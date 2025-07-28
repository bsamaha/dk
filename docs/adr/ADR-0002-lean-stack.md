# ADR-0002: Lean Single-Host Deployment

Date: 2025-07-15 (updated)
Status: Accepted

## Context

The primary business goal is to keep operational costs to an absolute minimum. The application must run on a single, low-cost EC2 Spot instance. This requires a minimal resource footprint and zero external dependencies (e.g., no managed Redis, RDS, or ElasticSearch).

The original architecture specified a single Docker container with HTTPS terminated by a managed load balancer (e.g., AWS CloudFront). This has been revised to further reduce costs and complexity by managing TLS on the host itself.

## Decision

1. The entire application will be deployed on a **single host** using a `docker-compose.yml` orchestrating multiple containers.
2. The core stack consists of an `app` container (FastAPI + React build) and an `nginx` container that acts as a reverse proxy.
3. The FastAPI `app` container serves both the API and the static frontend assets.
4. All data is loaded into memory from a local Parquet file at startup. State is ephemeral.
5. External services (e.g., databases, caches) are disallowed.
6. HTTPS is terminated by the `nginx` container using free certificates from **Let's Encrypt**. A `certbot` service profile in Docker Compose manages certificate issuance and renewal. This approach eliminates the need for managed load balancers.

## Consequences

* **Positive**:
  * Zero cost for HTTPS/TLS termination.
  * The entire stack is defined declaratively in `docker-compose.yml`.
  * Maintains the core principle of a lean, low-cost, single-instance deployment.
* **Neutral**:
  * Slightly more complex than a single-container build, but standard for modern web apps.
  * Requires managing certificate renewal (automated via cron and Docker Compose profiles).

## Alternatives Considered

* **Single Container + CloudFront (Original model)**: Simpler container setup but introduces a dependency on a managed AWS service with associated costs.
* **Managed PaaS (e.g., Heroku, Render)**: Higher cost and less control over the underlying infrastructure.

## References

* `docker-compose.yml`: Defines the `app`, `nginx`, and `certbot` services.
* `nginx.conf`: Nginx configuration for reverse proxy and TLS.
* `docs/HTTPS_SETUP.md`: Detailed guide for setting up Let's Encrypt.
