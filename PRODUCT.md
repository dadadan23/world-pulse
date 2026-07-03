# Product

## Register

product

## Users

Developers, tinkerers, and home-lab enthusiasts who want a 24/7 ambient information
display running on dedicated hardware -- a TV, an iPad mounted on a wall, a spare
monitor. They run self-hosted software and care about real data, not simulations.
They are not interior designers; they are people who think a globe showing live
seismic activity is more interesting than a screensaver.

## Product Purpose

World Pulse is a real-time information radiator: a 24/7 ambient dashboard that
streams live global events (earthquakes, ISS position, aurora alerts,
near-Earth asteroids, volcano activity, planet visibility) and renders them on
an interactive 3D globe. The interface is mission-control, not consumer-app --
every pixel earns its place by conveying state. Success means a user can glance
at the display from across the room and immediately read the world's pulse.

## Brand Personality

Cinematic, technical, authoritative. World Pulse speaks in the visual language of
GMUNK's UI work for the film Oblivion: dark navy backgrounds, cyan data-ink, amber
selection highlights, monospace type, and mechanical motion timing.

Three-word personality: cinematic, precise, ambient.

The interface is a tool used by someone who leaves it running -- it must earn
passive attention without demanding active attention. No notifications, no CTAs,
no onboarding. Just live data rendered with craft.

## Anti-references

The design must repel everything that makes "dark dashboard" a tired trope:

- **Gradient abuse**: no purple-to-blue hero gradients, no color-wash backgrounds.
- **Glassmorphism**: no frosted-glass panels, no backdrop-blur on data surfaces.
- **Rounded-corner cards**: the aesthetic is rectilinear with corner ticks, not
  iOS-style rounded cards.
- **Neon-on-black cyberpunk**: we are not building a gaming peripheral UI. Cyan is
  data ink, not decoration.
- **Data theater**: widgets that look busy but convey nothing. Every number shown
  must be the number a user actually needs.
- **Consumer-app chrome**: navigation bars, hamburger menus, breadcrumbs. This is
  a single-view ambient display, not a multi-page app.
- **Generic sans-serif body text**: the entire UI uses JetBrains Mono. No
  exceptions.

## Design Principles

1. **The globe is the hero.** Every other element defers to it. Side columns and
   HUD panels are overlaid at fixed positions so the globe fills the viewport
   behind them.
2. **Data ink ratio.** Every visible pixel either conveys state or provides
   structural context for state. Remove anything that does neither.
3. **Severity maps to color, always.** Critical events are danger-red; elevated
   are amber; nominal are cyan. This mapping is not decorative -- it is the
   interface's primary information channel.
4. **Motion is functional.** Animation encodes change (new event pulse, scanline
   on active data panel, breathing glow on live readings). Nothing animates
   unless it signals something.
5. **Ambient-first sizing.** Text and markers must read from 2-3 meters. Minimum
   readable label size is 0.7rem at standard density; globe markers are sized by
   severity, never smaller than 8px diameter.

## Colors

Primary palette (CSS custom properties from `src/renderer/index.css`):

| Token | Hex | Role |
|---|---|---|
| `--ob-bg-primary` | `#0a0a0f` | Body background |
| `--ob-bg-panel` | `#101820` | Panel fill |
| `--ob-bg-elevated` | `#141c26` | Elevated surface |
| `--ob-text-primary` | `#c8e6f0` | Primary text |
| `--ob-text-dim` | `rgba(200,230,240,0.5)` | Labels, secondary |
| `--ob-accent-cyan` | `#00d4ff` | Active UI, highlights, live data |
| `--ob-accent-amber` | `#ff8c42` | Selected/featured event |
| `--ob-success` | `#4ae68a` | Connected / healthy |
| `--ob-danger` | `#ff3d3d` | Error / critical severity |
| `--ob-warning` | `#ffb020` | Warning / degraded |

Always use the CSS custom property, never the raw hex. Tailwind equivalents are
defined in `tailwind.config.js` as `bg-ob-bg-primary`, `text-ob-accent-cyan`, etc.

## Typography

Single typeface: **JetBrains Mono** (Google Fonts, weights 300/400/500/700).
Fallbacks: SF Mono, Fira Code, Consolas, monospace.

| Class | Style | Use |
|---|---|---|
| `.ob-heading` | uppercase, tracking 0.2em, weight 300 | Section labels |
| `.ob-label` | uppercase, tracking 0.05em, 0.7rem, dim color | Field names |
| `.ob-value` | tabular nums, primary color | Data readings |
| `.ob-value-highlight` | cyan + text-shadow glow | Active/live readings |

No proportional fonts anywhere. No weight above 500 for body text.

## Core Components

- **ob-panel**: rectilinear panel with 12px L-shaped corner ticks via CSS
  pseudo-elements. Never use rounded corners.
- **ob-scanline**: 2px cyan line sweeping top-to-bottom at 6s interval on panels
  that show live data.
- **Globe**: Three.js sphere (r3f) with atmosphere glow, coastline mesh, event
  markers, and arc lines. z-0 fixed-fill.
- **HUD panels**: fixed-position overlays at z-20 (Header, SideColumns,
  EventPanel, Ticker). Never absolutely positioned.
- **ConnectionBanner**: full-width status banner at z-30 on disconnect.
- **Severity badge**: color-coded by severity threshold (>=7 danger, >=4 amber,
  <4 cyan).

## Accessibility and Inclusion

Target: WCAG 2.1 AA where feasible for an ambient display.

Known constraints: the ambient dark palette pushes some text/background contrast
ratios below AA threshold at dim opacity levels (`--ob-text-dim`). This is
acceptable for secondary label text that supplements primary color-coded state.
Critical state (severity, connection status) always uses full-opacity tokens that
meet AA contrast.

Commitments:
- All interactive controls (event selection, panel expansion) keyboard-navigable.
- `prefers-reduced-motion` respected: scanline sweep and breathing glow disabled.
- Semantic HTML for non-globe UI; Three.js canvas has `aria-label` describing
  the view.
- Color is never the only channel for critical state: severity also shown as
  numeric value and text label.
