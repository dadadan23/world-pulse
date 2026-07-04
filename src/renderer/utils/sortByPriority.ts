import { SEVERITY_LEVELS } from '@shared/types';
import type { Event } from '@shared/types';

/**
 * Severity threshold above which an event is considered "high priority" and
 * pinned at the top of ticker displays, regardless of timestamp.
 * Corresponds to SEVERITY_LEVELS.high (7).
 */
export const TICKER_HIGH_SEVERITY_THRESHOLD = SEVERITY_LEVELS.high;

/**
 * Sort events for ticker display using a two-tier strategy:
 * 1. High-priority events (severity >= threshold) first, ordered by severity
 *    descending then timestamp descending.
 * 2. Routine events (severity < threshold) follow, ordered by timestamp
 *    descending.
 *
 * This ensures breaking / high-severity events are always visible at the top
 * of the rotation regardless of when they arrived.
 */
export function sortByPriority(events: Event[]): Event[] {
  const high: Event[] = [];
  const routine: Event[] = [];

  for (const event of events) {
    if ((event.severity ?? 0) >= TICKER_HIGH_SEVERITY_THRESHOLD) {
      high.push(event);
    } else {
      routine.push(event);
    }
  }

  high.sort((a, b) => {
    const sevDiff = (b.severity ?? 0) - (a.severity ?? 0);
    return sevDiff !== 0 ? sevDiff : b.timestamp - a.timestamp;
  });

  routine.sort((a, b) => b.timestamp - a.timestamp);

  return [...high, ...routine];
}
