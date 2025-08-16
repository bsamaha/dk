# ---------- Stage 1: build React frontend ----------
FROM node:20-alpine AS ui-builder

# Install pnpm globally
RUN npm install -g pnpm

# Set workdir to frontend source
WORKDIR /src/frontend

# Install dependencies first (better layer caching)
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend source and build
COPY frontend .

# Pass environment variables during build
ARG VITE_GA_TRACKING_ID
ARG VITE_YT_CHANNEL_ID
ARG VITE_YT_UPLOADS_PLAYLIST_ID
ENV VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID
ENV VITE_YT_CHANNEL_ID=$VITE_YT_CHANNEL_ID
ENV VITE_YT_UPLOADS_PLAYLIST_ID=$VITE_YT_UPLOADS_PLAYLIST_ID

RUN pnpm run build

# ---------- Stage 2: production image ----------
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS runtime
ENV UV_LINK_MODE=copy

# Install system packages needed by duckdb & friends
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend requirements & install with uv
COPY backend/requirements.txt ./backend/requirements.txt
RUN uv pip install --system --no-cache -r backend/requirements.txt

# Copy backend source
COPY backend ./backend

# Copy built frontend assets from ui-builder stage into backend/app/frontend_dist.
# FastAPI StaticFiles will serve this directory (see backend/app/main.py)
COPY --from=ui-builder /src/frontend/dist ./backend/app/frontend_dist

# (Optional) Copy data directory at build time; can also be mounted at runtime.
COPY data ./data

# Expose API port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://127.0.0.1:8000/health || exit 1

# Create non-root user and adjust permissions
RUN adduser --disabled-password --gecos "appuser" appuser \
    && chown -R appuser:appuser /app
USER appuser

# Default command runs the API server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
