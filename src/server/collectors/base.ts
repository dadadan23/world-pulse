/**
 * Abstract base class for data collectors
 * All data source plugins should extend this
 */

import type { Event, DataCollector, EventType } from '@shared/types';

/** Maximum backoff interval: 5 minutes */
const MAX_BACKOFF_MS = 5 * 60 * 1000;

/** Default cooldown before a recovery attempt: 30 minutes */
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;

export abstract class BaseCollector implements DataCollector {
  public readonly name: string;
  public readonly type: EventType;
  public readonly interval: number;
  public enabled: boolean = true;

  private pollTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private lastFetch: number = 0;
  private errorCount: number = 0;
  public readonly maxErrors: number;
  public readonly cooldownMs: number;
  public lastErrorAt: number | null = null;
  public disabledReason: string | null = null;

  // Callback reference held for scheduling
  private pollCallback: ((events: Event[]) => void) | null = null;

  // Optional callback invoked when the collector becomes disabled
  public onDisabled?: (reason?: string) => void;

  constructor(
    name: string,
    type: EventType,
    interval: number,
    maxErrors = 5,
    cooldownMs = DEFAULT_COOLDOWN_MS
  ) {
    this.name = name;
    this.type = type;
    this.interval = interval;
    this.maxErrors = maxErrors;
    this.cooldownMs = cooldownMs;
  }

  /**
   * Implement this to fetch data from your source
   */
  abstract fetch(): Promise<Event[]>;

  /**
   * Implement this to validate external data
   */
  abstract validate(data: unknown): boolean;

  /**
   * Calculate the next poll delay with exponential backoff.
   * Returns the base interval when errorCount is 0, otherwise
   * interval * 2^errorCount capped at MAX_BACKOFF_MS.
   */
  getBackoffDelay(): number {
    if (this.errorCount === 0) return this.interval;
    const backoff = this.interval * Math.pow(2, this.errorCount);
    return Math.min(backoff, MAX_BACKOFF_MS);
  }

  /**
   * Start the collector (polling loop)
   */
  start(callback: (events: Event[]) => void): void {
    if (this.pollTimer) {
      console.warn(`[${this.name}] Already running`);
      return;
    }

    console.warn(`[${this.name}] Starting collector (interval: ${this.interval}ms)`);
    this.pollCallback = callback;

    // Initial fetch
    this.pollNow(callback).catch(() => {});

    // Schedule next poll
    this.scheduleNext();
  }

  /**
   * Schedule the next poll using the current backoff delay.
   * Replaces fixed setInterval with adaptive setTimeout.
   */
  private scheduleNext(): void {
    if (!this.enabled || !this.pollCallback) return;
    this.clearPollTimer();

    const delay = this.getBackoffDelay();
    this.pollTimer = setTimeout(() => {
      if (!this.enabled || !this.pollCallback) return;
      this.pollNow(this.pollCallback)
        .catch(() => {})
        .finally(() => {
          // Schedule next only if still enabled (pollNow may have disabled us)
          if (this.enabled) this.scheduleNext();
        });
    }, delay);
  }

  /**
   * Stop the collector and clear all timers
   */
  stop(): void {
    this.clearPollTimer();
    this.clearRecoveryTimer();
    console.warn(`[${this.name}] Stopped`);
  }

  private clearPollTimer(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private clearRecoveryTimer(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * Single iteration of the polling logic. Public to allow deterministic testing.
   */
  public async pollNow(callback: (events: Event[]) => void): Promise<void> {
    if (!this.enabled) return;

    try {
      const events = await this.fetch();

      if (events.length > 0) {
        console.warn(`[${this.name}] Fetched ${events.length} events`);
        callback(events);
      }

      this.lastFetch = Date.now();
      this.errorCount = 0; // Reset on success
    } catch (error) {
      this.errorCount++;
      this.lastErrorAt = Date.now();
      console.error(`[${this.name}] Fetch error (${this.errorCount}/${this.maxErrors}):`, error);

      if (this.errorCount >= this.maxErrors) {
        this.disable(`max_errors: ${this.errorCount} consecutive failures`);
      }
    }
  }

  /**
   * Disable the collector and schedule a recovery attempt after cooldown.
   */
  private disable(reason: string): void {
    this.disabledReason = reason;
    console.error(`[${this.name}] Disabled: ${reason}`);
    this.clearPollTimer();
    this.enabled = false;
    if (this.onDisabled) this.onDisabled(reason);

    // Schedule a recovery attempt
    this.scheduleRecovery();
  }

  /**
   * Schedule a single recovery fetch after the cooldown period.
   */
  private scheduleRecovery(): void {
    if (!this.pollCallback) return;
    this.clearRecoveryTimer();

    console.warn(`[${this.name}] Scheduling recovery attempt in ${this.cooldownMs / 1000}s`);

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery().catch(() => {});
    }, this.cooldownMs);
  }

  /**
   * Attempt a single recovery fetch. Re-enables if successful, stays disabled otherwise.
   */
  public async attemptRecovery(): Promise<boolean> {
    if (!this.pollCallback) return false;

    console.warn(`[${this.name}] Attempting recovery fetch...`);

    try {
      const events = await this.fetch();

      // Success - re-enable
      this.enabled = true;
      this.errorCount = 0;
      this.disabledReason = null;
      this.lastFetch = Date.now();
      console.warn(`[${this.name}] Recovery successful, re-enabled`);

      if (events.length > 0) {
        this.pollCallback(events);
      }

      // Resume normal polling
      this.scheduleNext();
      return true;
    } catch (error) {
      console.error(`[${this.name}] Recovery failed, staying disabled:`, error);
      // Schedule another recovery attempt
      this.scheduleRecovery();
      return false;
    }
  }

  /**
   * Get collector status
   */
  getStatus() {
    return {
      name: this.name,
      type: this.type,
      enabled: this.enabled,
      running: this.pollTimer !== null,
      lastFetch: this.lastFetch,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      lastErrorAt: this.lastErrorAt,
      disabledReason: this.disabledReason,
      recoveryPending: this.recoveryTimer !== null,
      healthy: this.enabled && this.pollTimer !== null && this.errorCount < this.maxErrors,
    };
  }
}
