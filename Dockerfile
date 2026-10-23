# ATLAS image: the same single FastAPI process as `npm run atlas`, serving the
# API and the built frontend, with bundled data and checkpoints baked in.
#
#   docker build -t atlas .
#   docker run --rm -p 127.0.0.1:8000:8000 atlas
#
# There is no authentication. Publish to 127.0.0.1 only, never to all interfaces.

# Stage 1: build the production frontend (tsc + vite, as in `npm run build`).
FROM node:22-bookworm-slim AS frontend
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY scripts/map-assets.mjs scripts/
COPY frontend frontend
RUN npm run build

# Stage 2: slim Python runtime with the pinned lock file.
FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    ATLAS_PORT=8000
WORKDIR /app

# CPU-only PyTorch wheel at the locked version, then everything else from the lock.
COPY requirements-lock.txt ./
RUN torch_version="$(sed -n 's/^torch==//p' requirements-lock.txt)" \
 && pip install --no-deps --index-url https://download.pytorch.org/whl/cpu "torch==${torch_version}" \
 && pip install -r requirements-lock.txt \
 && pip check

# Source, bundled data/checkpoints (as tracked in Git and shipped in the release), built UI.
COPY backend backend
COPY data data
COPY scripts/check_release.py scripts/
COPY frontend/public/data frontend/public/data
COPY --from=frontend /app/dist dist

# Release integrity gate at build time: source hashes and real PyTorch checkpoint replay.
RUN python scripts/check_release.py \
 && useradd --system --uid 10001 --home-dir /app --shell /usr/sbin/nologin atlas \
 && chown -R atlas /app/data
USER atlas

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import os, urllib.request as u; u.urlopen('http://127.0.0.1:%s/api/ready' % os.environ.get('ATLAS_PORT', '8000'), timeout=4)"

# Like `npm run atlas`: verify artifacts, then serve. Inside the container the
# server must listen on 0.0.0.0 so Docker can forward the loopback-published port.
CMD ["sh", "-c", "python scripts/check_release.py && exec python -m uvicorn atlas.api:app --app-dir backend --host 0.0.0.0 --port \"$ATLAS_PORT\""]
