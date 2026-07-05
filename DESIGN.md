# Design

## Design Language

**Oblivion UI** -- inspired by GMUNK's motion-graphics work for the 2013 film
Oblivion. The aesthetic is mission-control: rectilinear panels, monospace type,
data-ink color, and motion that signals state change rather than decoration.

This is not a "dark mode" of a light-mode app. The visual language was designed
dark-first for ambient display at arm's length and across the room.

## Color System

All tokens are CSS custom properties defined in `src/renderer/index.css`.
Use them; never use raw hex.

### Backgrounds

| Token              | Value     | Use                                 |
| ------------------ | --------- | ----------------------------------- |
| `--ob-bg-primary`  | `#0a0a0f` | Body / viewport fill                |
| `--ob-bg-panel`    | `#101820` | Panel background                    |
| `--ob-bg-elevated` | `#141c26` | Cards, dropdowns, elevated surfaces |

### Text

| Token               | Value                   | Use                                 |
| ------------------- | ----------------------- | ----------------------------------- |
| `--ob-text-primary` | `#c8e6f0`               | All primary readable text           |
| `--ob-text-dim`     | `rgba(200,230,240,0.5)` | Labels, secondary text, field names |

### Accent

| Token                   | Value                  | Use                                  |
| ----------------------- | ---------------------- | ------------------------------------ |
| `--ob-accent-cyan`      | `#00d4ff`              | Active UI, highlights, live data ink |
| `--ob-accent-cyan-dim`  | `rgba(0,212,255,0.6)`  | Muted cyan                           |
| `--ob-accent-amber`     | `#ff8c42`              | Selected / featured event            |
| `--ob-accent-amber-dim` | `rgba(255,140,66,0.6)` | Muted amber                          |

### Semantic

| Token          | Value     | Use                               |
| -------------- | --------- | --------------------------------- |
| `--ob-success` | `#4ae68a` | Connected, healthy, online        |
| `--ob-danger`  | `#ff3d3d` | Error, critical severity (>=7)    |
| `--ob-warning` | `#ffb020` | Degraded, elevated severity (>=4) |

### Structural

| Token                | Value                    | Use                        |
| -------------------- | ------------------------ | -------------------------- |
| `--ob-border-subtle` | `rgba(200,230,240,0.12)` | Default panel borders      |
| `--ob-border-active` | `rgba(0,212,255,0.4)`    | Focused or hovered borders |
| `--ob-grid-dot`      | `rgba(200,230,240,0.05)` | Dot-grid pattern fill      |

### Glow

| Token               | Value                   | Use                 |
| ------------------- | ----------------------- | ------------------- |
| `--ob-glow-cyan`    | `rgba(0,212,255,0.3)`   | Cyan shadow glow    |
| `--ob-glow-amber`   | `rgba(255,140,66,0.3)`  | Amber shadow glow   |
| `--ob-glow-success` | `rgba(74,230,138,0.35)` | Success shadow glow |
| `--ob-glow-danger`  | `rgba(255,61,61,0.35)`  | Danger shadow glow  |

### Severity Color Mapping

This mapping is canonical and must not be changed without updating both UI badges
and Three.js globe markers:

```
severity >= 7  ->  --ob-danger   (#ff3d3d)   critical
severity >= 4  ->  --ob-accent-amber (#ff8c42)  elevated
severity <  4  ->  --ob-accent-cyan  (#00d4ff)  nominal
featured event ->  --ob-accent-amber            selection highlight
```

TypeScript constant: `OB_COLORS` in `src/renderer/components/Globe/Globe.tsx`.

## Typography

Single typeface everywhere: **JetBrains Mono**.
Google Fonts import in `src/renderer/index.css` (weights 300, 400, 500, 700).
Fallback stack: `'SF Mono', 'Fira Code', 'Consolas', monospace`.

Applied globally on `body`. No element in the UI uses a different font family.

### Type Scale

| Class                 | Properties                                                | Use                   |
| --------------------- | --------------------------------------------------------- | --------------------- |
| `.ob-heading`         | uppercase, letter-spacing 0.2em, weight 300               | Section headings      |
| `.ob-label`           | uppercase, letter-spacing 0.05em, 0.7rem, `--ob-text-dim` | Field labels          |
| `.ob-value`           | tabular-nums, `--ob-text-primary`                         | Live numeric readings |
| `.ob-value-highlight` | cyan color, `text-shadow: 0 0 10px var(--ob-glow-cyan)`   | Active data values    |

Tailwind classes for letter-spacing: `tracking-ultrawide` (0.2em) and
`tracking-wide` (0.1em) via `tailwind.config.js`.

Rules:

- Never use weight > 500 for body or label text.
- Never use proportional fonts (no `font-sans`, no `font-serif`).
- Minimum legible text size at ambient viewing distance: 0.7rem (the `.ob-label`
  floor). Do not go smaller.

## Motion

Animation communicates state change. Nothing moves without a reason.

### Timing Tokens

| Variable             | Value   | Use                              |
| -------------------- | ------- | -------------------------------- |
| `--ob-timing-glitch` | `60ms`  | Snap/glitch on data arrival      |
| `--ob-timing-snap`   | `120ms` | Quick transitions, hover borders |
| `--ob-timing-fade`   | `300ms` | Standard opacity/color fades     |
| `--ob-timing-pulse`  | `3s`    | Breathing glow, dot-grid pulse   |
| `--ob-timing-sweep`  | `6s`    | Scanline sweep across panel      |
| `--ob-timing-scroll` | `30s`   | Ticker scroll loop               |

### Easing

| Variable                 | Curve                           | Feel                |
| ------------------------ | ------------------------------- | ------------------- |
| `--ob-easing-mechanical` | `cubic-bezier(0.25,0.1,0.25,1)` | Robotic, deliberate |
| `--ob-easing-snap`       | `cubic-bezier(0.4,0,0.2,1)`     | Material-style snap |

Never use bounce or elastic easing.

### Reduced Motion

All continuous animations (`ob-dot-grid-animated`, `ob-scanline`, `ob-glow`)
must be paused or disabled under `prefers-reduced-motion: reduce`.

## Components

### ob-panel

The foundational layout container. Rectilinear with four L-shaped corner ticks.

```css
.ob-panel {
  background: var(--ob-bg-panel);
  border: 1px solid var(--ob-border-subtle);
}
```

Corner ticks: 12x12 px L-shaped borders at each corner via `::before`/`::after`
pseudo-elements (defined in `src/renderer/index.css`). Color: `--ob-accent-cyan`.

Modifiers:

- `.ob-panel-active`: adds `box-shadow: 0 0 20px var(--ob-glow-cyan)` + inset
  highlight on border.

Rules:

- Never add `border-radius` to any panel. Zero rounded corners.
- Never use Tailwind `shadow-*` utilities. Use explicit `box-shadow` with glow tokens.
- Always include `.ob-panel-inner` for the corner tick effect inside the panel.

### ob-scanline

Active data panels use a sweeping scanline:

```css
/* Applied by adding class ob-scanline to the panel element */
/* ::after creates a 2px cyan line at top, animating top: 0 -> 100% over 6s */
```

Use on panels that display live-updating numeric data (seismic widget, ISS widget,
event rate, aurora, asteroid readout). Do not use on static informational panels.

### ob-dot-grid

Full-viewport background texture:

```css
background-image: radial-gradient(circle at center, var(--ob-grid-dot) 1px, transparent 1px);
background-size: 40px 40px;
```

Applied to the root container. Provides depth without competing with data ink.

### Globe (Three.js / r3f)

- Sphere radius: 2 units.
- Atmosphere: back-facing sphere at 1.06x scale, `meshBasicMaterial` opacity 0.15,
  color `#00d4ff`.
- Coastlines: `LineSegments` from GeoJSON, color `--ob-accent-cyan`.
- Event markers: `SphereGeometry` sized by severity, color by severity mapping above.
- Background: `#050510` (not pure black -- always tint blacks).
- Camera: `PerspectiveCamera` fov 45, auto-rotating unless user drags.

### HUD Layout

Dashboard (`src/renderer/components/Dashboard/Dashboard.tsx`) stacks layers:

| Layer             | z-index | Component                               |
| ----------------- | ------- | --------------------------------------- |
| Globe             | 0       | `<Globe>` canvas, `fixed inset-0`       |
| HUD panels        | 20      | Header, SideColumns, EventPanel, Ticker |
| Connection banner | 30      | `<ConnectionBanner>`                    |
| Modals            | 50+     | Modal overlays                          |

HUD panels must be `fixed` positioned, never `absolute`. This keeps them
viewport-relative regardless of content height.

### Severity Badge

Three-state color badge co-located with event data:

```
severity >= 7  -> red background + border
severity >= 4  -> amber background + border
severity <  4  -> cyan background + border
```

Badge always shows numeric severity AND text label. Color alone is not sufficient.

### Ticker

`<Ticker>` is `fixed bottom-0 left-0 right-0 z-20`. Scrolls
event summaries at `--ob-timing-scroll` (30s loop). Pauses on hover.

## Layout

- Viewport: full-screen, no scroll. The globe occupies 100vw x 100vh.
- Side columns: left and right strips, `fixed` positioned, 280px wide.
- Header: `fixed top-0 left-0 right-0`, height ~48px.
- EventPanel: `fixed right-0`, appears when an event is selected.
- All spacing follows 4px base grid (Tailwind default spacing scale).

## Responsive Layout

World Pulse targets three deployment surfaces (per project scope: TV, iPad,
monitor). The layout above is the widescreen default; this section defines
the portrait addendum for a vertically mounted iPad.

### Breakpoint Condition

Portrait mode is triggered by **aspect ratio, not device width**:

```ts
const isPortrait = window.matchMedia('(orientation: portrait)').matches;
// equivalent condition: viewport width < viewport height
```

Rationale: a width-threshold breakpoint (e.g. `< 768px`) conflates "small
screen" with "portrait orientation." World Pulse never targets phones (out of
scope -- see Out of Scope below), and a large iPad in portrait is still wider
than many breakpoint thresholds tuned for phones. The orientation query is the
only condition that reflects the actual constraint: side columns need
horizontal room, and portrait orientation is what removes it, regardless of
absolute pixel width. `matchMedia('(orientation: portrait)')` also fires on
rotation, which the live re-layout in #237 depends on -- a static width
threshold checked once on mount would miss orientation changes at a fixed
window size (rare for a mounted display, but not guaranteed).

### Target Viewports

| Viewport                 | Orientation | Layout                                 |
| ------------------------ | ----------- | -------------------------------------- |
| TV, large monitor (16:9) | Landscape   | Existing widescreen layout (unchanged) |
| iPad                     | Landscape   | Existing widescreen layout (unchanged) |
| iPad                     | Portrait    | New stacked layout (this addendum)     |

### Wireframes

**Landscape (TV / iPad landscape) -- existing, unchanged:**

```
+--------------------------------------------------------------+
| HudStatusPanel                              HudCollectorPanel |
|                                                                |
| Left  |                                              | Right  |
| Column|                  Globe (100vw x 100vh)        | Column |
| (280px|                                               | (280px |
|  wide)|                                               |  wide) |
|       |                                               |        |
+--------------------------------------------------------------+
|                          Ticker (bottom)                       |
+--------------------------------------------------------------+
```

**Portrait (iPad portrait) -- new:**

```
+---------------------------+
| HudStatusPanel  HudCollec.|
+---------------------------+
| Left Column (stacked,     |
| full-width, condensed)    |
+---------------------------+
|                           |
|   Globe (fills remaining  |
|   vertical space)         |
|                           |
+---------------------------+
| Right Column (stacked,    |
| full-width, condensed)    |
+---------------------------+
|      Ticker (bottom)      |
+---------------------------+
```

### Stacking Order (top to bottom, portrait)

1. `HudStatusPanel` / `HudCollectorPanel` -- unchanged, top corners
2. `LeftColumn` widgets -- collapse from a 280px vertical strip into a
   full-width horizontal band directly under the header
3. Globe canvas -- fills all remaining vertical space between the stacked
   side columns and the ticker; this is still the largest single region of
   the viewport, preserving Design Principle #1 ("the globe is the hero")
4. `RightColumn` widgets -- same full-width band treatment, placed below the
   globe
5. `Ticker` -- unchanged, `fixed bottom-0`

Nothing is hidden or dropped in portrait: every widget in `LeftColumn` and
`RightColumn` remains present, just re-flowed from a vertical strip to a
horizontal band, to avoid the display silently losing data sources when
rotated. If a future pass finds the stacked bands too tall (pushing the globe
below a usable minimum height), the fallback is to make individual widgets
within each band horizontally scrollable/collapsible -- not to remove
widgets outright.

### Invariants (hold in every orientation)

- Viewport stays full-screen with **no scroll** -- `100vw x 100vh`, no
  document scrollbar, in both orientations.
- HUD panels remain `fixed`, never `absolute`, regardless of orientation --
  re-layout happens by changing `top/left/right/bottom` values on the same
  `fixed` elements, not by switching positioning strategy.
- The globe fills the viewport behind HUD panels and is never fully occluded
  by stacked columns (Design Principle #1).
- Ambient-sizing floors are never violated: `.ob-label` text stays at or
  above its 0.7rem floor, and globe event markers stay at or above their 8px
  effective floor -- condensing a widget band for portrait must shrink
  layout (padding, gaps, column width), never type size or marker size below
  these floors.

## Anti-Patterns

Patterns that violate the Oblivion design language:

- Rounded corners on panels (`rounded-*` Tailwind classes).
- Tailwind color classes directly (`blue-500`, `gray-900`) -- use `ob-*` classes.
- `shadow-*` Tailwind utilities -- use explicit `box-shadow` with glow tokens.
- `font-sans` or `font-serif` anywhere.
- Gradient backgrounds (linear or radial on panels).
- Glassmorphism / backdrop-blur.
- Bounce or elastic easing.
- `font-weight` > 500 for labels or body text.
- Absolute positioning for HUD panels -- always `fixed`.
- Color as the only channel for severity -- always pair with text/number.
- Hardcoded hex values in TypeScript/JSX -- use `OB_COLORS` or CSS variables.
- Omitting corner ticks on data panels.
- Pure black (`#000000`) -- always use tinted darks like `--ob-bg-primary`.
