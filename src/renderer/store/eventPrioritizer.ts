import type { Event } from '@shared/types';

/** Window (ms) for featured-event candidacy (default: 30 minutes) */
export const FEATURED_WINDOW_MS = 30 * 60 * 1000;

/** How long (ms) a featured event is displayed before auto-rotation fires (default: 60 seconds) */
export const FEATURED_ROTATION_MS = 60 * 1000;

/**
 * Select the best featured event from a list.
 * Priority: highest severity in the last 30 min, timestamp tiebreaker.
 * Fallback: most recent event of any severity.
 */
export function selectFeaturedEvent(events: Event[]): Event | null {
  if (events.length === 0) return null;

  const now = Date.now();
  const cutoff = now - FEATURED_WINDOW_MS;
  const recent = events.filter((e) => e.timestamp >= cutoff);

  const candidates = recent.length > 0 ? recent : events;

  return candidates.reduce((best, event) => {
    const bestSev = best.severity ?? 0;
    const curSev = event.severity ?? 0;
    if (curSev > bestSev) return event;
    if (curSev === bestSev && event.timestamp > best.timestamp) return event;
    return best;
  });
}

/**
 * Rotate to the next highest-priority event, skipping the current featured event.
 * Intended for use by the auto-rotation timer (see FEATURED_ROTATION_MS).
 *
 * Selection follows the same rules as selectFeaturedEvent: highest severity in
 * the last 30 minutes wins, with a timestamp tiebreaker. When all remaining
 * events are outside the featured window (stale scenario), the function falls
 * back to the highest-severity event from the full remaining list so the
 * featured slot is never left empty.
 *
 * When the current event is the only one available it is returned unchanged.
 */
export function rotateFeaturedEvent(events: Event[], currentFeatured: Event | null): Event | null {
  if (events.length === 0) return null;

  const candidates = currentFeatured ? events.filter((e) => e.id !== currentFeatured.id) : events;

  if (candidates.length === 0) return currentFeatured;

  return selectFeaturedEvent(candidates);
}
