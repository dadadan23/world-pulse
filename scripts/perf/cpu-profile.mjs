// Main-thread CPU attribution for the globe render loop (issue #384).
//
// Prereqs: npx vite build. Starts vite preview (:4173) + mock server (:3000).
// Usage:   node scripts/perf/cpu-profile.mjs [--chrome path] [--markers 50] [--seconds 10]
//          [--startup]   profile page load instead (navigation -> canvas + 4 s)
//
// Renders at a deliberately tiny viewport (640x360, dpr 1) so software GL fill
// cost is minimised and the main thread is not stalled on the GPU process.
// What remains is JS cost per frame: React reconciliation + r3f + three.js
// scene traversal + WebGL command encoding. That cost scales with CPU speed,
// not GPU, so it is the most transferable number this container can produce.
//
// Output: CDP sampling-profiler self time bucketed by script chunk, plus
// startup long tasks (texture generation etc.) and probe frame stats.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.indexOf(`--${n}`) > -1 ? argv[argv.indexOf(`--${n}`) + 1] : d);
const CHROME = opt('chrome', process.env.CHROME_PATH);
const MARKERS = opt('markers', '50');
const SECONDS = Number(opt('seconds', '10'));
const STARTUP = argv.includes('--startup');
const probeSrc = readFileSync(path.join(here, 'probe.js'), 'utf8');

// Own process group so stopProc() also kills the vite child of `npx`.
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

const preview = await startProc(
  'npx',
  ['vite', 'preview', '--port', '4173', '--strictPort'],
  /4173/
);
const mock = await startProc(
  process.execPath,
  [path.join(here, 'mock-server.mjs'), '--markers', MARKERS],
  /listening/
);
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const page = await ctx.newPage();
  await page.addInitScript({ content: probeSrc });
  await page.addInitScript(() => {
    window.__longTasks = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          window.__longTasks.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) });
      }).observe({ type: 'longtask', buffered: true });
    } catch (_e) {
      /* longtask unsupported */
    }
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  if (STARTUP) await cdp.send('Profiler.start');
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);
  const startup = await page.evaluate(() => window.__longTasks.slice());

  await page.evaluate(() => window.__wpPerf.start());
  if (!STARTUP) {
    await cdp.send('Profiler.start');
    await page.waitForTimeout(SECONDS * 1000);
  } else {
    await page.waitForTimeout(1000);
  }
  const { profile } = await cdp.send('Profiler.stop');
  const probe = await page.evaluate(() => window.__wpPerf.stop());

  // Self time per node = samples * avg interval; bucket by chunk.
  const dt = (profile.endTime - profile.startTime) / profile.samples.length / 1000; // ms
  const counts = new Map();
  for (const id of profile.samples) counts.set(id, (counts.get(id) || 0) + 1);
  const buckets = {};
  const fns = {};
  for (const n of profile.nodes) {
    const c = counts.get(n.id) || 0;
    if (!c) continue;
    const url = n.callFrame.url || '';
    const fn = n.callFrame.functionName || '(anonymous)';
    let b;
    if (fn === '(idle)') b = 'idle';
    else if (fn === '(program)') b = 'program (native, incl. GPU IPC)';
    else if (fn === '(garbage collector)') b = 'garbage collector';
    else if (/vendor-three/.test(url)) b = 'vendor-three chunk (three + r3f + drei)';
    else if (/assets\/main-/.test(url)) b = 'main chunk (React + app code)';
    else b = 'other / native';
    buckets[b] = (buckets[b] || 0) + c * dt;
    const key = `${fn} @ ${url.split('/').pop()}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`;
    if (b !== 'idle') fns[key] = (fns[key] || 0) + c * dt;
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  const frames = probe.summary.frames || 1;
  console.warn(`\nCPU profile, ${SECONDS}s @ 640x360, ${MARKERS} markers, ${frames} frames`);
  console.warn('| Bucket | ms per second | ms per frame | share of wall |');
  console.warn('|---|---|---|---|');
  for (const [b, ms] of Object.entries(buckets).sort((a, c) => c[1] - a[1])) {
    console.warn(
      `| ${b} | ${(ms / SECONDS).toFixed(1)} | ${(ms / frames).toFixed(2)} | ${((ms / total) * 100).toFixed(1)}% |`
    );
  }
  console.warn('\nTop self-time functions (non-idle):');
  Object.entries(fns)
    .sort((a, c) => c[1] - a[1])
    .slice(0, 12)
    .forEach(([k, ms]) => console.warn(`  ${(ms / frames).toFixed(3)} ms/frame  ${k}`));
  console.warn('\nProbe summary:', JSON.stringify(probe.summary));
  console.warn('Startup long tasks (ms):', JSON.stringify(startup));
  console.warn(
    'Texture allocations:',
    JSON.stringify(
      probe.textures.filter((t) => t.w * t.h > 1).map((t) => `${t.w}x${t.h}x${t.levels}`)
    ),
    `total ${(probe.textures.reduce((a, t) => a + t.bytes, 0) / 1048576).toFixed(1)} MiB`
  );
  await ctx.close();
} finally {
  await browser.close();
  stopProc(mock);
  stopProc(preview);
}
