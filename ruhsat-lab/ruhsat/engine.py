from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import threading
import time
import warnings
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener
from rapidocr import RapidOCR, ModelType, OCRVersion
from rapidocr.utils.process_img import get_rotate_crop_image

from .parser import extract, reconcile
from .privacy import partition_fields
from .quality import prepare_image

ROOT = Path(__file__).resolve().parent.parent
MODELS = Path(os.environ.get("OTOTR_MODEL_DIR", str(ROOT / "models")))
MAX_PIXELS = 32_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
register_heif_opener()


class ImageInputError(ValueError):
    pass


def decode_image(data: bytes, rotation: int = 0, min_side: int = 80) -> tuple[Image.Image, dict]:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(data))
            if image.format not in ("JPEG", "PNG", "WEBP", "HEIF", "HEIC"):
                raise ImageInputError("JPG, PNG, WebP veya HEIC fotoğrafı yükleyin.")
            if image.width * image.height > MAX_PIXELS:
                raise ImageInputError("Fotoğraf en fazla 32 megapiksel olabilir.")
            original = {"width": image.width, "height": image.height, "format": image.format}
            image = ImageOps.exif_transpose(image)
            if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                rgba = image.convert("RGBA")
                white = Image.new("RGBA", rgba.size, "white")
                image = Image.alpha_composite(white, rgba).convert("RGB")
            else:
                image = image.convert("RGB")
            if min(image.size) < min_side:
                raise ImageInputError("Fotoğraf çok küçük. Ruhsatı daha yakından çekin.")
            image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
            if rotation:
                image = image.rotate(-rotation, expand=True, fillcolor="white")
            return image, original
    except ImageInputError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ImageInputError("Görsel açılamadı veya güvenli boyut sınırını aşıyor. Geçerli bir fotoğraf seçin.") from exc


def perspective(image: Image.Image) -> tuple[Image.Image, bool]:
    """Optional largest-document correction, with strict shape/area limits."""
    rgb = np.array(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 50, 150)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = gray.shape
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        area = cv2.contourArea(contour) / (w * h)
        approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        if not 0.50 < area < 0.96 or len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        points = approx.reshape(4, 2).astype(np.float32)
        total, diff = points.sum(axis=1), np.diff(points, axis=1).ravel()
        ordered = np.array([points[np.argmin(total)], points[np.argmin(diff)], points[np.argmax(total)], points[np.argmax(diff)]])
        if len(np.unique(ordered, axis=0)) != 4:
            continue
        tl, tr, br, bl = ordered
        out_w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
        out_h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
        if not 0.4 < out_w / max(out_h, 1) < 3.2 or min(out_w, out_h) < 300:
            continue
        matrix = cv2.getPerspectiveTransform(ordered, np.array([[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]], dtype=np.float32))
        return Image.fromarray(cv2.warpPerspective(rgb, matrix, (out_w, out_h))), True
    return image, False


def image_quality(image: Image.Image) -> dict:
    reduced = image.copy()
    reduced.thumbnail((1200, 1200))
    gray = np.array(reduced.convert("L"))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    contrast = float(np.percentile(gray, 99) - np.percentile(gray, 1))
    messages = []
    if min(image.size) < 600:
        messages.append("Çözünürlük düşük; küçük yazılar ve şasi hatalı okunabilir.")
    if sharpness < 45:
        messages.append("Görüntü bulanık olabilir. Sabit tutarak ve daha iyi ışıkta yeniden çekin.")
    if contrast < 45:
        messages.append("Yazı-zemin kontrastı düşük. Yansıma ve ışığı kontrol edin.")
    return {"sharpness": round(sharpness, 1), "contrast": round(contrast, 1), "warnings": messages}


class OCRService:
    def __init__(self):
        self.status = "loading"
        self.error = None
        self.models = {}
        self.lock = threading.Lock()

    def initialize(self):
        try:
            manifest = json.loads((MODELS / "manifest.json").read_text(encoding="utf-8"))
            for item in manifest:
                path = MODELS / item["file"]
                if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
                    raise RuntimeError("Model dosyası eksik veya bütünlük kontrolü başarısız. Kurulum.ps1 çalıştırın.")
            common = {
                "Global.log_level": "error", "Global.text_score": 0.40,
                "Global.max_side_len": 2400,
                "EngineConfig.onnxruntime.intra_op_num_threads": min(os.cpu_count() or 4, 4),
                "EngineConfig.onnxruntime.inter_op_num_threads": 1,
                "Cls.model_path": str(MODELS / "ch_ppocr_mobile_v2.0_cls_mobile.onnx"),
                "Det.limit_side_len": 1280, "Det.limit_type": "max",
            }
            self.models["v5"] = RapidOCR(params={**common,
                "Det.ocr_version": OCRVersion.PPOCRV5, "Det.model_type": ModelType.SERVER,
                "Det.model_path": str(MODELS / "ch_PP-OCRv5_det_server.onnx"),
                "Rec.ocr_version": OCRVersion.PPOCRV5, "Rec.model_type": ModelType.MOBILE, "Rec.lang_type": "latin",
                "Rec.model_path": str(MODELS / "latin_PP-OCRv5_rec_mobile.onnx"),
            })
            self.models["v6"] = RapidOCR(params={**common,
                "Det.ocr_version": OCRVersion.PPOCRV6, "Det.model_type": ModelType.SMALL,
                "Det.model_path": str(MODELS / "PP-OCRv6_det_small.onnx"),
                "Rec.ocr_version": OCRVersion.PPOCRV6, "Rec.model_type": ModelType.SMALL, "Rec.lang_type": "tr",
                "Rec.model_path": str(MODELS / "PP-OCRv6_rec_small.onnx"),
            })
            # Force lazy model initialization now; fail before accepting documents.
            sample = Image.new("RGB", (500, 100), "white")
            ImageDraw.Draw(sample).text((20, 20), "OTOTR 123456789", fill="black", font_size=30)
            for model in self.models.values():
                model(sample)
            self.status = "ready"
        except Exception as exc:
            self.status = "error"
            self.error = f"OCR motoru hazırlanamadı ({type(exc).__name__}). Kurulum kontrol edilmeli."
            # No customer documents exist during initialization.
            import traceback
            traceback.print_exc()

    def read(self, image: Image.Image, model: str, prefix: str) -> list[dict]:
        result = self.models[model](image, use_det=True, use_cls=True, use_rec=True)
        if result.txts is None or result.boxes is None:
            return []
        return [{"id": f"{prefix}-{idx}", "text": text, "score": round(float(score), 4),
                 "box": [[round(float(x), 1), round(float(y), 1)] for x, y in box], "model": model}
                for idx, (box, text, score) in enumerate(zip(result.boxes, result.txts, result.scores))]

    def orientation(self, image: Image.Image, lines: list[dict]) -> int:
        """Vote across actual text crops to distinguish 0/90/180/270 degrees.

        OCR can read rotated crops even while document geometry is sideways.
        Normalize page orientation before spatial field association.
        """
        selected = []
        for line in lines:
            xs, ys = [p[0] for p in line["box"]], [p[1] for p in line["box"]]
            w, h = max(xs)-min(xs), max(ys)-min(ys)
            if len(line["text"]) >= 5 and line["score"] > .65 and max(w,h)/max(min(w,h),1) > 2:
                selected.append((line, h > w * 1.5))
        selected = sorted(selected,key=lambda pair:pair[0]["score"],reverse=True)[:12]
        if len(selected)<3:
            return 0
        bgr=cv2.cvtColor(np.array(image),cv2.COLOR_RGB2BGR)
        crops=[get_rotate_crop_image(bgr,np.array(line["box"],dtype=np.float32)) for line,_ in selected]
        classifications=self.models["v5"].text_cls(crops).cls_res
        votes={0:0.,90:0.,180:0.,270:0.}
        for (_,vertical),(label,score) in zip(selected,classifications):
            if score < .90:
                continue
            upside_down = label == "180"
            angle=(90 if upside_down else 270) if vertical else (180 if upside_down else 0)
            votes[angle]+=float(score)
        total=sum(votes.values())
        best=max(votes,key=votes.get)
        return best if total >= 2.5 and votes[best]/total >= .7 else 0

    def analyze(self, data: bytes, mode: str, rotation: int, rectify: bool, auto_rotate: bool,
                preprocessing: str = "standard") -> dict:
        started = time.perf_counter()
        image, original = decode_image(data, rotation)
        quality = image_quality(image)
        rectified = False
        if rectify:
            image, rectified = perspective(image)
        image = prepare_image(image, preprocessing)
        lines = self.read(image, "v5", "a")
        auto_angle = 0
        orientation_hint = self.orientation(image, lines)
        if auto_rotate and orientation_hint:
            auto_angle = orientation_hint
            image = image.rotate(-auto_angle,expand=True,fillcolor="white")
            lines = self.read(image,"v5","a")
        extracted = extract(lines, image.width, image.height)
        # Only retry orientation if extraction is weak; manual rotation is available.
        if auto_rotate and lines and not auto_angle and sum(bool(f["value"]) for f in extracted["fields"]) < 5:
            initial = image
            best_score = extracted["anchor_count"] + sum(bool(f["value"]) for f in extracted["fields"])
            for angle in (90, 180, 270):
                candidate = initial.rotate(-angle, expand=True, fillcolor="white")
                candidate_lines = self.read(candidate, "v5", "a")
                candidate_result = extract(candidate_lines, candidate.width, candidate.height)
                score = candidate_result["anchor_count"] + sum(bool(f["value"]) for f in candidate_result["fields"])
                if score > best_score:
                    image, lines, extracted, best_score, auto_angle = candidate, candidate_lines, candidate_result, score, angle
                if best_score >= 20:
                    break
        if mode == "detailed":
            second = self.read(image, "v6", "b")
            extracted = reconcile(extracted, extract(second, image.width, image.height))
            lines.extend(second)
        # Suppress impossible confidence when image quality has clear problems.
        if quality["warnings"]:
            for field in extracted["fields"]:
                if field["value"]:
                    field["needs_review"], field["status"] = True, "review"
        warnings_out = list(quality["warnings"])
        if not auto_rotate and orientation_hint:
            warnings_out.append("Belge yan veya ters görünüyor. Yön kontrolünü açın ya da fotoğrafı döndürüp tekrar okuyun.")
            for field in extracted["fields"]:
                if field["value"]:
                    field["needs_review"], field["status"] = True, "review"
        if not extracted["document_recognized"]:
            warnings_out.append("Yeterli ruhsat etiketi bulunamadı. Ruhsatın tamamını net ve düz çekin.")
        if not lines:
            warnings_out.append("Okunabilir metin bulunamadı.")
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=90)
        fields, seller_suggestion = partition_fields(extracted["fields"])
        return {"schema_version": "1.1", "mode": mode, "preprocessing": preprocessing,
                "elapsed_seconds": round(time.perf_counter() - started, 2),
                "models": ["PP-OCRv5 Latin"] + (["PP-OCRv6 Turkish"] if mode == "detailed" else []),
                "document_recognized": extracted["document_recognized"], "anchor_count": extracted["anchor_count"],
                "image": {"width": image.width, "height": image.height, "original": original,
                          "rotation": (rotation + auto_angle) % 360, "perspective_corrected": rectified,
                          "preview": "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")},
                "quality": quality, "warnings": warnings_out, "fields": fields, "lines": lines,
                "summary": {"read": sum(f["value"] is not None for f in fields),
                            "review": sum(f["status"] == "review" for f in fields),
                            "missing": sum(f["status"] == "missing" for f in fields)},
                "analysed": {"Data": {f["key"]: f["value"] for f in fields}},
                "seller_suggestion": seller_suggestion,
                "privacy": {"processing": "local", "persistent_storage": False,
                            "seller_suggestion_storage": "memory_only",
                            "diagnostics_storage": "memory_only"},
                "review_state": "unreviewed", "confidence_is_calibrated": False}
