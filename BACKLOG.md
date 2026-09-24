# World Pulse — Backlog

**Updated:** 2026-09-24 | **Branch:** `claude/backlog-refinement-design-s9thab`

This file is the project management companion to `CLAUDE.md`. It summarizes
current backlog state, what's shipped, and the concrete gaps found during this
refinement pass.

---

## Current State: No Open Backlog

A full review of the tracker (121 issues, all states) and open PRs found
**zero open issues**. Every epic, feature, story, and bug currently tracked is
closed. There is nothing to prioritize or triage in the traditional sense —
the actionable work right now is housekeeping (below), not feature delivery.

This file previously (as of 2026-05-03) tracked a Phase 1 MVP sprint that has
long since shipped; that content is superseded and removed rather than kept
as dead weight. `CLAUDE.md`'s "Project Status" table is the current source of
truth for what shipped.

---

## Epics Shipped (all closed)

| Epic | Issue | Notes |
|---|---|---|
| Phase 1 MVP | #24 | Backend, collectors, globe, Oblivion v1 |
| Globe visualization | #40 | Natural Earth 110m coastlines, markers, atmosphere, graticule |
| Oblivion design system | #46 | All HUD components; `DESIGN.md`/`PRODUCT.md` canonical |
| Degraded-state UX | #26 | Reconnection, disconnect overlay, error boundaries |
| Desktop release readiness | #27 | Electron CI, smoke tests, packaging |
| Extensible Data & Visualization Platform | #142 | Collector/visualization manifest, registry, extension governance |
| Historical Geo-Context Enrichment | #143 | Relevance scoring, Past Echoes UX, sensitivity guardrails |
| Headline news ticker + geologic/night-sky tickers | #208 | NewsAPI collector, "near you" headlines |
| Ambient Display Settings Panel | #226 | Persisted settings, per-type mutes, location override |
| Adaptive Layout for Multi-Display Deployment | #227 | Portrait breakpoint, orientation handling |
| Severity-Aware Event Prioritization & Alerting | #228 | Ticker ordering, pulse, audio chime, mute thresholds |
| Electron Auto-Update | #229 | electron-updater, in-app update flow, recovery docs |

---

## Gaps Found (this refinement pass)

| # | Gap | Recommendation |
|---|---|---|
| 1 | **No next-phase backlog exists.** No file in the repo (`CLAUDE.md`, `PRODUCT.md`, `SPEC.md`) names what comes after the epics above. | Get direction from the project owner before opening new epics/stories — this is a product-priority decision, not an engineering-triage one. |
| 2 | **26 open Dependabot PRs** (#255–#303), oldest dated 2026-07-26 (~2 months unmerged). Several are major-version bumps: `vitest` 4→5 (#299), `vite` 7→8 (#257), `eslint` 9→10 (#256), `electron` 42→43 (#258), `@vitejs/plugin-react` 5→6 (#255), plus two large grouped PRs (#302 prod-deps ×8, #303 dev-deps ×18). | Triage in two passes: (a) patch/minor bumps (the other ~19 PRs — mostly safe, low-risk) can likely be batch-merged after CI passes; (b) major bumps need a manual compat check each, one at a time, not batched. Recommend the project owner set a Dependabot auto-merge policy for patch/minor to prevent this recurring. |
| 3 | **`.agentx/state/agent-status.json`** had `engineer` marked `active` on 7 issues that are all closed. | Reset to `idle` as part of this pass (see commit). Root cause worth checking: is `agentx.sh hook complete` reliably run at the end of every session? |
| 4 | **`CHANGELOG.md` stops at v0.2.0 / PR #225.** Four epics (#208, #226–229) have shipped since with no changelog entries. | Not fixed here — reconstructing accurate entries from merged-PR history is release-notes work and risks getting details wrong without reading every PR. Flagging for whoever owns releases. |
| 5 | **This file and `CLAUDE.md`'s status table were both ~4 months stale**, describing a sprint and CI issue (#176–#187) that no longer exist. | Both updated in this pass. |

No issue was found mis-statused (open when it should be closed, or vice versa) — the only "status" problem was that supporting docs hadn't caught up to a tracker that's actually current and fully closed out.

---

## Design Language

The Oblivion design language is documented and current in `DESIGN.md` and
`PRODUCT.md` (tokens, typography, motion, component specs, anti-patterns).
It was scaffolded via the **Impeccable** tool in PR #225 (see `CHANGELOG.md`
"Unreleased" section and `.gitignore`'s `impeccable-ignore` block) and is not
stale — Oblivion is fully applied across the UI per the design-system epic
(#46) closure. See `CLAUDE.md` for current status of an "initialize Impeccable"
request against this already-initialized state.
