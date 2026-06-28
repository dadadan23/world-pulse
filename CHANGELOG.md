# Changelog

All notable changes to world-pulse are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

## [0.2.0] - 2026-06-28

### Added

- **Mission-control side-column telemetry widgets** (`feat(dashboard): side columns`)

  Filled the two empty vertical edges of the globe-dominant dashboard with
  compact, animated HUD widgets in a "For All Mankind" × Oblivion style,
  sourced entirely from the existing Zustand `events` store -- no new
  dependencies, no new API calls.

  **Left column** (`SideColumns/LeftColumn.tsx`):
  - `SeismicWidget` -- last 6 earthquakes as magnitude segmented bars
  - `EventRateWidget` -- 24-hour event count sparkline
  - `TypeDistWidget` -- event counts by type, sorted descending
  - `SeverityWidget` -- critical/high/moderate/low severity histogram

  **Right column** (`SideColumns/RightColumn.tsx`):
  - `ISSWidget` -- altitude arc gauge + velocity readout
  - `AuroraWidget` -- Kp-index linear gauge with storm-level coloring
  - `AsteroidWidget` -- top 3 near-Earth approaches by miss distance
  - `WeatherWidget` -- relocated into the right column (previously built but unused)

  **Other changes:**
  - New `.ob-seg-bar`, `.ob-sparkline`, `.ob-stat-readout` CSS primitives
    in `src/renderer/index.css`, respecting `prefers-reduced-motion`
  - Extracted `getEventIndicator`'s type-to-symbol map out of `Ticker.tsx`
    into `src/renderer/utils/eventIndicators.ts`, shared with `TypeDistWidget`
  - Fixed `RightColumn`'s vertical offset (`top-[210px]` to `top-[460px]`)
    after manual verification showed it rendering behind `HudCollectorPanel`,
    whose height grows with the number of registered collectors

  **Build stats:**
  - Test suite: **481 tests passing** across 50 files
  - Lint: clean (zero warnings)
  - Typecheck: clean

  **Before:** both vertical screen edges were empty; only top-corner HUD
  panels, the slide-in event panel, and the bottom ticker were populated.

  **After:** both edges show live, independently-scrollable telemetry
  widgets that hide individually when their underlying event type has no data.

- **Natural Earth 110m coastline pipeline** (`feat(globe): #115`)

  Replaced the 30-segment hand-drawn coastline approximations on the 3D globe
  with real-world Natural Earth 110m data (134 features, 5,128 coordinate pairs).

  **What the globe now renders:**
  - Accurate continental outlines sourced from Natural Earth 110m dataset
  - Island and peninsula detail faithful to the 110m resolution
  - All coastlines rendered as continuous polylines via the `CoastlineSource`
    abstraction -- swapping to a higher-resolution dataset (50m, 10m) requires
    only a one-line import change in `geoJsonCoastlineSource.ts`

  **Pipeline components added:**
  - `src/renderer/components/Globe/ne_110m_coastline.geojson` -- source data
    (136 KB raw, 48 KB gzip)
  - `src/renderer/components/Globe/geoJsonParser.ts` -- pure parser with full
    runtime shape-guards (per-feature, per-geometry, per-coordinate validation)
  - `src/renderer/components/Globe/geoJsonCoastlineSource.ts` -- pre-parsed
    singleton with dev-mode empty-dataset warning
  - `scripts/vite-plugins/geojson.ts` -- shared Vite/Vitest/Electron-vite
    plugin for `.geojson` module imports
  - `src/renderer/geojson.d.ts` -- TypeScript module type declaration

  **Build stats (CI verified):**
  - Total gzip bundle: **347 KB** (within 500 KB target)
  - Test suite: **156 tests passing** (5 new malformed-input guard tests added)
  - Lint: clean (zero warnings)
  - Renderer build: success

  **Before (hand-drawn approximation):**
  Coastlines were 30 straight-line segments per continent, visually approximate
  and not geographically accurate.

  **After (Natural Earth 110m):**
  Coastlines follow real-world geometry -- continents, major islands, and
  peninsulas are all correctly outlined at 1:110,000,000 scale resolution.

---

## [0.1.0] - 2026-01-01

### Added

- Initial release: Phase 0 foundation complete
- React 18 + Three.js 3D globe renderer
- Zustand state management
- Express + Socket.io backend with plugin-based data collectors
- Electron wrapper for desktop deployment
- Oblivion dark aesthetic design system
- Earthquake, ISS, aurora, volcano, asteroid, and planet visibility collectors
