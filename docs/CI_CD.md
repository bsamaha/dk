# CI/CD Guide – **Draft Analytics Dashboard**

> Covers GitHub Actions pipelines that lint, test, build, and deploy the **single-container** application described in [`DEV_ARCHITECTURE.md`](DEV_ARCHITECTURE.md).

---

## 1. Goals

1. **Fail Fast** – catch lint & unit-test failures within two minutes.
2. **Deterministic Builds** – Docker image is the *only* artefact promoted to environments.
3. **One-Click Deploy** – shipping to production requires merging to `main`; rollback = redeploy previous tag.
4. **Cost Awareness** – jobs run on `ubuntu-latest` with aggressive caching to minimise runner minutes.

---

## 2. Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/ci.yml` | `pull_request`, `push` to feature branches | Lint + unit tests + type-check + build artefacts (no push) |
| `.github/workflows/release.yml` | `push` to `main` *or* Git tag `v*` | Build multi-stage Docker image → push to GHCR → deploy via `deploy.sh` |
| `.github/workflows/manual-deploy.yml` | `workflow_dispatch` | Run deploy job with selected image tag (rollback) |

> **Why separate?** CI runs on every PR; Release only on merge to `main` to avoid wasting build minutes.

---

## 3. `ci.yml` (Quality Gate)

```yaml
name: CI
on:
  pull_request:
  push:
    branches-ignore: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      - run: pip install -r backend/requirements.txt
      - run: ruff check backend && black --check backend
      - run: pytest -q

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: {version: 8}
      - uses: actions/setup-node@v4
        with: {node-version: 20, cache: 'pnpm'}
      - run: cd frontend && pnpm i --frozen-lockfile && pnpm lint && pnpm test --run

  types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12'}
      - run: pip install mypy
      - run: mypy backend/app || true  # warnings only for now

  # Require all jobs
  status:
    runs-on: ubuntu-latest
    needs: [backend, frontend, types]
    steps:
      - run: echo "CI successful"
```

### Key Points

* **Caching** – `actions/setup-python` & Node caches speed up installs.
* **Parallelism** – backend & frontend jobs run in parallel; status job gates PR.
* **Fail-fast** – first error aborts remaining steps (default).

---

## 4. `release.yml` (Build & Deploy)

```yaml
name: Release
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      tag:
        description: 'Image tag to deploy'
        required: false
jobs:
  build-image:
    runs-on: ubuntu-latest
    permissions: {packages: write}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3  # multi-arch optional
      - uses: docker/setup-buildx-action@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build & push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: infra/Dockerfile
          push: true
          tags: 311352839382.dkr.ecr.us-east-2.amazonaws.com/bestball:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-ec2:
    runs-on: ubuntu-latest
    needs: build-image
    environment: production
    steps:
      - name: SSH & deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            docker pull 311352839382.dkr.ecr.us-east-2.amazonaws.com/bestball:${{ github.sha }}
            ./scripts/deploy.sh 311352839382.dkr.ecr.us-east-2.amazonaws.com/bestball:${{ github.sha }}
```

### Highlights

* **Multi-Stage Dockerfile** – first stage installs Python/Node deps, second stage is slim runtime.
* **Image Tagging** – SHA tag for immutability (`bestball:${{ github.sha }}`) ; optionally `latest` or SemVer tags on releases.
* **Cache-to/from – GHA registry speeds up subsequent builds by ~60 % (does not affect ECR).
* **Deploy Script** – idempotent: pulls tag, stops old container, starts new with `--restart=always`.

---

## 5. Secrets & Variables

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM creds with `AmazonEC2ContainerRegistryFullAccess` |
| `AWS_REGION` | `us-east-2` |
| `ECR_REGISTRY` | `311352839382.dkr.ecr.us-east-2.amazonaws.com` |
| `ECR_REPOSITORY` | `bestball` |
| `EC2_HOST` | Public IP / DNS of Spot instance |
| `EC2_SSH_KEY` | Private key for passwordless SSH |
| `ENV` | `prod` passed as container env var |

---

## 6. Local Pre-Flight (`make ci`)

```bash
make ci  # ruff → black --check → pytest → frontend lint+test
```

Mirrors the CI steps so developers catch failures before pushing.

---

## 7. Rollback Procedure

1. Open **Actions → Manual Deploy** workflow.
2. Enter previously-known image tag (list via `docker images` on EC2).
3. Workflow will call `deploy.sh tag` which restarts container with that tag.

---

## 8. Future Enhancements

* **Smoke Tests** – small Playwright job that hits `/health` & key pages after deploy.
* **Snyk Scan** – add dependency vulnerability check.
* **Concurrency Guards** – `concurrency: group: deploy cancel-in-progress: true` to avoid overlapping deploys.
* **Canary Deploy** – run new container on port 9000, run smoke tests, then switch Nginx.

---

Last updated: 2025-07-12
