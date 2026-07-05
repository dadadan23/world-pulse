import type { Event } from '@shared/types';
import { SEVERITY_LEVELS } from '@shared/types';

/** Default severity threshold at/above which events are pinned ahead of routine ordering. */
export const DEFAULT_HIGH_SEVERITY_THRESHOLD = SEVERITY_LEVELS.high;

/**
 * Sort events for ticker display: events at or above `threshold` are pinned
 * ahead of routine events (regardless of relative timestamp), ordered by
 * severity then recency among themselves. Routine events keep pure recency
 * ordering.
 */
export function sortBySeverityThenRecency<T extends Event>(
  events: T[],
  threshold: number = DEFAULT_HIGH_SEVERITY_THRESHOLD
): T[] {
  const high: T[] = [];
  const routine: T[] = [];

  for (const event of events) {
    if ((event.severity ?? 0) >= threshold) {
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
