# CLAUDE.md — World Pulse AI Assistant Guide

## Project Overview

World Pulse is a real-time information radiator that visualizes global events on an interactive 3D globe. It is designed to run 24/7 as an ambient dashboard on dedicated hardware (TV, iPad, monitor). The app streams live data from multiple sources (earthquakes, ISS tracking, aurora, volcanoes, asteroids, planet visibility) and renders them on a Three.js globe with a dark "Oblivion" aesthetic.

**Current status:** v0.2.0+ — Phase 1 (MVP), Phase 2 (epics #142/#143) and four later epics (#208 headline news ticker; #226/#227/#228/#229 ambient settings, adaptive layout, severity alerting, Electron auto-update) are shipped and closed. **A new "next phase" is planned and open: 4 epics (#347–#350), 19 features and 46 stories — 70 open issues as of 2026-10-18** (see "Next Phase" below).

---

## Project Status (as of 2026-10-24)

| Area | Status | Notes |
|---|---|---|
| Phase 1, Phase 2, news/tickers, ambient settings, adaptive layout, severity alerting, Electron auto-update | Done | Epics #142/#143, #208, #226–#229 and all child stories closed. `DESIGN.md`/`PRODUCT.md` are the canonical design references. |
| Next phase (#347–#350) | **Started** | Frame-budget spike #384 is done (PR #438, `docs/specs/SPEC-384.md`, tooling in `scripts/perf/`); 9 follow-up stories under #356: #431–#437, #448 (non-gating CI perf probe, architect review required) and #449 (profile control in settings, UX review). Everything else is open. See "Next Phase". |
| Dependency upgrades (#417) | Mostly done | Merged: vitest 5 (#423), dotenv 18 (#426), three 0.186 (#430). **Open Dependabot PRs: 3** — #333 vite 8 (blocked: needs electron-vite 6; `manualChunks` fails under rolldown), #335 electron 44 (needs desktop smoke test), #336 TypeScript 7 (blocked: typescript-eslint peer range). Not yet PR'd: eslint 10, @vitejs/plugin-react 6, @testing-library/jest-dom 7. Use npm 11 for lockfiles. |
| CI/CD | Green on main | Last main commits are dependency/build fixes (#421, #423, #426, #428 Express 5 SPA fallback, #430). |
| AgentX state | Idle | `.agentx/state/agent-status.json` shows all agents idle. Always run `hook complete` when finishing work. |
| `CHANGELOG.md` | Stale | Stops at v0.2.0 / PR #225; does not cover any epic shipped since. |

## Next Phase (epics opened 2026-10-17; proposal: `docs/proposals/NEXT-PHASE-EPICS.md`)

| Epic | Pri | Features | Summary |
|---|---|---|---|
| #347 Mode Deck | P1 | #351–#355 | Mode registry + persisted state, Mode Deck chips/hotkeys/remote nav, engage feedback, Peek, Scenes/Showtime. Every new effect registers as a mode. |
| #348 Living Globe | P2 | #356–#362 | Perf/a11y guardrails, live solar terminator, callouts, pulse rings, sweep/ping, calm/alert modes, phosphor + burn-in drift. |
| #349 Context at a Glance | P2 | #363–#366 | Rolling-median baselines, now-vs-normal gauges, data-lineage footer, ISS pass prediction (spike first). |
| #350 New Data Layers wave 1 | P2 | #367–#369 | NASA FIRMS wildfires, NOAA SWPC space weather, GDACS/EONET disaster alerts (spike first). |

**Owner decisions (2026-10-20, details in `docs/specs/SPEC-384.md` section 9):** 30 fps is acceptable at the Floor tier (Raspberry Pi 5); reduced motion also stops auto-rotation and renders on demand (criteria on #385); a non-gating CI perf check is wanted (#448); the simplified earth material is acceptable at the last-resort ladder level (L6) only; a quality-profile control in settings is approved as a later UX story (#449); the night-lights texture is 1024x512 or smaller for every tier, but its **source and licence are still open** (#387).

**Hardware status:** the Raspberry Pi 5 and Recommended-device baseline (#434) is waiting on hardware, which is not available yet. Until a real device exists, perf work uses emulation or mocked tests only. #437 (on-device sign-off) stays blocked, and so do the sweep (#360) and phosphor (#362) features it gates. Budgets in SPEC-384 are assumptions until #434 produces real rows.

**Suggested sequence** (derived from epic text and titles; story-level blocked-by links were not verified):
1. Foundation (P1): ~~#384 frame-budget spike~~ (done), #434 on-device Pi 5 baseline (owner), #433 guardrails doc, #431 quality profile, #432 instanced markers, #385 reduced-motion utility, #370 → #371 mode registry/persistence.
2. In parallel: Deck UX #372 → #373 → #374; lineage #405 → #406; sun #386 → #387; start baseline server job #400–#402 early so history accumulates.
3. P2 layers: fires #409–#411, space weather #412–#414, gauges #403–#404, callouts/rings #389–#392, alert state machine/drill #395–#397, remaining deck stories.
4. P3 after spikes: sweep #393–#394, phosphor #398–#399, sound #377, ISS #407/#408, GDACS #415/#369.

**Open concerns:** stories touching `src/shared/**` or `src/server/**` need architect review (#370, #371, #400, #401, #405, #409, #412 are likely candidates) but no ADR tasks exist; #395–#397 may overlap shipped alerting (#228); several P1 stories sit under P2 epics; no cross-viewport/E2E validation story, no release/CHANGELOG story, and no config/security story for the FIRMS `MAP_KEY` and new external hosts. The prototypes the epics cite (`docs/prototypes/mode-deck.html`, `next-phase-concepts.html`) are not on `main`.

## Active Branches

No feature PRs are open besides the Dependabot PRs above (#333, #335, #336). Before starting new work: run `git fetch --all`, check `.agentx/state/agent-status.json` for active agents on the same issue, and confirm the target issue is still open — the tracker and this file have both lagged behind reality before.

## AgentX Knowledge Layer

`.agentx/knowledge/` now exists. **Load the relevant skill(s) before beginning any issue.**

| Directory | Contents |
|---|---|
| `.agentx/knowledge/skills/` | 9 skills: `oblivion-component` (P0), `react-component`, `three-js-scene`, `socket-io-event`, `electron-ipc`, `vitest-unit`, `playwright-e2e`, `github-actions-workflow`, `typescript-type` |
| `.agentx/knowledge/instructions/` | `security.md`, `commit-standards.md`, `performance.md` |
| `.agentx/knowledge/templates/` | `pr-description.md`, `execution-plan.md`, `adr.md`, `changelog-entry.md` |

**Always load `oblivion-component.md` for any UI change.** It is the visual identity of the project.

## Severity Gate Rules

Any change touching the following paths is **high risk surface** and requires architect review, regardless of file count:

| Pattern | Reason |
|---|---|
| `src/shared/**` | Cross-boundary TypeScript contracts — breaks frontend and backend simultaneously |
| `src/server/**` | Backend protocol — affects all connected clients |
| `*Contract*`, `*Schema*`, `*Types*` | Shared type contract filenames |
| `.github/workflows/**` | CI pipeline — breaks all PR gates |

This is enforced in `.agentx/workflows/story.toml`, `bug.toml`, and `docs.toml` via the `[routing]` section. The `agentx.sh hook start` command checks this before routing.

## Critical Path

The original critical path (CI green → Globe GeoJSON → Oblivion design system → Degraded UX → Release readiness) is complete. The active path for the next phase is: on-device baseline (#434) and quality profile/instancing (#431/#432) alongside mode registry (#370/#371) → Mode Deck UI and mode-producing features. Sweep (#360) and phosphor (#362) stay blocked until on-device sign-off (#437). Performance budgets and the degrade ladder are in `docs/specs/SPEC-384.md`. See "Next Phase".

## Issue Lifecycle (REQUIRED — automated via `.github/workflows/pr-issue-link.yml`)

Issue status is tracked automatically from PR open → merge via GitHub Actions + Projects v2.
**These steps are mandatory for every story, bug, and task.**

### When you pick up a story

1. Comment on the GitHub issue: `gh issue comment <N> --body "Starting work on this — branch: <branch-name>"`
2. This is a signal to other agents; the workflow moves the issue to "In progress" automatically when the PR is opened.

### When creating a PR

Every PR body **must** include a `Closes #N` line for every story it addresses.
For a PR covering multiple stories:

```
Closes #150
Closes #159
Closes #160
```

- `Closes`, `Fixes`, and `Resolves` all work.
- The `pr-issue-link.yml` workflow enforces this and will **fail the check** if missing.
- GitHub auto-closes the issues when the PR is merged.
- The workflow also moves each issue to **"Done"** in the World Pulse! Projects v2 board on merge.

### What the workflow does automatically

| PR event | Action |
|---|---|
| PR opened/reopened | Issues → `status:in-progress` label + Projects v2 "In progress" |
| PR merged | Issues → closed by GitHub; Projects v2 → "Done" |
| PR closed (no merge) | Issues → `status:in-progress` label removed; Projects v2 → "Ready" |

### One-time setup required (repository secret)

The Projects v2 status updates require a GitHub classic PAT with `project` scope:
1. Go to https://github.com/settings/tokens → Generate new token (classic) → check **project**
2. Add it as repository secret: **Settings → Secrets → Actions → New** → name: `GH_PROJECT_TOKEN`
Without this secret, labels still apply but Projects v2 card moves are skipped (logged as warnings).

## Claude Code Setup (`.claude/`)

AgentX content from `.github/` and `.agentx/` is exposed to Claude Code under `.claude/` (see `.claude/README.md`; regenerate with `python3 .claude/sync-agentx.py`).

- **Coordinator:** `/agent-x [issue|ready]` — classifies the issue (fast path vs. full path, risk-surface gate above) and dispatches role subagents.
- **Role subagents** (`.claude/agents/`): `product-manager`, `ux-designer`, `architect`, `engineer`, `devops-engineer`, `reviewer`, `reviewer-auto`, `customer-coach`. They cannot call each other; each ends with a `NEXT:` line for the coordinator.
- **Skills** (`.claude/skills/`): the 9 project skills listed above plus all 42 general AgentX skills (several, e.g. C#/Go/Rust/Fabric, are outside this stack and only trigger on matching work). Load `oblivion-component` for any UI change.
- **Commands:** `/ax-prd`, `/ax-architecture`, `/ax-ux-design`, `/ax-test-gen`, `/ax-refactor`, `/ax-bug-triage`, `/ax-code-review`, `/ax-security-review`, `/ax-devops`, `/ax-ai-agent`, `/ax-evaluation`.
- **Rules** (`.claude/rules/`): path-scoped guidance for TypeScript, React, server API, workflows/YAML, UX and (not used by this stack) C#, Blazor, Python, SQL, Terraform, Bicep, AI.
- **AgentX CLI on Linux/macOS/cloud:** use `./.agentx/agentx.sh` (the `.ps1` forms in `AGENTS.md` are the Windows equivalents). Hook phases: `start`, `complete`, `failed`.
- If `AGENTS.md`/agent files disagree with this file, this file wins (e.g. coverage target >70%).

## Agent Coordination

Two agents are active: **Claude Code** and **GitHub Copilot SWE**. Collisions are a real risk.

**Before starting any issue:**

1. Check `.agentx/state/agent-status.json` for agents with `"status": "active"` on the same issue or branch.
2. If Copilot is active on the same issue, wait or post a coordination comment on the GitHub issue.
3. When starting: `./.agentx/agentx.sh hook start <role> <issue-number>`
4. When done: `./.agentx/agentx.sh hook complete <role> <issue-number>`
5. On error: `./.agentx/agentx.sh hook failed <role> <issue-number> "<error message>"`

The state file is at `.agentx/state/agent-status.json`. It records `{ role, status, issue, branch, startedAt }`.

---

## Operating Principles

- **Correctness over cleverness**: Favor straightforward, maintainable approaches.
- **Smallest change that works**: Limit scope; avoid unnecessary refactoring.
- **Leverage existing patterns**: Follow project conventions before creating new abstractions.
- **Prove it works**: Validate through tests, builds, linting, or reproducible manual verification.
- **Be explicit about uncertainty**: Acknowledge unknowns and propose safe next steps.

## Quick Reference — Commands

| Task | Command |
|---|---|
| **Install dependencies** | `npm install` |
| **Start dev (server + frontend)** | `npm run dev` |
| **Start dev server only** | `npm run dev:server` |
| **Start dev frontend only** | `npm run dev:renderer` |
| **Start Electron dev** | `npm run dev:electron` |
| **Run all tests** | `npm test` |
| **Run tests in watch mode** | `npm run test:watch` |
| **Run tests with coverage** | `npm run test:coverage` |
| **Run E2E tests** | `npm run test:e2e` |
| **Lint** | `npm run lint` |
| **Lint with autofix** | `npm run lint:fix` |
| **Format code** | `npm run format` |
| **Type check** | `npm run typecheck` |
| **Full validation** | `npm run validate` |
| **Build all** | `npm run build` |
| **Build Electron** | `npm run build:electron` |

**`npm run validate`** runs `typecheck && test && lint && build:renderer` — use this as the full pre-push check.

## Architecture

```
world-pulse/
├── src/
│   ├── renderer/          # React frontend (Vite + Three.js)
│   │   ├── components/    # UI components (Dashboard, Globe, Header, EventPanel, Ticker)
│   │   ├── hooks/         # Custom hooks (useSocket for WebSocket)
│   │   ├── store/         # Zustand state management (useAppStore)
│   │   ├── App.tsx        # Root component
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Oblivion design system
│   ├── server/            # Node.js backend (Express + Socket.io)
│   │   ├── collectors/    # Data source plugins (extend BaseCollector)
│   │   ├── app.ts         # Express app, routes, Socket.io setup
│   │   └── index.ts       # Server entry point
│   ├── shared/            # TypeScript types shared across layers
│   │   └── types.ts       # Event, EventType, GeoLocation, DataCollector, etc.
│   └── test/              # Test setup (testing-library config)
├── docs/                  # Extended documentation and prototypes
├── .github/               # CI/CD workflows (ci, security, release)
└── .husky/                # Git hooks (pre-commit, commit-msg)
```

### Deployment Modes

1. **Desktop (primary):** Electron wrapper with embedded backend
2. **Web (secondary):** Separate Node.js server + Vite frontend

### Key Architectural Patterns

- **Plugin-based data collection:** All data sources extend `BaseCollector` (in `src/server/collectors/base.ts`). Each collector implements `fetch()` and `validate()`, runs on a polling interval, and auto-disables after 5 consecutive errors.
- **Event streaming:** Backend emits events via Socket.io (`events:initial` on connect, `events:new` for live updates). Max 100 events cached.
- **State management:** Zustand store (`useAppStore`) — not Redux. Flat state with actions for connection status, events, featured/selected event, and initialization.
- **Path aliases:** `@/` → `src/`, `@shared/` → `src/shared/`, `@renderer/` → `src/renderer/`, `@server/` → `src/server/` (configured in tsconfig.json and vitest.config.ts).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Three.js, react-three-fiber, react-three-drei |
| Styling | Tailwind CSS 3 + custom "Oblivion" CSS (dark navy/cyan/amber) |
| State | Zustand |
| Backend | Express 4, Socket.io |
| Database | SQLite (via sqlite3 npm package) |
| Language | TypeScript 5 (strict mode) |
| Build | Vite 6 (frontend), esbuild (backend bundle), electron-vite (desktop main/preload) |
| Desktop | Electron |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Linting | ESLint + Prettier |
| Container | Docker (multi-stage build, see Dockerfile) |

## Code Conventions

### TypeScript

- **Strict mode** is enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`).
- ES modules (`"type": "module"` in package.json).
- Target: ES2022.
- Prefix unused parameters with `_` (e.g., `_req`).
- Avoid `any` — it produces a warning. Use `unknown` with type narrowing instead.
- All shared types live in `src/shared/types.ts`.

### Formatting (Prettier)

- Single quotes, semicolons, trailing commas (ES5), 2-space indentation, 100 char print width, LF line endings, always use parens for arrow functions.

### Linting (ESLint)

- `no-console` is a warning — use `console.warn()` and `console.error()` only; avoid `console.log()` in production code.
- React: no need for `import React` (react-jsx transform). PropTypes are disabled.
- Three.js JSX properties (`args`, `attach`, `position`, `rotation`, etc.) are allowed via `react/no-unknown-property` ignore list.

### Commit Messages

Conventional Commits enforced by commitlint + husky:
```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```

Pre-commit hook runs `lint-staged` which auto-fixes ESLint and Prettier on staged `.ts`/`.tsx` files.

## Testing

- **Framework:** Vitest with globals enabled.
- **Environment:** `jsdom` for `src/renderer/**` tests, `node` for `src/server/**` tests (auto-selected via `environmentMatchGlobs`).
- **Setup file:** `src/test/setup.ts` (imports testing-library utilities).
- **Test file pattern:** `src/**/*.test.{ts,tsx}` — co-locate tests next to source files.
- **Coverage:** V8 provider, target >70%.
- **Component testing:** `@testing-library/react` + `@testing-library/user-event`.
- **API testing:** `supertest` for Express endpoint tests.
- **E2E:** Playwright (`npm run test:e2e`).

### Running a Single Test File

```bash
npx vitest run src/server/collectors/earthquakes.test.ts
```

## CI Pipeline

The GitHub Actions CI (`.github/workflows/ci.yml`) runs on pushes/PRs to `main` and `develop`:

1. **Lint** — ESLint (zero warnings) + Prettier check
2. **TypeCheck** — `tsc --noEmit`
3. **Test** — Vitest with coverage, uploaded to Codecov
4. **Build** — Full production build (depends on all above passing)

Additional workflows: `security.yml` (npm audit, Snyk, CodeQL — weekly + on push), `release.yml` (Electron builds on version tags).

## Adding a New Data Collector

1. Create `src/server/collectors/<name>.ts`.
2. Extend `BaseCollector` from `src/server/collectors/base.ts`.
3. Implement `fetch()` (returns `Event[]`) and `validate()`.
4. Add the corresponding `EventType` to `src/shared/types.ts` if new.
5. Create a typed event interface extending `Event` in `src/shared/types.ts`.
6. Register the collector in `src/server/index.ts`.
7. Add a test file `src/server/collectors/<name>.test.ts`.

## Environment Variables

Copy `.env.example` to `.env.local` (gitignored) and fill in API keys:

| Variable | Required | Description |
|---|---|---|
| `OPENWEATHER_API_KEY` | Yes | OpenWeather API key |
| `NEWSAPI_KEY` | Yes | NewsAPI key |
| `SPOTIFY_CLIENT_ID` | No | Spotify integration |
| `SPOTIFY_CLIENT_SECRET` | No | Spotify integration |
| `NODE_ENV` | — | `development` / `production` |
| `PORT` | — | Backend port (default: 3000) |
| `DB_PATH` | — | SQLite path (default: `./data/world-pulse.db`) |
| `LOG_LEVEL` | — | Logging level (default: `info`) |

**Never commit secrets.** The `.env.local` file is gitignored.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (`{ status, timestamp }`) |
| GET | `/api/status` | Server readiness, active collectors, event count |
| GET | `/api/events` | Retrieve cached events |

### WebSocket Events (Socket.io)

| Event | Direction | Payload |
|---|---|---|
| `events:initial` | Server → Client | `{ events: Event[], timestamp }` |
| `events:new` | Server → Client | `{ events: Event[], timestamp }` |

## Workflow Orchestration (for AI Agents)

### Planning

Use planning mode for complex tasks (3+ steps, multi-file changes, architectural decisions). Deploy focused sub-agents for repo exploration, pattern discovery, test triage, and dependency research.

### Incremental Delivery

Ship thin vertical slices. Validate each step before moving to the next.

### Verification Before Done

Never mark a task complete without test results, lint checks, type checks, or manual reproducible evidence. Run `npm run validate` for full verification.

### Autonomous Bug Fixing

Reproduce → Isolate → Fix → Add test coverage → Verify — without offloading work back to the user.

### Error Handling and Recovery

- **Stop-the-line rule:** Pause when tests fail or behavior regresses.
- **Triage checklist:** Reproduce → Localize → Reduce → Fix root cause → Guard with regression test → Verify end-to-end.
- **Safe fallbacks:** Prefer "safe default + warning" over partial behavior.
- **Rollback strategy:** Keep changes reversible using isolated commits.

### Definition of Done

A task is complete when:
- Behavior matches acceptance criteria
- `npm run validate` passes (typecheck + test + lint + build)
- Code follows the conventions documented above
- New code has test coverage
- Risky changes have a rollback strategy
