// ---------------------------------------------------------------------------
// Budget configuration
// ---------------------------------------------------------------------------

export interface VizBudgetConfig {
  /** Maximum render time in ms for a single frame before a violation is counted. Default: 2ms. */
  maxFrameMs: number;
  /** Rolling window size in frames for computing the average. Default: 60 (≈1 second at 60fps). */
  windowSize: number;
  /**
   * After this many consecutive over-budget frames the module is auto-disabled.
   * Set to 0 to never auto-disable — violations are still reported.
   */
  autoDisableAfterFrames: number;
}

export const DEFAULT_BUDGET_CONFIG: VizBudgetConfig = {
  maxFrameMs: 2,
  windowSize: 60,
  autoDisableAfterFrames: 30,
};

// ---------------------------------------------------------------------------
// Violation record
// ---------------------------------------------------------------------------

export interface BudgetViolation {
  moduleId: string;
  /** Frame time that triggered the violation (ms). */
  frameMs: number;
  /** Rolling average over the current window (ms). */
  averageMs: number;
  /** How many frames in a row have now exceeded the budget. */
  consecutiveViolations: number;
  /** True when the tracker auto-disabled the module due to this violation. */
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// Budget tracker
// ---------------------------------------------------------------------------

/**
 * Per-module frame-time budget tracker.
 *
 * Call `record(id, ms)` on every frame for each active visualization module.
 * The tracker maintains a rolling window of frame times, counts consecutive
 * budget overruns, and can auto-disable modules that persistently violate
 * their budget so they stop harming the ambient frame rate.
 *
 * A violation callback fires every time a single frame exceeds `maxFrameMs`,
 * giving callers a telemetry hook without polling.
 */
export class VizBudgetTracker {
  private readonly config: VizBudgetConfig;
  private readonly onViolation: ((v: BudgetViolation) => void) | undefined;

  private frames = new Map<string, number[]>();
  private consecutiveViolations = new Map<string, number>();
  private disabledModules = new Set<string>();

  constructor(config: Partial<VizBudgetConfig> = {}, onViolation?: (v: BudgetViolation) => void) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
    this.onViolation = onViolation;
  }

  /**
   * Record a frame time for a visualization module.
   *
   * Returns a `BudgetViolation` when the frame exceeded the budget,
   * or `undefined` when the frame was within budget.
   * Returns `undefined` immediately for modules that are already disabled.
   */
  record(moduleId: string, frameMs: number): BudgetViolation | undefined {
    if (this.disabledModules.has(moduleId)) return undefined;

    const window = this.frames.get(moduleId) ?? [];
    window.push(frameMs);
    if (window.length > this.config.windowSize) window.shift();
    this.frames.set(moduleId, window);

    if (frameMs <= this.config.maxFrameMs) {
      this.consecutiveViolations.set(moduleId, 0);
      return undefined;
    }

    const consecutive = (this.consecutiveViolations.get(moduleId) ?? 0) + 1;
    this.consecutiveViolations.set(moduleId, consecutive);

    const averageMs = window.reduce((s, t) => s + t, 0) / window.length;

    const shouldDisable =
      this.config.autoDisableAfterFrames > 0 && consecutive >= this.config.autoDisableAfterFrames;

    if (shouldDisable) {
      this.disabledModules.add(moduleId);
    }

    const violation: BudgetViolation = {
      moduleId,
      frameMs,
      averageMs,
      consecutiveViolations: consecutive,
      disabled: shouldDisable,
    };

    this.onViolation?.(violation);
    return violation;
  }

  /** Whether the tracker has auto-disabled this module. */
  isDisabled(moduleId: string): boolean {
    return this.disabledModules.has(moduleId);
  }

  /**
   * Rolling average render time for a module in ms.
   * Returns 0 when no frames have been recorded.
   */
  getAverageMs(moduleId: string): number {
    const window = this.frames.get(moduleId);
    if (!window || window.length === 0) return 0;
    return window.reduce((s, t) => s + t, 0) / window.length;
  }

  /** Current consecutive over-budget frame count for a module. */
  getConsecutiveViolations(moduleId: string): number {
    return this.consecutiveViolations.get(moduleId) ?? 0;
  }

  /**
   * Clear all tracking data for a single module.
   * Use this to re-enable a module after the underlying issue is resolved.
   */
  reset(moduleId: string): void {
    this.frames.delete(moduleId);
    this.consecutiveViolations.delete(moduleId);
    this.disabledModules.delete(moduleId);
  }

  /** Clear all tracking data across all modules. */
  resetAll(): void {
    this.frames.clear();
    this.consecutiveViolations.clear();
    this.disabledModules.clear();
  }
}
