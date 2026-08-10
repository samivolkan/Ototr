import base64
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


TARGETS = {
    "top": [],
    "left": [
        {"x": 20.2, "y": 75.7, "w": 3.2, "h": 5.4},
        {"x": 81.9, "y": 75.5, "w": 3.2, "h": 5.4},
    ],
    "right": [
        {"x": 19.2, "y": 75.5, "w": 3.2, "h": 5.4},
        {"x": 81.2, "y": 75.5, "w": 3.2, "h": 5.4},
    ],
    "front": [{"x": 50.0, "y": 47.3, "w": 5.4, "h": 8.0}],
    "rear": [{"x": 50.0, "y": 38.0, "w": 5.8, "h": 9.2}],
}

MARKER = "const PHYSICAL_LOGO_BLUR='pillow-gaussian-feather-v1';"
PATTERN = re.compile(r"^const VIEW_IMAGES=(\{.*\});$", re.MULTILINE)


def encode_png(image):
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True, compress_level=9)
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")


def blur_targets(image, targets):
    original = image.convert("RGBA")
    result = original.copy()
    width, height = original.size

    for target in targets:
        box_width = max(8, round(width * target["w"] / 100))
        box_height = max(8, round(height * target["h"] / 100))
        center_x = round(width * target["x"] / 100)
        center_y = round(height * target["y"] / 100)
        box = (
            center_x - box_width // 2,
            center_y - box_height // 2,
            center_x + (box_width + 1) // 2,
            center_y + (box_height + 1) // 2,
        )

        blur_radius = max(4.0, min(12.0, max(box_width, box_height) * 0.38))
        feather_radius = max(1.5, min(4.0, min(box_width, box_height) * 0.18))
        blurred = result.filter(ImageFilter.GaussianBlur(radius=blur_radius))
        mask = Image.new("L", result.size, 0)
        ImageDraw.Draw(mask).ellipse(box, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=feather_radius))
        result = Image.composite(blurred, result, mask)

    difference = ImageChops.difference(original, result)
    grayscale = difference.convert("L")
    changed_pixels = sum(count for value, count in enumerate(grayscale.histogram()) if value)
    return result, changed_pixels, difference.convert("RGB").getbbox()


def main():
    target_path = Path(sys.argv[1] if len(sys.argv) > 1 else "OTOTR_Kaporta_Giris_MASTER_v1.html")
    text = target_path.read_text(encoding="utf-8")
    force = "--force" in sys.argv
    if force:
        text = text.replace(MARKER + "\n", "").replace("\n" + MARKER, "")
    match = PATTERN.search(text)
    if not match:
        raise RuntimeError("VIEW_IMAGES constant not found")

    if "--extract-dir" in sys.argv:
        output_dir = Path(sys.argv[sys.argv.index("--extract-dir") + 1])
        output_dir.mkdir(parents=True, exist_ok=True)
        images = json.loads(match.group(1))
        for view, data_url in images.items():
            (output_dir / f"{view}.png").write_bytes(base64.b64decode(data_url.split(",", 1)[1]))
        print(json.dumps({"ok": True, "extracted": len(images), "directory": str(output_dir)}))
        return

    if MARKER in text and not force:
        print(json.dumps({"ok": True, "changed": False, "reason": "already blurred"}))
        return

    image_document = text
    if "--source" in sys.argv:
        source_path = Path(sys.argv[sys.argv.index("--source") + 1])
        image_document = source_path.read_text(encoding="utf-8")
    image_match = PATTERN.search(image_document)
    if not image_match:
        raise RuntimeError("Source VIEW_IMAGES constant not found")
    images = json.loads(image_match.group(1))
    stats = {}
    for view, targets in TARGETS.items():
        if view not in images:
            raise RuntimeError(f"Missing embedded image: {view}")
        raw = base64.b64decode(images[view].split(",", 1)[1])
        with Image.open(io.BytesIO(raw)) as decoded:
            decoded.load()
            if not targets:
                stats[view] = {"size": list(decoded.size), "masks": 0, "changedPixels": 0}
                continue
            blurred, changed_pixels, changed_box = blur_targets(decoded, targets)
            images[view] = encode_png(blurred)
            stats[view] = {
                "size": list(decoded.size),
                "masks": len(targets),
                "changedPixels": changed_pixels,
                "changedBox": list(changed_box) if changed_box else None,
            }

    replacement = "const VIEW_IMAGES=" + json.dumps(images, ensure_ascii=False, separators=(",", ":")) + ";\n" + MARKER
    updated = text[: match.start()] + replacement + text[match.end() :]
    target_path.write_text(updated, encoding="utf-8", newline="\n")
    print(json.dumps({"ok": True, "changed": True, "file": str(target_path), "views": stats}, indent=2))


if __name__ == "__main__":
    main()
