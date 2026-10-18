# Progress Log: #384 - [Spike] Define minimum display target and frame budget

## Status

| Field        | Value                                               |
| ------------ | --------------------------------------------------- |
| Issue        | #384 (parent feature #356, epic #348)               |
| Type         | type:story (spike)                                  |
| Agent        | Architect                                           |
| Status       | In Review (owner decision needed on hardware tiers) |
| Branch       | `claude/384-frame-budget-spike` (uncommitted)       |
| Started      | 2026-10-18                                          |
| Last Updated | 2026-10-18                                          |

### Phase Checklist

- [x] Research and planning (CLAUDE.md, NEXT-PHASE-EPICS.md, DESIGN.md, PRODUCT.md, `Globe.tsx` and helpers, skills `performance`, `three-js-scene`)
- [x] Measurement tooling (`scripts/perf/`, no `src/` changes)
- [x] Baseline measurements (container, SwiftShader; relative and exact counts only)
- [x] Spec: `docs/specs/SPEC-384.md`
- [ ] On-device measurements (owner; procedure in `scripts/perf/README.md`)
- [ ] Owner decision on tiers (SPEC-384 section 9)

## Acceptance criteria (issue #384)

| AC                                                 | State                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Target hardware list and frame-rate budget in docs | Done as a **proposal** (SPEC-384 sections 2 and 3). Tiers are assumptions until the owner confirms them |
| Baseline measurements for the current globe        | Done for what the container can measure (SPEC-384 section 4). Real-device numbers are missing           |
| Recommendation on effects needing a lite fallback  | Done (SPEC-384 sections 5 and 6): bloom, sweep, pulse-ring expansion, fire markers                      |

## Session 1 - Architect (2026-10-18)

### What I did

- Ran `agentx.sh hook start architect 384`. No blockers.
- Ran `npm ci` (skipping browser and Electron downloads) and `npx vite build` to get bundle sizes.
- Wrote `scripts/perf/probe.js`: a dependency-free in-page WebGL2 probe that can also be pasted into a console on a device.
- Wrote `scripts/perf/mock-server.mjs`: a seeded mock backend that needs no keys.
- Wrote `scripts/perf/globe-baseline.mjs`: throughput runs (3 reps, median) and `--ablation`.
- Wrote `scripts/perf/cpu-profile.mjs`: CDP render-loop and `--startup` profiles.
- Wrote `scripts/perf/README.md`: the on-device checklist.
- Wrote `docs/specs/SPEC-384.md`.

### Problems hit and how they were resolved

- The first mock payloads had empty `data`, which crashed `Dashboard` (a widget calls `.toFixed` on `magnitude`), so runs 2 onward measured an error screen with 0 draw calls. Fixed with realistic payloads, and the affected runs were discarded.
- Program tagging first used `SHADER_NAME`, but three.js r186 sets that from `material.name`, which is empty. Switched to `SHADER_TYPE`. The first ablation run was discarded.
- Texture accounting first hooked only `texImage2D`. three.js on WebGL2 allocates with `texStorage2D`. Added that hook and re-measured (58.2 MiB).
- `gl.finish()` attribution mode didn't wait for SwiftShader raster (the earth draw read 0.03 ms). Results excluded, the caveat is documented in `probe.js`, and per-element cost relies on ablation instead.
- Throughput is noisy (the empty scene ran at 4.4 to 8.5 fps across reps). All numbers are medians of 3 and shares are presented as rank order.

### Key numbers (provenance in SPEC-384 section 4)

- Exact: 265 draw calls per frame at 50 markers (77 at 0 markers), of which about 202 are markers. 42,552 triangles. 58.2 MiB of textures. JS heap about 15 MiB. vendor-three chunk 324 kB gzip, main chunk 136 kB gzip.
- Relative (SwiftShader, 1080p): DPR 2 is 2.2x slower and 4K is 2.4x slower. Ablation shares: earth ~31%, atmosphere ~17%, wireframe ~17%, markers ~13%, labels ~6%.
- CPU (container, 640x360): rAF callback mean goes from 1.7 ms to 5.8 ms when 50 markers are added.
- Startup (container): first draw at about 7 s. About 6.1 s is synchronous shader link wait (SwiftShader-specific) and about 1.1 s is heightmap generation.

### Not measured

Real GPUs, Raspberry Pi, iPad Safari, TV browsers, Electron builds, GPU timer queries, power and thermals, and 24 h memory growth.

### Hand-off

- NEXT: product-manager or owner decision on tiers (SPEC-384 section 9), then reviewer for the spec and scripts.
- Proposed follow-up stories under #356 (not created): DPR cap and quality profile store; instanced markers and rings; label sprite atlas and hidden-label culling; frame-time governor; non-gating perf probe in CI (high-risk surface: `.github/workflows/**`).
