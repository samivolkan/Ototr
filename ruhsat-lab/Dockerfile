FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    OTOTR_MODEL_DIR=/app/models OTOTR_DATA_DIR=/app/runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements-lock.txt setup_models.py ./
RUN pip install -r requirements-lock.txt && python setup_models.py
COPY app.py ./
COPY ruhsat/ ./ruhsat/
COPY web/ ./web/
RUN useradd --uid 10001 --create-home ocr \
    && mkdir -p /app/runtime && chown ocr:ocr /app/runtime && chmod 700 /app/runtime
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/ready', timeout=4)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log", "--no-proxy-headers"]
