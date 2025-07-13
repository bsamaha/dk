# Draft Analytics – **Master Documentation Index**

> *Audience: Human developers **and** AI coding assistants*
>
> This file is the **single entry-point** to all engineering knowledge for the Fantasy Football Draft Analytics Dashboard.  Every other markdown document is referenced here so automated tooling (e.g., AI assistants) can quickly locate deeper context without crawling the entire repo.

---
## 0. Quick Links
| Area | Doc | Purpose |
|------|-----|---------|
| Architectural Decision | [`adr/ADR-0002-lean-stack.md`](adr/ADR-0002-lean-stack.md) | Lean single-container deployment principle |
| Architecture & Engineering Guide | [`DEV_ARCHITECTURE.md`](DEV_ARCHITECTURE.md) | Comprehensive deep dive, endpoint matrix, deployment details |

| API Overview | [`api/README.md`](api/README.md) | Package-level summary of **15** FastAPI routes |
| Models Overview | [`models/README.md`](models/README.md) | Data contracts & schema conventions |
| Services Overview | [`services/README.md`](services/README.md) | Business-logic services & extension workflow |

---
## 1. Table of Contents
1. [System Purpose](#1-system-purpose)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Document Map](#3-document-map)
4. [Developer Onboarding](#4-developer-onboarding)
5. [AI Assistant Tips](#5-ai-assistant-tips)

---
## 1. System Purpose
Provide lightning-fast analytics for fantasy-football drafts from a 12 MB parquet data set while running in a **single Docker container** (see ADR-0002).  Users explore players, positions, combinations, and advanced analytics via a modern React UI backed by a typed FastAPI service.

---
## 2. High-Level Architecture (snapshot)
```mermaid
flowchart LR
    subgraph Front-End (Vite 5173)
        A[React Components] -->|TanStack Query| B(Api Layer)
    end
    subgraph Back-End (FastAPI 8000)
        C[Routers] --> D[Services Layer]\n(data_service / analytics_service)
        D --> E[DuckDB / Polars]
    end
    B -- REST/JSON --> C
    E -- parquet --> F[data/bestball.parquet]
```
*Entire stack ships as **one container**; CloudFront terminates TLS and routes to port 80 → 8000 inside the EC2 Spot instance.*

---
## 3. Document Map
> Follow the links to drill down from coarse → fine granularity.

```text
README.md (this file)
 ├─ ADRs/
 │   └─ ADR-0002-lean-stack.md           # Deployment principle
 ├─ DEV_ARCHITECTURE.md                  # Deep dive, request flows, component trees

 ├─ api/
 │   ├─ README.md                        # Summary & backlog table
 │   ├─ <module>.md (5 files)            # metadata.md, players.md, ...
 ├─ models/
 │   ├─ README.md                        # Schema groups & conventions
 │   └─ schemas.md                       # Field-level docs
 └─ services/
     ├─ README.md                        # Service catalogue & patterns
     ├─ duckdb_service.md
     ├─ data_service.md
     └─ analytics_service.md
```

---
## 4. Developer Onboarding (1-minute version)
1. **Clone & Run** – `make dev` → http://localhost:5173 & http://localhost:8000
2. **Read** – Skim [`DEV_ARCHITECTURE.md`](DEV_ARCHITECTURE.md) for architecture, endpoint matrix, and stack cheat-sheet.
3. **Deep Dive** – Jump to package README of the area you plan to edit (`api`, `models`, `services`).
4. **Lean Principle** – Any proposal that adds *external infra* must answer ADR-0002 constraints.
5. **Contribute** – Create a branch → PR; CI runs lint + tests + docs build.

---
## 5. AI Assistant Tips
* Prefer **relative links** above to fetch detailed docs quickly.
* When you need request/response shapes, open [`models/schemas.md`](models/schemas.md) instead of scraping code.
* For query logic performance tweaks, inspect [`services/analytics_service.md`](services/analytics_service.md).
* ADR-0002 is the *north star*—avoid suggesting Redis, Prometheus, or multi-service deployments unless refactor is explicitly underway.

---
*Last updated: 2025-07-12*
