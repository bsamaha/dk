# ---------- Stage 1: build React frontend ----------
FROM node:20-alpine AS ui-builder

# Set workdir to frontend source
WORKDIR /src/frontend

# Install dependencies first (better layer caching)
COPY frontend/package.json ./
RUN npm install --silent

# Copy the rest of the frontend source and build
COPY frontend .
RUN npm run build

# ---------- Stage 2: production image ----------
FROM python:3.11-slim AS runtime

# Install system packages needed by duckdb & friends
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend requirements & install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend ./backend

# Copy built frontend assets from ui-builder stage into backend/app/frontend_dist.
# FastAPI StaticFiles will serve this directory (see backend/app/main.py)
COPY --from=ui-builder /src/frontend/dist ./backend/app/frontend_dist

# (Optional) Copy data directory at build time; can also be mounted at runtime.
COPY data ./data

# Expose API port
EXPOSE 8000

# Default command runs the API server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
