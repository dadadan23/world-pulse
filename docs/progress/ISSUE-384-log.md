# Progress Log: #384 - [Spike] Define minimum display target and frame budget

## Status

| Field        | Value                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Issue        | #384 (parent feature #356, epic #348)                                                                                                        |
| Type         | type:story (spike)                                                                                                                           |
| Agent        | Architect                                                                                                                                    |
| Status       | In Review, revision 3 (PR #438 review threads addressed; owner decisions of 2026-10-18 recorded; SPEC-384 section 9 items 1 to 6 still open) |
| Branch       | `claude/384-frame-budget-spike` (commits 58f9d4a, b2a91b6; revision 2 in df2a424)                                                            |
| Started      | 2026-10-18                                                                                                                                   |
| Last Updated | 2026-10-18                                                                                                                                   |

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

- Exact: 265 draw calls per frame at 50 markers (77 at 0 markers), of which 196 are markers and 58 are labels (re-measured in session 2; the session 1 figure of about 202 was inflated by a probe counting bug). Markers: 50 mounted (client cap `MAX_MARKERS = 50`) = 50 spheres + 50 x 2 ring passes + 23 x 2 pulse-ring passes (corrected in session 3; counted in the page on a build of `12bec81`, whose `src/` equals `7dbd9d5`). 42,552 triangles. 58.2 MiB of textures. JS heap about 15 MiB. vendor-three chunk 324 kB gzip, main chunk 136 kB gzip.
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
- **B2 / O1:** `probe.js` now accumulates per-tag counts inside completed frame records only. Re-measured (Chromium 141 SwiftShader, 1080p DPR 1, 50 markers): markers 196, labels 58, sum of all tags 265 exactly (0 markers: 77, sum 77). (The breakdown originally written here, 52 events and 20 pulse rings, was wrong; see session 3: 50 markers and 23 pulse rings.) `cityData.ts` defines 58 cities (the review said 60); 58 label textures and 58 city-light points match it.
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

## Session 3 - Architect, PR review follow-up (2026-10-18)

PR #438 review threads (Copilot). Each claim was checked against the code before changing anything. No `src/` or `.github/` changes. Measured on a `vite build` of `12bec81` (`src/` identical to `7dbd9d5`).

| Thread                                                        | Verdict                                                                                                                                                          | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. [P1] `probe.js` counts rAF ticks, not app render frames    | Valid for capped or on-demand rendering. Today `<Canvas>` uses r3f's default `frameloop="always"`, so ticks and renders coincide and no published number changes | A tick counts as a rendered frame only if at least one draw (including `setSkip`-suppressed draws) was issued since the previous tick. Frame timing and per-frame counts use rendered frames; new `renderedFrames`, `rafTicks`, `rafFpsMean`, `rafIntervalMsP50/P95` (`frames` renamed to `renderedFrames`). README, SPEC-384 sections 3, 4.1, 7 and 7.1 updated. Checked with a simulated 30 fps app cap: 65 rendered frames vs 130 rAF ticks, 265 draws per rendered frame |
| 2. [P2] SPEC-384 section 4.4 marker derivation                | Valid. `MAX_MARKERS = 50` caps the selection; the mock's 52 events lose `perf-10` and `perf-41` (severity 0.1 and 0) to the cap, none to the 5-degree rule       | Re-derived and counted in the page: 50 spheres + 50 x 2 ring passes + 23 x 2 pulse-ring passes = 196. Headline numbers (196, 265, 254, 20.2k marker triangles) unchanged. Fixed in SPEC-384 sections 4.1, 4.2, 4.3 ablation row, 4.4, AC 3, and session 1 and 2 key numbers here; measured revision recorded in section 4.1                                                                                                                                                  |
| 3. [P2] governor step-up cannot happen at 60 Hz or from L5    | Valid. 70% of 20 ms is 14 ms, below the 16.7 ms vsync interval; the L5 cap pins intervals at 33.3 ms                                                             | Step-up now uses render-work headroom (`W` at most 50% of the next level's target interval for 60 s) plus a 20 s trial that reverts on a miss, with a 5 to 60 min back-off. Interval budget is never below 1.2 x the measured refresh interval; L5 budget is 50 ms. SPEC-384 section 6.2 (signals table, diagram, worked cases, what #435 needs), AC 5 and the risks row updated                                                                                             |
| 4. [P2] `cpu-profile.mjs` setup outside cleanup               | Valid                                                                                                                                                            | Preview, mock and browser start inside the `try`; `finally` stops whatever started. Tested with `--chrome /nonexistent/chrome` and with port 3000 occupied: exit 1, ports 3000 and 4173 free afterwards, no vite or mock processes left                                                                                                                                                                                                                                      |
| 5. [P2] `cpu-profile.mjs --startup` per-frame rates           | Valid. Samples span navigation plus ~5 s, frames only the last ~1 s                                                                                              | Startup mode prints total ms per bucket and function over the profiler's own elapsed time; steady mode divides by the profiler's elapsed time instead of `--seconds`. README documents it                                                                                                                                                                                                                                                                                    |
| 6. [P2] `globe-baseline.mjs` preview survives a failed launch | Valid                                                                                                                                                            | Preview and browser start inside the `try`. Tested with `--chrome /nonexistent/chrome`: exit 1, port 4173 free afterwards                                                                                                                                                                                                                                                                                                                                                    |

Verification: `prettier --check` on `scripts/perf/`, SPEC-384 and this log passed; `node --check` passed on all four scripts; `node scripts/perf/globe-baseline.mjs --quick` completed in 242 s. Per-element draw calls sum to the total in every scenario (265, 77 at 0 markers, 0 for clear only), and rendered frames equal rAF ticks in every scenario, as expected with `frameloop="always"`. fps values from the single quick rep are not comparable with the section 4.3 medians and were not copied into the spec.

### Hand-off

- NEXT: reviewer re-review of #384 (PR #438). The owner updates story #435 from the new AC 5 text.

## Session 4 - post-merge review corrections (2026-10-19)

Applied the "Re-review (revision 3, post-merge)" section of `docs/reviews/REVIEW-384.md` to SPEC-384 on `claude/384-followups` (from `origin/main` `99fa237`). Spec only; S7, S8, the README line of S9 and the probe changes are owned by the parallel `scripts/perf/` fix. No `src/` or `.github/` changes.

| Finding        | Fix in SPEC-384                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 (blocking)  | `R` is now a calibrated display refresh interval and an injected governor input, measured only while the app is not render-bound: before the canvas first renders, from intervals that start at L5-skipped ticks, and by a calibration pause on screen or refresh-rate change; default 16.7 ms until calibrated; never from a window in which every tick rendered. New "Why `R` is calibrated" paragraph, signals table, diagram, worked cases, AC 5 ("Overload is not a slow display", revised "Slow display", "`R` calibration"), section 10 risk row |
| S1             | Back-off resets to 5 min only after the kept trial level has held 30 min; a step-down within 30 min of a kept trial counts as a failed trial. Stated bound: at most 4 level changes per rolling hour once the back-off has settled, 8 in the first 2 hours, 100 in 24 h. AC 5 "Flap bound"                                                                                                                                                                                                                                                              |
| S2             | Counters reset on any level change, settle and `Paused`. Settle: 30 s after the first rendered frame at startup (shader compile about 6 s on SwiftShader, unknown on Pi; texture upload; initial event burst), 10 s after every level change and visibility return (bloom programs, L4 drawing-buffer resize). Programs precompiled (`compileAsync`) before a trial. Step-downs 30 s apart, L0 to L5 at least 150 s. AC 5 "Step-down", "Settle and counters"                                                                                            |
| S3             | `W` = max(main-thread p95, GPU p95), not the sum. Without the timer query (expected on Safari and Pi), `W` is main-thread only and the headroom threshold drops from 50% to 40% of `T(next)`; the trial remains the final check. AC 5 "Headroom threshold"                                                                                                                                                                                                                                                                                              |
| S4             | Section 3 "Timestamp tolerance": budget comparisons allow 1 ms; over budget means `I > B + 1 ms`. Notes that the probe's `framesOver*` counters use the same 1 ms (probe change owned by the parallel fix)                                                                                                                                                                                                                                                                                                                                              |
| S5             | L5 cap row: render when time since last render is at least 33.3 ms minus `R`/2; no-op when `R` is 30 ms or more; whole frame skipped (`frameloop="never"` plus `advance()`), `useFrame` included. AC 5 "Cap on slow displays"                                                                                                                                                                                                                                                                                                                           |
| S6             | "Profiles and the ladder" table: Full ceiling L0; Lite ceiling L4 (L1 to L4 applied, story #431); Auto L0 on Recommended and Showpiece, L4 on Floor; L5 only by the governor. AC 5 "Caps"                                                                                                                                                                                                                                                                                                                                                               |
| S9 (spec part) | Section 7 step 2: keep the page visible and the Sky Map modal (second r3f `<Canvas>`) closed while sampling                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| O1             | `T(L5)` removed; `T(next)` is only evaluated for the next better level                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| O2             | Diagram start label now "option B in section 6.1"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| O3             | Interval spanning a hidden period discarded; counters reset on `Paused`; abandoned trial reverts without changing the back-off; settle after return                                                                                                                                                                                                                                                                                                                                                                                                     |
| O4             | Section 4.1 cites `99fa237` (`src/` identical to `7dbd9d5`, built with three 0.186.1); `12bec81` described as the pre-squash branch commit actually measured                                                                                                                                                                                                                                                                                                                                                                                            |
| O5             | Header: Accepted (revision 3 merged in PR #438), with this post-merge correction                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| O6             | AC 2 (and AC 3): home-beacon draws on geolocation-enabled devices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| O7             | Section 3: `rafCallbackMsP95` is per callback; equal to per frame while r3f is the only rAF user                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| O8             | Worked case: a Recommended device with the container's 10.8 ms main-thread p95 stays at L1 until marker instancing; consistent with the 8 ms budget                                                                                                                                                                                                                                                                                                                                                                                                     |

### Simulation (throwaway, not committed)

Window-level model of the corrected section 6.2 rules (10 s windows, calibrated `R` input, settle periods, counter resets, 1 ms tolerance, max-based `W` with the 40% threshold when GPU time is unknown, new back-off rule), plus a frame-level model of the L5 cap with 0.4 ms tick jitter. Script: `gov2.mjs` in the session scratchpad, extending the reviewer's `gov.mjs`.

| Case                                                                | Result                                                                                                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Recommended 60 Hz unloaded at L1, `W` 4 ms (GPU known and unknown)  | Trial L0 at 300 s, kept at 330 s, both variants                                                                                           |
| Recommended at L5, capable device                                   | Trials every 5 min, all kept: L0 at 1530 s (25.5 min)                                                                                     |
| Overload, Recommended 60 Hz, steady 30 fps at L0 to L3, `R` 16.67   | Steps down at 50, 80, 110, 140 s to L4 (`I` 33.4 over `B` 20 + 1). Trials of L3 fail at about 7.5, 18 and 38 min, back-off 10, 20, 40 min |
| Overload, Floor, steady 15 fps, `R` 16.67, from L4                  | Steps down to L5 at 50 s (`I` 68 over `B` 50 + 1)                                                                                         |
| Genuine 30 Hz display, Recommended, `R` 33.3, at L0 for 60 min      | No step-down (`B` 40)                                                                                                                     |
| Same, from L1                                                       | Trial L0 at 300 s, kept                                                                                                                   |
| Floor on 30 Hz at L5, ceiling L4                                    | Cap no-op, `I` 33.3: trial L4 at 300 s, kept                                                                                              |
| Lite ceiling L4, full headroom, 60 min                              | Stays at L4                                                                                                                               |
| GPU-bound, no timer, L0 always misses                               | Trials at 5, 15.3, 35.7, 76, 136.3, 196.7 min; each fails 20 s after it starts                                                            |
| Bursty load, 1 min on / 5 min off at L0, 24 h                       | 51 changes; at most 2 per rolling hour after 2 h; 7 in the first hours (revision 3 rules: 720 a day)                                      |
| Bursty sweep: on 0.5 to 10 min, period 3 to 120 min, 4 phases, 24 h | Worst: 4 per rolling hour after 2 h (0.5 min every 36 min), 7 in any hour overall, 96 in 24 h                                             |
| L5 cap, rendered fps (p95 ms) at 144, 120, 75, 60, 50, 30, 24 Hz    | 28.8 (35.5), 30 (34.1), 30.8 (40.1), 30 (33.9), 25 (40.5), 30 (33.7), 24 (42.1): all within `B(L5)` 50 ms                                 |

### Hand-off

- Story #435 must be updated from the new AC 5 text before implementation starts (the owner pastes it into the issue).
- NEXT: reviewer re-review of #384 (SPEC-384 post-merge corrections).
