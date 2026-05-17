import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRestartController } from './restartController';

describe('createRestartController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows restart when no attempts have been recorded', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    expect(ctrl.shouldRestart()).toBe(true);
  });

  it('allows restarts while count is below the maximum', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    ctrl.recordRestart();
    expect(ctrl.shouldRestart()).toBe(true);
    ctrl.recordRestart();
    expect(ctrl.shouldRestart()).toBe(true);
  });

  it('blocks restart once maximum count is reached within window', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    ctrl.recordRestart();
    ctrl.recordRestart();
    ctrl.recordRestart();
    expect(ctrl.shouldRestart()).toBe(false);
  });

  it('allows restarts again after the window expires', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    ctrl.recordRestart();
    ctrl.recordRestart();
    ctrl.recordRestart();
    expect(ctrl.shouldRestart()).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(ctrl.shouldRestart()).toBe(true);
  });

  it('counts only timestamps within the window', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    ctrl.recordRestart(); // t=0
    vi.advanceTimersByTime(30_000);
    ctrl.recordRestart(); // t=30s
    vi.advanceTimersByTime(31_000); // now t=61s; first timestamp is 61s old (outside 60s window)
    expect(ctrl.getRecentRestartCount()).toBe(1);
    expect(ctrl.shouldRestart()).toBe(true);
  });

  it('getRecentRestartCount returns 0 initially', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    expect(ctrl.getRecentRestartCount()).toBe(0);
  });

  it('getRecentRestartCount reflects recorded restarts', () => {
    const ctrl = createRestartController({ maxRestarts: 3, windowMs: 60_000 });
    ctrl.recordRestart();
    ctrl.recordRestart();
    expect(ctrl.getRecentRestartCount()).toBe(2);
  });

  it('respects custom maxRestarts=1', () => {
    const ctrl = createRestartController({ maxRestarts: 1, windowMs: 60_000 });
    expect(ctrl.shouldRestart()).toBe(true);
    ctrl.recordRestart();
    expect(ctrl.shouldRestart()).toBe(false);
  });
});
