import io
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image
from app import app, service, MAX_BYTES
from ruhsat.engine import decode_image, ImageInputError
import pytest

client=TestClient(app,base_url="http://localhost")
HEADERS={"X-OTOTR-Client":"ruhsat-lab"}


def test_home_and_local_headers():
    r=client.get("/")
    assert r.status_code==200 and "no-store" in r.headers["cache-control"]
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]


def test_reject_other_hosts():
    assert client.get("/api/health",headers={"Host":"evil.example"}).status_code==400


def test_reject_cross_origin_and_missing_header():
    assert client.post("/api/v1/ruhsat/oku",content=b"x").status_code==403
    assert client.post("/api/v1/ruhsat/oku",content=b"x",headers={**HEADERS,"Origin":"https://evil.example"}).status_code==403


def test_reject_oversized_upload():
    with patch.object(service,"status","ready"):
        r=client.post("/api/v1/ruhsat/oku",content=b"abc",headers={**HEADERS,"Content-Length":str(MAX_BYTES+1)})
        assert r.status_code==413


def test_reject_empty_and_invalid_image():
    with patch.object(service,"status","ready"):
        assert client.post("/api/v1/ruhsat/oku",content=b"",headers=HEADERS).status_code==400
        assert client.post("/api/v1/ruhsat/oku",content=b"not an image",headers=HEADERS).status_code==422


def test_not_ready_and_concurrency():
    with patch.object(service,"status","loading"):
        assert client.post("/api/v1/ruhsat/oku",content=b"x",headers=HEADERS).status_code==503
    with patch.object(service,"status","ready"):
        service.lock.acquire()
        try:
            assert client.post("/api/v1/ruhsat/oku",content=b"x",headers=HEADERS).status_code==429
        finally:
            service.lock.release()


def test_reject_bad_rotation_and_mode():
    assert client.post("/api/v1/ruhsat/oku?rotation=45",content=b"x",headers=HEADERS).status_code==422
    assert client.post("/api/v1/ruhsat/oku?mode=unknown",content=b"x",headers=HEADERS).status_code==422


def test_accept_valid_rotation_query():
    with patch.object(service,"status","ready"),patch.object(service,"analyze",return_value={"ok":True}) as analyze:
        r=client.post("/api/v1/ruhsat/oku?rotation=90&mode=detailed&rectify=false&auto_rotate=true",content=b"image",headers=HEADERS)
        assert r.status_code==200 and r.json()["ok"] is True
        assert r.json()["request_id"] and r.json()["engine_version"] == "0.3.3"
        analyze.assert_called_once_with(b"image","detailed",90,False,True,"standard")


def test_decode_transparency_and_size_limits():
    image=Image.new("RGBA",(100,120),(0,0,0,0)); buf=io.BytesIO();image.save(buf,format="PNG")
    decoded,_=decode_image(buf.getvalue(),90)
    assert decoded.size==(120,100) and decoded.getpixel((0,0))==(255,255,255)
    with pytest.raises(ImageInputError):
        decode_image(b"<svg></svg>")


def test_transient_seller_response_is_not_cacheable():
    payload = {"analysed": {"Data": {"plate": "16TST123"}},
               "seller_suggestion": {"persistence": "memory_only", "fields": [
                   {"key": "owner_name", "value": "KURGUSAL AD"}]}}
    with patch.object(service, "status", "ready"), patch.object(service, "analyze", return_value=payload):
        response = client.post("/api/v1/ruhsat/oku", content=b"image", headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "owner_name" not in response.json()["analysed"]["Data"]


def test_web_preview_discloses_transport_and_preserves_csrf():
    origin = "https://example-test.trycloudflare.com"
    with patch("app.PUBLIC_ORIGIN", origin):
        home = client.get("/")
        assert "HTTPS / Cloudflare" in home.text
        assert "Harici servise gönderilmez." not in home.text
        assert "WEB TESTİ" in home.text
        assert client.get("/api/health").json()["local_only"] is False
        with patch.object(service, "status", "ready"), patch.object(service, "analyze", return_value={"ok": True}):
            assert client.post("/api/v1/ruhsat/oku", content=b"image", headers={**HEADERS, "Origin": origin}).status_code == 200
            assert client.post("/api/v1/ruhsat/oku", content=b"image", headers={**HEADERS, "Origin": origin + ".evil.example"}).status_code == 403


def test_public_test_requires_origin_and_limits_cpu_requests():
    import app as app_module
    app_module.recent_requests.clear()
    origin = "https://example-test.trycloudflare.com"
    with patch("app.PUBLIC_ORIGIN", origin), patch("app.PUBLIC_TEST", True):
        assert "Girişsiz test erişimi" in client.get("/").text
        assert client.get("/api/health").json()["access_mode"] == "public_test"
        assert client.post("/api/v1/ruhsat/oku", content=b"image", headers=HEADERS).status_code == 403
        assert client.post("/api/v1/ruhsat/oku", content=b"image", headers={**HEADERS,"Origin":"https://evil.example"}).status_code == 403
        with patch.object(service,"status","ready"), patch.object(service,"analyze",return_value={"ok":True}):
            for _ in range(10):
                r=client.post("/api/v1/ruhsat/oku",content=b"image",headers={**HEADERS,"Origin":"https://samivolkan.github.io"})
                assert r.status_code == 200
            r=client.post("/api/v1/ruhsat/oku",content=b"image",headers={**HEADERS,"Origin":origin})
            assert r.status_code == 429 and r.headers["retry-after"] == "60"
    app_module.recent_requests.clear()
