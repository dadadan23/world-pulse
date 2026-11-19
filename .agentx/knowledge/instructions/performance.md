# Instruction: Performance

World Pulse runs 24/7 on dedicated display hardware (TV, iPad, monitor). Performance is a first-class constraint — not an optimization to do later.

---

## Frame Budget: per display tier

The budget depends on the display tier, not a single 60 fps target. The Floor device (Raspberry Pi 5 on a 1080p TV) holds **30 fps**; Recommended and Showpiece devices hold **60 fps**. Source of truth: [`docs/specs/SPEC-384.md`](../../../docs/specs/SPEC-384.md) (sections 2, 3, 5, 6). Device capabilities in the spec are assumed until the on-device baseline (#434) is recorded.

| Tier | Target fps | p95 frame | Frames over 66 ms | Main-thread JS per frame | GPU per frame | Texture cap | DPR cap |
|---|---|---|---|---|---|---|---|
| Floor (Pi 5) | 30 | <= 50 ms | <= 1% over 10 min | <= 16 ms | <= 23 ms | 64 MiB | 1.0 |
| Recommended | 60 | <= 20 ms | <= 0.1% | <= 8 ms | <= 11 ms | 96 MiB | 1.5 |
| Showpiece | 60 | <= 20 ms | <= 0.1% | <= 8 ms | <= 11 ms | 128 MiB | 1.0 at 4K |

About 30% of each frame is held back as headroom for thermals, compositing and GC. Budget checks allow 1 ms of timestamp jitter (SPEC-384 section 3).

### Hard ceilings (hardware-independent, measured with the probe at 50 markers)

| Metric | Full | Lite |
|---|---|---|
| Draw calls per frame | <= 300 (<= 120 after the instanced-markers story, #432) | <= 80 |
| Triangles per frame | <= 100,000 | <= 60,000 |
| Shader programs | <= 16 | <= 12 |
| Texture allocations incl. mipmaps | <= 96 MiB | <= 64 MiB |
| Full-screen post passes | <= 4 (bloom at half res) | 0 |
| New per-frame React state updates | 0 | 0 |

Per-effect cost limits (draw calls, concurrent rings, Floor/Lite behaviour) are in SPEC-384 section 5; the degrade ladder L0-L5 is in section 6.2. Measure with [`scripts/perf/README.md`](../../../scripts/perf/README.md).

### Effect PR checklist

Every PR that adds or changes a Globe effect must show:
- [ ] Probe draw-call and triangle counts **before and after** at 50 markers (`scripts/perf/probe.js`), inside the ceilings above
- [ ] Behaviour on **Full and Lite**, and the degrade-ladder level at which the effect steps down or turns off
- [ ] No `setState` or store `set` inside `useFrame`
- [ ] Reduced motion honoured through the shared reduced-motion utility once #385 lands (until then, `prefers-reduced-motion`)
- [ ] Severity is not carried by colour alone (shape, label or motion as well)

Guidelines for all render-loop code:
- `useFrame` callbacks must be cheap; the whole app's main-thread JS must stay inside the tier budget above.
- Do not call `setState` (Zustand) inside `useFrame` — it triggers React re-renders. Read state via `useAppStore.getState()` instead.
- Mutate `ref.current` properties directly for per-frame animation (scale, opacity, rotation).
- Use `useMemo` for geometry/texture creation — these are expensive and must only run once.

---

## Event Marker Cap

Maximum **30 event markers** rendered at once (enforced in `EventMarkers` component via `.slice(0, 30)`). Do not raise this limit without profiling.

Each marker consists of:
- 1× `sphereGeometry` (12×12 segments)
- 1× `ringGeometry` (24 segments)
- 1× optional `ringGeometry` for pulse

At 30 markers that is 90 draw calls. Any increase must be validated against the tier budgets and ceilings above.

---

## Texture and Memory

- Globe textures are generated on a `<canvas>` element via `createEarthTextures()` in `earthTexture.ts`. This runs once and the texture is cached.
- Do not reload or re-create textures on re-renders.
- Dispose of Three.js geometries and materials when components unmount:

```ts
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);
```

Failure to dispose causes memory leaks — critical for 24/7 operation.

---

## React Re-Render Budget

For an always-on dashboard, React re-renders must be minimal:
- Use per-selector Zustand subscriptions (not `useAppStore()` with destructuring).
- Use `useMemo` for expensive derived values.
- Use `useCallback` for event handlers passed as props to Three.js objects.
- Do not use `React.memo` as a default — only when profiling shows excess renders.

---

## Data Freshness vs. Update Frequency

| Collector | Typical interval | Notes |
|---|---|---|
| ISS position | 5 s | Position changes fast |
| Earthquakes | 60 s | USGS feed latency |
| Weather | 300 s | Data rarely changes faster |
| Asteroids | 3600 s | Daily data |

Do not decrease collector intervals without verifying the external API rate limit. The `BaseCollector` enforces a `maxBackoff` of 5 minutes automatically after errors.

---

## Lazy Loading

Components not visible on initial load (SkyMapModal, DisconnectOverlay) should not render their heavy content until triggered:

```tsx
{skyMapOpen && <SkyMapModal />}
```

Three.js Canvas elements not in view should have their render loop paused or removed from the DOM.

---

## Always-On Stability Rules

- No memory leaks — all timers, socket listeners, and Three.js objects must be cleaned up on unmount.
- No unhandled promise rejections — collectors catch and log errors; they do not crash the process.
- No `console.log()` in production code — it causes GC pressure. Use `console.warn()`/`console.error()` only.
- The server auto-restarts via Electron `fork()` monitoring if it crashes — do not rely on this as a substitute for proper error handling.
