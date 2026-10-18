"""Build only public browser assets for the ERP's GitHub Pages directory."""
import argparse
import json
import shutil
from pathlib import Path
from ruhsat.web_access import preview_origin

ROOT = Path(__file__).resolve().parent


def build(output: Path, api_base: str):
    api_base = preview_origin(api_base)
    if not api_base:
        raise ValueError("HTTPS OCR adresi gerekli.")
    output.mkdir(parents=True, exist_ok=True)
    for name in ["app.js", "style.css", "field-settings.js", "data-policy.js", "sample.png", "erp-bridge.js"]:
        shutil.copyfile(ROOT / "web" / name, output / name)
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    html = html.replace('/assets/', './').replace('href="/"', 'href="../index.html#ruhsat" target="_top"')
    html = html.replace('<script src="./data-policy.js"', '<script src="./config.js"></script><script src="./data-policy.js"')
    html = html.replace('YEREL PROTOTİP', 'ERP / TEST')
    html = html.replace('Bu bilgisayarda işlenir', 'Girişsiz test erişimi')
    html = html.replace('Harici servise gönderilmez.', 'HTTPS / Cloudflare üzerinden kendi OCR bilgisayarınıza iletilir.')
    html = html.replace('Yerel işleme · Otomatik kayıt yok · Ototr bağlantısı henüz etkin değil',
                        'OTOTR ERP · Otomatik kayıt yok · OCR bilgisayarı açık kalmalı')
    (output / "index.html").write_text(html, encoding="utf-8")
    config = {"apiBase": api_base, "samplePath": "./sample.png", "erp": True}
    (output / "config.js").write_text('window.RUHSAT_CONFIG = Object.freeze(' + json.dumps(config) + ');\n', encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--api-base", required=True)
    args = parser.parse_args()
    build(args.output, args.api_base)
