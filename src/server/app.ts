import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { Event, CollectorHealth, CollectorHealthStatus, WeatherEvent } from '@shared/types';
import type { BaseCollector } from './collectors/base';
import { fetchWeatherData } from './collectors/weatherClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Built frontend assets, produced by `vite build` (see vite.config.ts outDir). */
const RENDERER_DIST = path.resolve(__dirname, '../../dist/renderer');

/**
 * Derive a CollectorHealth summary from the internal collector status.
 */
function toCollectorHealth(collector: BaseCollector): CollectorHealth {
  const raw = collector.getStatus();
  let status: CollectorHealthStatus;
  if (!raw.enabled) {
    status = 'disabled';
  } else if (raw.errorCount > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  const intervalMs = collector.interval;
  const isStale = raw.lastFetch > 0 && Date.now() - raw.lastFetch > intervalMs * 3;
  return {
    name: raw.name,
    status,
    lastFetchAt: raw.lastFetch || null,
    errorCount: raw.errorCount,
    isEnabled: raw.enabled,
    qualityTier: collector.qualityTier,
    intervalMs,
    isStale,
  };
}

export function createApp(options?: { corsOrigin?: string }) {
  const app = express();
  const corsOrigin = options?.corsOrigin ?? 'http://localhost:5173';
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  let eventCache: Event[] = [];
  const MAX_EVENTS = 100;
  /** Maximum event age in milliseconds (default: 60 minutes) */
  const EVENT_TTL_MS = 60 * 60 * 1000;
  /** Sweep interval in milliseconds (default: 60 seconds) */
  const SWEEP_INTERVAL_MS = 60 * 1000;
  let collectors: BaseCollector[] = [];
  let sweepTimer: ReturnType<typeof setInterval> | null = null;

  /** Short-lived cache for on-demand weather lookups, keyed by rounded coordinates. */
  const weatherCache = new Map<string, { data: WeatherEvent['data']; expiresAt: number }>();
  const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;

  /** Simple in-process rate limiter for /api/weather: max 10 requests per IP per minute. */
  const weatherRateMap = new Map<string, { count: number; resetAt: number }>();
  const WEATHER_RATE_LIMIT = 10;
  const WEATHER_RATE_WINDOW_MS = 60 * 1000;

  /** Remove events older than EVENT_TTL_MS, evict expired weather cache entries, notify clients */
  function sweepStaleEvents() {
    const now = Date.now();
    const cutoff = now - EVENT_TTL_MS;
    const before = eventCache.length;
    eventCache = eventCache.filter((e) => e.timestamp >= cutoff);
    const expired = before - eventCache.length;
    if (expired > 0) {
      io.emit('events:expired', { count: expired, timestamp: now });
    }
    // Evict expired weather cache entries to prevent unbounded growth on 24/7 deployments
    for (const [key, entry] of weatherCache) {
      if (entry.expiresAt <= now) weatherCache.delete(key);
    }
    // Evict stale rate-limit buckets
    for (const [ip, bucket] of weatherRateMap) {
      if (bucket.resetAt <= now) weatherRateMap.delete(ip);
    }
  }

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    const mem = process.memoryUsage();
    const collectorsSummary = collectors.map((c) => c.getStatus());
    const healthyCount = collectorsSummary.filter((c) => c.healthy).length;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
      },
      collectors: collectorsSummary,
      collectorsTotal: collectorsSummary.length,
      collectorsHealthy: healthyCount,
    });
  });

  // Status endpoint for frontend initialization
  app.get('/api/status', (_req, res) => {
    const collectorHealth = collectors.map(toCollectorHealth);
    const healthyCount = collectorHealth.filter((c) => c.status === 'healthy').length;
    const primaryCollectors = collectorHealth.filter((c) => c.qualityTier === 'primary');
    const primaryAllHealthy =
      primaryCollectors.length === 0 || primaryCollectors.every((c) => c.status === 'healthy');
    const overallStatus = primaryAllHealthy ? 'ready' : 'degraded';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      collectors: collectorHealth,
      collectorsTotal: collectorHealth.length,
      collectorsHealthy: healthyCount,
      eventCount: eventCache.length,
    });
  });

  // Get all cached events
  app.get('/api/events', (_req, res) => {
    res.json({
      events: eventCache,
      timestamp: new Date().toISOString(),
    });
  });

  // On-demand weather lookup for a given coordinate (client geolocation or a
  // selected event's location). Distinct from the WeatherCollector's ambient
  // broadcast, which always reflects the server's own IP-detected location.
  app.get('/api/weather', async (req, res) => {
    // Rate limit: 10 requests per IP per minute to protect the upstream API key
    const ip = String(req.ip ?? 'unknown');
    const now = Date.now();
    const bucket = weatherRateMap.get(ip);
    if (bucket && bucket.resetAt > now) {
      if (bucket.count >= WEATHER_RATE_LIMIT) {
        res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
        return;
      }
      bucket.count++;
    } else {
      weatherRateMap.set(ip, { count: 1, resetAt: now + WEATHER_RATE_WINDOW_MS });
    }

    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const name = typeof req.query.name === 'string' ? req.query.name : 'Unknown location';

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      res.status(400).json({ error: 'invalid_coordinates' });
      return;
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'not_configured',
        message: 'OPENWEATHER_API_KEY is not set on the server',
      });
      return;
    }

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ data: cached.data, timestamp: new Date().toISOString() });
      return;
    }

    try {
      const { data } = await fetchWeatherData(lat, lon, apiKey, name);
      weatherCache.set(cacheKey, { data, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS });
      res.json({ data, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('[API] /api/weather fetch failed:', err);
      res.status(502).json({ error: 'fetch_failed', message: 'Failed to fetch weather data' });
    }
  });

  // Serve the built frontend (single-container deployment). In dev/test the
  // renderer is served by the Vite dev server instead, so this only activates
  // in production, and only if dist/renderer was actually built.
  if (process.env.NODE_ENV === 'production' && fs.existsSync(RENDERER_DIST)) {
    app.use(express.static(RENDERER_DIST));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(RENDERER_DIST, 'index.html'));
    });
  }

  // Socket.io connection handling
  io.on('connection', (socket) => {
    socket.emit('events:initial', {
      events: eventCache,
      timestamp: Date.now(),
    });

    socket.on('disconnect', () => {
      // Client disconnected
    });
  });

  return {
    app,
    httpServer,
    io,
    addEvents(events: Event[]) {
      // Remove existing events with same IDs (deduplication)
      const newIds = new Set(events.map((e) => e.id));
      const filtered = eventCache.filter((e) => !newIds.has(e.id));
      eventCache = [...events, ...filtered].slice(0, MAX_EVENTS);
      // Broadcast new events to connected clients
      try {
        io.emit('events:new', { events, timestamp: Date.now() });
      } catch (err) {
        // If emit fails, log and continue
        console.error('Failed to emit events:new', err);
      }
    },
    getEventCache() {
      return eventCache;
    },
    setCollectors(c: BaseCollector[]) {
      collectors = c;
    },
    startSweep() {
      if (!sweepTimer) {
        sweepTimer = setInterval(sweepStaleEvents, SWEEP_INTERVAL_MS);
      }
    },
    stopSweep() {
      if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
    },
  };
}
