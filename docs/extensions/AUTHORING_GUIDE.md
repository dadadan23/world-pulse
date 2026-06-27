# Extension Authoring Guide

This guide covers how to add a new **collector** (data source) or **visualization**
(globe/HUD render layer) to World Pulse without modifying core orchestration code,
per the Extensible Data and Visualization Platform epic (#142).

Both extension kinds follow the same lifecycle: **author → register → validate → test → review**.

---

## 1. Lifecycle

| Stage    | What happens                                                                  | Where                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Author   | Implement the extension against its contract                                  | `src/server/collectors/*.ts` or `src/renderer/visualization/*.ts`                                                                                        |
| Register | Declare a manifest and factory                                                | `src/server/index.ts` (collectors) — visualization plugins register against a `VisualizationRegistry` instance where the layer stack is composed         |
| Validate | Manifest is checked at registration time                                      | `validateManifest` / `validateVisualizationManifest` (`src/shared/types.ts`) — invalid manifests throw synchronously and are logged, never crash the app |
| Test     | Unit tests for fetch/validate or render logic                                 | `*.test.ts` co-located with the extension                                                                                                                |
| Review   | PR review against the checklist in [§5](#5-review-criteria-for-extension-prs) | —                                                                                                                                                        |

A misbehaving extension is isolated by design: a collector that throws is disabled after
5 consecutive errors (`BaseCollector`, exponential backoff + cooldown recovery) and a
visualization plugin whose factory throws is skipped and recorded in `getFailures()` —
neither takes down the rest of the app.

---

## 2. Collector Extensions

Collectors fetch data on a polling interval and emit `Event[]`. Every collector extends
`BaseCollector` (`src/server/collectors/base.ts`).

**Steps:**

1. Copy [`templates/collector-extension.template.ts`](./templates/collector-extension.template.ts)
   to `src/server/collectors/<name>.ts`.
2. Implement `fetch()` (returns `Event[]`) and `validate()` (returns `boolean`).
3. If you're introducing a new category of event, add the `EventType` and a typed event
   interface extending `Event` to `src/shared/types.ts`.
4. Register a `CollectorManifest` + factory in `src/server/index.ts`, following the
   existing entries in that file. The registry rejects duplicate ids and invalid
   manifests at startup without crashing the server.
5. Add `src/server/collectors/<name>.test.ts` covering `fetch()` success/failure and
   `validate()` edge cases.

**Manifest fields** (`CollectorManifest` in `src/shared/types.ts`):

| Field              | Required | Notes                                                                        |
| ------------------ | -------- | ---------------------------------------------------------------------------- |
| `id`               | yes      | Stable snake_case identifier, must be unique across the registry             |
| `version`          | yes      | Semver string — bump on breaking changes to the collector's output shape     |
| `displayName`      | yes      | Shown in health UI and the Source Directory                                  |
| `capabilities`     | yes      | `EventType[]` this collector can emit                                        |
| `qualityTier`      | yes      | `'primary'` or `'supplementary'` — primary collectors gate degraded-state UX |
| `enabledByDefault` | yes      | Set `false` to ship disabled until explicitly enabled                        |
| `description`      | no       | Shown in the Source Directory                                                |
| `sourceUrl`        | no       | Upstream API/data source link, shown in the Source Directory                 |
| `requiredEnvVars`  | no       | Collector is skipped at startup (not crashed) if any are missing             |

---

## 3. Visualization Extensions

Visualization plugins render a globe/overlay/HUD layer for one or more event types.
Plugins register against a `VisualizationRegistry` (`src/renderer/visualization/registry.ts`)
with a manifest and a factory, mirroring the collector pattern server-side.

**Steps:**

1. Copy [`templates/visualization-extension.template.ts`](./templates/visualization-extension.template.ts)
   as a starting point for your plugin module.
2. Implement the factory — it should return whatever instance type your render layer needs
   (a Three.js object, a React component reference, etc.). Keep the factory side-effect-free
   until `initialize()` is called.
3. Declare a `VisualizationManifest` with the event types you support and a `renderOrder`
   tier (`'base' | 'overlay' | 'hud'`, rendered bottom-to-top).
4. If your layer depends on another plugin being initialized first, list its id in
   `dependencies` — the registry topologically sorts and throws on cycles or missing deps
   at `initialize()` time (a configuration error, not a runtime crash).
5. Add a co-located `*.test.ts` covering registration and render-order/dependency behavior.

**Manifest fields** (`VisualizationManifest` in `src/shared/types.ts`):

| Field                 | Required | Notes                                                    |
| --------------------- | -------- | -------------------------------------------------------- |
| `id`                  | yes      | Stable snake_case identifier, unique across the registry |
| `version`             | yes      | Semver string                                            |
| `displayName`         | yes      | Shown in the Source Directory                            |
| `supportedEventTypes` | yes      | `EventType[]` this plugin can render                     |
| `renderOrder`         | yes      | `'base' \| 'overlay' \| 'hud'`                           |
| `dependencies`        | no       | Other plugin ids that must initialize first              |
| `description`         | no       | Shown in the Source Directory                            |

**Guardrails already built into the registry** (no extra work needed on your part):

- Layer budgets (`setBudget`) can cap how many plugins render per tier or in total —
  plugins exceeding budget are suppressed, not crashed.
- `disable(id)` / `enable(id)` provide a kill switch for a misbehaving plugin without a deploy.

---

## 4. Versioning and Kill-Switch Policy

- **Version bump rules:** bump the manifest `version` (semver) whenever the shape of
  emitted `Event.data` (collectors) or the set of `supportedEventTypes` (visualizations)
  changes. Patch-level bumps for internal fixes that don't change the contract.
- **Kill switch:** collectors self-disable after `maxErrors` (default 5) consecutive
  fetch failures and retry once after a cooldown (default 30 min). Visualization plugins
  can be disabled instantly via `VisualizationRegistry.disable(id, reason)` — use this for
  an extension causing a frame-rate or correctness regression in production rather than
  reverting a deploy.
- **Compatibility:** extensions should not assume they are the only one registered.
  Don't mutate shared state outside what your factory returns.

---

## 5. Review Criteria for Extension PRs

- [ ] Manifest `id` is unique, snake_case, and stable (won't be renamed across versions)
- [ ] `version` follows semver and is bumped appropriately for the change
- [ ] Collector: `fetch()` failures throw (don't swallow errors) so backoff/disable works
- [ ] Collector: `validate()` rejects malformed upstream payloads before they reach `Event[]`
- [ ] Visualization: factory has no side effects until invoked by `initialize()`
- [ ] Visualization: `dependencies` accurately reflects render-order requirements
- [ ] Unit tests cover both the success path and at least one failure/edge case
- [ ] No new required env vars without `requiredEnvVars` declared in the manifest
- [ ] `displayName`/`description` are written for the Source Directory audience, not internal jargon
- [ ] No changes to `src/shared/**` or `src/server/app.ts` socket/HTTP contracts unless the
      extension genuinely requires a new shared type — those changes need architect review
      per the severity gate in `CLAUDE.md`

---

## See Also

- [`templates/collector-extension.template.ts`](./templates/collector-extension.template.ts)
- [`templates/visualization-extension.template.ts`](./templates/visualization-extension.template.ts)
- `src/server/collectors/base.ts` — `BaseCollector` contract
- `src/server/collectors/registry.ts` — `CollectorRegistry`
- `src/renderer/visualization/registry.ts` — `VisualizationRegistry`
- `src/shared/types.ts` — `CollectorManifest`, `VisualizationManifest`, validators
