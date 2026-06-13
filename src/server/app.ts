import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Event, CollectorHealth, CollectorHealthStatus } from '@shared/types';
import type { BaseCollector } from './collectors/base';

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
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: options?.corsOrigin || 'http://localhost:5173',
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

  /** Remove events older than EVENT_TTL_MS and notify clients */
  function sweepStaleEvents() {
    const cutoff = Date.now() - EVENT_TTL_MS;
    const before = eventCache.length;
    eventCache = eventCache.filter((e) => e.timestamp >= cutoff);
    const expired = before - eventCache.length;
    if (expired > 0) {
      io.emit('events:expired', { count: expired, timestamp: Date.now() });
    }
  }

  // Middleware
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
        // eslint-disable-next-line no-console
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
