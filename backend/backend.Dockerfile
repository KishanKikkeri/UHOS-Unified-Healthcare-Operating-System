FROM python:3.11-slim

WORKDIR /app

# System deps for psycopg2-binary wheels / building if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
EXPOSE 8000

# Seed is run explicitly (not on every boot) via `docker compose exec` or a
# one-off `docker run ... python -m seed.demo_seed` so redeploys don't wipe
# demo data unexpectedly. Healthcheck hits the existing /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,os,sys; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\",8000)}/health').read()" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
