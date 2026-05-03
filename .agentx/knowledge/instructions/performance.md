# Instruction: Performance

World Pulse runs 24/7 on dedicated display hardware (TV, iPad, monitor). Performance is a first-class constraint — not an optimization to do later.

---

## Frame Budget: 60 fps

The Three.js render loop must sustain **60 fps** on the target hardware. Budget: **16.6 ms per frame**.

Guidelines:
- `useFrame` callbacks must complete in < 1 ms each.
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

At 30 markers that is 90 draw calls. Any increase must be validated against the 60 fps target.

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
