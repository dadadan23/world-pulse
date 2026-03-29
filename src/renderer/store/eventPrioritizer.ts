import type { Event } from '@shared/types';

/** Window (ms) for featured-event candidacy (default: 30 minutes) */
const FEATURED_WINDOW_MS = 30 * 60 * 1000;

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
 * Order events for the ticker display.
 * Sort: severity desc > recency desc > type diversity (no two adjacent same-type).
 */
export function prioritizeTickerEvents(events: Event[]): Event[] {
  if (events.length <= 1) return [...events];

  // First, sort by severity desc then recency desc
  const sorted = [...events].sort((a, b) => {
    const sevDiff = (b.severity ?? 0) - (a.severity ?? 0);
    if (sevDiff !== 0) return sevDiff;
    return b.timestamp - a.timestamp;
  });

  // Then apply type-diversity pass: avoid consecutive same-type events
  const result: Event[] = [sorted[0]];
  const remaining = sorted.slice(1);

  while (remaining.length > 0) {
    const lastType = result[result.length - 1].type;
    const diverseIdx = remaining.findIndex((e) => e.type !== lastType);

    if (diverseIdx >= 0) {
      result.push(remaining.splice(diverseIdx, 1)[0]);
    } else {
      // No diverse option available, take the next in priority order
      result.push(remaining.shift()!);
    }
  }

  return result;
}
