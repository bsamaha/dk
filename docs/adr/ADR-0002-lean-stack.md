# ADR-0002: Lean Single-Container Deployment Strategy

Date: 2025-07-10
Status: Accepted

## Context
The analytics service will initially run on a **single t3a.small Spot EC2** instance (2 vCPU, 2 GiB).  Requirements: sub-second UX, minimal cost, and ability to auto-recover from Spot termination.

## Decision
1. **One Docker container** bundles the FastAPI backend and serves the static React build via `StaticFiles`.
2. CI builds a multi-stage image (`python:3.12-slim`) and pushes to GitHub Container Registry.
3. A user-data script (or `deploy.sh`) on the instance pulls the latest tag and restarts the container with:
   ```bash
   docker run -d --name draft-analytics \
     --restart always -p 80:8000 \
     -e ENV=prod ghcr.io/org/dk:latest
   ```
4. The instance is placed in an Auto Scaling Group with *desired capacity = 1*; if the Spot is reclaimed, a replacement is spawned automatically.
5. HTTPS is terminated by an Amazon Certificate on a CloudFront distribution pointing at the instance’s public IP.

## Consequences
* **Cost-efficient** (< $8/month) and simple to operate.
* Zero external dependencies; state is derived from the parquet file bundled in the image.
* Horizontal scalability is limited; will need refactor (e.g., RDS + S3) if traffic exceeds ~50 RPS.

## Alternatives Considered
* **Fargate** – eliminates server management but 3-4× more expensive.
* **Fly.io** – great DX but strict egress limits; Spot EC2 offers predictable pricing.
* **Docker compose (FE + BE dev split)** – unnecessary complexity for prod; merged container keeps cold-start small.

## Links
* Dockerfile: `infra/Dockerfile`
* CI workflow: `.github/workflows/ci.yml`
* Deploy script: `scripts/deploy.sh`
