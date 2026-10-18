# Progress Log: #384 - [Spike] Define minimum display target and frame budget

## Status

| Field        | Value                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Issue        | #384 (parent feature #356, epic #348)                                                                                            |
| Type         | type:story (spike)                                                                                                               |
| Agent        | Architect                                                                                                                        |
| Status       | In Review, revision 2 (review fixes applied; owner decisions of 2026-10-18 recorded; SPEC-384 section 9 items 1 to 6 still open) |
| Branch       | `claude/384-frame-budget-spike` (commits 58f9d4a, b2a91b6; revision 2 uncommitted)                                               |
| Started      | 2026-10-18                                                                                                                       |
| Last Updated | 2026-10-18                                                                                                                       |

### Phase Checklist

- [x] Research and planning (CLAUDE.md, NEXT-PHASE-EPICS.md, DESIGN.md, PRODUCT.md, `Globe.tsx` and helpers, skills `performance`, `three-js-scene`)
- [x] Measurement tooling (`scripts/perf/`, no `src/` changes)
- [x] Baseline measurements (container, SwiftShader; relative and exact counts only)
- [x] Spec: `docs/specs/SPEC-384.md`
- [ ] On-device measurements (owner; procedure in `scripts/perf/README.md`)
- [x] Owner decision on tiers (2026-10-18: Pi 5 Floor, smart-TV browsers out, AC 8 gate accepted)
- [x] Review fixes from `docs/reviews/REVIEW-384.md` (B1, B2, S1 to S9, O1, O4 to O7)
- [ ] Open questions in SPEC-384 section 9, items 1 to 6 (owner)

## Acceptance criteria (issue #384)

| AC                                                 | State                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target hardware list and frame-rate budget in docs | Done (SPEC-384 sections 2 and 3). Floor device confirmed by the owner on 2026-10-18; device capabilities and fps targets are unvalidated until on-device rows exist |
| Baseline measurements for the current globe        | Done for what the container can measure (SPEC-384 section 4). Real-device numbers are missing                                                                       |
| Recommendation on effects needing a lite fallback  | Done (SPEC-384 sections 5 and 6): bloom, sweep, pulse-ring expansion, fire markers                                                                                  |

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

- Exact: 265 draw calls per frame at 50 markers (77 at 0 markers), of which 196 are markers and 58 are labels (re-measured in session 2; the session 1 figure of about 202 was inflated by a probe counting bug). 42,552 triangles. 58.2 MiB of textures. JS heap about 15 MiB. vendor-three chunk 324 kB gzip, main chunk 136 kB gzip.
- Relative (SwiftShader, 1080p): DPR 2 is 2.2x slower and 4K is 2.4x slower. Ablation shares: earth ~31%, atmosphere ~17%, wireframe ~17%, markers ~13%, labels ~6%.
- CPU (container, 640x360): rAF callback mean goes from 1.7 ms to 5.8 ms when 50 markers are added.
- Startup (container): first draw at about 7 s. About 6.1 s is synchronous shader link wait (SwiftShader-specific) and about 1.1 s is heightmap generation.

### Not measured

Real GPUs, Raspberry Pi, iPad Safari, Electron builds, GPU timer queries, power and thermals, and 24 h memory growth.

### Hand-off (superseded by session 2)

- Was: owner decision on tiers, then reviewer. The owner decisions are recorded below and the review is in `docs/reviews/REVIEW-384.md`.
- Proposed follow-up stories under #356 (not created): DPR cap and quality profile store; instanced markers and rings; label sprite atlas and hidden-label culling; frame-time governor; non-gating perf probe in CI (high-risk surface: `.github/workflows/**`).

### Owner decisions (2026-10-18)

- Floor: Raspberry Pi 5 (a better-fitting device may replace it); iPad 9th gen moved to best effort; broad backwards compatibility not required.
- Smart-TV browsers out as render hosts.
- Acceptance criterion 8 gate accepted.
- Still open: SPEC-384 section 9, items 1-6 (30 fps at Floor, reduced-motion rotation, lite earth material, night-lights texture, profile setting UI, CI perf check).

## Session 2 - Architect, review fixes (2026-10-18)

Applied `docs/reviews/REVIEW-384.md`. No `src/` or `.github/` changes.

- **B1:** kept the 96 MiB Full and 64 MiB Floor/Lite caps. #357 night texture is now 2048x1024 or smaller in Full (+10.7 MiB, 68.9 MiB total) and none or 1024x512 or smaller in Lite (+2.7 MiB, 60.9 MiB total). Arithmetic added to SPEC-384 section 5; section 9 item 4 now says +2.7 to +10.7 MiB.
- **B2 / O1:** `probe.js` now accumulates per-tag counts inside completed frame records only. Re-measured (Chromium 141 SwiftShader, 1080p DPR 1, 50 markers): markers 196, labels 58, sum of all tags 265 exactly (0 markers: 77, sum 77). 196 = 52 events x 1 sphere + 52 x 2 ring passes + 20 pulse rings x 2 passes. `cityData.ts` defines 58 cities (the review said 60); 58 label textures and 58 city-light points match it.
- **S1:** mock server binds `127.0.0.1` by default; `--host` (or `PERF_MOCK_HOST`) for the LAN case, documented in the README.
- **S2:** probe reports `framesOver33ms`, `framesOver50ms`, `framesOver66ms`, `pctFramesOver66ms`. SPEC-384 section 3 maps each budget column to a probe field; section 7.1 columns match.
- **S3 to S5:** AC 1 describes a test-only tier override, AC 2 says Lite 80 needs instancing, AC 5 includes the 5-minute step-up rule, AC 8 and sections 9 and 10 now require rows that meet the p95 budget and say what happens if the Pi 5 fails.
- **S6:** status text refreshed here and in the spec header.
- **S7:** marker description corrected against `src/renderer/components/Globe/Globe.tsx` (`EventMarkers`, `EventMarker`, `EventRing`, `EventPulseRing`).
- **S8 / O6:** probe summary includes `renderer` (unmasked WebGL renderer string), `programsCreated` and `programsUsedWhileSampling` (both 10 here, replacing the "~9 estimated" in section 3). README step references fixed.
- **S9:** attribution scenarios behind `--attribution`. `globe-baseline.mjs --quick` now completes in 248 s here.
- **O4, O5, O7:** SwiftShader labels in section 6.2; TV-browser references removed from the probe header and README; iPad listed under its own runtime in the Recommended row; runner child processes now get their own process group and the readiness timer is cleared.
- Not changed: the section 4.3 fps tables (not re-run as medians of 3; the single `--quick` rep is not comparable). O2 is handled by documenting that texture totals are cumulative allocations (AC 6) rather than by hooking `deleteTexture`. O3 (ESLint config covers only `.ts/.tsx`) is outside the allowed files. O8 is cosmetic in `.agentx/state`.

### Hand-off

- NEXT: reviewer re-review of #384, then PR (`Closes #384`) when the owner asks for one.
