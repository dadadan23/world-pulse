# CLAUDE.md — World Pulse AI Assistant Guide

## Project Overview

World Pulse is a real-time information radiator that visualizes global events on an interactive 3D globe. It is designed to run 24/7 as an ambient dashboard on dedicated hardware (TV, iPad, monitor). The app streams live data from multiple sources (earthquakes, ISS tracking, aurora, volcanoes, asteroids, planet visibility) and renders them on a Three.js globe with a dark "Oblivion" aesthetic.

**Current status:** v0.2.0+ — Phase 1 (MVP) and Phase 2 (extensibility platform + historical context, epics #142/#143) are both complete and closed, along with three further epics shipped since (#208 headline news ticker, #226/#227/#228/#229 ambient settings / adaptive layout / severity alerting / Electron auto-update). **The issue tracker currently has zero open issues.** There is no defined next phase — see "Backlog Refinement Findings" below.

---

## Project Status (as of 2026-09-24)

| Area | Status | Notes |
|---|---|---|
| CI/CD | Needs attention | Feature-branch CI is green, but **26 Dependabot PRs are open and unmerged** (#255–#303, oldest from 2026-07-26). Several are major-version bumps (vite 7→8, eslint 9→10, vitest 4→5, electron 42→43) that need manual verification, not auto-merge. This has been a recurring gap — the PR numbers cited in the prior status entry (#176–#187) are long gone, but the underlying backlog is larger now, not smaller. |
| Globe fidelity | Done | All stories (#41–45, #56, #57, #62) closed, including the graticule overlay (#45) and Natural Earth 110m coastline pipeline. |
| Oblivion design system | Done | Feature #46 and all stories closed. `DESIGN.md`/`PRODUCT.md` are the canonical, current reference (added via PR #225 by the "Impeccable" tool — see design-language note below). |
| Degraded UX | Done | Feature #26 and all stories closed. |
| Reliability (original scope) | Done | Feature #23, collector health/lifecycle, and registry/manifest work all closed. |
| Release readiness | Done | #39, #66, #37, #38 all closed. |
| Phase 2 backlog (#142/#143) | Done | Both epics and all 24 child stories (#144–167) closed. |
| Headline news + tickers (#208) | Done | NewsAPI collector, "near you" headlines, geologic/night-sky vertical tickers (#209–215) closed. |
| Ambient display settings (#226) | Done | Settings store, panel UI, mute toggles, ticker speed, location override (#230–234) closed. |
| Adaptive multi-display layout (#227) | Done | Breakpoint spec, portrait layout, orientation handling, cross-viewport validation (#235–238) closed. |
| Severity-aware alerting (#228) | Done | Ticker ordering, pulse animation, audio chime, mute config (#239–242) closed. |
| Electron auto-update (#229) | Done | electron-updater wiring, in-app update check, status indicator, recovery docs (#243–246) closed. |
| AgentX automation | Resolved | Bug #191 (duplicate routing comments) closed. |

## Backlog Refinement Findings (2026-09-24)

A full backlog review (all 121 tracked issues, all open PRs) found:

1. **The backlog is empty.** Every issue in the tracker is closed — there is nothing to triage or refine, and no work is currently mis-statused. The prior "Phase 2 needs refinement" framing above is obsolete; refinement happened and the epics shipped.
2. **There is no defined next phase.** Neither this file, `BACKLOG.md`, `PRODUCT.md`, nor `SPEC.md` names what comes after the four epics above. Before opening new stories, get direction from the project owner on priorities rather than inventing scope.
3. **Dependabot debt (26 open PRs, #255–#303)** is the one concrete, actionable gap — see CI/CD row above.
4. **`.agentx/state/agent-status.json` had a stale entry**: `engineer` was recorded `"active"` on issues 232/233/236/237/238/241/242, all of which are closed. Reset to `idle` as part of this pass — a symptom worth watching is that the `hook complete` step isn't always being run when work finishes.
5. **`CHANGELOG.md` stops at v0.2.0 / PR #225** and does not reflect the four epics closed since. Left as-is here (reconstructing changelog entries from merged-PR history is release-notes work, not backlog triage) but flagged for whoever owns releases.
6. **`BACKLOG.md`** was dated 2026-05-03 and described a sprint that finished months ago; rewritten below to match current state.

## Active Branches

No feature PRs are currently open — only Dependabot dependency-bump PRs (26 of them, see above). Before starting new work: run `git fetch --all`, check `.agentx/state/agent-status.json` for active agents on the same issue, and confirm the target issue isn't already closed (the tracker has previously lagged behind merged work).

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

The original critical path (CI green → Globe GeoJSON → Oblivion design system →
Degraded UX → Release readiness) is **complete** — every stage closed, including
the three later epics (news/tickers, ambient settings + adaptive layout,
severity alerting + auto-update) that were added after this path was written.
There is currently no active critical path; see "Backlog Refinement Findings"
above for what to resolve before defining the next one.

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

## Agent Coordination

Two agents are active: **Claude Code** and **GitHub Copilot SWE**. Collisions are a real risk.

**Before starting any issue:**

1. Check `.agentx/state/agent-status.json` for agents with `"status": "active"` on the same issue or branch.
2. If Copilot is active on the same issue, wait or post a coordination comment on the GitHub issue.
3. When starting: `./agentx/agentx.sh hook start <role> <issue-number>`
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
