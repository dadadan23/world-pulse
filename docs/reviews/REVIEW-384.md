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
