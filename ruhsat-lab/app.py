from __future__ import annotations

import asyncio
import os
import time
from collections import deque
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.cors import CORSMiddleware

from ruhsat.engine import ImageInputError, OCRService
from ruhsat.web_access import origin_allowed, preview_origin

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 20 * 1024 * 1024
PUBLIC_ORIGIN = preview_origin(os.environ.get("OTOTR_PREVIEW_ORIGIN", ""))
PUBLIC_TEST = os.environ.get("OTOTR_PREVIEW_ACCESS") == "public_test"
ERP_ORIGIN = "https://samivolkan.github.io"
recent_requests: deque[float] = deque()
service = OCRService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=service.initialize, daemon=True)
    thread.start()
    yield


app = FastAPI(title="OTOTR Ruhsat Lab", version="0.1.0", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url="/api/openapi.json")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"] +
                   ([urlparse(PUBLIC_ORIGIN).hostname] if PUBLIC_ORIGIN else []))


@app.middleware("http")
async def privacy_headers(request: Request, call_next):
    if request.method == "POST":
        origin = request.headers.get("origin")
        accepted = origin_allowed(origin, str(request.base_url), PUBLIC_ORIGIN)
        if PUBLIC_TEST and PUBLIC_ORIGIN:
            accepted = bool(origin) and (accepted or origin == ERP_ORIGIN)
        if not accepted:
            return JSONResponse({"detail": "Yalnız uygulamanın kendi adresinden istek kabul edilir."}, status_code=403)
        if request.headers.get("x-ototr-client") != "ruhsat-lab":
            return JSONResponse({"detail": "X-OTOTR-Client: ruhsat-lab başlığı gerekli."}, status_code=403)
        if PUBLIC_TEST and PUBLIC_ORIGIN:
            now = time.monotonic()
            while recent_requests and now - recent_requests[0] >= 60:
                recent_requests.popleft()
            if len(recent_requests) >= 10:
                return JSONResponse({"detail": "Test kullanım sınırına ulaşıldı. Bir dakika sonra tekrar deneyin."},
                                    status_code=429, headers={"Retry-After": "60", "Cache-Control": "no-store"})
            recent_requests.append(now)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
    return response


# Outermost CORS also covers error responses, so the UI can explain failures.
app.add_middleware(CORSMiddleware, allow_origins=[ERP_ORIGIN] if PUBLIC_TEST else [],
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-OTOTR-Client"],
                   allow_credentials=False, max_age=600)


@app.get("/api/health")
def health():
    return {"service": "ototr-ruhsat-lab", "status": service.status,
            "error": ("OCR motoru hazırlanamadı." if service.error else None) if PUBLIC_ORIGIN else service.error,
            "local_only": not bool(PUBLIC_ORIGIN), "version": "0.1.0",
            "access_mode": ("public_test" if PUBLIC_TEST else "email_protected_preview") if PUBLIC_ORIGIN else "local",
            "processing_location": "host_computer"}


@app.post("/api/v1/ruhsat/oku", summary="Read image bytes locally; nothing is stored",
          openapi_extra={"requestBody": {"required": True, "content": {
              "image/jpeg": {"schema": {"type": "string", "format": "binary"}},
              "image/png": {"schema": {"type": "string", "format": "binary"}},
              "image/webp": {"schema": {"type": "string", "format": "binary"}},
              "image/heic": {"schema": {"type": "string", "format": "binary"}}
          }}})
async def analyze(request: Request,
                  mode: Literal["fast", "detailed"] = "detailed",
                  rotation: int = Query(0, ge=0, le=270),
                  rectify: bool = False, auto_rotate: bool = True):
    if rotation not in (0, 90, 180, 270):
        raise HTTPException(422, "Döndürme 0, 90, 180 veya 270 derece olmalı.")
    if service.status != "ready":
        raise HTTPException(503, "OCR motoru henüz hazır değil. Durum göstergesini kontrol edin.")
    if not service.lock.acquire(blocking=False):
        raise HTTPException(429, "Bir fotoğraf işleniyor. İşlem bitince yeniden deneyin.")
    try:
        length = request.headers.get("content-length")
        if length:
            try:
                if int(length) > MAX_BYTES:
                    raise HTTPException(413, "Fotoğraf en fazla 20 MB olabilir.")
            except ValueError:
                raise HTTPException(400, "Geçersiz içerik uzunluğu.")
        body = bytearray()
        # Raw streaming body intentionally avoids multipart temporary disk files.
        async with asyncio.timeout(30):
            async for chunk in request.stream():
                if len(body) + len(chunk) > MAX_BYTES:
                    raise HTTPException(413, "Fotoğraf en fazla 20 MB olabilir.")
                body.extend(chunk)
        if not body:
            raise HTTPException(400, "Fotoğraf içeriği boş.")
        return await run_in_threadpool(service.analyze, bytes(body), mode, rotation, rectify, auto_rotate)
    except ImageInputError as exc:
        raise HTTPException(422, str(exc))
    except TimeoutError:
        raise HTTPException(408, "Fotoğraf yükleme süresi doldu.")
    except HTTPException:
        raise
    except Exception:
        # Never serialize OCR data, raw image bytes, filenames or model exceptions.
        raise HTTPException(500, "Fotoğraf işlenemedi. Başka bir fotoğrafla yeniden deneyin.")
    finally:
        service.lock.release()


@app.get("/")
def home():
    html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
    if PUBLIC_ORIGIN:
        html = html.replace("YEREL PROTOTİP", "WEB TESTİ")
        html = html.replace("Bu bilgisayarda işlenir", "Girişsiz test erişimi" if PUBLIC_TEST else "E-posta ile korunan erişim")
        html = html.replace("Harici servise gönderilmez.",
                            "HTTPS / Cloudflare üzerinden kendi OCR bilgisayarınıza iletilir.")
        html = html.replace("Yerel işleme · Otomatik kayıt yok", "Bilgisayar açıkken erişilebilir · Otomatik kayıt yok")
    return HTMLResponse(html)


app.mount("/assets", StaticFiles(directory=ROOT / "web"), name="assets")
