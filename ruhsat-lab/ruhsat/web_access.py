"""Explicit origin settings for an email-protected Cloudflare test tunnel.

This is origin validation, not authentication. The launcher must require
Cloudflare's --allowed-mail gate and keep uvicorn bound to loopback.
"""
from urllib.parse import urlsplit


def preview_origin(value: str) -> str:
    value = value.strip().rstrip("/")
    if not value:
        return ""
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or not parsed.hostname
            or not parsed.hostname.endswith(".trycloudflare.com")
            or parsed.username or parsed.password or parsed.port
            or parsed.path or parsed.query or parsed.fragment):
        raise ValueError("Web önizleme adresi geçerli bir HTTPS Quick Tunnel origin olmalı.")
    return value


def origin_allowed(origin: str | None, base_url: str, public_origin: str) -> bool:
    return not origin or origin == base_url.rstrip("/") or bool(public_origin and origin == public_origin)
