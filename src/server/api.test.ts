import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { BaseCollector } from './collectors/base';
import type { Event } from '@shared/types';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS',
    location: null,
    title: 'Test',
    data: {},
    ...overrides,
  };
}

describe('Server API', () => {
  let app: ReturnType<typeof createApp>;

  afterEach(() => {
    app?.stopSweep();
    app?.httpServer.close();
    app?.io.close();
  });

  function setup() {
    app = createApp({ corsOrigin: '*' });
    return app;
  }

  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/health');

      const date = new Date(res.body.timestamp);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe('GET /api/status', () => {
    it('should return ready status', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.collectors).toBeDefined();
      expect(Array.isArray(res.body.collectors)).toBe(true);
      expect(res.body.eventCount).toBe(0);
    });

    it('should report event count', async () => {
      const { app: expressApp, addEvents } = setup();
      addEvents([
        {
          id: '1',
          timestamp: Date.now(),
          type: 'earthquake',
          source: 'USGS Earthquake Hazards Program',
          location: null,
          title: 'Test',
          data: {},
        },
      ]);

      const res = await request(expressApp).get('/api/status');
      expect(res.body.eventCount).toBe(1);
    });
  });

  describe('GET /api/events', () => {
    it('should return empty events initially', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/api/events');

      expect(res.status).toBe(200);
      expect(res.body.events).toEqual([]);
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return ISO timestamp string', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/api/events');

      expect(typeof res.body.timestamp).toBe('string');
      expect(Date.parse(res.body.timestamp)).toBeGreaterThan(0);
    });

    it('should return added events', async () => {
      const { app: expressApp, addEvents } = setup();
      const event = {
        id: 'test-1',
        timestamp: Date.now(),
        type: 'earthquake' as const,
        source: 'USGS Earthquake Hazards Program',
        location: { lat: 35.7, lon: 139.7, name: 'Tokyo' },
        severity: 5,
        title: 'M5.0 - Near Tokyo',
        data: { magnitude: 5.0 },
      };
      addEvents([event]);

      const res = await request(expressApp).get('/api/events');
      expect(res.body.events).toHaveLength(1);
      expect(res.body.events[0].id).toBe('test-1');
      expect(res.body.events[0].location.name).toBe('Tokyo');
    });

    it('should return events matching the Event[] schema', async () => {
      const { app: expressApp, addEvents } = setup();
      const event: Event = {
        id: 'schema-test-1',
        timestamp: Date.now(),
        type: 'earthquake',
        source: 'USGS Earthquake Hazards Program',
        location: { lat: -33.9, lon: 151.2, name: 'Sydney' },
        severity: 3,
        title: 'M3.1 - Near Sydney',
        description: 'Minor tremor near Sydney',
        data: { magnitude: 3.1, depth: 10, region: 'New South Wales' },
      };
      addEvents([event]);

      const res = await request(expressApp).get('/api/events');
      expect(res.status).toBe(200);
      const ev = res.body.events[0];

      // Validate all required Event fields
      expect(typeof ev.id).toBe('string');
      expect(typeof ev.timestamp).toBe('number');
      expect(typeof ev.type).toBe('string');
      expect(typeof ev.source).toBe('string');
      expect(typeof ev.title).toBe('string');
      expect(ev.data).toBeDefined();
      expect(typeof ev.data).toBe('object');

      // Optional fields present in this event
      expect(typeof ev.severity).toBe('number');
      expect(typeof ev.description).toBe('string');

      // GeoLocation fields
      expect(typeof ev.location.lat).toBe('number');
      expect(typeof ev.location.lon).toBe('number');
      expect(typeof ev.location.name).toBe('string');
    });

    it('should return event with null location', async () => {
      const { app: expressApp, addEvents } = setup();
      addEvents([makeEvent({ id: 'null-loc-1' })]);

      const res = await request(expressApp).get('/api/events');
      expect(res.body.events[0].location).toBeNull();
    });

    it('should deduplicate events with the same id', async () => {
      const { app: expressApp, addEvents } = setup();
      const event = makeEvent({ id: 'dup-1', title: 'Original' });
      addEvents([event]);
      addEvents([{ ...event, title: 'Updated' }]);

      const res = await request(expressApp).get('/api/events');
      const matches = res.body.events.filter((e: Event) => e.id === 'dup-1');
      expect(matches).toHaveLength(1);
      expect(matches[0].title).toBe('Updated');
    });

    it('should cap events at 100', async () => {
      const { app: expressApp, addEvents } = setup();
      const events = Array.from({ length: 120 }, (_, i) => ({
        id: `event-${i}`,
        timestamp: Date.now(),
        type: 'earthquake' as const,
        source: 'USGS Earthquake Hazards Program',
        location: null,
        title: `Event ${i}`,
        data: {},
      }));
      addEvents(events);

      const res = await request(expressApp).get('/api/events');
      expect(res.body.events.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown paths', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/unknown');
      expect(res.status).toBe(404);
    });

    it('should return 404 for unknown API sub-paths', async () => {
      const { app: expressApp } = setup();
      const res = await request(expressApp).get('/api/not-a-route');
      expect(res.status).toBe(404);
    });
  });

  describe('addEvents error resilience', () => {
    it('should keep events in cache even if io.emit throws', () => {
      const { io, addEvents, getEventCache } = setup();
      vi.spyOn(io, 'emit').mockImplementationOnce(() => {
        throw new Error('socket error');
      });

      expect(() => addEvents([makeEvent({ id: 'resilient-1' })])).not.toThrow();
      expect(getEventCache()).toHaveLength(1);
      expect(getEventCache()[0].id).toBe('resilient-1');

      vi.restoreAllMocks();
    });
  });

  describe('GET /api/status CollectorHealth contract', () => {
    class FakeCollector extends BaseCollector {
      async fetch(): Promise<Event[]> {
        return [];
      }
      validate(): boolean {
        return true;
      }
    }

    class FakePrimaryCollector extends FakeCollector {
      public readonly qualityTier = 'primary' as const;
    }

    it('should return CollectorHealth shape for each collector', async () => {
      const { app: expressApp, setCollectors } = setup();
      const collector = new FakeCollector('earthquakes', 'earthquake', 60000);
      setCollectors([collector]);

      const res = await request(expressApp).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body.collectors).toHaveLength(1);

      const c = res.body.collectors[0];
      expect(c).toEqual({
        name: 'earthquakes',
        status: 'healthy',
        lastFetchAt: null,
        errorCount: 0,
        isEnabled: true,
        qualityTier: 'supplementary',
      });
    });

    it('should report degraded overall status when a primary collector is disabled', async () => {
      const { app: expressApp, setCollectors } = setup();
      const collector = new FakePrimaryCollector('earthquakes', 'earthquake', 60000, 1);
      collector.fetch = async () => {
        throw new Error('primary source unavailable');
      };

      // One failure reaches maxErrors=1 and disables the collector.
      await collector.pollNow(() => {});
      setCollectors([collector]);

      const res = await request(expressApp).get('/api/status');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.collectors[0].qualityTier).toBe('primary');
      expect(res.body.collectors[0].status).toBe('disabled');
    });

    it('should report degraded when collector has errors', async () => {
      const { app: expressApp, setCollectors } = setup();
      const collector = new FakeCollector('earthquakes', 'earthquake', 60000);
      // Simulate errors by calling pollNow with a failing fetch
      const originalFetch = collector.fetch.bind(collector);
      collector.fetch = async () => {
        throw new Error('API down');
      };
      await collector.pollNow(() => {});
      // Restore fetch so getStatus works normally
      collector.fetch = originalFetch;
      setCollectors([collector]);

      const res = await request(expressApp).get('/api/status');
      expect(res.body.collectors[0].status).toBe('degraded');
      expect(res.body.collectors[0].errorCount).toBe(1);
    });

    it('should report disabled when collector is disabled', async () => {
      const { app: expressApp, setCollectors } = setup();
      // maxErrors=1 for fast test; production uses default (5)
      const collector = new FakeCollector('earthquakes', 'earthquake', 60000, 1);
      collector.fetch = async () => {
        throw new Error('API down');
      };
      // One error = maxErrors so it auto-disables
      await collector.pollNow(() => {});
      setCollectors([collector]);

      const res = await request(expressApp).get('/api/status');
      expect(res.body.collectors[0].status).toBe('disabled');
      expect(res.body.collectors[0].isEnabled).toBe(false);
    });
  });

  describe('Event TTL sweep', () => {
    it('should remove stale events when sweep runs', () => {
      vi.useFakeTimers();
      try {
        const { addEvents, getEventCache, startSweep, stopSweep: stop } = setup();
        const staleTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
        addEvents([
          makeEvent({ id: 'stale-1', timestamp: staleTimestamp }),
          makeEvent({ id: 'fresh-1', timestamp: Date.now() }),
        ]);
        expect(getEventCache()).toHaveLength(2);

        startSweep();
        // Advance past the 60-second sweep interval
        vi.advanceTimersByTime(61_000);
        stop();

        const remaining = getEventCache();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe('fresh-1');
      } finally {
        vi.useRealTimers();
      }
    });

    it('should keep fresh events in cache', async () => {
      const { app: expressApp, addEvents } = setup();
      addEvents([makeEvent({ id: 'fresh-1', timestamp: Date.now() })]);

      const res = await request(expressApp).get('/api/events');
      expect(res.body.events).toHaveLength(1);
      expect(res.body.events[0].id).toBe('fresh-1');
    });
  });
});
