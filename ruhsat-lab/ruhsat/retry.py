"""Bounded, memory-only recognition of a user-selected vehicle field crop."""
from __future__ import annotations

import time
import re
import cv2
import numpy as np
from PIL import Image, ImageOps

from .parser import BY_KEY, find_labels, same_value, validate

VEHICLE_KEYS = frozenset(k for k, s in BY_KEY.items() if s.group != "Sahip bilgileri")


def crop_variants(image: Image.Image):
    # Enlarging resamples pixels; it does not generate or invent text.
    scale = min(2., 1600 / max(image.size))
    if scale > 1:
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    image = ImageOps.expand(image, border=16, fill="white")
    yield "original", image
    gray = np.asarray(image.convert("L"))
    enhanced = cv2.createCLAHE(clipLimit=2., tileGridSize=(8, 8)).apply(gray)
    yield "local_contrast", Image.fromarray(enhanced).convert("RGB")


def collect_candidates(key: str, readings: list[dict]) -> list[dict]:
    if key not in VEHICLE_KEYS:
        raise ValueError("Yalnız araç alanları yeniden okunabilir.")
    spec = BY_KEY[key]
    candidates = []
    for reading in readings:
        for line in reading["lines"]:
            raw = line["text"]
            labels = find_labels(raw)
            if labels:
                # Never take a different labelled cell as the requested value.
                matching = [item for item in labels if item[2] == key]
                if not matching:
                    continue
                _, end, _ = matching[0]
                next_start = min((a for a, _, _ in labels if a >= end), default=len(raw))
                raw = raw[end:next_start]
            value, issues = validate(spec, raw)
            if not value:
                continue
            if spec.kind in ("year", "date") and issues:
                continue
            if spec.kind == "vin" and len(value) < 11:
                continue
            if spec.kind == "plate" and (len(value)<5 or not re.search(r"[A-Z]",value) or len(re.findall(r"\d",value))<3):
                continue
            score = max(0., min(float(line["score"]), 1.))
            candidate = next((c for c in candidates if same_value(c["value"], value)), None)
            source = {"model": reading["model"], "variant": reading["variant"]}
            if candidate:
                candidate["confidence"] = max(candidate["confidence"], score)
                if source not in candidate["sources"]:
                    candidate["sources"].append(source)
            else:
                candidates.append({"value": value, "confidence": round(score, 4), "issues": issues,
                                   "sources": [source], "needs_review": True})
    for c in candidates:
        c["model_agreement"] = len({s["model"] for s in c["sources"]}) > 1
    # Show conflicts, never silently replace the first reading or use a majority as truth.
    return sorted(candidates, key=lambda c: (bool(c["issues"]), -int(c["model_agreement"]), -c["confidence"]))[:6]


def reread(service, data: bytes, key: str) -> dict:
    from .engine import ImageInputError, decode_image
    if key not in VEHICLE_KEYS:
        raise ImageInputError("Yalnız araç alanları yeniden okunabilir.")
    image, original = decode_image(data, min_side=8)
    if original["width"] * original["height"] > 2_000_000:
        raise ImageInputError("Yalnız ilgili alanı seçin; bölge en fazla 2 megapiksel olabilir.")
    started = time.perf_counter()
    readings = []
    for variant, prepared in crop_variants(image):
        for model in ("v5", "v6"):
            readings.append({"variant": variant, "model": model,
                             "lines": service.read(prepared, model, "retry")})
    return {"field": key, "candidates": collect_candidates(key, readings),
            "elapsed_seconds": round(time.perf_counter() - started, 2),
            "attempts": len(readings), "requires_confirmation": True,
            "confidence_is_calibrated": False, "persistent_storage": False,
            "model_trained": False}
