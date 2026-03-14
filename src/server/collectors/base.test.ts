import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseCollector } from './base';
import type { Event } from '@shared/types';

/** Collector that always fails */
class FailingCollector extends BaseCollector {
  constructor(maxErrors = 2, cooldownMs = 1000) {
    super('fail-test', 'earthquake', 1000, maxErrors, cooldownMs);
  }

  async fetch(): Promise<Event[]> {
    throw new Error('simulated failure');
  }

  validate() {
    return false;
  }
}

/** Collector that succeeds, returning one event */
class SucceedingCollector extends BaseCollector {
  fetchCount = 0;

  constructor(interval = 1000) {
    super('succeed-test', 'earthquake', interval);
  }

  async fetch(): Promise<Event[]> {
    this.fetchCount++;
    return [
      {
        id: `evt-${this.fetchCount}`,
        timestamp: Date.now(),
        type: 'earthquake',
        source: 'Test',
        location: null,
        title: 'Test event',
        data: {},
      },
    ];
  }

  validate() {
    return true;
  }
}

/** Collector that fails N times then succeeds */
class RecoverableCollector extends BaseCollector {
  callCount = 0;
  failUntil: number;

  constructor(failUntil: number, maxErrors = 5, cooldownMs = 100) {
    super('recover-test', 'earthquake', 1000, maxErrors, cooldownMs);
    this.failUntil = failUntil;
  }

  async fetch(): Promise<Event[]> {
    this.callCount++;
    if (this.callCount <= this.failUntil) {
      throw new Error(`failure #${this.callCount}`);
    }
    return [
      {
        id: `evt-${this.callCount}`,
        timestamp: Date.now(),
        type: 'earthquake',
        source: 'Test',
        location: null,
        title: 'Recovered event',
        data: {},
      },
    ];
  }

  validate() {
    return true;
  }
}

describe('BaseCollector', () => {
  const noop = () => {};

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables after configured max errors', async () => {
    const c = new FailingCollector(2);

    // First failure
    await c.pollNow(noop).catch(() => {});
    expect(c.getStatus().enabled).toBe(true);
    expect(c.getStatus().errorCount).toBe(1);

    // Second failure -> should disable
    await c.pollNow(noop).catch(() => {});
    expect(c.getStatus().enabled).toBe(false);
    expect(c.getStatus().errorCount).toBe(2);
    expect(c.disabledReason).toContain('max_errors');
  });

  it('resets error count on successful fetch', async () => {
    const c = new RecoverableCollector(1, 5); // fail first, then succeed

    await c.pollNow(noop).catch(() => {});
    expect(c.getStatus().errorCount).toBe(1);

    // Next call succeeds
    await c.pollNow(noop).catch(() => {});
    expect(c.getStatus().errorCount).toBe(0);
    expect(c.getStatus().enabled).toBe(true);
  });

  describe('exponential backoff', () => {
    it('returns base interval when no errors', () => {
      const c = new SucceedingCollector(1000);
      expect(c.getBackoffDelay()).toBe(1000);
    });

    it('doubles delay per error count', async () => {
      const c = new FailingCollector(10); // high max so it does not disable

      // After 1 error: 1000 * 2^1 = 2000
      await c.pollNow(noop).catch(() => {});
      expect(c.getBackoffDelay()).toBe(2000);

      // After 2 errors: 1000 * 2^2 = 4000
      await c.pollNow(noop).catch(() => {});
      expect(c.getBackoffDelay()).toBe(4000);

      // After 3 errors: 1000 * 2^3 = 8000
      await c.pollNow(noop).catch(() => {});
      expect(c.getBackoffDelay()).toBe(8000);
    });

    it('caps backoff at 5 minutes', async () => {
      const c = new FailingCollector(100); // very high max
      // Simulate many errors to exceed cap
      for (let i = 0; i < 20; i++) {
        await c.pollNow(noop).catch(() => {});
      }
      expect(c.getBackoffDelay()).toBe(5 * 60 * 1000);
    });
  });

  describe('disable threshold', () => {
    it('fires onDisabled callback with reason', async () => {
      const c = new FailingCollector(2);
      const onDisabledSpy = vi.fn();
      c.onDisabled = onDisabledSpy;

      await c.pollNow(noop).catch(() => {});
      await c.pollNow(noop).catch(() => {});

      expect(onDisabledSpy).toHaveBeenCalledOnce();
      expect(onDisabledSpy).toHaveBeenCalledWith(expect.stringContaining('max_errors'));
    });

    it('logs collector:disabled with name', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const c = new FailingCollector(1);

      await c.pollNow(noop).catch(() => {});

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[fail-test] Disabled:'));
    });
  });

  describe('recovery attempt', () => {
    it('re-enables after successful recovery fetch', async () => {
      // Fail 2 times (disable), then succeed on recovery
      const c = new RecoverableCollector(2, 2, 100);
      const events: Event[][] = [];
      const callback = (evts: Event[]) => events.push(evts);

      // Set pollCallback so attemptRecovery can deliver events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).pollCallback = callback;

      // Two failures -> disabled
      await c.pollNow(callback).catch(() => {});
      await c.pollNow(callback).catch(() => {});
      expect(c.getStatus().enabled).toBe(false);

      // Manual recovery attempt (callCount is now 2, failUntil is 2, so next succeeds)
      const recovered = await c.attemptRecovery();
      expect(recovered).toBe(true);
      expect(c.getStatus().enabled).toBe(true);
      expect(c.getStatus().errorCount).toBe(0);
      expect(c.disabledReason).toBeNull();
      expect(events).toHaveLength(1); // recovery produced events
      c.stop(); // Clean up scheduled timers
    });

    it('stays disabled if recovery fails', async () => {
      // Always fails
      const c = new FailingCollector(2, 100);

      // Set pollCallback so attemptRecovery proceeds past the guard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c as any).pollCallback = noop;

      // Disable
      await c.pollNow(noop).catch(() => {});
      await c.pollNow(noop).catch(() => {});
      expect(c.getStatus().enabled).toBe(false);

      // Attempt recovery (will fail since FailingCollector always fails)
      const recovered = await c.attemptRecovery();
      expect(recovered).toBe(false);
      expect(c.getStatus().enabled).toBe(false);
      c.stop(); // Clean up scheduled timers
    });
  });

  describe('cooldown behavior', () => {
    it('schedules recovery timer on disable', async () => {
      vi.useFakeTimers();
      const c = new FailingCollector(1, 5000);
      c.start(noop);

      // Let initial poll microtask complete -> errorCount=1 >= maxErrors=1 -> disabled
      await vi.advanceTimersByTimeAsync(0);
      expect(c.getStatus().enabled).toBe(false);
      expect(c.getStatus().recoveryPending).toBe(true);

      c.stop();
      vi.useRealTimers();
    });

    it('clears all timers on stop', () => {
      vi.useFakeTimers();
      const c = new SucceedingCollector(1000);
      c.start(noop);

      c.stop();
      expect(c.getStatus().running).toBe(false);
      expect(c.getStatus().recoveryPending).toBe(false);

      vi.useRealTimers();
    });
  });
});
