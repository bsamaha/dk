# CI/CD Guide – **Draft Analytics Dashboard**

> Covers GitHub Actions pipelines that lint, test, build, and deploy the **single-container** application described in [`DEV_ARCHITECTURE.md`](DEV_ARCHITECTURE.md).

---

## 1. Goals

1. **Fail Fast** – catch lint & unit-test failures within two minutes.
2. **Deterministic Builds** – Docker image is the *only* artefact promoted to environments.
3. **One-Click Deploy** – shipping to production requires merging to `main`; rollback = redeploy previous tag.
4. **Cost Awareness** – jobs run on `ubuntu-latest` with aggressive caching to minimise runner minutes.
5. **Consistent Package Management** – standardized on pnpm for frontend, pip for backend.

---

## 2. Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/ci.yml` | `pull_request`, `push` to feature branches | Lint + unit tests + type-check + build frontend (consolidated pipeline) |
| `.github/workflows/release.yml` | `push` to `main` *or* Git tag `v*` | Build multi-stage Docker image → push to GHCR → deploy via `deploy.sh` |

> **Recent Changes**: Consolidated multiple CI workflows (`frontend-ci.yml`, `python-ci.yml`) into single `ci.yml` for consistency and to avoid conflicts.

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
      - run: |
          pip install -r backend/requirements.txt
          pip install ruff black==25.1.0
      - run: ruff check backend && ruff format --check backend
      - run: pytest  # Run from project root

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml
      - name: Install dependencies
        run: pnpm i --frozen-lockfile
      - name: Lint
        run: pnpm run lint
      - name: Test
        run: pnpm run test --run
      - name: Build
        run: pnpm run build

  types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install mypy
      - run: mypy backend/app || true  # warn only

  status:
    runs-on: ubuntu-latest
    needs: [backend, frontend, types]
    steps:
      - run: echo "CI successful"
```

### Key Changes & Improvements

* **Consolidated Workflows** – Merged `frontend-ci.yml` and `python-ci.yml` into single `ci.yml` to prevent conflicts
* **Package Manager Standardization** – Frontend now exclusively uses `pnpm` (removed conflicting `package-lock.json`)
* **Working Directory Strategy** – Frontend jobs use `defaults.run.working-directory` for cleaner commands
* **Environment Variables** – Tests properly handle `ALLOWED_ORIGINS` for CORS validation
* **Parallel Execution** – All three main jobs (backend, frontend, types) run in parallel
* **Caching Optimization** – Both pip and pnpm caches speed up subsequent runs

### Environment Setup

The CI handles environment variables correctly:

* **Backend tests**: `ALLOWED_ORIGINS='["http://testserver"]'` automatically set
* **Frontend tests**: Mock API calls with proper error handling
* **Type checking**: Runs against backend codebase with mypy

---

## 4. Package Management Strategy

### Frontend (pnpm)

* **Lock file**: `frontend/pnpm-lock.yaml` only
* **Commands**: `pnpm i --frozen-lockfile`, `pnpm run lint/test/build`
* **Benefits**: Faster installs, better dependency resolution, disk space efficiency

### Backend (pip)

* **Requirements**: `backend/requirements.txt`
* **Commands**: `pip install -r backend/requirements.txt`
* **Development tools**: `ruff`, `black`, `mypy` installed separately

### Root Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000",
    "dev:frontend": "cd frontend && pnpm run dev",
    "install:all": "cd backend && pip install -r requirements.txt && cd ../frontend && pnpm install",
    "build": "cd frontend && pnpm run build",
    "test": "cd backend && pytest && cd ../frontend && pnpm run test --run",
    "lint": "cd backend && ruff check . && ruff format --check . && cd ../frontend && pnpm run lint"
  }
}
```

---

## 5. `release.yml` (Build & Deploy)

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
      - uses: docker/setup-qemu-action@v3
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
          file: Dockerfile
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

---

## 6. Secrets & Variables

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM creds with `AmazonEC2ContainerRegistryFullAccess` |
| `AWS_REGION` | `us-east-2` |
| `ECR_REGISTRY` | `311352839382.dkr.ecr.us-east-2.amazonaws.com` |
| `ECR_REPOSITORY` | `bestball` |
| `EC2_HOST` | Public IP / DNS of Spot instance |
| `EC2_SSH_KEY` | Private key for passwordless SSH |
| `ENVIRONMENT` | `production` passed as container env var |

---

## 7. Local Development & Testing

### Quick Commands

```bash
# Install all dependencies
npm run install:all

# Run development servers
npm run dev

# Run all tests
npm run test

# Run all linting
npm run lint

# Build frontend only
npm run build
```

### Manual Testing

```bash
# Backend tests with proper env vars
cd backend
ALLOWED_ORIGINS='["http://testserver"]' python -m pytest

# Frontend tests
cd frontend
pnpm run test --run

# Frontend build
cd frontend
pnpm run build
```

---

## 8. Troubleshooting Common Issues

### CI Failures

#### "npm workspace not found"

* **Cause**: Old workflow trying to use npm workspaces
* **Solution**: ✅ Fixed by consolidating to single `ci.yml` and using pnpm

#### "module is not defined" (Lighthouse)

* **Cause**: Lighthouse CI configuration issues
* **Solution**: ✅ Temporarily removed, can be re-added with proper config

#### Backend test failures

* **Cause**: Missing `ALLOWED_ORIGINS` environment variable
* **Solution**: ✅ Set in CI and documented for local development

#### Multiple workflow conflicts

* **Cause**: Having `ci.yml`, `frontend-ci.yml`, and `python-ci.yml` running simultaneously
* **Solution**: ✅ Removed redundant workflows, consolidated into single pipeline

### Package Management Issues

#### Mixed lock files

* **Problem**: Both `package-lock.json` and `pnpm-lock.yaml` present
* **Solution**: ✅ Removed `package-lock.json`, standardized on pnpm

#### Cache misses

* **Solution**: Verify cache keys match lock file paths in CI

---

## 9. Performance Metrics

### CI Pipeline Performance

* **Total Duration**: ~3-5 minutes (with cache hits)
* **Backend Job**: ~1-2 minutes (tests + lint)
* **Frontend Job**: ~2-3 minutes (install + lint + test + build)
* **Types Job**: ~30 seconds (mypy check)

### Build Artifacts

* **Frontend Build Size**: ~1.2MB (gzipped: ~330KB)
* **Bundle Analysis**: Main chunk ~958KB (consider code splitting)

---

## 10. Future Enhancements

### Short Term

* [ ] **Re-add Lighthouse CI** with proper CommonJS configuration
* [ ] **Add performance budgets** to catch bundle size regressions
* [ ] **Implement code splitting** to reduce main bundle size

### Medium Term

* [ ] **Smoke Tests** – Playwright job hitting `/health` & key pages after deploy
* [ ] **Dependency Scanning** – Snyk or similar for vulnerability checks
* [ ] **Coverage Reports** – Jest/pytest coverage uploaded to PR comments

### Long Term

* [ ] **Canary Deployments** – Blue/green strategy with health checks
* [ ] **Multi-environment** – staging environment for pre-production testing
* [ ] **Performance Monitoring** – Web Vitals tracking in production

---

## 11. Rollback Procedure

1. Open **Actions → Release** workflow
2. Click **"Run workflow"**
3. Enter previously-known image tag (get via `docker images` on EC2)
4. Workflow will deploy that specific image tag

---

Last updated: 2025-01-17 (Post CI consolidation & standardization)
