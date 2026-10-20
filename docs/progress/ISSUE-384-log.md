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

### Owner decisions (2026-10-20)

- 30 fps acceptable at Floor.
- Reduced motion stops auto-rotation and allows on-demand rendering (criteria posted on #385).
- CI perf check wanted, non-gating (story #448; architect review required).
- Simplified earth acceptable at L5 only (lever added to the ladder); profile control in settings approved as a later UX story.
- Night-lights texture: size taken as <= 1024x512 for every tier; source and licence still open (SPEC-384 section 9, item 1).

## Session 5 - final review corrections (2026-10-20)

Applied the "Final review of PR #440 (corrections)" section of `docs/reviews/REVIEW-384.md` to SPEC-384 on `claude/384-followups` (head `35570a6`). Spec and this log only; no `src/`, `.github/` or `scripts/perf/` changes. Following the owner's working style (simplest rule that is sound, risk-averse), each finding was first checked for a simpler rule that removes the whole problem class, rather than adding the reviewer's rules on top.

| Finding         | Fix in SPEC-384                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-B1 (blocking) | The back-off rules are replaced by one trial gate `G`: a trial starts only at least `G` after any level change; `G` is 30 min, doubles after a failed trial (max 4 h) and returns to 30 min when a trial is kept. The bound follows by arithmetic: at most 2 step-ups per 60 min, so at most 4 changes per hour (97 per 24 h) for load at one level and at most 10 per hour (102 per 24 h) for any load. Section 6.2, AC 5, section 10              |
| N-B2 (blocking) | `R` is measured only in calibration pauses (no rendering, 20 intervals or 2 s, 10th percentile, spread and range test). Pauses run when the startup settle ends, before every step-down (re-checked with the new `R`, so a wrong-low `R` cancels instead of stepping down), on a screen change, and hourly while `R` is 20 ms or more (corrects a wrong-high `R` within 60 min). Electron `displayFrequency` seeds `R`. Section 6.2, AC 5, risk row |
| N-S1            | L0 to L5 takes 140 s and L0 to L6 170 s after the overload starts (20 s, then 30 s per level, plus the pauses); first step-down 60 s after the first rendered frame at startup. Section 6.2 and AC 5                                                                                                                                                                                                                                                |
| N-S2            | On-demand rendering and hidden documents put the governor in `Paused`; one frame-loop owner (`frameloop="never"` plus `advance()`) drives every tick, the cap, calibration pauses and #385 invalidations. Section 6.2 (two new paragraphs, "What story #435 needs"), AC 5 "Visibility and on-demand rendering", section 9                                                                                                                           |
| N-S3, N-S4      | Ladder split: L5 = 30 fps cap plus outer atmosphere and wireframe off; L6 = simplified earth that keeps the terminator and night-lights terms, governor only. The AC 8 / section 10 Floor fallback is ceiling L5, never L6. New "Ladder level" column in the 7.1 table and section 7 step 4. Every L0-L5 reference updated (cap, budgets, `T(next)`, caps, recovery)                                                                                |
| N-S5            | Header now says one item (night-lights source and licence) is open. Section 9 rewritten as one decided list; each former open item carries its old number ("was item 6" for the CI check, "was item 2" for reduced motion), so #448 and #385 references resolve                                                                                                                                                                                     |
| N-O4            | A calibration pause is a settle trigger                                                                                                                                                                                                                                                                                                                                                                                                             |
| N-O5            | Moot: only a failed trial doubles `G`; step-downs never change it                                                                                                                                                                                                                                                                                                                                                                                   |
| N-O6            | Section 5: night texture 1024x512 or smaller on every tier (+2.7 MiB, 60.9 MiB total)                                                                                                                                                                                                                                                                                                                                                               |
| N-O7            | Precompile row: on entering a level, the programs of both neighbouring levels are compiled (`compileAsync`); the L6 earth program is compiled when L5 is entered, never at startup                                                                                                                                                                                                                                                                  |
| N-O8            | Section 9 blank line and heading fixed; section 3 no longer calls the probe tolerance a parallel fix                                                                                                                                                                                                                                                                                                                                                |

N-O1 to N-O3 (probe thresholds, runner `onData`, README visibility line) are `scripts/perf/` changes and ride with #448 as the review suggests. N-O9 is an issue-text change on #448 and #431 (handed to the owner).

### What was simplified or removed, and why

- **Back-off machinery removed** (5 to 60 min back-off, "reset only after 30 min held", "a step-down within 30 min of a kept trial counts as a failed trial", per-level memory as suggested in N-B1). Each round found a new flap pattern between these rules. One gate (`G` since any level change) makes the bound a counting argument that an implementation can assert directly. Cost: recovery is 30 min per level (L5 to L0 about 150 min instead of 25.5 min), acceptable on an ambient display.
- **Three `R` sources replaced by one mechanism.** Removed: the "before the first render" sample (busiest phase of startup, B1's own mechanism), updating `R` from L5-skipped ticks (could never fire on a 30 Hz or slower panel, which pinned it at L5), and the 30-interval/3 s fallback. Kept one calibration pause type with one acceptance test. Not adopted: a one-way ratchet on `R` (it cannot follow a real refresh drop without an event) and holding the first render (not needed once the first pause runs at the end of the startup settle, when no decision has been made yet).
- **No pause before a trial revert.** A wrong-low `R` is already corrected by the pause before the first step-down, so a revert pause only mattered when every pause fails, where it cannot help.
- **One frame-loop owner for every level** instead of `frameloop="never"` at L5 only, so the cap, calibration pauses and on-demand rendering share one code path.
- **Added** (needed by N-S3/N-S4, not machinery): ladder level L6. It costs one more step-down (170 s to the bottom) and one more trial (180 min back to L0).

### Simulation (throwaway, not committed)

Window-level model of the simplified rules, written from the new section 6.2 text on top of the reviewer's `gov3.mjs` structure: `gov5.mjs`, `gov5-cases.mjs`, `gov5-flap.mjs` and `gov5-adapt.mjs` in the session scratchpad. Pauses are instantaneous in the model; a pause returns either the true refresh interval, a scripted wrong value, or a rejection.

| Case                                                                               | Result                                                                                                                       |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Recommended 60 Hz unloaded at L1, GPU known or unknown                             | Trial L0 at 30 min, kept                                                                                                     |
| Recommended overload, steady 30 fps at L0 to L3, `W` 14 ms                         | Down at 60, 90, 120, 150 s from startup; holds L4; no trials                                                                 |
| Same, `W` 4 ms, GPU unknown                                                        | Failed L3 trials at 32.5, 92.8, 213.2, 453.5, 693.8 min (then every 4 h)                                                     |
| Overload starting at 600 s, all of L0 to L5 overloaded                             | Down at 20, 50, 80, 110, 140, 170 s after onset: L5 at 140 s, L6 at 170 s                                                    |
| Floor 15 fps, Auto (L4) / Full (L0)                                                | L6 at 90 s / 210 s from startup                                                                                              |
| Genuine 30 Hz, correct pauses, from L0 / from L1                                   | No change in 2 h / trial L0 at 30 min, kept                                                                                  |
| Recommended at L5 / L6, capable device                                             | L0 at 150 min / 180 min                                                                                                      |
| 30, 25, 24 Hz panel, startup pause rejected (`R` 16.7)                             | No level change in 4 h: the pause before the first step-down measures the true interval and cancels it                       |
| 30, 25, 24 Hz panel, Electron reports a wrong 60 Hz                                | Same: no level change                                                                                                        |
| 30, 25, 24 Hz Floor at L4, startup pause rejected                                  | No change (Floor budget 50 ms)                                                                                               |
| Residual: 30, 25, 24 Hz panel, every pause rejected                                | L5 at 180 s and held; failed L4 trials at 33, 93.3, 213.7 min, then every 4 h; never L6                                      |
| 60 Hz, startup pause wrongly 33 ms, steady 30 fps overload                         | Hidden until the hourly pause; first step-down at 61 min                                                                     |
| Same, startup and first hourly pause wrong                                         | First step-down at 121 min                                                                                                   |
| Residual: every pause wrongly 33 ms (non-render main-thread load)                  | No step-down (30 fps on a 60 Hz panel is not acted on)                                                                       |
| GPU-bound, no timer, L0 always misses, from L1, 24 h                               | Failed trials at 30, 90.3, 210.7, 451, 691.3 min, then every 4 h; 16 changes a day                                           |
| Hidden 1810 to 1900 s during the trial                                             | Abandoned and reverted at 30.3 min, `G` unchanged; next trial at 60.3 min, kept                                              |
| Lite ceiling L4, full headroom, 2 h                                                | Stays at L4                                                                                                                  |
| Flap, L0 only, fine grid (on 0.5 to 10 min by 0.5, periods 3 to 120 min, 8 phases) | Worst 4 in any hour, 93 in 24 h (bound 4 and 97)                                                                             |
| Flap, L0 and L1 overloaded (k = 2), fine grid                                      | Worst 5 in any hour (4 after 2 h), 94 in 24 h                                                                                |
| Flap, k = 3 / k = 6, fine grid                                                     | k = 3: worst 6 in any hour (5 after 2 h), 95 in 24 h. k = 6: worst 9 in any hour (6 after 2 h), 98 in 24 h. Bound 10 and 102 |
| Reviewer's failing case, 6 min on every 46 min, L0 only                            | 3 per hour, 63 per day (was 7 and 125)                                                                                       |
| 1 min on, 5 off, L0 only                                                           | 4 per hour, 41 per day                                                                                                       |
| 300 random burst schedules each, k up to 1 / 3 / 6                                 | Worst 4 / 6 / 9 per hour; 62 / 77 / 85 per day                                                                               |
| State-adaptive adversary (load starts 0 to 600 s after every step-up, k 1 to 6)    | Worst 4 per hour, 92 per day                                                                                                 |

### Hand-off

- The owner re-pastes AC 5 into #435 and updates #435's description (ladder L0 to L6, simplified earth at L6, on-demand `Paused`, one frame-loop owner), #448's section reference and the #385 coordination note.
- NEXT: reviewer, spec diff only.
