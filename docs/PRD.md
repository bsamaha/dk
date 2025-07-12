# Fantasy Football Draft Analytics Dashboard – Product Requirements Document (PRD) v2

## 1. Purpose
Provide fantasy-football enthusiasts and analysts with fast, data-driven insights into Best-Ball draft behaviour so they can make smarter roster decisions.

## 2. Target Users
* Serious Best-Ball drafters tracking ADP trends
* Analysts / content creators producing draft-strategy content
* Internal data-science team validating predictive models

## 3. Goals & Success Metrics
| Goal | Success Metric |
|------|---------------|
| Fast, visual exploration of 600 k+ pick records | Initial page < **1.5 s** on desktop |
| Surface actionable insights (ADP dispersion, roster construction) | ≥ **80 %** of beta users cite “actionable” in survey |
| Enable multi-player synergy search | End-to-end query < **2 s** for ≤ 4 players |
| Zero unhandled UI exceptions in production | Sentry shows < **0.1** errors / 100 sessions |

## 4. Current Feature Set
| ID | Feature | User Flow | Data Source / API |
|----|---------|-----------|--------------------|
| F-1 | Overview Dashboard | Land on `/` → view total drafts, teams, picks + high-level charts | `GET /api/metadata/` |
| F-2 | Players List & Filters | `/players` → position filter, free-text search, multi-select autocomplete, sortable columns, pagination | `GET /api/players/`, `GET /api/players/search` |
| F-3 | Player Detail | Click player row → collapsible panel shows stats grid + dynamic-bucket histogram | `GET /api/players/details` |
| F-4 | Positions Analysis | `/positions` → stats by position, first-player pick stats, round-counts chart | `GET /api/positions/stats`, `GET /api/positions/stats/first_player`, `GET /api/positions/stats/{pos}/by_round` |
| F-5 | Roster Construction | `/positions` tab → table of counts per team; aggregate counts view | `GET /api/positions/roster-construction`, `GET /api/positions/roster-construction/counts` |
| F-6 | Combinations Search | `/combinations` → choose 2-4 players + N rounds → returns matching teams | `GET /api/combinations/` |
| F-7 | Draft-wide Roster Construction | `/combinations` second card | `GET /api/combinations/roster-construction/` |
| F-8 | Responsive UI & Error Handling | Works down to 375 px; loading skeletons; retry logic; user-friendly errors | Front-end only |
| F-DSC | Draft Slot Correlation | `/analytics` → choose "Draft Slot" tab → set slot, metric, top-N → view bar chart + table | `GET /api/analytics/draft-slot` |

## 4.1 Feature Detail — Draft Slot Correlation (F-DSC)
### User Story
As a competitive drafter, I want to know which players historically correlate with **draft slot X** so that I can maximise advance-rate upside when drafting from that position.

### Flow (UI)
1. Navigate to **Analytics** in header.
2. Land on **Draft Slot** tab.
3. Input desired **Draft Slot** (1–12).
4. Toggle **Metric** (Count | % Slot | % Overall).
5. Adjust **Top-N** selector (10-50).
6. Observe bar chart + sortable table; refine inputs as needed.

### Acceptance Criteria
| ID | Given | When | Then |
|----|-------|------|------|
| AC-DSC-1 | Valid slot 1–12 | Load tab | Data fetch completes < 600 ms 95-th pct |
| AC-DSC-2 | Metric toggled | User clicks another metric | Chart & table update without full page reload |
| AC-DSC-3 | No data (edge) | Backend returns [] | UI shows "No players meet criteria" message |
| AC-DSC-4 | Keyboard only | Tab through controls | All inputs reachable & `aria-label` present |
| AC-DSC-5 | Error 5xx | Backend fails | Error Alert with retry button appears |

## 5. Functional Requirements (excerpt)
| Req ID | Description | Priority |
|--------|-------------|----------|
| FR-1 | User can filter player list by multiple positions simultaneously | P0 |
| FR-2 | Search field accepts partial surnames ("Dobbins") | P0 |
| FR-3 | Player histogram uses dynamic bucket sizing (1–24 picks) | P1 |
| FR-4 | Combination search limited to ≤ 4 players & rounds 1-20 | P1 |
| FR-5 | API must respond ≤ 400 ms for list endpoints (95-th pct) | P1 |
| FR-6 | Front-end must show retry w/ back-off on 5xx up to 3 tries | P2 |

## 6. Non-Functional Requirements
| Area | Requirement |
|------|-------------|
| Performance | Backend loads 12 MB parquet into memory once; subsequent queries complete < 50 ms |
| Reliability | 99.5 % uptime; graceful 500 handler returns JSON `{detail: …}` |
| Security | CORS restricted to known origins; no PII stored |
| Accessibility | Colour contrast ≥ 4.5 : 1; keyboard-navigable dropdowns |
| Maintainability | 80 %+ TypeScript coverage; black/ruff & eslint/prettier CI gates |

## 7. Known Gaps / Backlog for v2
* Team-level win-rate overlay
* User authentication & saved “watch lists”
* Real-time draft room assistant (WebSocket)
* CI/CD pipeline to staging (Netlify FE + Fly.io backend)

## 8. Proposed vNext (v2) Feature Set – Data-Science Powered
| ID | Feature | User Value | DS Method | New API |
|----|---------|-----------|-----------|---------|
| F-9 | Draft Pick Volatility | Identify risky vs stable picks using std-dev & IQR of draft position | DuckDB `stddev` + percentile | `GET /api/players/volatility` |
| F-10 | Positional Run Detector | Visual cues of positional "runs" to plan picks | Window funcs over pick order | `GET /api/positions/runs` |
| F-11 | Team Stack Frequency | Surface popular QB-WR/TE stacks for upside correlation | Self-join within draft_id | `GET /api/combinations/stacks` |
| F-12 | Roster Construction Heatmap | Heatmap of positions drafted per round bucket | Pivot round×position counts | `GET /api/positions/heatmap` |
| F-13 | ADP Trend Tracker | Track ADP movement over season/draft chronology | Rolling avg by draft index | `GET /api/players/adp_trend` |

### 8.1 Data Requirements
Current parquet already holds draft_id, pick, player, position, team, round. No extra fields needed; draft_id order serves as time proxy.

### 8.2 Success Signals
* ≥ 70 % beta users try at least one new analytic card.
* Average session length increases by 20 %.

---
*Document updated on 2025-07-10 15:56 CT to incorporate vNext data-science feature proposals.*
