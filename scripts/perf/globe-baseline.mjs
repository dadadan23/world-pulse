// Globe baseline + ablation runner (issue #384).
//
// Prereqs:  npx vite build      (renderer into dist/renderer, SERVER_URL defaults to :3000)
// Usage:    node scripts/perf/globe-baseline.mjs [--chrome /path/to/chrome] [--quick]
//           [--reps 3] [--ablation] [--attribution] [--out file.json] [--headed] [--gpu]
//
//   default        throughput scenarios (3 reps, median)
//   --quick        1 rep, shorter warm-up and sample windows
//   --ablation     skip one scene element's draws at a time
//   --attribution  also run the gl.finish() attribution scenarios. Off by default:
//                  very slow under SwiftShader (especially at 4K) and its output is
//                  excluded from SPEC-384 (see the CAVEAT in probe.js).
//
// Starts `vite preview` (port 4173) and scripts/perf/mock-server.mjs (port 3000),
// then runs each scenario in a fresh browser page with scripts/perf/probe.js
// injected, and prints a JSON + markdown summary.
//
// IMPORTANT: in a headless container Chromium rasterizes WebGL with SwiftShader
// (CPU). Absolute fps from such a run says nothing about real GPUs. Use the
// numbers for RELATIVE comparisons only (scene element A vs B, 1080p vs 4K).
// On real hardware, pass --headed --gpu (or use the console procedure in README.md).
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (argv.indexOf(`--${n}`) > -1 ? argv[argv.indexOf(`--${n}`) + 1] : d);

const CHROME = opt('chrome', process.env.CHROME_PATH);
const QUICK = flag('quick');
const WARMUP_MS = QUICK ? 2000 : 4000;
const SAMPLE_MS = QUICK ? 5000 : 10000;
const OUT = opt('out', null);
const probeSrc = readFileSync(path.join(here, 'probe.js'), 'utf8');

const HD = { width: 1920, height: 1080 };
const UHD = { width: 3840, height: 2160 };

const ALL_TAGS = [
  'earth',
  'atmosphere',
  'stars',
  'cityLights',
  'graticule',
  'wireframe',
  'markers',
  'labels',
  'aurora',
  'iss',
  'other',
];
const REPS = Number(opt('reps', QUICK ? 1 : 3));

// Throughput scenarios (repeated REPS times, interleaved, median reported) and,
// with --attribution only, attribution scenarios (gl.finish() around every draw).
const ABLATION = flag('ablation');
const ATTRIBUTION = flag('attribution');
const THROUGHPUT_SCENARIOS = [
  { name: 'empty (0 markers) 1080p dpr1', markers: 0, vp: HD, dpr: 1 },
  { name: 'baseline (50 markers) 1080p dpr1', markers: 50, vp: HD, dpr: 1 },
  { name: 'baseline 1080p dpr2', markers: 50, vp: HD, dpr: 2 },
  { name: 'baseline 4K dpr1', markers: 50, vp: UHD, dpr: 1 },
  { name: 'baseline reduced-motion', markers: 50, vp: HD, dpr: 1, reducedMotion: true },
  { name: 'clear only (all draws skipped)', markers: 50, vp: HD, dpr: 1, skip: ALL_TAGS },
];
const ATTRIBUTION_SCENARIOS = [
  { name: 'ATTRIBUTION 1080p dpr1', markers: 50, vp: HD, dpr: 1, attribution: true, once: true },
  { name: 'ATTRIBUTION 4K dpr1', markers: 50, vp: UHD, dpr: 1, attribution: true, once: true },
];

// --ablation: skip one scene element's draw calls at a time (1080p, dpr1, 50 markers).
// Raster + submission cost of the element is removed; its CPU scene-graph cost is not.
const ABLATION_SCENARIOS = [
  { name: 'baseline (50 markers) 1080p dpr1', markers: 50, vp: HD, dpr: 1 },
  ...['markers', 'labels', 'earth', 'atmosphere', 'wireframe', 'stars'].map((t) => ({
    name: `skip:${t}`,
    markers: 50,
    vp: HD,
    dpr: 1,
    skip: [t],
  })),
];
const SCENARIOS = ABLATION
  ? ABLATION_SCENARIOS
  : [...THROUGHPUT_SCENARIOS, ...(ATTRIBUTION ? ATTRIBUTION_SCENARIOS : [])];

// Spawned in its own process group so stopProc() also kills children
// (`npx vite preview` runs vite in a child of the npx wrapper).
function startProc(cmd, args, readyRe) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const timer = setTimeout(() => {
      stopProc(p);
      reject(new Error(`${cmd} not ready`));
    }, 30000);
    const onData = (d) => {
      if (readyRe.test(d.toString())) {
        clearTimeout(timer);
        resolve(p);
      }
    };
    p.stdout.on('data', onData);
    p.stderr.on('data', onData);
    p.on('exit', (c) => {
      clearTimeout(timer);
      reject(new Error(`${cmd} exited ${c}`));
    });
  });
}

function stopProc(p) {
  try {
    process.kill(-p.pid, 'SIGTERM');
  } catch {
    p.kill();
  }
}

async function withMock(markers, fn) {
  const mock = await startProc(
    process.execPath,
    [path.join(here, 'mock-server.mjs'), '--markers', String(markers)],
    /listening/
  );
  try {
    return await fn();
  } finally {
    stopProc(mock);
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function runScenario(browser, s) {
  const ctx = await browser.newContext({
    viewport: s.vp,
    deviceScaleFactor: s.dpr,
    reducedMotion: s.reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  await page.addInitScript({ content: probeSrc });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  if (s.skip) await page.evaluate((t) => window.__wpPerf.setSkip(t), s.skip);
  if (s.attribution) await page.evaluate(() => window.__wpPerf.setAttribution(true));
  await page.waitForTimeout(WARMUP_MS);
  await page.evaluate(() => window.__wpPerf.start());
  await page.waitForTimeout(SAMPLE_MS);
  const r = await page.evaluate(() => window.__wpPerf.stop());
  const gl = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('webgl2');
    const ext = c && c.getExtension('WEBGL_debug_renderer_info');
    return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await ctx.close();
  return { scenario: s.name, renderer: gl, ...r };
}

const preview = await startProc(
  'npx',
  ['vite', 'preview', '--port', '4173', '--strictPort'],
  /4173/
);
const launchArgs = flag('gpu')
  ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization']
  : [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      // Uncapped so frame interval reflects work, not vsync (relative comparisons).
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
    ];
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: !flag('headed'),
  args: launchArgs,
});

const results = [];
try {
  // Group scenarios by marker count so the mock server restarts only when needed.
  for (const markers of [...new Set(SCENARIOS.map((s) => s.markers))]) {
    await withMock(markers, async () => {
      const group = SCENARIOS.filter((x) => x.markers === markers);
      for (let rep = 0; rep < REPS; rep++) {
        for (const s of group) {
          if (s.once && rep > 0) continue;
          const r = await runScenario(browser, s);
          r.rep = rep;
          results.push(r);
          console.warn(
            `${s.name.padEnd(40)} rep${rep} fps=${r.summary.fpsMean} p50=${r.summary.frameMsP50}ms ` +
              `raf=${r.summary.rafCallbackMsP50}ms calls=${r.summary.drawCallsPerFrame}`
          );
        }
      }
    });
  }
} finally {
  await browser.close();
  stopProc(preview);
}

if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 2));

const median = (xs) => {
  const v = xs.filter((x) => x !== null).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
console.warn(
  '\n| Scenario | reps | fps (median) | mean frame ms | fps range | draw calls | triangles |'
);
console.warn('|---|---|---|---|---|---|---|');
for (const s of SCENARIOS) {
  const rs = results.filter((r) => r.scenario === s.name);
  const fps = rs.map((r) => r.summary.fpsMean);
  const m = median(fps);
  console.warn(
    `| ${s.name} | ${rs.length} | ${m} | ${m ? (1000 / m).toFixed(1) : '-'} | ` +
      `${Math.min(...fps)}-${Math.max(...fps)} | ${rs[0].summary.drawCallsPerFrame} | ` +
      `${Math.round(rs[0].summary.trianglesPerFrame)} |`
  );
}
for (const r of results.filter((x) => x.scenario.startsWith('ATTRIBUTION'))) {
  const total = Object.values(r.perTag).reduce((a, t) => a + (t.gpuMsPerFrame || 0), 0);
  console.warn(`\n${r.scenario}: blocking GPU ms per frame by element (total ${total.toFixed(1)})`);
  console.warn('| Element | draw calls/frame | primitives/frame | GPU ms/frame | share |');
  console.warn('|---|---|---|---|---|');
  Object.entries(r.perTag)
    .sort((a, b) => (b[1].gpuMsPerFrame || 0) - (a[1].gpuMsPerFrame || 0))
    .forEach(([tag, t]) =>
      console.warn(
        `| ${tag} | ${t.drawCallsPerFrame} | ${t.primitivesPerFrame} | ${t.gpuMsPerFrame} | ` +
          `${(((t.gpuMsPerFrame || 0) / total) * 100).toFixed(1)}% |`
      )
    );
}
const b = results.find((r) => r.scenario.startsWith('baseline (50'));
if (b) {
  console.warn(
    '\nBaseline resources:',
    JSON.stringify({
      textureUploadMiB: b.summary.textureUploadMiB,
      textureCount: b.summary.textureCount,
      largestTextures: b.textures
        .slice()
        .sort((x, y) => y.bytes - x.bytes)
        .slice(0, 3)
        .map((t) => `${t.w}x${t.h}`),
      jsHeapUsedMiB: b.summary.jsHeapUsedMiB,
      renderer: b.renderer,
    })
  );
}
