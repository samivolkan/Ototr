"""Review policy and optional image preprocessing, independent of model training."""
from PIL import Image, ImageOps


def prepare_image(image: Image.Image, preset: str) -> Image.Image:
    if preset == "contrast":
        # Geometry and source evidence stay aligned. Never invent characters.
        return ImageOps.autocontrast(image, cutoff=1, preserve_tone=True)
    if preset != "standard":
        raise ValueError("Unknown preprocessing preset")
    return image


def apply_thresholds(result: dict, general: float, vin: float) -> dict:
    for field in result.get("fields", []):
        threshold = vin if field["key"] == "vin" else general
        field["threshold"] = threshold
        # A threshold must never remove format, conflict or image-quality warnings.
        review = (field.get("value") is None or field.get("confidence", 0) < threshold
                  or bool(field.get("issues")) or bool(result.get("warnings"))
                  or not result.get("document_recognized", True))
        field["needs_review"] = review
        field["status"] = "missing" if field.get("value") is None else "review" if review else "read"
    if "summary" in result:
        result["summary"]["review"] = sum(f["status"] == "review" for f in result["fields"])
    result["review_policy"] = {"general": general, "vin": vin, "calibrated": False}
    return result
