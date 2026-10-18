# Globe performance scripts (issue #384)

Measurement tooling for the display-target and frame-budget spike. Results and
budgets live in [`docs/specs/SPEC-384.md`](../../docs/specs/SPEC-384.md). Nothing
here is imported by `src/`.

| File                 | What it does                                                                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `probe.js`           | Dependency-free in-page probe. Counts draw calls, triangles and texture allocations per frame by patching `WebGL2RenderingContext`, and measures frame intervals with its own `requestAnimationFrame` loop. Can skip a scene element (ablation). |
| `mock-server.mjs`    | Deterministic backend (`/health`, `/api/status`, Socket.io `events:initial`) with N seeded synthetic events plus one ISS and one aurora event. No API keys, no network. Binds `127.0.0.1` unless `--host` is given.                              |
| `globe-baseline.mjs` | Starts `vite preview` and the mock server, runs throughput scenarios (or `--ablation`) in Playwright Chromium, prints markdown tables.                                                                                                           |
| `cpu-profile.mjs`    | CDP sampling profile of the render loop at a tiny viewport (JS cost per frame), or of page load with `--startup`.                                                                                                                                |

## Container / CI use (software GL, relative numbers only)

```bash
npx vite build
node scripts/perf/globe-baseline.mjs --chrome /opt/pw-browsers/chromium-1194/chrome-linux/chrome
node scripts/perf/globe-baseline.mjs --chrome <path> --quick         # 1 rep, ~4 min here
node scripts/perf/globe-baseline.mjs --chrome <path> --ablation
node scripts/perf/globe-baseline.mjs --chrome <path> --attribution   # adds gl.finish() runs; slow
node scripts/perf/cpu-profile.mjs --chrome <path> [--markers 0|50] [--startup]
```

Headless Chromium here renders WebGL with SwiftShader (CPU). Absolute fps is not
representative of any real display. Draw-call and triangle counts are exact and
hardware-independent.

## On-device procedure (the numbers the spike could not capture)

Run on each candidate device (see SPEC-384 section 2). Takes about 10 minutes per device.

1. Build and serve the app the way the device will run it (Electron build, or `npm run build`
   plus the real server). Use the real backend if possible. Otherwise run the mock backend:
   - Same machine as the browser: `node scripts/perf/mock-server.mjs --markers 50` (binds
     `127.0.0.1` only).
   - Device fetching from another machine on the LAN:
     `node scripts/perf/mock-server.mjs --markers 50 --host <lan-ip-of-that-machine>` (or
     `--host 0.0.0.0`), on a trusted network only, and build the renderer with
     `VITE_SERVER_URL=http://<lan-ip>:3000`. The mock sends `Access-Control-Allow-Origin: *`
     and synthetic data only; stop it when you are done.
2. Set the display to its deployment resolution and scaling. Record: device model, OS and browser
   version and resolution. `window.devicePixelRatio` and the unmasked WebGL renderer string
   (`WEBGL_debug_renderer_info`) are included in the probe summary (`devicePixelRatio`,
   `renderer`) from step 5.
3. Open DevTools for the page:
   - Electron: View > Toggle Developer Tools (or `Ctrl+Shift+I`).
   - Raspberry Pi Chromium: launch with `--remote-debugging-port=9222` and open
     `chrome://inspect` from another machine, or use local DevTools.
   - iPad Safari (Recommended tier for M1 or newer; older iPads are best effort): enable Web
     Inspector on the iPad (Settings > Safari > Advanced), connect to a Mac, Safari > Develop >
     [iPad] > page.
4. Let the globe run for 2 minutes after load (warm-up; thermals matter for always-on use).
5. Paste the full contents of `probe.js` into the console, then run:
   `__wpPerf.start(); setTimeout(() => { const r = __wpPerf.stop(); console.table(r.summary); console.table(r.perTag); copy && copy(JSON.stringify(r)); }, 60000);`
   (`copy` exists in Chromium DevTools only; on Safari, expand and copy the logged object.)
6. Repeat step 5 with the settings the tier uses (for example after toggling reduced motion), and
   once with `__wpPerf.setSkip(['markers'])` to measure the marker system on that device.
7. Visual check: watch for 60 s for visible stutter during rotation and marker pulses. Note OS-level
   CPU and GPU load if available (`htop` and `vcgencmd measure_temp` on Pi; Activity Monitor on
   macOS; Task Manager GPU tab on Windows).
8. Record results in the on-device table in SPEC-384 section 7.1. Summary fields to copy:
   `renderer`, `devicePixelRatio`, `fpsMean`, `frameMsP95`, `pctFramesOver66ms`, `framesOver50ms`,
   `rafCallbackMsP95`, plus temperature after 10 minutes and whether p95 meets the section 3
   budget for the tier. `framesOver33ms` is informative only (at 30 fps nearly every frame is
   about 33.3 ms). `programsCreated` is only complete when the probe is injected before load.

Notes: the probe patches WebGL only after it is pasted, so draw-call counts start from the next
frame, which is fine. The renderer string is read from the app's own context on the first
`useProgram` after pasting. Texture allocation totals and `programsCreated` are only complete when
the probe is injected before load (Playwright path); texture totals are cumulative allocations
(`deleteTexture` is not subtracted). Per-element (`perTag`) draw calls sum exactly to
`drawCallsPerFrame`.
