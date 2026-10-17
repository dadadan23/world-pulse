# Next-Phase Proposal: Epics and Features

**Status:** Issues created (see the index at the end). Content remains open to owner refinement.
**Mockups:** [`next-phase-concepts.html`](../prototypes/next-phase-concepts.html) (static frames) and [`mode-deck.html`](../prototypes/mode-deck.html) (interactive toggle prototype). Open in a browser; all data is illustrative.
**Context:** The tracker has zero open issues and no defined next phase (see `CLAUDE.md`, "Backlog Refinement Findings"). This proposal is input to that decision, not a commitment.

## Inspirations in one paragraph

Film and TV interface design (LCARS restraint, Oblivion linework, Territory Studio and BLIND-style "narrative before function" displays) shares a few traits: quiet screens, fine technical detail, one dominant hue with a reserved alarm color, and each display telling a small story. World Pulse already has the palette, type and motion tokens (`DESIGN.md`). What it lacks is _context_ (is this normal?), _cinematic hierarchy_ (what matters right now?) and more _data worth looking at_.

## What already exists (do not rebuild)

| Capability                                                | Where                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| Night-side city lights, day/night shader                  | `Globe.tsx` (sun direction is a **fixed constant**, not real time) |
| ISS ground-track arc (great-circle approximation, no TLE) | `Globe/issGroundTrack.ts`                                          |
| Aurora zone                                               | `Globe/auroraZone.ts`                                              |
| Severity ordering, pulse, chime, mute                     | Epic #228                                                          |
| Historical enrichment, Past Echoes                        | Epic #143, `collectors/historical.ts`                              |
| Collector health and degraded UX                          | Epics #23, #26                                                     |
| Ambient settings (mutes, location, ticker speed)          | Epic #226                                                          |

---

## Epic 0: Mode Deck (toggleable display modes)

**Problem:** Each new effect or layer would otherwise need its own buried setting. The display should be easy, fun and satisfying to reconfigure, and calm by default.
**Outcome:** One mode system and one toggle experience that every other epic plugs into. Prototype: [`mode-deck.html`](../prototypes/mode-deck.html).

**The UX treatment:**

| Element         | Behavior                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Mode chips      | Glyph, name, hotkey, LED. Tap or press `1-8` to toggle.                                                                            |
| Engage feedback | Corner brackets close, LED lights, 60 ms globe glitch, toast names the mode, optional rising/falling blip. Off is quieter than on. |
| Peek            | Hold a key or chip to preview; release and it reverts. Trying a mode is never a commitment.                                        |
| Scenes          | One tap swaps a bundle: Ambient, Analyst, Cinema, Storm.                                                                           |
| Showtime        | Auto-cycles scenes on a timer for walk-by displays.                                                                                |
| Idle            | Deck collapses to an LED strip after about 6 s; any pointer, key or remote press wakes it.                                         |
| Input           | Mouse, touch, keyboard, TV remote (arrows plus Enter).                                                                             |
| Safety          | Sound off by default; reduced-motion disables brackets, glitch, sound and flicker.                                                 |

| #   | Feature                                                        | Size |
| --- | -------------------------------------------------------------- | ---- |
| 0.1 | Mode registry and persisted state (extends `useSettingsStore`) | S    |
| 0.2 | Mode Deck UI: chips, LEDs, keyboard and remote navigation      | M    |
| 0.3 | Engage feedback: brackets, glitch, toast, optional sound       | M    |
| 0.4 | Peek: hold to preview                                          | S    |
| 0.5 | Scenes and Showtime                                            | M    |

Modes planned for the registry: Terminator, Callouts, Sweep, Fires, Space Wx, Baselines, Phosphor, Alert drill.

---

## Epic 1: Living Globe (cinematic visual language)

**Problem:** The globe is accurate but static in meaning. Nothing distinguishes the one event that matters from the rest, and quiet periods look dead.
**Outcome:** Visual hierarchy that makes the display glanceable from across a room, without adding noise.

| #   | Feature                            | Summary                                                                                                                   | Size | Notes                                                                                             |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| 1.1 | Live solar terminator              | Compute the subsolar point from UTC and drive the shader and city lights from it. Optional dashed terminator line.        | S    | Smallest change with the largest "alive" effect. Pure renderer.                                   |
| 1.2 | Tactical callout                   | Leader line from the featured event to a readout (coords, local time, depth, age).                                        | M    | Extends featured-event logic. Needs collision rules for panel overlap and portrait layout (#227). |
| 1.3 | Magnitude pulse rings              | Expanding rings scaled to severity or magnitude, 3 s period.                                                              | S    | Reuse `--ob-timing-pulse`. Cap concurrent rings.                                                  |
| 1.4 | Sweep and ping                     | Optional 6 s scan arc; markers flash as it passes.                                                                        | M    | Opt-in setting, off by default. Watch GPU cost on low-end hardware.                               |
| 1.5 | Calm and alert mode                | Critical event (severity 7+) dims the UI, recenters the globe, holds a dominant callout for a bounded time, then returns. | M    | Builds on #228. Needs a hold-time setting and a mute override.                                    |
| 1.6 | Phosphor texture and burn-in drift | Optional scanlines and bloom; slow pixel-shift drift for 24/7 panels.                                                     | M    | Burn-in protection is a real benefit for TV deployments.                                          |

**Cross-cutting acceptance criteria (all features):**

- Every animated element honors `prefers-reduced-motion` (existing pattern: `reducedMotion` in `Globe.tsx`).
- Each effect has a toggle in the ambient settings panel.
- Severity color mapping in `DESIGN.md` is unchanged; no new raw hex values.
- Meets a frame-rate budget on the lowest supported display target (to be set by a spike; see open questions).
- Color is never the only severity signal (shape, label or motion also carries it).

## Epic 2: Context at a Glance (baselines and provenance)

**Problem:** A reading of "31 earthquakes" means nothing without knowing whether that is normal. Stale or degraded sources are not obvious on an ambient display.
**Outcome:** The display answers "is this unusual?" and "can I trust this?" without interaction.

| #   | Feature                  | Summary                                                                                        | Size | Notes                                                                                                                                                            |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Baseline engine          | Rolling median (for example 30 days) per event type, computed server-side from stored history. | M    | **High-risk surface** (`src/server/**`, likely `src/shared/types.ts`): architect review. Needs enough history; define cold-start behavior.                       |
| 2.2 | Now-versus-normal gauges | Ring gauges and 30-day sparklines in the HUD.                                                  | M    | Depends on 2.1. Must explain "normal" in the UI to avoid false alarm.                                                                                            |
| 2.3 | Data-lineage footer      | Per-source name, last update, and state (live, stale, degraded).                               | S    | Collector health already exists; this is mostly presentation. Show expected latency (for example satellite sources) so "slow by design" is not read as "broken". |
| 2.4 | ISS pass prediction      | Upcoming pass over the user's location, shown as a track and countdown.                        | L    | Replaces the approximation in `issGroundTrack.ts`. Needs a TLE source and propagation, which the PRD (OQ-3) deferred. Treat as a spike first.                    |

## Epic 3: New Data Layers, Wave 1

**Problem:** The current layers are geophysical and astronomical. Active hazards and the space environment, both of which pair well with existing layers, are missing.
**Outcome:** Three new layers following the existing collector pattern.

| #   | Feature         | Source                   | Size | Notes                                                                                                                                                                                                   |
| --- | --------------- | ------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Wildfires       | NASA FIRMS (VIIRS/MODIS) | M    | Free MAP_KEY, 5,000 requests per 10 min. Roughly 3 h latency worldwide. Render as clustered amber **squares** (distinct from circular quake markers). Large volume: needs clustering and a density cap. |
| 3.2 | Space weather   | NOAA SWPC JSON feeds     | S–M  | Kp, solar wind, flare class. Ties directly to the aurora layer. Estimated Kp comes from US magnetometers, so label its limits. **Verify current endpoint paths before building.**                       |
| 3.3 | Disaster alerts | GDACS and/or NASA EONET  | M    | Cyclones, floods, tsunami warnings. **Not verified in research**; confirm schema, terms and update cadence in a spike.                                                                                  |

Each follows `CLAUDE.md` "Adding a New Data Collector" (extend `BaseCollector`, add `EventType` and typed event in `src/shared/types.ts`, register in `src/server/index.ts`, add tests) and the collector/visualization manifest from #142. New env vars (for example a FIRMS key) go in `.env.example` with graceful degradation when absent.

### Wave 2 parking lot (not scoped; each needs a go/no-go spike)

| Candidate                             | Main risk                                                  |
| ------------------------------------- | ---------------------------------------------------------- |
| Air quality (OpenAQ)                  | Station coverage is uneven; format and latency unconfirmed |
| Global news tone (GDELT)              | Noisy; needs filtering and source-quality work             |
| Lightning (Blitzortung or commercial) | Redistribution terms; commercial cost                      |
| Aircraft (OpenSky ADS-B)              | Rate limits; heavy render load                             |
| Ocean buoys (NDBC)                    | Unverified                                                 |
| Submarine cables                      | Mostly static; decorative value only                       |
| Ship tracking (AIS)                   | No free real-time source found; do not plan around it      |

---

## Stakeholder view

| Constituent                            | Needs                                       | How this proposal serves them                                          |
| -------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Ambient viewer (room or desk)          | Glanceable, calm, not alarming              | Epic 1 hierarchy; quiet by default; alert mode is bounded              |
| Operator/deployer (TV, iPad, Electron) | Low CPU/GPU, no burn-in, few keys to manage | Per-effect toggles, drift (1.6), graceful degradation without API keys |
| Accessibility needs                    | Reduced motion, non-color cues              | Cross-cutting criteria above                                           |
| Maintainers                            | Small, reviewable changes; contained risk   | Thin slices; high-risk surfaces flagged for architect review           |
| Data providers                         | Respect for rate limits and terms           | Caching, backoff, license check in each spike                          |

## Suggested sequencing

0. **Foundation:** Epic 0 (0.1, then 0.2) so every later effect lands as a toggleable mode.
1. **Quick wins, low risk, renderer only:** 1.1, 1.3, 2.3.
2. **First data pair:** 3.2 (space weather, ties to aurora) and 3.1 (wildfires).
3. **Hierarchy:** 1.2, then 1.5.
4. **Context:** 2.1, then 2.2 (needs history accumulating; start 2.1 early so data builds up).
5. **Optional polish:** 1.4, 1.6.
6. **Spikes in parallel:** 2.4 (TLE), 3.3 (GDACS/EONET), performance budget.

## Risks and open questions

1. **Performance budget:** What is the minimum supported display hardware? Needed before 1.4 and 1.6.
2. **Alert fatigue:** Alert mode must not trigger often. Proposed starting threshold is severity 7+; confirm with real event rates.
3. **Baseline cold start:** 2.1 needs history. Hide gauges until enough data exists rather than showing misleading ones.
4. **Licenses and terms:** Verify per source before building (LCARS itself is copyrighted, so use its principles only, never its assets).
5. **Dependabot debt (26 PRs):** Still unresolved and independent of this work, but major bumps (vite, vitest, electron) could collide with renderer work. Consider clearing them first.
6. **Verification gap:** Research for this proposal had limited web access; items marked "not verified" must be confirmed before estimation.

## Issue index

Hierarchy: Epic, Feature, Story (real GitHub sub-issues; story bodies also say "Parent Feature: #N"). Numbers in this doc's headings (Epic 0 to 3, features 0.1 and so on) map to the issues below.

| Epic                   | Issue | Features (issue)                                                                                             |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| Mode Deck              | #347  | Registry #351, Deck UI #352, Engage feedback #353, Peek #354, Scenes and Showtime #355                       |
| Living Globe           | #348  | Guardrails #356, Terminator #357, Callout #358, Pulse rings #359, Sweep #360, Alert mode #361, Phosphor #362 |
| Context at a Glance    | #349  | Baseline engine #363, Gauges #364, Lineage footer #365, ISS passes #366                                      |
| New Data Layers wave 1 | #350  | Wildfires #367, Space weather #368, Disaster alerts spike #369                                               |

Stories are #370 to #415 (46 stories). Spike stories: #384 (minimum display target and frame budget), #407 (ISS TLE source), #415 (GDACS/EONET).

Severity Gate: stories touching `src/shared/**` or `src/server/**` (baseline engine and contract, lineage latency declaration, FIRMS, SWPC, any disaster collector) are flagged for architect review in their bodies. Per `CLAUDE.md`, each PR needs a `Closes #N` line.
