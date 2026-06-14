import { describe, it, expect, vi } from 'vitest';
import { VizBudgetTracker, DEFAULT_BUDGET_CONFIG, type BudgetViolation } from './vizBudget';

describe('VizBudgetTracker (#152)', () => {
  describe('record()', () => {
    it('returns undefined for frames within budget', () => {
      const tracker = new VizBudgetTracker();
      const result = tracker.record('mod-a', 1.5);
      expect(result).toBeUndefined();
    });

    it('returns a violation for a frame exceeding maxFrameMs', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2 });
      const violation = tracker.record('mod-a', 5);
      expect(violation).toBeDefined();
      expect(violation!.moduleId).toBe('mod-a');
      expect(violation!.frameMs).toBe(5);
    });

    it('counts consecutive violations', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2 });
      tracker.record('mod-a', 5);
      tracker.record('mod-a', 5);
      const v = tracker.record('mod-a', 5);
      expect(v!.consecutiveViolations).toBe(3);
    });

    it('resets consecutive counter after a good frame', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2 });
      tracker.record('mod-a', 5);
      tracker.record('mod-a', 5);
      tracker.record('mod-a', 1); // good frame
      const result = tracker.record('mod-a', 5);
      expect(result!.consecutiveViolations).toBe(1);
    });

    it('auto-disables after autoDisableAfterFrames consecutive violations', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2, autoDisableAfterFrames: 3 });
      tracker.record('mod-a', 5);
      tracker.record('mod-a', 5);
      const v = tracker.record('mod-a', 5);
      expect(v!.disabled).toBe(true);
      expect(tracker.isDisabled('mod-a')).toBe(true);
    });

    it('does not auto-disable when autoDisableAfterFrames is 0', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2, autoDisableAfterFrames: 0 });
      for (let i = 0; i < 100; i++) tracker.record('mod-a', 5);
      expect(tracker.isDisabled('mod-a')).toBe(false);
    });

    it('returns undefined immediately for an already-disabled module', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2, autoDisableAfterFrames: 1 });
      tracker.record('mod-a', 5); // disables it
      const result = tracker.record('mod-a', 5); // already disabled
      expect(result).toBeUndefined();
    });

    it('caps rolling window at windowSize frames', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2, windowSize: 5 });
      for (let i = 0; i < 10; i++) tracker.record('mod-a', 1);
      // window should only hold 5 frames
      const avg = tracker.getAverageMs('mod-a');
      expect(avg).toBe(1);
    });

    it('fires the violation callback on each over-budget frame', () => {
      const spy = vi.fn();
      const tracker = new VizBudgetTracker({ maxFrameMs: 2 }, spy);
      tracker.record('mod-a', 5);
      tracker.record('mod-a', 3);
      expect(spy).toHaveBeenCalledTimes(2);
      const firstCall: BudgetViolation = spy.mock.calls[0][0];
      expect(firstCall.moduleId).toBe('mod-a');
    });

    it('does not fire the callback for frames within budget', () => {
      const spy = vi.fn();
      const tracker = new VizBudgetTracker({ maxFrameMs: 2 }, spy);
      tracker.record('mod-a', 1);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getAverageMs()', () => {
    it('returns 0 when no frames recorded', () => {
      expect(new VizBudgetTracker().getAverageMs('unknown')).toBe(0);
    });

    it('returns accurate rolling average', () => {
      const tracker = new VizBudgetTracker({ windowSize: 3 });
      tracker.record('mod-a', 1);
      tracker.record('mod-a', 2);
      tracker.record('mod-a', 3);
      expect(tracker.getAverageMs('mod-a')).toBe(2);
    });
  });

  describe('getConsecutiveViolations()', () => {
    it('returns 0 for unknown module', () => {
      expect(new VizBudgetTracker().getConsecutiveViolations('unknown')).toBe(0);
    });
  });

  describe('isDisabled()', () => {
    it('returns false for unknown module', () => {
      expect(new VizBudgetTracker().isDisabled('unknown')).toBe(false);
    });
  });

  describe('reset()', () => {
    it('clears frame history and re-enables a disabled module', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2, autoDisableAfterFrames: 1 });
      tracker.record('mod-a', 5);
      expect(tracker.isDisabled('mod-a')).toBe(true);
      tracker.reset('mod-a');
      expect(tracker.isDisabled('mod-a')).toBe(false);
      expect(tracker.getAverageMs('mod-a')).toBe(0);
      expect(tracker.getConsecutiveViolations('mod-a')).toBe(0);
    });
  });

  describe('resetAll()', () => {
    it('clears all module data', () => {
      const tracker = new VizBudgetTracker({ maxFrameMs: 2, autoDisableAfterFrames: 1 });
      tracker.record('mod-a', 5);
      tracker.record('mod-b', 5);
      tracker.resetAll();
      expect(tracker.isDisabled('mod-a')).toBe(false);
      expect(tracker.isDisabled('mod-b')).toBe(false);
      expect(tracker.getAverageMs('mod-a')).toBe(0);
    });
  });

  describe('DEFAULT_BUDGET_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_BUDGET_CONFIG.maxFrameMs).toBe(2);
      expect(DEFAULT_BUDGET_CONFIG.windowSize).toBe(60);
      expect(DEFAULT_BUDGET_CONFIG.autoDisableAfterFrames).toBe(30);
    });
  });
});
