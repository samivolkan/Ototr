from __future__ import annotations

import asyncio
import os
import time
import secrets
from uuid import uuid4
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
from fastapi.exceptions import RequestValidationError

from ruhsat.engine import ImageInputError, OCRService
from ruhsat import __version__
from ruhsat.web_access import origin_allowed, preview_origin, server_origin
from ruhsat.quality import apply_thresholds
from ruhsat.feedback import Feedback, FeedbackStore
from ruhsat.retry import reread, VEHICLE_KEYS

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 20 * 1024 * 1024
PUBLIC_ORIGIN = preview_origin(os.environ.get("OTOTR_PREVIEW_ORIGIN", ""))
PUBLIC_TEST = os.environ.get("OTOTR_PREVIEW_ACCESS") == "public_test"
SERVER_ORIGIN = server_origin(os.environ.get("OTOTR_SERVER_ORIGIN", ""))
API_TOKEN = os.environ.get("OTOTR_API_TOKEN", "")
ADMIN_TOKEN = os.environ.get("OTOTR_ADMIN_TOKEN", "")
if SERVER_ORIGIN and (len(API_TOKEN) < 32 or len(ADMIN_TOKEN) < 32 or API_TOKEN == ADMIN_TOKEN):
    raise RuntimeError("Sunucu modu için iki farklı en az 32 karakterlik erişim anahtarı gerekli.")
if SERVER_ORIGIN and PUBLIC_ORIGIN:
    raise RuntimeError("Sunucu ve geçici tünel modu birlikte kullanılamaz.")
ERP_ORIGIN = "https://samivolkan.github.io"
feedback_store = FeedbackStore(Path(os.environ.get("OTOTR_DATA_DIR", str(ROOT / "runtime"))) / "feedback.sqlite3")
recent_requests: deque[float] = deque()
service = OCRService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=service.initialize, daemon=True)
    thread.start()
    yield


app = FastAPI(title="OTOTR Ruhsat Lab", version=__version__, lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url="/api/openapi.json")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"] +
                   ([urlparse(PUBLIC_ORIGIN or SERVER_ORIGIN).hostname] if PUBLIC_ORIGIN or SERVER_ORIGIN else []))


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Pydantic's default errors echo rejected inputs, which might contain personal data.
    return JSONResponse({"detail": "İstek alanları veya değerleri geçersiz."}, status_code=422)


def authorized(request: Request, token: str) -> bool:
    given = request.headers.get("authorization", "")
    return bool(token) and secrets.compare_digest(given.encode("utf-8"), ("Bearer " + token).encode("utf-8"))


def require_admin(request: Request):
    if ADMIN_TOKEN:
        if not authorized(request, ADMIN_TOKEN):
            raise HTTPException(401, "Yönetim erişim kodu gerekli.")
    elif PUBLIC_ORIGIN or SERVER_ORIGIN or not request.client or request.client.host not in ("127.0.0.1", "::1"):
        raise HTTPException(403, "Geri bildirim yönetimi bu erişimde etkin değil.")


@app.middleware("http")
async def privacy_headers(request: Request, call_next):
    if request.method == "POST":
        origin = request.headers.get("origin")
        accepted = origin_allowed(origin, str(request.base_url), PUBLIC_ORIGIN or SERVER_ORIGIN)
        if PUBLIC_TEST and PUBLIC_ORIGIN:
            accepted = bool(origin) and (accepted or origin == ERP_ORIGIN)
        if SERVER_ORIGIN:
            accepted = not origin or origin in (SERVER_ORIGIN, ERP_ORIGIN)
        if not accepted:
            return JSONResponse({"detail": "Yalnız uygulamanın kendi adresinden istek kabul edilir."}, status_code=403)
        if request.headers.get("x-ototr-client") != "ruhsat-lab":
            return JSONResponse({"detail": "X-OTOTR-Client: ruhsat-lab başlığı gerekli."}, status_code=403)
        if SERVER_ORIGIN and request.url.path in ("/api/v1/ruhsat/oku", "/api/v1/ruhsat/tekrar") and not authorized(request, API_TOKEN):
            return JSONResponse({"detail": "OCR erişim kodu gerekli."}, status_code=401, headers={"Cache-Control":"no-store"})
        if (PUBLIC_TEST and PUBLIC_ORIGIN or SERVER_ORIGIN) and request.url.path in ("/api/v1/ruhsat/oku", "/api/v1/ruhsat/tekrar"):
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
app.add_middleware(CORSMiddleware, allow_origins=[ERP_ORIGIN] if PUBLIC_TEST or SERVER_ORIGIN else [],
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-OTOTR-Client", "Authorization"],
                   allow_credentials=False, max_age=600)


@app.get("/api/health")
def health():
    return {"service": "ototr-ruhsat-lab", "status": service.status,
            "error": ("OCR motoru hazırlanamadı." if service.error else None) if PUBLIC_ORIGIN or SERVER_ORIGIN else service.error,
            "local_only": not bool(PUBLIC_ORIGIN or SERVER_ORIGIN), "version": __version__,
            "access_mode": "server_token" if SERVER_ORIGIN else ("public_test" if PUBLIC_TEST else "email_protected_preview") if PUBLIC_ORIGIN else "local",
            "processing_location": "server" if SERVER_ORIGIN else "host_computer",
            "field_retry": True, "feedback": "anonymous_statistics", "feedback_revision": 2,
            "training_images_stored": False}


@app.get("/api/ready")
def ready():
    return JSONResponse({"status": service.status}, status_code=200 if service.status == "ready" else 503)


@app.get("/api/admin/feedback")
def feedback_stats(request: Request, synthetic: bool = False):
    require_admin(request)
    return feedback_store.stats(synthetic)


@app.post("/api/admin/feedback")
async def save_feedback(request: Request):
    require_admin(request)
    body = bytearray()
    try:
        async with asyncio.timeout(10):
            async for chunk in request.stream():
                if len(body) + len(chunk) > 12000:
                    raise HTTPException(413, "Geri bildirim çok büyük.")
                body.extend(chunk)
    except TimeoutError:
        raise HTTPException(408, "Geri bildirim yükleme süresi doldu.")
    try:
        payload = Feedback.model_validate_json(bytes(body))
        feedback_store.save(payload)
    except ValueError:
        raise HTTPException(422, "Yalnız izin verilen anonim araç alanı sonuçları kabul edilir.")
    return {"saved": True, "images_stored": False, "model_trained": False}


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
                  rectify: bool = False, auto_rotate: bool = True,
                  preprocessing: Literal["standard", "contrast"] = "standard",
                  review_threshold: float = Query(.90, ge=.5, le=1),
                  vin_threshold: float = Query(.95, ge=.5, le=1)):
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
        result = await run_in_threadpool(service.analyze, bytes(body), mode, rotation, rectify, auto_rotate, preprocessing)
        apply_thresholds(result, review_threshold, vin_threshold)
        result["request_id"] = str(uuid4())
        result["engine_version"] = __version__
        if SERVER_ORIGIN and "privacy" in result:
            result["privacy"]["processing"] = "server"
        return result
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


@app.post("/api/v1/ruhsat/tekrar", summary="Reread one vehicle field crop; no automatic replacement",
          openapi_extra={"requestBody": {"required": True, "content": {
              "image/png": {"schema": {"type": "string", "format": "binary"}},
              "image/jpeg": {"schema": {"type": "string", "format": "binary"}}}}})
async def retry_field(request: Request, field: str = Query(...)):
    if field not in VEHICLE_KEYS:
        raise HTTPException(422, "Yalnız izin verilen araç alanları yeniden okunabilir.")
    if service.status != "ready":
        raise HTTPException(503, "OCR motoru henüz hazır değil.")
    if not service.lock.acquire(blocking=False):
        raise HTTPException(429, "Bir fotoğraf işleniyor. İşlem bitince yeniden deneyin.")
    try:
        body = bytearray()
        async with asyncio.timeout(30):
            async for chunk in request.stream():
                if len(body) + len(chunk) > 4 * 1024 * 1024:
                    raise HTTPException(413, "Seçilen bölge en fazla 4 MB olabilir.")
                body.extend(chunk)
        if not body:
            raise HTTPException(400, "Bölge görüntüsü boş.")
        return await run_in_threadpool(reread, service, bytes(body), field)
    except ImageInputError as exc:
        raise HTTPException(422, str(exc))
    except TimeoutError:
        raise HTTPException(408, "Bölge yükleme süresi doldu.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, "Seçilen bölge okunamadı. Daha net bir bölge seçin.")
    finally:
        service.lock.release()


@app.get("/")
def home():
    html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
    if SERVER_ORIGIN:
        html = html.replace("YEREL PROTOTİP", "SUNUCU")
        html = html.replace("Bu bilgisayarda işlenir", "Kalıcı OCR sunucusu")
        html = html.replace("Harici servise gönderilmez.", "Kendi OCR sunucunuzda işlenir; ham fotoğraf kaydedilmez.")
        html = html.replace("Yerel işleme · Otomatik kayıt yok · Ototr bağlantısı henüz etkin değil", "Sunucuda işleme · Fotoğraflar kaydedilmez · Geri bildirim isteğe bağlı")
    if PUBLIC_ORIGIN:
        html = html.replace("YEREL PROTOTİP", "WEB TESTİ")
        html = html.replace("Bu bilgisayarda işlenir", "Girişsiz test erişimi" if PUBLIC_TEST else "E-posta ile korunan erişim")
        html = html.replace("Harici servise gönderilmez.",
                            "HTTPS / Cloudflare üzerinden kendi OCR bilgisayarınıza iletilir.")
        html = html.replace("Yerel işleme · Otomatik kayıt yok", "Bilgisayar açıkken erişilebilir · Otomatik kayıt yok")
    return HTMLResponse(html)


app.mount("/assets", StaticFiles(directory=ROOT / "web"), name="assets")
