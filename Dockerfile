# TaxSathi AI — Production Backend Dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# ─── Production Runner Stage ─────────────────────────────────
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/root/.local/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY backend/ backend/
COPY scripts/ scripts/

WORKDIR /app/backend

# Ensure storage directories exist
RUN mkdir -p data/uploads data/chromadb

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Production server execution (bind to $PORT dynamically for Render)
CMD ["sh", "-c", "alembic upgrade head && (python ../scripts/ingest.py || true) && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
