/** Interval (ms) between /health poll attempts during startup. */
const DEFAULT_POLL_INTERVAL_MS = 250;

export interface PollResult {
  ready: boolean;
  /** Elapsed time in ms from first poll to either success or timeout. */
  elapsedMs: number;
}

/**
 * Poll the backend /health endpoint until it responds OK or the deadline
 * expires. Returns whether the server became ready and how long it took.
 */
export async function waitForServer(
  url: string,
  maxMs: number,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
): Promise<PollResult> {
  const start = Date.now();
  const deadline = start + maxMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return { ready: true, elapsedMs: Date.now() - start };
      }
    } catch {
      // Server not ready yet; keep polling.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return { ready: false, elapsedMs: Date.now() - start };
}
