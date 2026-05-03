# World Pulse — Backlog

**Updated:** 2026-05-03 | **Branch:** `claude/plan-world-pulse-mission-qoZIF`

This file is the project management companion to `CLAUDE.md`. It summarises current sprint focus, the critical path, epic status, and the full open issue inventory.

---

## Current Sprint Focus

1. **Merge CI fix** — `claude/plan-world-pulse-mission-qoZIF` contains the Node.js 24 action upgrades (#75). This must merge before any other branch can get a green CI check.
2. **Globe Track A** — Start #56 (earthTexture.ts refactor) immediately after CI merge. It is the prerequisite that unblocks all 7 remaining globe stories.
3. **Design system P0** — #59 (LoadingScreen), #48 (Typography) are cosmetically broken and affect the always-on display experience. Can parallel-track with globe foundation work.

---

## Critical Path

```
CI green (#75 merged)
  └─► Globe Track A
        #56 earthTexture refactor (no deps — START NOW)
        └─► #57 GeoJSON pipeline
              └─► #41 Coastlines rendering
                    └─► #42 Country boundaries
                    └─► #43 Ocean depth shading   ← Track B gate

  Globe Track B (after #56)
        #44 Fresnel atmospheric glow
        #45 Graticule grid overlay
        (#43 needs #41 first)

  Design system (parallel)
        #59 LoadingScreen → #48 Typography → #49 #50 #51 #53

  Degraded UX (parallel)
        #58 Socket reconnection → #63 Disconnect overlay → #34 #35 #36

  Reliability (parallel)
        #28 Collector health contract → #30 Regression coverage → #60 Event TTL

  Release readiness (after all above)
        #62 Event markers → #64 Electron CI → #66 release.yml → #37 #38 #39 Smoke/gate
```

---

## Epic Status

| Epic | Issue | Stories done | Stories open | Status |
|---|---|---|---|---|
| Phase 1 MVP (root) | #24 | ~10 | ~28 | In Progress |
| Stabilize server/collectors | #23 | 2 of 4 | 2 | In Progress |
| Signal curation/prioritization | #25 | 2 of 5 | 3 | In Progress |
| Globe visualization | #40 | 0 of 8 | 8 | Not started — blocked on #56 |
| Oblivion design system | #46 | 2 of 8 | 6 | In Progress (~25%) |
| Degraded-state UX | #26 | 1 of 6 | 5 | In Progress (~17%) |
| Desktop release readiness | #27 | 2 of 8 | 6 | In Progress (~25%) |

---

## Open Issues by Theme

### CI / DevOps
| # | Title | Priority | Status |
|---|---|---|---|
| #75 | Upgrade GitHub Actions to Node.js 24-compatible versions | P1 | Fix in branch — needs merge |

### Globe Visualization — Track A (Data)
| # | Title | Priority | Blocked by |
|---|---|---|---|
| #56 | Refactor earthTexture.ts into composable modules | P0 | — (start here) |
| #57 | GeoJSON coastline data pipeline | P0 | #56 |
| #41 | Replace simplified coastlines with high-fidelity GeoJSON | P0 | #56, #57 |
| #42 | Add country boundary rendering from GeoJSON | P0 | #41 |
| #62 | Event location markers on globe | P0 | — |

### Globe Visualization — Track B (Render)
| # | Title | Priority | Blocked by |
|---|---|---|---|
| #44 | Enhance atmospheric glow with multi-layer Fresnel shader | P1 | #56 |
| #45 | Add latitude/longitude graticule grid overlay | P2 | #56 |
| #43 | Add ocean depth shading and terrain elevation | P1 | #41 |

### Oblivion Design System
| # | Title | Priority | Status |
|---|---|---|---|
| #59 | Redesign LoadingScreen to Oblivion aesthetic | P0 | Ready |
| #48 | Apply Oblivion typography system across all UI | P0 | Ready |
| #49 | Refine Header/HUD to Oblivion cinematic aesthetic | P1 | Ready |
| #50 | Refine EventPanel with Oblivion data row styling | P1 | Ready |
| #51 | Refine Ticker with Oblivion marquee styling | P1 | Ready |
| #53 | Refine StatusBadge with Oblivion pulse animations | P1 | Ready |

### Degraded-State UX
| # | Title | Priority | Blocked by |
|---|---|---|---|
| #58 | Socket reconnection-exhaustion recovery | P0 | — |
| #63 | Non-destructive disconnect overlay | P0 | — |
| #34 | Deliver empty-state experience (no events) | P0 | — |
| #35 | Surface connection-loss and reconnect UX | P0 | — |
| #36 | Collector health treatments in dashboard shell | P0 | — |

### Reliability
| # | Title | Priority | Blocked by |
|---|---|---|---|
| #28 | Expose collector health contract and readiness metrics | P0 | — |
| #30 | Add API and socket integration regression coverage | P0 | — |
| #32 | Define featured-event and ticker prioritization rules | P0 | — |
| #33 | Add source quality and fallback configuration model | P0 | — |
| #60 | Event TTL and data freshness indicators | P0 | — |
| #64 | Add Electron build to CI pipeline | P1 | — |
| #66 | Fix release.yml Electron packaging workflow | P1 | — |
| #67 | Backend auto-restart on crash in Electron | P1 | — |

### Release Readiness
| # | Title | Priority | Blocked by |
|---|---|---|---|
| #37 | Add Electron smoke validation for MVP startup | P1 | #64 |
| #38 | Define MVP quality gate and release checklist | P1 | — |
| #39 | Validate dedicated-display performance and startup | P1 | — |

### Epics / Features (parent issues)
| # | Title | Priority |
|---|---|---|
| #24 | World Pulse Phase 1 MVP objectives and roadmap | P0 |
| #23 | Stabilize server and collectors | P0 |
| #25 | Improve signal curation and event prioritization | P0 |
| #40 | Realistic globe visualization with geographic fidelity | P0 |
| #46 | Oblivion design system polish across all UI components | P0 |
| #26 | Complete ambient dashboard degraded-state UX | P0 |
| #27 | Reach desktop MVP release readiness | P1 |

---

## Grading Targets

| Area | Current | Target |
|---|---|---|
| CI/CD health | F → **Fixing** | A — all pipelines green |
| Agent coordination | D → **Active** | A — lifecycle tracked, gates active |
| Knowledge layer | D → **Done** | A — 9 skills, 3 instructions, 4 templates |
| Globe fidelity | F | B+ — GeoJSON coastlines and markers |
| Oblivion UI | C | A — all HUD components complete |
| Degraded UX | D | A — all 6 stories done |
| Release readiness | C | A — smoke validation, packaging green |

---

## Backlog Hygiene Notes (2026-05-03)

**Closed this session:**
- #102, #103 — AgentX coordination wiring (done in commit `9d1a784`)
- #104–#112 — Knowledge layer skills (done in commit `a46ddb0`)

**Labels added this session:**
- `globe-data` → #56, #57, #41, #42
- `globe-render` → #43, #44, #45
- `theme:release` → #27, #37, #38, #39
- `theme:ci` → #75

**Branches with open work:**
- `feature/sprint2-batch3` — check for corresponding open issues
- `fix/pr78-ci-retrigger` — verify PR #78 is still relevant
