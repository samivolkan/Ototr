"""Start the loopback-only user application without an extra terminal window."""
import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8765"


def running():
    try:
        with urllib.request.urlopen(URL + "/api/health", timeout=2) as response:
            return json.load(response).get("service") == "ototr-ruhsat-lab"
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if not running():
        runtime = ROOT / "runtime"
        runtime.mkdir(exist_ok=True)
        python = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        flags = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
        with (runtime / "server.log").open("a", encoding="utf-8") as log:
            process = subprocess.Popen([str(python), "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8765", "--no-access-log", "--log-level", "warning"], cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=log, creationflags=flags)
        (runtime / "server.pid").write_text(str(process.pid), encoding="ascii")
        for _ in range(80):
            if running():
                break
            if process.poll() is not None:
                raise RuntimeError("Sunucu başlatılamadı. runtime/server.log dosyasını kontrol edin.")
            time.sleep(0.25)
        else:
            raise RuntimeError("Sunucu henüz yanıt vermiyor. Birkaç saniye sonra tekrar deneyin.")
    if not args.no_browser:
        webbrowser.open(URL)
    print(URL)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        if os.name == "nt":
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, str(exc), "OTOTR Ruhsat Lab", 0x10)
        raise
