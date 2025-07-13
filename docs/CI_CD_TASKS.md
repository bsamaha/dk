# CI/CD Implementation Task List
*Derived from [`CI_CD.md`](CI_CD.md)*

> **Owner:** single engineer  
> **Goal:** Ship a working, lightweight pipeline that gates PRs with tests and automatically deploys the merged image to our EC2 Spot instance.

---
## Sequential Tasks

1. **Bootstrap Pre-commit Hooks**
   - [ ] Install `pre-commit` locally (`pip install pre-commit`).
   - [ ] Add `.pre-commit-config.yaml` with hooks: `ruff`, `black`, `isort`, `eslint`, `pnpm lint`, `sort-package-json`.
   - [ ] Run `pre-commit install` so hooks fire before each commit.

2. **Create `ci.yml` (Quality Gate)**
   - [ ] Add workflow under `.github/workflows/ci.yml` exactly as specified (backend → frontend → types → status jobs).
   - [ ] Confirm caching blocks (`pip`, `pnpm`) are present to keep costs down.
   - [ ] Push test PR; verify all jobs pass in <2 min.

3. **Prepare Docker Build Context**
   - [ ] Ensure `infra/Dockerfile` is multi-stage (deps → slim). Size target: ≤110 MB.
   - [ ] `docker build . -f infra/Dockerfile` locally to validate.

4. **Implement `release.yml` (Build & Deploy)**
   - [ ] Create `.github/workflows/release.yml` using template from doc.
   - [ ] Add secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (ECR push), `AWS_REGION=us-east-2`.
   - [ ] Add `EC2_HOST` and `EC2_SSH_KEY` secrets.
   - [ ] Ensure `deploy-ec2` job logs into ECR and runs `scripts/deploy.sh` with pulled tag (`311352839382.dkr.ecr.us-east-2.amazonaws.com/bestball:$SHA`).

5. **Write `scripts/deploy.sh` on Repo + EC2**
   - [ ] Script accepts image tag arg, pulls, `docker stop && rm` old container, then runs new with `--restart=always`.
   - [ ] Copy script to `/home/ec2-user/app/scripts/` on instance and chmod +x.

6. **Smoke-Test Manual Deploy**
   - [ ] Trigger **Manual Deploy** workflow (`workflow_dispatch`) with current SHA.
   - [ ] SSH into instance → `docker ps` to confirm new container.
   - [ ] Hit `https://<domain>/health` – expect `{"status":"ok"}`.

7. **Wire Release to `main` Branch**
   - [ ] Merge PR into `main`; observe SHA-tagged image should appear in ECR; observe `Release` workflow auto-builds image and rolls instance.
   - [ ] Confirm site is live and version string (`/health?verbose=1`) matches SHA.

8. **Cleanup**
   - [ ] Delete old `ENGINEERING.md` or move to `docs/archive/`.
   - [ ] Update `docs/README.md` “Document Map” line 54 to drop that file (if not already).
   - [ ] Commit & push.

---
## Done Criteria
- CI passes for every PR with <3 min runtime.
- Merging to `main` builds image, pushes to GHCR, deploys to EC2 automatically.
- Rollback possible via Manual Deploy workflow.
- Pre-commit hooks prevent lint/format errors from reaching CI.

*Last updated: 2025-07-12*
