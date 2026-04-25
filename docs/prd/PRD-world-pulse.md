# PRD -- World Pulse

**Version**: 2.0 (Vision Realignment)
**Date**: 2026-04-25
**Status**: Active

---

## 1. Vision Statement

World Pulse is a cinematic, always-on ambient display for a large screen. A photorealistic 3D globe fills the entire viewport. Real-world events -- earthquakes, ISS passes, aurora, volcanic activity, near-Earth asteroids -- surface as glowing animated markers on the globe. Translucent HUD panels overlay the globe with live data feeds and status indicators. The globe auto-centers on the user's physical location on first load.

The aesthetic benchmark: **Oblivion (2013 film, GMUNK motion graphics)** + **NASA Blue Marble / Eyes on the Solar System** + **Star Trek LCARS** accents. Not a data dashboard. Not a news feed. A mission control display for planet Earth.

---

## 2. Core Problem

The current prototype lays out Globe, SkyMap, and EventPanel as equal-weight side-by-side columns. The globe is just another panel. The result looks like a generic monitoring dashboard, not a cinematic Earth visualization. It does not feel like a NASA visualization or a sci-fi HUD.

The user wants to put this on a large display (TV, monitor) and have it be visually compelling at a glance, with no interaction required.

---

## 3. Users

**Primary persona: "The Observer"** -- A person who leaves this running on a dedicated display 24/7 (a TV, large monitor, iPad). They glance at it, not interact with it. They want to feel the pulse of the planet. They are technically capable but this is ambient, not a tool they operate.

**Context of use**: Large screen (1080p-4K), dark room or ambient lighting, 2-10 feet viewing distance, no mouse/keyboard interaction expected. Always-on, auto-updating.

---

## 4. Goals & Non-Goals

### Goals (this PRD / Phase 2)
- Globe fills 100% of viewport -- it IS the UI, not a panel within it
- All data panels are translucent HUD overlays positioned on top of the globe
- Globe auto-orients to the user's geolocation on first load
- A "home" beacon marker pulses at the user's location
- Globe uses high-fidelity NASA satellite imagery (Blue Marble) not a canvas-drawn texture
- Atmosphere glow and star field create a sense of floating in space
- ISS orbital path renders as a live animated arc on the globe surface
- Aurora events render as glowing polar zone overlays, not just point markers
- SkyMap moves to a secondary toggled overlay mode, not a permanent column
- The overall experience passes the "60-second wow test": someone unfamiliar sits in front of it for 60 seconds and says it looks like NASA or a sci-fi movie

### Non-Goals (explicit)
- NOT a user-interactive tool (no search, no filter, no settings UI)
- NOT mobile-optimized (desktop/Electron first)
- NOT a data analytics platform (no charts, no time-series graphs)
- NOT a news reader (events are geospatial markers, not article summaries)
- No user accounts, auth, or persistence beyond the 100-event server cache
- SkyMap is NOT removed -- it moves to secondary mode, NOT deleted

---

## 5. Requirements

### R1 -- Globe-Dominant Layout
- **R1.1**: The Three.js canvas renders at exactly `100vw x 100vh` with `position: fixed`.
- **R1.2**: All UI panels are `position: absolute` or `position: fixed` overlays on top of the canvas.
- **R1.3**: The globe canvas is never occluded by more than 30% of screen area by overlay panels in default state.
- **R1.4**: On a 1920x1080 display, the globe diameter is >=900px at the initial camera distance.

### R2 -- User Geolocation
- **R2.1**: On first render, the app calls `navigator.geolocation.getCurrentPosition()` with a 10-second timeout.
- **R2.2**: If geolocation succeeds, the globe camera animates (over 2000ms) to center on the user's lat/lon.
- **R2.3**: If geolocation is denied or times out, the globe centers on `lat:30, lon:-40` (mid-Atlantic, neutral default) with no error shown to the user.
- **R2.4**: A pulsing cyan "home" beacon marker is placed at the user's location (or omitted if geolocation denied).
- **R2.5**: User lat/lon is stored in Zustand and passed as `observerLat`/`observerLon` to SkyMap.
- **R2.6**: Geolocation is requested once per session; the result is cached in the store.

### R3 -- Globe Visual Fidelity
- **R3.1**: Earth surface texture is a high-resolution satellite image (>=2048x1024px Blue Marble or equivalent), NOT a canvas-drawn procedural texture.
- **R3.2**: The atmosphere glow layer has opacity >=0.12 (currently 0.03 -- invisible).
- **R3.3**: A star field with >=800 stars surrounds the globe.
- **R3.4**: The globe has a visible specular highlight on the sun-facing side.

### R4 -- ISS Orbital Visualization
- **R4.1**: When an ISS event is in the event list, its current position renders as a station icon marker.
- **R4.2**: An orbital arc (TubeGeometry or Line) renders the ISS ground track for the next 90 minutes.
- **R4.3**: The arc animates -- a bright leading point moves along the track in real time.

### R5 -- Aurora Zone Visualization
- **R5.1**: Aurora events render as translucent elliptical polar zone overlays (not point markers).
- **R5.2**: Aurora zones use a gradient from cyan to transparent with opacity proportional to event severity.

### R6 -- HUD Overlay Panels
- **R6.1**: A top-left status HUD shows: connection status, event count, UTC time. Max width 280px. Background `rgba(10,10,15,0.75)`.
- **R6.2**: A top-right HUD shows collector health badges. Max width 240px.
- **R6.3**: A bottom full-width ticker strip scrolls the 10 most recent events. Max height 64px.
- **R6.4**: A right-edge event detail panel slides in when an event marker is clicked, and slides out after 8 seconds or on globe click. Width 320px.
- **R6.5**: All HUD panels use `backdrop-filter: blur(8px)` for depth.

### R7 -- SkyMap Secondary Mode
- **R7.1**: SkyMap is removed from the default Dashboard grid layout.
- **R7.2**: A toggle button (top-right HUD area) opens SkyMap as a full-overlay modal at 80vw x 80vh, centered.
- **R7.3**: SkyMap modal closes on Escape key or click-outside.

### R8 -- Aesthetic Compliance
- **R8.1**: All UI text uses JetBrains Mono (already in design system).
- **R8.2**: Color palette is strictly the existing Oblivion system: `--ob-accent-cyan: #00d4ff`, `--ob-accent-amber: #ff8c42`, `--ob-bg-primary: #0a0a0f`.
- **R8.3**: No purple gradients, green terminal text, or glassmorphism that diverges from the Oblivion palette.
- **R8.4**: New event markers animate in with a 300ms expand+fade. Markers do not snap into existence.

### R9 -- Performance (ambient display)
- **R9.1**: Globe renders at >=30fps on a modern laptop (M1 or equivalent) with <=20 active markers.
- **R9.2**: Memory does not grow unboundedly -- event list is capped at 100 items (already spec'd).
- **R9.3**: The app does not show a loading spinner after initial boot; it degrades gracefully to "awaiting events."

---

## 6. Success Metrics

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Globe fill | Globe canvas >= 100vw x 100vh | CSS inspection |
| Geolocation | Camera centers within 2000ms of permission grant | Manual test |
| Atmosphere visible | Atmosphere opacity >= 0.12 | Code review / visual |
| ISS track visible | Arc renders when ISS event present | Manual test |
| Aurora zones visible | Polar zone renders for aurora events | Manual test |
| Frame rate | >=30fps on M1 MacBook with 20 markers | Chrome DevTools |
| 60-second wow test | Person unfamiliar with the project says "that looks like NASA" | User observation |
| CI | `npm run validate` passes | CI |

---

## 7. Implementation Stories (Phase 2)

### Story A -- Globe-Dominant Layout Refactor
Remove the column grid from `Dashboard.tsx`. Render the Globe canvas at `100vw x 100vh`. Convert all other UI elements to absolute-positioned overlay components. Remove SkyMap from the default layout (move to modal).

**AC**:
- Dashboard has no CSS grid columns; Globe is the only root-level element
- Header, Ticker, EventPanel are overlay components with `position: fixed` or `position: absolute`
- SkyMap is not rendered on page load; only renders when toggle is activated

### Story B -- Geolocation Store + Globe Centering
Add `userLat`, `userLon`, `geolocationStatus` to Zustand store. On app boot, call `navigator.geolocation.getCurrentPosition()`. Animate Globe camera to user location. Place home beacon marker.

**AC**:
- `useAppStore` has `userLat: number | null`, `userLon: number | null`, `geolocationStatus: 'pending' | 'granted' | 'denied'`
- Globe camera animates to user location within 2000ms of permission grant
- A pulsing cyan marker at radius `GLOBE_RADIUS * 1.012` renders at user position when `geolocationStatus === 'granted'`
- If denied, `lat:30, lon:-40` is used silently

### Story C -- Globe Texture Upgrade (Blue Marble)
Replace the procedural canvas texture in `earthTexture.ts` with a NASA Blue Marble satellite image. Increase atmosphere opacity. Add a night-side city lights layer.

**AC**:
- `earthTexture.ts` loads a 2K+ satellite image URL (NASA CDN or bundled asset)
- Atmosphere sphere opacity >= 0.12
- Specular highlight visible on sun-facing side (MeshPhongMaterial or MeshStandardMaterial with metalness)

### Story D -- ISS Orbital Arc
When an ISS event exists in the store, compute the next-90-minute ground track from current TLE/position data and render it as a `TubeGeometry` arc on the globe surface.

**AC**:
- ISS position marker renders as a distinct icon (not a generic sphere)
- Orbital arc renders as a cyan `TubeGeometry` line, 90 minutes forward
- A bright leading point animates along the arc in real time (useFrame)

### Story E -- Aurora Polar Zones
Replace point-marker rendering for aurora events with translucent elliptical disc overlays over the north/south poles.

**AC**:
- Aurora events with `location.lat > 60` render as a cyan elliptical disc at the north pole
- Disc opacity scales with `event.severity` (0-1 mapped to 0.05-0.3)
- Aurora events with `location.lat < -60` render a south pole disc

### Story F -- HUD Panel Components
Create `HudStatusPanel`, `HudCollectorBadges` fixed-position overlay components. Convert `Ticker` to fixed-bottom. Remove `Header` from flow layout.

**AC**:
- `HudStatusPanel` renders top-left, `position: fixed`, shows status + time + event count
- `HudCollectorBadges` renders top-right, `position: fixed`
- `Ticker` renders `position: fixed; bottom: 0`
- No layout elements (divs, grids) wrap the Globe canvas at the Dashboard level

### Story G -- Concept HUD Prototype (HTML)
Build `docs/prototypes/concept-hud.html` -- a self-contained static HTML file that demonstrates the full-screen globe + Oblivion HUD overlay layout using only HTML/CSS/JS (no build step). Use a CSS animated sphere to simulate the globe.

**AC**:
- File opens in any browser with no server
- Globe fills 100% of viewport
- HUD panels overlay the globe as described in R6
- Oblivion color system applied (no green terminal text, no purple gradients)

---

## 8. Open Questions

| # | Question | Impact |
|---|----------|--------|
| OQ-1 | What NASA Blue Marble texture URL is stable and royalty-free? | Story C texture URL |
| OQ-2 | Do we bundle the texture asset or load from CDN? CDN needs network; bundle adds ~3MB. | Story C |
| OQ-3 | ISS TLE data -- are we computing the ground track client-side or does the server collector provide the arc? | Story D architecture |

---

## 9. References

- CLAUDE.md -- architecture overview, commands, conventions
- `src/renderer/index.css` -- Oblivion design system tokens
- `src/renderer/components/Globe/Globe.tsx` -- current globe implementation
- `docs/prototypes/` -- prior concept prototypes (concepts A/B are deprecated direction)
- NASA Blue Marble imagery: https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation-w-topography-and-bathymetry
- Oblivion (2013) GMUNK motion graphics: reference aesthetic benchmark
