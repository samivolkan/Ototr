"""Bounded, memory-only recognition of a user-selected vehicle field crop."""
from __future__ import annotations

import time
import re
import cv2
import numpy as np
from PIL import Image, ImageOps

from .parser import BY_KEY, extract, find_labels, fold, rect, same_value, validate

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


def field_blocks(key: str, reading: dict) -> list[dict]:
    """One cell per model pass; never treat every OCR line as a field value."""
    lines = [{**l, "id": str(i)} for i, l in enumerate(reading["lines"])]
    if not lines:
        return []
    # The small test/service interface can also supply a single text-only line.
    spatial = all("box" in l for l in lines)
    labels = [label for l in lines for label in find_labels(l["text"])]
    if spatial:
        width = reading.get("width", max(rect(l)[2] for l in lines) + 1)
        height = reading.get("height", max(rect(l)[3] for l in lines) + 1)
        parsed = extract(lines, width, height)
        selected = next(f for f in parsed["fields"] if f["key"] == key)
        if key != "vehicle_category" and any(label[2] == key for label in labels):
            # Full-document cell boundaries also apply inside a crop. This
            # joins wrapped descriptions and stops at adjacent field captions.
            if not selected["value"]:
                return []
            used = [l for l in lines if l["id"] in selected["line_ids"]]
            return [{"text": selected["raw_value"], "score": min(l["score"] for l in used)}]
        # Exclude values explicitly associated with a different labelled cell.
        other_ids = {i for f in parsed["fields"] if f["key"] != key and f["method"] != "pattern"
                     for i in f["line_ids"]}
        lines = [l for l in lines if l["id"] not in other_ids]

    values = []
    for line in lines:
        raw = line["text"]
        found = find_labels(raw)
        if found:
            matching = [item for item in found if item[2] == key]
            if not matching:
                continue
            _, end, _ = matching[0]
            stop = min((a for a, _, _ in found if a >= end), default=len(raw))
            raw = raw[end:stop]
        if not raw.strip():
            continue
        values.append({**line, "text": raw})

    # A description split into multiple OCR boxes is one value. Only join
    # neighbouring lines in the same column until the open bracket closes.
    blocks = []
    for line in values:
        raw, score = line["text"], line["score"]
        if spatial and key == "vehicle_category" and "(" not in raw:
            x0,y0,x1,y1 = rect(line)
            same_row = [l for l in values if l is not line and l["text"].lstrip().startswith("(")
                        and 0 <= rect(l)[0]-x1 < max(y1-y0, 8)*1.2
                        and abs((rect(l)[1]+rect(l)[3]-y0-y1)/2) < max(y1-y0, 8)*.6]
            if len(same_row) == 1:
                raw += " " + same_row[0]["text"]
                score = min(score, same_row[0]["score"])
        if spatial and key == "vehicle_category" and raw.count("(") > raw.count(")"):
            current = line
            used_ids = {line["id"]}
            for _ in range(3):
                x0, y0, x1, y1 = rect(current)
                cy, lh = (y0+y1)/2, max(y1-y0, 8)
                tails = [l for l in values if l["id"] not in used_ids
                         and cy < (rect(l)[1]+rect(l)[3])/2 < cy+lh*1.7
                         and rect(l)[0] <= x1 and rect(l)[2] >= x0-lh*2
                         and not any(cy < (rect(a)[1]+rect(a)[3])/2 < (rect(l)[1]+rect(l)[3])/2
                                     and abs(rect(a)[0]-rect(l)[0]) < width*.15
                                     for a in lines if find_labels(a["text"]))]
                if not tails:
                    break
                current = min(tails, key=lambda l: rect(l)[1])
                used_ids.add(current["id"])
                raw += " " + current["text"]
                score = min(score, current["score"])
                if raw.count("(") == raw.count(")"):
                    break
        value, issues = validate(BY_KEY[key], raw)
        if not value:
            continue
        if key == "vehicle_category":
            # A bare continuation like HECBEK is not the complete vehicle kind.
            if not re.match(r"^(?:OTOMOBIL|KAMYONET|KAMYON|OTOBUS|MINIBUS|MOTOSIKLET|TRAKTOR|ROMORK|YARI ROMORK|OZEL AMACLI|ARAZI TASITI)\b", fold(value)):
                continue
            if value.count("(") != value.count(")"):
                continue
        if BY_KEY[key].kind in ("year", "date") and issues:
            continue
        if BY_KEY[key].kind == "vin" and len(value) < 11:
            continue
        if BY_KEY[key].kind == "plate" and (len(value)<5 or not re.search(r"[A-Z]",value) or len(re.findall(r"\d",value))<3):
            continue
        block = {"text": raw, "score": score}
        if spatial:
            x0,y0,x1,y1 = rect(line)
            block["distance"] = ((x0+x1)/2/width-.5)**2 + ((y0+y1)/2/height-.5)**2
        blocks.append(block)
    # An unlabelled user crop is centred on the selected value. Neighbouring
    # headings are not independent alternatives; disagreements across models are.
    return [min(blocks, key=lambda b: b.get("distance", 0))] if blocks else []


def collect_candidates(key: str, readings: list[dict]) -> list[dict]:
    if key not in VEHICLE_KEYS:
        raise ValueError("Yalnız araç alanları yeniden okunabilir.")
    spec = BY_KEY[key]
    candidates = []
    for reading in readings:
        for line in field_blocks(key, reading):
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
            if key == "vehicle_category" and not re.match(r"^(?:OTOMOBIL|KAMYONET|KAMYON|OTOBUS|MINIBUS|MOTOSIKLET|TRAKTOR|ROMORK|YARI ROMORK|OZEL AMACLI|ARAZI TASITI)\b", fold(value)):
                continue
            if key == "vehicle_category" and value.count("(") != value.count(")"):
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
            readings.append({"variant": variant, "model": model, "width": prepared.width, "height": prepared.height,
                             "lines": service.read(prepared, model, "retry")})
    return {"field": key, "candidates": collect_candidates(key, readings),
            "elapsed_seconds": round(time.perf_counter() - started, 2),
            "attempts": len(readings), "requires_confirmation": True,
            "confidence_is_calibrated": False, "persistent_storage": False,
            "model_trained": False}
