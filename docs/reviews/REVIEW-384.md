# Code Review: [Spike] Define minimum display target and frame budget

**Issue**: #384 | **Parent feature**: #356 | **Epic**: #348
**Branch**: `claude/384-frame-budget-spike` (commits 58f9d4a, b2a91b6)
**Reviewer**: Reviewer agent | **Date**: 2026-10-18
**Scope**: `docs/specs/SPEC-384.md`, `docs/progress/ISSUE-384-log.md`, `scripts/perf/*`, `.agentx/state/agent-status.json`. The `.claude/` and `CLAUDE.md` changes on the branch were not reviewed.

---

## 1. Executive Summary

### Overview

A documentation-and-tooling spike. It proposes three hardware tiers with frame budgets, captures a container baseline (SwiftShader) for the current globe, sets per-effect cost allocations, a degrade ladder and eight follow-up acceptance criteria. It also adds a dependency-free WebGL probe, a seeded mock backend and two Playwright runners.

### Files Changed (in scope)

| File                              | Lines  |
| --------------------------------- | ------ |
| `docs/specs/SPEC-384.md`          | +279   |
| `docs/progress/ISSUE-384-log.md`  | +74    |
| `scripts/perf/probe.js`           | +302   |
| `scripts/perf/globe-baseline.mjs` | +227   |
| `scripts/perf/cpu-profile.mjs`    | +142   |
| `scripts/perf/mock-server.mjs`    | +107   |
| `scripts/perf/README.md`          | +60    |
| `.agentx/state/agent-status.json` | +11/-5 |

### Verdict

**REQUEST CHANGES (minor, docs only).** The work is good and honest about its limits. All three issue acceptance criteria are covered. Two internal inconsistencies have to be fixed before merge: the texture budget contradicts itself, and the per-element draw-call breakdown is overstated by a probe normalisation bug. Both are small text edits.

| Severity   | Count |
| ---------- | ----- |
| Blocking   | 2     |
| Should-fix | 9     |
| Optional   | 8     |

---

## 2. Findings

### Blocking

**B1. Texture-memory ceilings contradict the terminator allocation and AC 6.**
Baseline is 58.2 MiB.

- Section 5 lets #357 add a Full night texture of 4096x2048 (+42.7 MiB), which gives 100.9 MiB. That is over the section 3 Full ceiling of 96 MiB.
- The Lite/Floor option (2048x1024, +10.7 MiB) gives 68.9 MiB. That is over the Lite/Floor cap of 64 MiB and fails AC 6.

As written, #357 can't pass its own budget.

_Edit (pick one):_

- (a) In section 5, change the #357 Full limit to "night texture 2048x1024 or smaller (+10.7 MiB)". Change Lite to "no night texture (existing city points only) or 1024x512 or smaller (+2.7 MiB)". Change section 9 item 4 to "+2.7 to +10.7 MiB".
- (b) Raise the Full ceiling to 112 MiB and the Floor/Lite cap to 72 MiB in section 3 and AC 6.

Option (a) keeps the current caps.

**B2. Per-element draw-call breakdown doesn't reproduce and doesn't sum to the total.**

- Section 4.2 lists markers ~202 and labels ~60, plus 11 for the other elements. That sums to 273, not 265.
- Cause: `probe.js` adds per-tag calls while sampling, even before the first `tick` and during the final unpushed frame, but divides by `perFrame.length`. At SwiftShader frame rates of 2 to 3 fps, that inflates per-tag values by 3 to 4%.
- Re-run here (24 frames): summary 265 calls (exact). Per-tag markers 204.2 and labels 60.4, which sum to 275.9. Normalised to 265, that is **markers ~196 and labels ~58**.
- `cityData.ts` defines **60** cities, not 61. 58 label textures were uploaded in this view.

_Edit:_

- Section 1: change "76% of draw calls" to "about 74% of draw calls".
- Section 4.2 draw-call row: change it to "markers ~196, labels ~58".
- Section 4.2 texture row: change it to "58 label sprite textures (60 cities defined)".
- Section 4.4 item 1: change "about 202 of 265" to "about 196 of 265".
- Section 4.4 item 5 and the ablation row: change "61" to "60".
- Progress log "Key numbers": change "about 202" to "about 196".
- Optionally fix the probe (see O1) and re-run.

### Should-fix

**S1. The mock server listens on all interfaces.** `server.listen(PORT)` without a host binds `::`/`0.0.0.0` and serves with `Access-Control-Allow-Origin: *`. The data is synthetic and there are no secrets, so risk is low, but it fails the "localhost only" expectation. Default to `127.0.0.1` and add `--host` for the on-device LAN case in README step 1.

**S2. A section 3 metric can't be measured.** Section 3's "Max frames over 66 ms" isn't reported by the probe, which only reports `framesOver33ms` at a 33.4 ms threshold. Section 7.1 records "Frames over 33 ms", which is meaningless at a 30 fps Floor because nearly every frame is around 33.3 ms. Add `framesOver66ms` (and `framesOver50ms`) to the probe summary and align the 7.1 columns with section 3.

**S3. AC 1 says "profile set to Floor", but profiles are Auto/Full/Lite.** Tiers come from capability detection (section 6). State how a test forces a tier (for example a tier override setting or query parameter), or restate AC 1 in terms of the detected tier.

**S4. AC 2's Lite ceiling of 80 or fewer is only reachable after instancing.** Today Lite would be about 265 calls. Say "Lite 80 or fewer (after the marker-instancing story)".

**S5. AC 5 and AC 8 are inconsistent with other sections.**

- AC 5 omits the "5 min since last change" step-up condition shown in the section 6.2 diagram.
- AC 8 requires rows that _meet_ the p95 budget. Section 9 and section 10 only say the table must _have_ results.

Align the wording. Also state what happens to #360/#362 if the Pi 5 fails (the section 10 risk row already gives a path).

**S6. Status text is stale after the owner decisions.**

- Spec header still says "Draft (needs owner decision on hardware tiers)".
- The progress log status says "owner decision needed".
- The log branch row says "(uncommitted)".
- The checklist item "Owner decision on tiers" is unchecked.
- The hand-off line still routes to an owner decision.

Update all of these to reflect the 2026-10-18 decisions, with the section 9 items still open.

**S7. "Every event is three meshes" is imprecise.**

- `EventPulseRing` renders a mesh only when severity is 5 or more, or the event is featured. Its `useFrame` is still registered for every event, because the hook runs before the early return.
- Rings are transparent and `DoubleSide`, so three.js draws each one twice.

Say "two or three meshes per event, three `useFrame` callbacks, double-sided rings draw twice". This explains the ~196 count and makes the AC 3 target of 6 or fewer clear: 3 instanced meshes x 2 passes.

**S8. README step 2 says the WebGL renderer string is "shown in the probe output if you use step 6".** The probe doesn't output it. Add `renderer` to `__wpPerf.stop().summary` (via `WEBGL_debug_renderer_info`), or give a one-line console snippet. Also fix the step reference.

**S9. The default throughput run includes two `ATTRIBUTION` scenarios** (gl.finish around every draw, including at 4K). The spec explicitly excludes their output. A `--quick` run here did not finish within 500 s (cause not isolated; attribution at 4K under SwiftShader is the likely cost). Move them behind an `--attribution` flag.

### Optional

- **O1.** In `probe.js`, only count per-tag calls when `state.cur` is set, and move accumulation into the frame record. This makes per-tag numbers sum exactly to `drawCallsPerFrame`.
- **O2.** Texture accounting is cumulative allocations; `deleteTexture` is not hooked. The spec calls it "texture memory". Rename it to "texture allocations" or hook deletion before AC 6 relies on it.
- **O3.** `npx eslint scripts/perf` passes, but `eslint.config.js` only configures `**/*.{ts,tsx}`, so the `.js`/`.mjs` files are effectively unlinted.
- **O4.** Label the SwiftShader-derived figures reused in section 6.2 ("2.2x measured", "about 17% each") as container/relative.
- **O5.** The `probe.js` header and README step 3 still reference Android TV and TV built-in browsers, which are out of scope after the owner decision. The Recommended row lists iPad under "desktop Chrome/Safari".
- **O6.** Have the probe report the distinct program count, so the 16/12 program ceilings in section 3 are measurable rather than "~9 (estimated)".
- **O7.** `startProc` never clears its 30 s timeout, and `preview.kill()` kills the `npx` wrapper only. Clear the timer and kill the process group.
- **O8.** `agent-status.json` also reformats the engineer `artifacts` array (cosmetic).

---

## 3. Provenance and honesty check (priority 1)

| Claim                                                                             | Result                                                                                                            |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 265 draw calls, 42,552 tris, 15,424 line verts, 858 points, 58.2 MiB @ 50 markers | **Reproduced exactly** (probe, Chromium 141 SwiftShader, 1080p DPR 1)                                             |
| Earth 4096x2048x13 levels, normal 2048x1024x12, label 256x64                      | Reproduced                                                                                                        |
| Per-element breakdown (markers ~202, labels ~60, 61 sprites)                      | **Not reproduced**, see B2                                                                                        |
| fps tables labelled SwiftShader / relative only                                   | Yes. Section 4.3 heading, section 4.5 and the intro all disclaim. No SwiftShader fps is presented as a device fps |
| Tier fps targets marked as unvalidated assumptions                                | Yes (sections 2, 4.5, 10)                                                                                         |
| `gl.finish()` attribution numbers excluded with caveat                            | Yes (spec section 4.5, `probe.js` header)                                                                         |

The relative fps values were not re-run as medians of 3. A single run gave 2.4 fps at 1080p against the spec's 3.3, which is within the documented noise.

## 4. Claims about current code (spot-checked in `src/renderer/components/Globe/`)

| Claim                                                            | Verdict                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Per-event meshes with per-frame callbacks                        | True with nuance (S7): `EventMarker`, `EventRing`, `EventPulseRing` each have a `useFrame`; the pulse ring mesh is conditional |
| DPR not capped                                                   | True: `<Canvas>` (`Globe.tsx` ~line 982) has no `dpr` prop, so the r3f default applies                                         |
| Reduced motion only zeroes amplitudes; still renders and rotates | True: atmosphere, aurora and stars set amplitude 0; `RotatingGlobe` ignores `reducedMotion`; no `frameloop="demand"`           |
| Hidden labels drawn at opacity 0                                 | True: `CityLabels.tsx` uses `opacity={isVisible ? 0.7 : 0}` on every sprite                                                    |
| Per-frame React state in `CityLabelsWithTracking`                | True: `setCameraDistance` inside `useFrame`                                                                                    |
| `SUN_DIRECTION` hard-coded                                       | True: `Globe.tsx` line 69                                                                                                      |

## 5. Acceptance criteria verification

| Issue AC                                         | Status                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1. Target hardware list and frame budget in docs | Met (sections 2 and 3; owner decisions recorded in section 9)                                               |
| 2. Baseline measurements for current globe       | Met for exact counts and relative costs; device numbers deferred by design (section 7.1, AC 8 gate). Fix B2 |
| 3. Lite fallback recommendation                  | Met (sections 5 and 6: bloom, sweep and ping, pulse-ring expansion, fire markers; ladder L0 to L5)          |

Spec section 8 ACs are mostly testable, each with a threshold and a tool. Gaps are B1 (AC 6), S2, S3 (AC 1), S4 (AC 2) and S5 (AC 5, AC 8). They are consistent with epic #348: the cross-cutting "frame-rate budget on the lowest supported display target" is now defined, sweep stays opt-in and off by default, and reduced-motion and colour-independence rules are kept in the "Never" ladder row.

## 6. Security and safety

- No secrets, no API keys, and nothing imported from `src/` (the README claim holds).
- Scripts make no network calls beyond localhost. Chromium's own background traffic was seen by the proxy (`android.clients.google.com`); it does not come from the scripts.
- Writes: only `--out <file>` in `globe-baseline.mjs`, which is opt-in and user-chosen.
- Mock server binds all interfaces (S1).

## 7. Severity Gate

**Respected.** The branch has no changes under `src/shared/**`, `src/server/**`, `.github/workflows/**` or `*Contract*|*Schema*|*Types*` files (`git diff origin/main...HEAD --name-only` filter returned nothing). The proposed CI perf job is correctly flagged as high-risk (section 9 item 6).

## 8. Testing

There is no `src/` change, so there are no unit tests and coverage is unaffected. The scripts are measurement tooling, not product code.

## 9. Checks run

| Command                                                                                                 | Result                                                                 |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `node --check` on all 4 scripts                                                                         | Pass                                                                   |
| `npx eslint scripts/perf`                                                                               | Pass (0 problems; see O3, no rules apply to .js/.mjs)                  |
| `npx prettier --check scripts/perf docs/specs/SPEC-384.md docs/progress/ISSUE-384-log.md`               | Pass                                                                   |
| Probe against `vite preview` + `mock-server.mjs --markers 50`, 1080p DPR 1, `/opt/pw-browsers` Chromium | 265 calls / 42,552 tris / 58.2 MiB reproduced; per-tag bias found (B2) |
| `node scripts/perf/globe-baseline.mjs --quick`                                                          | Did not complete within 500 s (S9)                                     |
| `git diff origin/main...HEAD --name-only` gate filter                                                   | No high-risk paths                                                     |

## 10. Next steps

The Architect (spec author) applies B1 and B2, plus S1 to S9 where practical, and then re-requests review. No `src/` changes are needed.

---

## Re-review (revision 2)

**Head**: `df2a424` (on top of 58f9d4a, b2a91b6) | **Reviewer**: Reviewer agent | **Date**: 2026-10-18
**Scope**: same as above. The diff `b2a91b6..df2a424` covers `docs/specs/SPEC-384.md`, `docs/progress/ISSUE-384-log.md`, `scripts/perf/*`, this file and `.agentx/state/agent-status.json`.

### Verdict

**APPROVE.** Both blocking findings and all nine should-fix findings are resolved. Re-measurement reproduces the corrected numbers exactly. One new optional nit is listed below and does not block merge.

| Severity (new) | Count |
| -------------- | ----- |
| Blocking       | 0     |
| Should-fix     | 0     |
| Optional       | 1     |

### Correction to the first review

`cityData.ts` defines **58** cities, not 60. `grep -c "{ name:" src/renderer/components/Globe/cityData.ts` returns 58. A plain `grep -c "name:"` returns 59 because it also matches the `name: string` interface field on line 7. That matches the 58 label textures and the 58 `labels` draw calls the probe measured. The architect's correction is right, and B2's suggested "60 cities defined" edit was wrong. The spec now says 58 everywhere (sections 4.2, 4.3 and 4.4).

### Status of previous findings

| ID  | Status       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **Resolved** | Option (a) taken; caps unchanged (section 3: 96 MiB Full, 64 MiB Lite). Section 5 adds the arithmetic. Full: 58.2 + 10.7 = 68.9 MiB, under 96. Lite: 58.2 + 2.7 = 60.9 MiB, under 64. The #357 row says 2048x1024 or smaller in Full and none or 1024x512 or smaller in Lite. Section 9 item 4 says +2.7 to +10.7 MiB. AC 6 uses the same 64/96 caps. Mip-chain sizes check out (2048x1024x4x4/3 = 10.67 MiB; 1024x512 = 2.67 MiB). |
| B2  | **Resolved** | The probe accumulates per-tag counts in completed frame records only (`account()` returns early without `state.cur`; `stop()` sums `perFrame[].tagCalls`). Section 4.2 now reads 196 + 58 + 11 = 265. Re-run: per-tag sum equals `drawCallsPerFrame` in all 6 scenarios (265 x 5, 0 for clear-only; 77 at 0 markers). Section 1 says "about 74% (196 of 265)". Section 4.4 item 1 derivation 52x1 + 52x2 + 20x2 = 196 holds.        |
| S1  | **Resolved** | `mock-server.mjs` binds `HOST` (default `127.0.0.1`; `--host`/`PERF_MOCK_HOST` to override). Verified: startup log reads `listening on 127.0.0.1:3911`. The README step 1 LAN case is documented with a trusted-network warning.                                                                                                                                                                                                    |
| S2  | **Resolved** | The probe reports `framesOver50ms`, `framesOver66ms` and `pctFramesOver66ms` (66.7 ms threshold). The section 3 column-to-field mapping is added. The section 7.1 columns are aligned, and `framesOver33ms` is marked informative.                                                                                                                                                                                                  |
| S3  | **Resolved** | AC 1 requires a test-only tier override (for example `?tier=`) set before canvas mount, and separates tier (DPR cap) from profile (Auto/Full/Lite).                                                                                                                                                                                                                                                                                 |
| S4  | **Resolved** | AC 2 and the section 3 table say Lite 80 is only reachable after marker instancing (today about 265; markers + labels = 254).                                                                                                                                                                                                                                                                                                       |
| S5  | **Resolved** | AC 5 includes the 5-minute step-up rule. AC 8, section 9 and section 10 all require rows that **meet** the p95 budget. AC 8 and section 10 state the Pi 5 failure path, and #360/#362 stay blocked until a Floor row passes.                                                                                                                                                                                                        |
| S6  | **Resolved** | The spec header reads "In review, revision 2" and the log status matches. The owner-decision checklist item is checked. Hand-off routes to the reviewer. No "owner decision needed" text remains. Leftover nit: see N1.                                                                                                                                                                                                             |
| S7  | **Resolved** | Section 4.4 item 1 now says two or three meshes per event, three `useFrame` callbacks (registered before the early return) and double-sided rings drawn twice.                                                                                                                                                                                                                                                                      |
| S8  | **Resolved** | The summary includes `renderer` (via `WEBGL_debug_renderer_info`). Re-run shows `ANGLE (Google, Vulkan 1.3.0 (SwiftShader ...))`. README step references point to step 5.                                                                                                                                                                                                                                                           |
| S9  | **Resolved** | Attribution scenarios are behind `--attribution`. `--quick` completed in **264 s** here (spec and log say 248 s, within run-to-run variation).                                                                                                                                                                                                                                                                                      |

Optional items: O1, O4, O5, O6 and O7 are addressed. O6: `programsCreated` = 10 in all scenarios, matching section 3. O7: process groups and a cleared readiness timer; no leftover `vite preview` or mock processes after the run. O2 is handled by documentation (AC 6 calls the figure an upper bound), which is acceptable for a spike. O3 and O8 remain open, as the log explains; neither blocks merge.

### New finding

- **N1 (optional).** `docs/progress/ISSUE-384-log.md` line 11 still says "revision 2 uncommitted". Revision 2 is now committed as `df2a424`. Update it when the branch is next touched.

### Stale-number sweep

`grep -nE "\b202\b|\b61\b|76%|100\.9|owner decision needed|needs owner decision|uncommitted"` over the spec, log and `scripts/perf/*` found:

- 202: one hit, in the log line explaining that the session 1 figure of about 202 was inflated (intended history).
- 61: one hit, a PRNG constant in `mock-server.mjs` (not a count).
- "uncommitted": N1.
- 76%, 100.9 and "owner decision needed": no hits.

The spec has no stale numbers. Internal consistency also checks out: 265 and 196/58 match across sections 1, 3, 4.2, 4.4 and AC 2; the texture caps match across sections 3 and 5, section 9 item 4 and AC 6; the p95 "meets" wording matches across AC 8 and sections 9 and 10.

### Re-run notes

Single `--quick` rep (SwiftShader, not comparable to the section 4.3 medians of 3):

| Scenario       | fps  | Draw calls |
| -------------- | ---- | ---------- |
| 0 markers      | 4.8  | 77         |
| 50 markers     | 2.3  | 265        |
| DPR 2          | 1.2  | 265        |
| 4K             | 1.3  | 265        |
| Reduced motion | 2.6  | 265        |
| Clear only     | 36.5 | 0          |

Triangles were 42,552 and textures 58.2 MiB. Exact counts reproduce. The fps values are lower than the spec's medians but in the same rank order (DPR 2 and 4K slowest), which is consistent with the documented noise. The probe reports `textureCount` 68 (58 labels, earth, normal map, plus small three.js/app textures). The spec makes no claim about the total count, so there is no conflict.

### Checks run (revision 2)

| Command                                                                                                                         | Result                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `node --check` on `scripts/perf/{probe.js,cpu-profile.mjs,globe-baseline.mjs,mock-server.mjs}`                                  | Pass (4/4)                                                                     |
| `npx prettier --check docs/specs/SPEC-384.md docs/progress/ISSUE-384-log.md docs/reviews/REVIEW-384.md scripts/perf`            | Pass (before this section was appended; re-checked after)                      |
| `grep -c "{ name:" src/renderer/components/Globe/cityData.ts`                                                                   | 58                                                                             |
| `node scripts/perf/globe-baseline.mjs --chrome /opt/pw-browsers/chromium-1194/chrome-linux/chrome --quick --out <scratch>.json` | Completed in 264 s; per-tag sum = total in 6/6 scenarios; `programsCreated` 10 |
| `node scripts/perf/mock-server.mjs --port 3911 --markers 1`                                                                     | Logs `listening on 127.0.0.1:3911`                                             |
| `git diff origin/main...HEAD --name-only` filtered for `src/`, `.github/`, `*Contract*`, `*Schema*` and `*Types*`               | No matches; severity gate respected                                            |

### Next steps

Ready for a PR with `Closes #384` when the owner asks for one. N1 can be fixed in that PR. The on-device rows (section 7.1) and section 9 items 1 to 6 remain owner actions and do not block this spike.

---

## Re-review (revision 3, post-merge): governor redesign and probe changes

**Scope**: what changed after revision 2 and merged in PR #438 (`99fa237`): SPEC-384 sections 3, 4.1 to 4.4, 6.2, 7, 8 (AC 3, AC 5) and 10; `scripts/perf/probe.js`, `cpu-profile.mjs`, `globe-baseline.mjs`, `README.md`. Reviewed on `claude/384-followups` (at `origin/main` `99fa237`). Date: 2026-10-19.

### Verdict

**REQUEST CHANGES (spec only; fix before story #435 starts).** The probe change, the marker derivation and the runner `finally` blocks are correct. The governor fixes the "can never step up" defect, but the new `1.2 x R` budget floor brings in a worse one. `R` is taken from the browser's rAF ticks, and when the app renders on every tick those ticks slow down with the render. So a device under steady overload looks the same as a slow display, and the governor **never steps down**. That includes the Pi 5 case the governor exists for. AC 5's "Slow display" test locks this behaviour in. Five governor rules are also underspecified or flap-prone, and two runner and probe defects mislead measurements.

| Severity   | Count |
| ---------- | ----- |
| Blocking   | 1     |
| Should-fix | 9     |
| Optional   | 8     |

### Simulation

I wrote a throwaway model of the section 6.2 rules as written. It was not committed. It uses 10 s windows with inputs `I`, `R` and `W` per window. Step-down needs 2 consecutive windows over `B`. Step-up needs 60 s of `W <= 50% T(next)` plus the back-off, then a 2-window trial. The script was `gov.mjs` in the session scratchpad.

| Case                                                                         | Spec's stated behaviour                  | Simulated result                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (i) Recommended, 60 Hz, unloaded, at L1, `W` 4 ms                            | Trials L0 and keeps it                   | Holds: trial at 300 s, kept at 320 s. `B` = max(20, 1.2 x 16.67) = 20.0 ms                                                                                                                       |
| (ii) Recommended at L5 (rAF 16.7 ms, rendered 33.3 ms), capable device       | Trials L4 and keeps it                   | Holds. L5 to L0 takes 5 trials, 26.7 min. `B(L5)` = max(50, 20) = 50 ms, consistent. `T(L5)` is never evaluated, because `T` is only read for the next _better_ level (O1)                       |
| (iii) Floor on a 30 Hz display, L0 to L4                                     | No step-down                             | Holds: `B` = max(50, 40) = 50, `I` = 33.3. At **L5**, a tick-parity cap gives 15 fps (`I` 66.7 > 50). The governor can't step lower or become eligible to step up, so it is stuck at 15 fps (S5) |
| Overload: Recommended, 60 Hz, steady 30 fps at L0 to L3 (rAF follows render) | Step down                                | **Never steps down** in 10 min. `R` = 33.3, so `B` = 40 and `I` = 33.4 (B1)                                                                                                                      |
| Overload: Floor Pi at steady 15 fps                                          | Step down                                | **Never steps down.** `R` = 66.7, so `B` = 80 and `I` = 68 (B1)                                                                                                                                  |
| (iv) Load bursts of 1 min every 6 min, fine at L1                            | Bounded by back-off (5 to 60 min)        | **720 level changes in 24 h** (L0 to L1 to L0 every ~6 min, forever). A successful trial resets the back-off, and a step-down soon after a successful trial is not counted as a failure (S1)     |
| (vi) GPU-bound without a timer query, L0 always misses                       | At most 20 s of misses every 5 to 60 min | Holds. Trials at 5, 15, 35 and 75 min, then every 60 min, each failing in 10 s (one window)                                                                                                      |

(v) **Variable refresh / noise.** On a 59.94 Hz display, `R` 16.68 gives `B` 20.02. That is harmless. 24 Hz and 50 Hz TV modes are fine (`B` 50.0 and 24 ms). The real `R` problem is B1, not noise. (vi) **No GPU timer.** `W` is defined without it ("where the extension exists"), and the worked cases state the optimistic eligibility, so that part is stated. (vii) **Hidden tab.** It is covered in the diagram, but the details are open (O3).

### Blocking

**B1. The `1.2 x R` floor hides steady overload, and AC 5 "Slow display" requires that.** (SPEC-384 section 6.2 `R` and `B(level)` rows, AC 5.)

- Browsers run one rAF callback per main-thread frame. If the frame's work takes 25 ms, or the GPU pipeline is full, the next tick is late too.
- So with r3f's `frameloop="always"` (every level except L5), the rAF tick interval equals the rendered-frame interval. `R` = median rAF interval is the achieved frame time, not the display refresh.
- A device stuck at a steady 30 fps on a 60 Hz panel produces exactly the AC 5 "Slow display" inputs: rAF 33.3 ms, rendered 33.3 ms. The AC says that must not step down.
- `B` grows with the slowdown, so step-down only happens when `I`'s p95 exceeds 1.2 x its own median. In other words, only jitter triggers it, never uniform slowness. A fanless Pi that throttles to a steady 15 fps is never degraded.

Suggested edits:

1. Replace the `R` row with: "`R`: the display refresh interval, **measured while the app is not render-bound**. It is the median rAF interval over (a) about 1 s of ticks at startup before the globe canvas first renders, and (b) any window in which the app skipped renders (the L5 cap), which leaves the rAF cadence free. Re-measure (a) when the window changes screen (`window.screen` / `devicePixelRatio` change, Electron `display-metrics-changed`). Never derive `R` from a window in which every tick rendered: there the rAF interval is the render time."
2. Add to "What story #435 needs": "a calibrated refresh interval `R` as an injected input, with the calibration rule above".
3. Rewrite AC 5 "Slow display": "**Slow display:** calibrated `R` 33.3 ms (30 Hz display), and rAF and rendered intervals at 33.3 ms on Recommended, cause no step-down."
4. Add an AC 5 bullet: "**Overload is not a slow display:** calibrated `R` 16.7 ms, and rAF and rendered intervals both at a steady 33.3 ms with work p95 14 ms, step down one level within 21 s."

### Should-fix

**S1. The anti-flap rule can't stop periodic flapping** (section 6.2 `back-off` row, diagram, AC 5 "Failed trial", section 10 risk row). A successful trial resets the back-off to 5 min, and a step-down shortly after a trial passes doesn't count against it. With intermittent load the ladder oscillates every ~5 to 6 min indefinitely (simulated: 720 changes a day). This is the "visible quality oscillation" that section 6.1 and the section 10 risk row say hysteresis prevents. Edit the `back-off` row to: "...reset to 5 min only after the trial level has been held for 30 min. A step-down within 30 min of a successful trial counts as a failed trial (back-off doubles)." Add an AC 5 bullet: "**Flap bound:** with load alternating 1 min on, 5 min off at L0 only, the governor makes no more than 6 level changes per hour after the first hour."

**S2. Step-down cadence and the settle period are unspecified** (diagram `StepDown --> Steady`, AC 5 "Step-down").

- The spec doesn't say that the consecutive-window counter and the 60 s headroom counter reset on a level change. Without the reset, sustained overload drops a level every 10 s instead of every 20 s.
- Two kinds of transition hitch are not excluded. The first is the startup shader compile, which section 4.3 measured at ~6 s on SwiftShader and is unknown on the Pi. The second is a level change: re-enabling bloom compiles new programs, and L4 resizes the canvas.
- A first-time trial of a level that needs a new program can therefore fail on its compile hitch alone.

Edit section 6.2: "All window counters reset on any level change. The window in which a level change, startup, or visibility return happens is discarded. Before a trial switches level, the effect's programs are precompiled (for example three.js `compileAsync`), or the trial's first window is discarded." Add to AC 5 "Step-down": "...and with overload sustained, consecutive step-downs are at least 20 s apart (L0 to L5 takes at least 100 s); at L5 a further step-down is a no-op."

**S3. `W` adds CPU and GPU time, but section 3 says they overlap** (section 6.2 `W` row). On a device with the timer extension, CPU 5 ms plus GPU 5 ms gives `W` = 10 ms, which is over 8.35 ms. That device is never eligible to step up, even though each part fits the section 3 per-part budgets (8 and 11 ms). Edit: "`W`: the larger of (p95 main-thread render-loop time) and (p95 GPU time from `EXT_disjoint_timer_query_webgl2`, where available; results arrive a few frames late and disjoint results are discarded)."

**S4. The 50 ms budget sits exactly on a vsync multiple** (sections 3 and 6.2, AC 8, probe `framesOver50ms`).

- On 60 Hz, 50 ms is three ticks. At a 30 fps Floor or the L5 cap, every slipped frame lands at 50.0 ms plus or minus timestamp jitter.
- So `I > B` (and "p95 50 ms or less" in a 7.1 row) passes or fails at random once more than 5% of frames slip once.
- The probe's comment says its thresholds "sit just above" 1, 1.5 and 2 frames, but `over(fi, 50)` sits exactly at 1.5 frames, unlike 33.4 and 66.7.

Edit section 3 under the field mapping: "Budget comparisons allow 1 ms for timestamp jitter: a p95 of 50.9 ms meets a 50 ms budget." Use `I > B + 1 ms` in the step-down rule. In `probe.js`, use `framesOver50ms: over(fi, 50.1)` (or fix the comment).

**S5. The L5 cap implementation is unspecified, and the obvious ones break on slow displays** (section 6.2 "What story #435 needs", ladder L5).

- Skipping every other tick gives 15 fps on a 30 Hz display.
- A strict "render when elapsed time is at least 33.3 ms" skips ticks that arrive at 33.2 ms, giving 15 fps on 30 Hz and intermittent 50 ms on 60 Hz.
- Either way `I > B(L5)` blocks eligibility, so the governor is stuck at L5.

Add: "The L5 cap renders on a tick when the time since the last render is at least 33.3 ms minus `R`/2, and is a no-op when `R` is 30 ms or more." Add an AC 5 bullet: "**Cap on slow displays:** at L5 with `R` 33.3 ms, rendered intervals stay at about 33.3 ms." Also state whether `useFrame` callbacks skip with the render. The power argument for the cap needs them to, which means r3f `frameloop="never"` plus `advance()` rather than a priority `useFrame` that only skips `gl.render`.

**S6. The mapping from profile to ladder level is missing**, but the "within user cap" test depends on it (sections 2, 5, 6.1, 6.2, AC 5 "Caps"). Neither "Full" nor "Lite" is mapped to an L-level, and no initial level is given per tier for Auto. Add a row under the ladder: "Profiles: Full = ceiling L0; Lite = ceiling L3 (bloom, sweep off; static rings). Auto starts at L0 on Recommended and Showpiece and at L3 on Floor. The 30 fps cap (L5) is reached only by the governor." The architect should confirm the actual values.

**S7. The runners treat "port in use" as ready** (`globe-baseline.mjs` line 178, `cpu-profile.mjs` line 71). The readiness regex `/4173/` also matches vite's stderr `Error: Port 4173 is already in use`. I checked by holding 4173 with a dummy server: `cpu-profile.mjs` went on, started the mock and reached the browser launch. With a valid `--chrome` it would have profiled **whatever is already on 4173**, for example a stale preview of another build. The README line "stop every process ... if any setup step fails, for example a taken port" is untrue for 4173. The session 3 log tested only port 3000 being taken. Edit both runners to use `startProc('npx', [...], /localhost:4173/)`. In `onData`, reject when `/already in use|EADDRINUSE/` matches.

**S8. Ctrl+C orphans `vite preview`.** The children are spawned `detached: true` (their own process group), so a terminal SIGINT doesn't reach them, and `finally` doesn't run on a signal. I sent SIGINT to the runner's group 12 s into `globe-baseline.mjs --quick`, and `npm exec vite preview` (3 processes) kept port 4173. Port 3000 was free afterwards. This predates revision 3. Add to both runners, after `startProc` is defined: `for (const s of ['SIGINT', 'SIGTERM']) process.once(s, () => { [mock, preview].forEach((p) => p && stopProc(p)); process.exit(130); });`. In `globe-baseline.mjs`, hoist the current mock into a module variable so the handler can reach it. Also add `p.on('error', reject)` in `startProc`: a missing `npx` is otherwise an unhandled `error` event.

**S9. The probe counts draws from every WebGL2 context.** The rendered-frame rule and the per-tag counts use draws from any context on the page. The app has a second r3f `<Canvas>`: the Sky Map modal (`SkyMap.tsx`). Its `meshBasicMaterial` draws fall through `refineBasic` into **`markers`**, its sprites into `labels` and its lines into `graticule`. I checked with a synthetic page (one context capped to every second tick, plus a second context drawing every tick). The probe reported 59.6 rendered fps instead of 29.6, and 3 draws per frame. If the modal is open on a device, the 7.1 numbers and the AC 2 and AC 3 counts are wrong without any warning. The minimum fix is in README step 4 and SPEC section 7 step 2: "Keep the Sky Map modal closed while sampling." The better fix is to count only draws on the context of the largest canvas, or the first context that uses a `MeshStandardMaterial` program, and add `contexts` to the summary.

### Optional

- **O1.** `T(level)` "33.3 ms at L5" is never evaluated. Delete it, or say `T` applies to the next better level only.
- **O2.** In the diagram, `Initial: capability detection (B)` reads as the budget `B`. Write "(option B, section 6.1)".
- **O3.** Hidden tab. Say that the interval spanning a hidden period is discarded and that counters reset on `Paused`. Say whether an abandoned trial doubles the back-off (suggest: no, the back-off restarts). Add "keep the page visible while sampling" to the README, because the probe has no visibility handling.
- **O4.** Provenance wording (section 4.1). `12bec81` includes `903d71c` (three 0.186.1), so the counts describe "`src/` of `7dbd9d5` built with three 0.186.1", not "the app as of `7dbd9d5`". `12bec81` is also a pre-squash branch commit. Citing `99fa237` is safer: its `src/` is identical (`git diff --quiet 7dbd9d5 99fa237 -- src` exit 0), and a fresh `vite build` reproduces the section 4.2 bundle sizes exactly.
- **O5.** The header still says "In review, revision 2", but the spec is merged with the revision 3 governor.
- **O6.** On-device runs with geolocation granted add home-beacon draws to `markers`. Note this next to AC 2 and AC 3 so a device run isn't read as a regression.
- **O7.** `rafCallbackMsP95` is per callback, not per frame. That is fine today (one r3f loop, no other rAF users in `src/`), but say so in section 3's field mapping.
- **O8.** The step-up rule's 50% of `T` equals the section 3 main-thread budget (8 ms at Recommended). The section 4.3 container p95 at 50 markers is 10.8 ms, so on a CPU like that a Recommended device never steps back up from L1 until marker instancing lands. That is consistent, but worth one sentence in the worked cases.

### Verified correct

- **Marker derivation.** I re-ran the mock's seed through the `Globe.tsx` selection: featured-first sort, `deduplicateNearbyEvents` with 5 degrees, `MAX_MARKERS` 50, pulse at severity 5 or more or featured, and `FEATURED_WINDOW_MS` 30 min for the auto-featured pick. Result: featured `perf-1` (severity 9); 0 dropped by dedup; `perf-10` (0.1) and `perf-41` (0) dropped by the cap; 50 mounted; 23 pulse rings, with no severities at exactly 5. That gives 50 + 100 + 46 = **196**.
- **Totals.** 196 + 58 + 11 = 265. 0 markers: 2 spheres + 4 ring passes + 2 aurora pulse passes + 69 = 77. `EventPulseRing` calls `useFrame` (line 347) before its early return (line 357).
- **Unchanged `src/`.** `git diff --quiet 7dbd9d5 HEAD -- src` exits 0, and `git log 7dbd9d5..HEAD -- src` is empty.
- **Rendered-frame definition.** With a single context it counts correctly. Every tick: 180 rendered / 180 rAF, p95 16.7. Every second tick: 89 rendered / 179 rAF, p95 33.4, `rafIntervalMsP95` 16.7. First tick: the start tick is the reference, and `renderedFrames` equals the number of rendered intervals. `setSkip` draws still count as issued. Context loss stops three.js rendering, so the result is a gap, not a miscount. DPR is read at `stop()` only, which is acceptable.
- **Field names.** `renderedFrames`, `rafTicks`, `rafFpsMean`, `rafIntervalMsP50/P95`, `frameMs*`, `framesOver*` and `rafCallbackMs*` are used consistently in `probe.js`, the README, SPEC sections 3, 7 and 7.1, and both runners. `cpu-profile.mjs` divides by `renderedFrames`. No stale `frames` field remains.
- **The old 70% rule.** "70%" appears only in the section 3 budget diagram (working budget) and in the two passages that explain why the old rule was removed. There is no live use.
- **Consistency of governor text.** Section 6.2 (table, diagram, worked cases, what #435 needs), AC 5 and the section 10 risk row agree with each other: 2-window step-down, 60 s / 50% headroom, 20 s trial, 5 to 60 min back-off, `B(L5)` 50 ms. AC 8 and the section 3 budgets agree. Issue #435 was not readable here; the AC 5 text is the reference. B1, S1, S2 and S5 change AC 5, so #435 must be updated from the corrected text.
- **Runner cleanup on a failed launch.** With `--chrome /nonexistent/chrome`, both runners exit 1 with ports 3000 and 4173 free and no vite or mock processes left. Timers are cleared on ready, exit and timeout. `stopProc` kills the process group.

### Checks run (revision 3)

| Command                                                                                                              | Result                                                                                             |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `node --check` on the 4 `scripts/perf` files                                                                         | Pass (4/4)                                                                                         |
| `npx prettier --check docs/specs/SPEC-384.md docs/reviews/REVIEW-384.md docs/progress/ISSUE-384-log.md scripts/perf` | Pass (re-checked after this section was appended)                                                  |
| `git diff --quiet 7dbd9d5 HEAD -- src`                                                                               | Exit 0                                                                                             |
| `npx vite build`                                                                                                     | vendor-three 1,168.61 kB, main 601.39 kB, CSS 44.81 kB: matches section 4.2                        |
| Scratch marker selection model (mock seed plus `Globe.tsx` rules)                                                    | 50 mounted, 23 pulse, 196 draws                                                                    |
| Scratch governor model (section 6.2 as written)                                                                      | Cases (i), (ii) and (vi) hold; overload never steps down (B1); 720 changes a day under bursts (S1) |
| `node scripts/perf/{globe-baseline,cpu-profile}.mjs --chrome /nonexistent/chrome`                                    | Exit 1; ports free; no stray processes                                                             |
| Same `cpu-profile.mjs` run with port 4173 held by a dummy server                                                     | Went past the preview step into browser launch (S7); ports free afterwards                         |
| SIGINT to the `globe-baseline.mjs --quick` process group after 12 s                                                  | `vite preview` orphaned on 4173 (S8); killed by hand                                               |
| Playwright synthetic page plus pasted `probe.js` (every tick, capped, capped plus second context)                    | 180/180, 89/179, 179/179 rendered/rAF (S9)                                                         |
| `grep -n "70%"` on the spec, scripts and review                                                                      | No live use of the removed rule                                                                    |

### Next steps

The architect fixes B1 and S1 to S6 in SPEC-384 (section 6.2, AC 5, and the section 3 tolerance note) on a follow-up branch, and the engineer fixes S7 to S9 in `scripts/perf/`. The owner then updates story #435 from the corrected AC 5 before anyone implements the governor. None of this touches `src/`, `.github/` or contract files.
