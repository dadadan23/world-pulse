// Deterministic mock backend for globe performance measurement (issue #384).
//
// Serves /health, /api/status and a Socket.io endpoint that emits a fixed,
// seeded set of synthetic events on connect, so that every measurement run
// renders the same scene. No collectors, no network, no API keys.
//
// Usage: node scripts/perf/mock-server.mjs [--port 3000] [--markers 50] [--host 127.0.0.1]
//   --host H      interface to bind. Defaults to 127.0.0.1 (loopback only). For an
//                 on-device run where the device fetches from another machine, pass
//                 the LAN address (or 0.0.0.0) on a trusted network only.
//   --markers N   number of located events to emit (plus 1 ISS + 1 aurora event)
//                 Events are spread on a golden-angle spiral so the client-side
//                 5-degree proximity dedup does not collapse them.
import http from 'node:http';
import { Server } from 'socket.io';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const PORT = Number(arg('port', process.env.PORT ?? 3000));
const MARKERS = Number(arg('markers', process.env.MARKERS ?? 50));
const HOST = arg('host', process.env.PERF_MOCK_HOST ?? '127.0.0.1');

// Small seeded PRNG (mulberry32) so severities are identical between runs.
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildEvents(n) {
  const rand = rng(384);
  const now = Date.now();
  const events = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const lat = (Math.asin(Math.max(-1, Math.min(1, y * 0.9))) * 180) / Math.PI;
    const lon = (((((i * golden * 180) / Math.PI) % 360) + 360) % 360) - 180;
    // Severity spread over 0-9 so EventPulseRing (severity >= 5) is exercised.
    const severity = Math.round(rand() * 9 * 10) / 10;
    const isVolcano = i % 3 === 0;
    events.push({
      id: `perf-${i}`,
      timestamp: now - i * 60_000,
      type: isVolcano ? 'volcano' : 'earthquake',
      source: 'perf-mock',
      location: { lat, lon },
      severity,
      title: `Synthetic event ${i}`,
      // Realistic data payloads: side-column widgets dereference these fields.
      data: isVolcano
        ? { volcanoName: `Synthetic ${i}`, alertLevel: 'advisory', colorCode: 'yellow' }
        : { magnitude: severity, depth: 10 + i, region: `Synthetic region ${i}` },
    });
  }
  events.push({
    id: 'perf-iss',
    timestamp: now,
    type: 'iss',
    source: 'perf-mock',
    location: { lat: 20, lon: -40 },
    severity: 1,
    title: 'ISS',
    data: { altitude: 420, velocity: 27600, visibility: 'daylight' },
  });
  events.push({
    id: 'perf-aurora',
    timestamp: now,
    type: 'aurora',
    source: 'perf-mock',
    location: { lat: 60, lon: 0 },
    severity: 6,
    title: 'Aurora',
    data: { kpIndex: 6, stormLevel: 'storm', hemisphere: 'both' },
  });
  return events;
}

const events = buildEvents(MARKERS);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.url?.startsWith('/health')) {
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), uptime: 1 }));
  } else if (req.url?.startsWith('/api/status')) {
    res.end(JSON.stringify({ status: 'ready', collectors: [], eventCount: events.length }));
  } else if (req.url?.startsWith('/api/events')) {
    res.end(JSON.stringify({ events }));
  } else if (!req.url?.startsWith('/socket.io')) {
    res.statusCode = 404;
    res.end('{}');
  }
});

const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  socket.emit('events:initial', { events, timestamp: Date.now() });
});

server.listen(PORT, HOST, () => {
  console.warn(
    `[perf-mock] listening on ${HOST}:${PORT} with ${MARKERS} located events (+ISS, +aurora)`
  );
});
