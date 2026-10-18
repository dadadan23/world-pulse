# Globe performance scripts (issue #384)

Measurement tooling for the display-target and frame-budget spike. Results and
budgets live in [`docs/specs/SPEC-384.md`](../../docs/specs/SPEC-384.md). Nothing
here is imported by `src/`.

| File                 | What it does                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `probe.js`           | Dependency-free in-page probe. Counts draw calls, triangles and texture allocations per frame by patching `WebGL2RenderingContext`, and measures frame intervals with its own `requestAnimationFrame` loop. Can skip a scene element (ablation). |
| `mock-server.mjs`    | Deterministic backend (`/health`, `/api/status`, Socket.io `events:initial`) with N seeded synthetic events plus one ISS and one aurora event. No API keys, no network.                                                                          |
| `globe-baseline.mjs` | Starts `vite preview` and the mock server, runs throughput scenarios (or `--ablation`) in Playwright Chromium, prints markdown tables.                                                                                                           |
| `cpu-profile.mjs`    | CDP sampling profile of the render loop at a tiny viewport (JS cost per frame), or of page load with `--startup`.                                                                                                                                |

## Container / CI use (software GL, relative numbers only)

```bash
npx vite build
node scripts/perf/globe-baseline.mjs --chrome /opt/pw-browsers/chromium-1194/chrome-linux/chrome
node scripts/perf/globe-baseline.mjs --chrome <path> --ablation
node scripts/perf/cpu-profile.mjs --chrome <path> [--markers 0|50] [--startup]
```

Headless Chromium here renders WebGL with SwiftShader (CPU). Absolute fps is not
representative of any real display. Draw-call and triangle counts are exact and
hardware-independent.

## On-device procedure (the numbers the spike could not capture)

Run on each candidate device (see SPEC-384 section 2). Takes about 10 minutes per device.

1. Build and serve the app the way the device will run it (Electron build, or `npm run build`
   plus the real server). Use the real backend if possible; otherwise run
   `node scripts/perf/mock-server.mjs --markers 50` on a machine the device can reach and build
   the renderer with `VITE_SERVER_URL=http://<host>:3000`.
2. Set the display to its deployment resolution and scaling. Record: device model, OS and browser
   version, resolution, `window.devicePixelRatio`, and the WebGL renderer string
   (`WEBGL_debug_renderer_info`, shown in the probe output if you use step 6).
3. Open DevTools for the page:
   - Electron: View > Toggle Developer Tools (or `Ctrl+Shift+I`).
   - Raspberry Pi Chromium: launch with `--remote-debugging-port=9222` and open
     `chrome://inspect` from another machine, or use local DevTools.
   - iPad Safari: enable Web Inspector on the iPad (Settings > Safari > Advanced), connect to a Mac,
     Safari > Develop > [iPad] > page.
   - TV built-in browsers: usually no DevTools. Record only the visual check in step 7 and treat the
     device as unsupported for rendering unless it can be inspected.
4. Let the globe run for 2 minutes after load (warm-up; thermals matter for always-on use).
5. Paste the full contents of `probe.js` into the console, then run:
   `__wpPerf.start(); setTimeout(() => { const r = __wpPerf.stop(); console.table(r.summary); console.table(r.perTag); copy && copy(JSON.stringify(r)); }, 60000);`
   (`copy` exists in Chromium DevTools only; on Safari, expand and copy the logged object.)
6. Repeat step 5 with the settings the tier uses (for example after toggling reduced motion), and
   once with `__wpPerf.setSkip(['markers'])` to measure the marker system on that device.
7. Visual check: watch for 60 s for visible stutter during rotation and marker pulses. Note OS-level
   CPU and GPU load if available (`htop` and `vcgencmd measure_temp` on Pi; Activity Monitor on
   macOS; Task Manager GPU tab on Windows).
8. Record results in the on-device table in SPEC-384 section 7.1 (median fps, p95 frame ms, frames
   over 33 ms, rAF callback p95, temperature after 10 minutes).

Notes: the probe patches WebGL only after it is pasted, so draw-call counts start from the next
frame, which is fine. Texture allocation totals are only complete when the probe is injected before
load (Playwright path).
