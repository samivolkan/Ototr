"""Build only public browser assets for the ERP's GitHub Pages directory."""
import argparse
import json
import re
import shutil
from pathlib import Path
from ruhsat.web_access import preview_origin, server_origin

ROOT = Path(__file__).resolve().parent


def build(output: Path, api_base: str, server: bool = False):
    api_base = server_origin(api_base) if server else preview_origin(api_base)
    if not api_base:
        raise ValueError("HTTPS OCR adresi gerekli.")
    output.mkdir(parents=True, exist_ok=True)
    for name in ["app.js", "style.css", "field-settings.js", "data-policy.js", "sample.png", "erp-bridge.js", "quality-policy.js", "learning.js", "retry.js"]:
        shutil.copyfile(ROOT / "web" / name, output / name)
    html = (ROOT / "web/index.html").read_text(encoding="utf-8")
    html = html.replace('/assets/', './').replace('href="/"', 'href="../index.html#ruhsat" target="_top"')
    html = html.replace('<script src="./data-policy.js"', '<script src="./config.js"></script><script src="./data-policy.js"')
    html = html.replace('YEREL PROTOTİP', 'ERP / TEST')
    html = html.replace('Bu bilgisayarda işlenir', 'Kalıcı OCR sunucusu' if server else 'Girişsiz test erişimi')
    html = html.replace('Harici servise gönderilmez.', 'Kendi OCR sunucunuzda işlenir; ham fotoğraf kaydedilmez.' if server else 'HTTPS / Cloudflare üzerinden kendi OCR bilgisayarınıza iletilir.')
    html = html.replace('Yerel işleme · Otomatik kayıt yok · Ototr bağlantısı henüz etkin değil',
                        'OTOTR ERP · Sunucuda işleme · Geri bildirim isteğe bağlı' if server else 'OTOTR ERP · Otomatik kayıt yok · OCR bilgisayarı açık kalmalı')
    html = re.sub(r'((?:src|href)="\./[^"?]+\.(?:js|css))"', r'\1?v=20261019-4"', html)
    (output / "index.html").write_text(html, encoding="utf-8")
    config = {"apiBase": api_base, "samplePath": "./sample.png", "erp": True}
    (output / "config.js").write_text('window.RUHSAT_CONFIG = Object.freeze(' + json.dumps(config) + ');\n', encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--api-base", required=True)
    parser.add_argument("--server", action="store_true")
    args = parser.parse_args()
    build(args.output, args.api_base, args.server)
