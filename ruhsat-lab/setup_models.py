"""Download only model files from RapidAI's versioned upstream registry.

Each artifact is checked against the SHA-256 shipped in the pinned PyPI package.
The OCR server itself has no model download path.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

import rapidocr
import requests
import yaml

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "models"
SELECTION = [
    ("PP-OCRv5", "det", "ch_PP-OCRv5_det_server"),
    ("PP-OCRv5", "rec", "latin_PP-OCRv5_rec_mobile"),
    ("PP-OCRv4", "cls", "ch_ppocr_mobile_v2.0_cls_mobile"),
    ("PP-OCRv6", "det", "multi_PP-OCRv6_det_small"),
    ("PP-OCRv6", "rec", "multi_PP-OCRv6_rec_small"),
]


def main():
    config = yaml.safe_load((Path(rapidocr.__file__).parent / "default_models.yaml").read_text(encoding="utf-8"))
    MODEL_DIR.mkdir(exist_ok=True)
    manifest = []
    for version, task, key in SELECTION:
        info = config["onnxruntime"][version][task][key]
        url, expected = info["model_dir"], info["SHA256"]
        if urlparse(url).hostname != "www.modelscope.cn" or "/RapidAI/RapidOCR/resolve/v3.10.0/" not in url:
            raise RuntimeError("Unexpected model origin")
        path = MODEL_DIR / url.rsplit("/", 1)[-1]
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            print(f"Downloading {path.name}", flush=True)
            part = path.with_suffix(".part")
            with requests.get(url, stream=True, timeout=(20, 90)) as response:
                response.raise_for_status()
                with part.open("wb") as output:
                    for chunk in response.iter_content(1024 * 1024):
                        output.write(chunk)
            if hashlib.sha256(part.read_bytes()).hexdigest() != expected:
                part.unlink(missing_ok=True)
                raise RuntimeError(f"SHA256 verification failed: {path.name}")
            part.replace(path)
        print(f"Verified {path.name} ({path.stat().st_size // 1024 // 1024} MB)", flush=True)
        manifest.append({"file": path.name, "sha256": expected, "source": url, "license": "Apache-2.0"})
    (MODEL_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("All models available locally.", flush=True)


if __name__ == "__main__":
    main()
