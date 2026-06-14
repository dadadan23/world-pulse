import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollectorRegistry } from './registry';
import { BaseCollector } from './base';
import type { CollectorManifest, Event } from '@shared/types';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'Test',
    location: null,
    title: 'Test event',
    data: {},
    ...overrides,
  };
}

class StubCollector extends BaseCollector {
  readonly events: Event[];
  constructor(events: Event[] = [], interval = 1000) {
    super('stub', 'earthquake', interval);
    this.events = events;
  }
  async fetch(): Promise<Event[]> {
    return this.events;
  }
  validate(): boolean {
    return true;
  }
}

const validManifest: CollectorManifest = {
  id: 'test-collector',
  version: '1.0.0',
  displayName: 'Test Collector',
  capabilities: ['earthquake'],
  qualityTier: 'primary',
  enabledByDefault: true,
};

describe('CollectorRegistry', () => {
  let registry: CollectorRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new CollectorRegistry();
  });

  afterEach(() => {
    registry.stop();
    vi.useRealTimers();
  });

  describe('register()', () => {
    it('accepts a valid manifest', () => {
      expect(() => registry.register(validManifest, () => new StubCollector())).not.toThrow();
    });

    it('rejects an invalid manifest (missing id)', () => {
      const bad = { ...validManifest, id: '' };
      expect(() => registry.register(bad, () => new StubCollector())).toThrow(/id must be/);
    });

    it('rejects a duplicate manifest id', () => {
      registry.register(validManifest, () => new StubCollector());
      expect(() => registry.register(validManifest, () => new StubCollector())).toThrow(
        /Duplicate/
      );
    });

    it('rejects invalid qualityTier', () => {
      const bad = { ...validManifest, qualityTier: 'unknown' as 'primary' };
      expect(() => registry.register(bad, () => new StubCollector())).toThrow(/qualityTier/);
    });
  });

  describe('start()', () => {
    it('starts enabled collectors and returns their instances', () => {
      registry.register(validManifest, () => new StubCollector());
      const collectors = registry.start(vi.fn());
      expect(collectors).toHaveLength(1);
    });

    it('skips collectors with enabledByDefault: false', () => {
      const disabledManifest = { ...validManifest, enabledByDefault: false };
      registry.register(disabledManifest, () => new StubCollector());
      const collectors = registry.start(vi.fn());
      expect(collectors).toHaveLength(0);
    });

    it('isolates instantiation failures - other collectors still start', () => {
      registry.register(validManifest, () => {
        throw new Error('boom');
      });
      const manifest2 = { ...validManifest, id: 'safe' };
      registry.register(manifest2, () => new StubCollector());
      expect(() => registry.start(vi.fn())).not.toThrow();
      expect(registry.getCollectors()).toHaveLength(1);
    });
  });

  describe('event payload validation (#149)', () => {
    it('forwards valid events to the onEvents callback', () => {
      const event = makeEvent();
      const collector = new StubCollector([event]);
      registry.register(validManifest, () => collector);
      const onEvents = vi.fn();
      registry.start(onEvents);
      vi.runAllTimers();
      // StubCollector.fetch is async; advance microtask queue
      return Promise.resolve().then(() => {
        vi.runAllTimers();
        return Promise.resolve().then(() => {
          expect(onEvents).toHaveBeenCalledWith(expect.arrayContaining([event]));
        });
      });
    });

    it('drops events with missing id and does not call onEvents', () => {
      const badEvent = makeEvent({ id: '' });
      const collector = new StubCollector([badEvent]);
      registry.register(validManifest, () => collector);
      const onEvents = vi.fn();
      registry.start(onEvents);
      vi.runAllTimers();
      return Promise.resolve().then(() => {
        vi.runAllTimers();
        return Promise.resolve().then(() => {
          expect(onEvents).not.toHaveBeenCalled();
        });
      });
    });

    it('drops events with non-object data', () => {
      const badEvent = makeEvent({ data: 'not-an-object' as unknown as Record<string, unknown> });
      const collector = new StubCollector([badEvent]);
      registry.register(validManifest, () => collector);
      const onEvents = vi.fn();
      registry.start(onEvents);
      vi.runAllTimers();
      return Promise.resolve().then(() => {
        vi.runAllTimers();
        return Promise.resolve().then(() => {
          expect(onEvents).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('stop()', () => {
    it('stops all active collectors without throwing', () => {
      registry.register(validManifest, () => new StubCollector());
      registry.start(vi.fn());
      expect(() => registry.stop()).not.toThrow();
      expect(registry.getCollectors()).toHaveLength(0);
    });

    it('can be called when no collectors are active', () => {
      expect(() => registry.stop()).not.toThrow();
    });
  });
});
