/**
 * Circuit-breaker for backend server auto-restart.
 *
 * Tracks restart timestamps and opens the circuit (stops restarting) when
 * restarts exceed maxRestarts within windowMs milliseconds.
 */

export interface RestartController {
  /** Returns true when the circuit is closed and a restart should proceed. */
  shouldRestart(): boolean;
  /** Record that a restart attempt has been made. */
  recordRestart(): void;
  /** Number of restart attempts within the current window. */
  getRecentRestartCount(): number;
}

export function createRestartController(options: {
  maxRestarts: number;
  windowMs: number;
}): RestartController {
  let timestamps: number[] = [];

  function pruneOld(): void {
    const cutoff = Date.now() - options.windowMs;
    timestamps = timestamps.filter((t) => t > cutoff);
  }

  return {
    shouldRestart() {
      pruneOld();
      return timestamps.length < options.maxRestarts;
    },

    recordRestart() {
      timestamps.push(Date.now());
    },

    getRecentRestartCount() {
      pruneOld();
      return timestamps.length;
    },
  };
}
