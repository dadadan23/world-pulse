import { describe, it, expect } from 'vitest';
import { selectFeaturedEvent, rotateFeaturedEvent } from './eventPrioritizer';
import type { Event } from '@shared/types';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'test',
    location: null,
    title: `Event ${overrides.id}`,
    data: {},
    ...overrides,
  };
}

describe('selectFeaturedEvent', () => {
  it('returns null for empty array', () => {
    expect(selectFeaturedEvent([])).toBeNull();
  });

  it('selects highest severity event', () => {
    const events = [
      makeEvent({ id: '1', severity: 3 }),
      makeEvent({ id: '2', severity: 8 }),
      makeEvent({ id: '3', severity: 5 }),
    ];
    expect(selectFeaturedEvent(events)?.id).toBe('2');
  });

  it('uses timestamp tiebreaker for equal severity', () => {
    const now = Date.now();
    const events = [
      makeEvent({ id: 'old', severity: 7, timestamp: now - 1000 }),
      makeEvent({ id: 'new', severity: 7, timestamp: now }),
    ];
    expect(selectFeaturedEvent(events)?.id).toBe('new');
  });

  it('falls back to most recent when no events in 30-min window', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const events = [
      makeEvent({ id: 'older', severity: 9, timestamp: twoHoursAgo - 1000 }),
      makeEvent({ id: 'newer', severity: 2, timestamp: twoHoursAgo }),
    ];
    // Severity 9 wins even though both are stale (fallback uses full list)
    expect(selectFeaturedEvent(events)?.id).toBe('older');
  });

  it('prefers recent high-severity over old high-severity', () => {
    const now = Date.now();
    const events = [
      makeEvent({ id: 'old-high', severity: 9, timestamp: now - 2 * 60 * 60 * 1000 }),
      makeEvent({ id: 'new-medium', severity: 6, timestamp: now }),
    ];
    // new-medium is in the 30-min window, old-high is not
    expect(selectFeaturedEvent(events)?.id).toBe('new-medium');
  });
});

describe('rotateFeaturedEvent', () => {
  it('returns null for empty array', () => {
    expect(rotateFeaturedEvent([], null)).toBeNull();
  });

  it('returns null for empty array even with a current event', () => {
    expect(rotateFeaturedEvent([], makeEvent({ id: 'x' }))).toBeNull();
  });

  it('returns unchanged event when it is the only one', () => {
    const event = makeEvent({ id: 'sole', severity: 5 });
    expect(rotateFeaturedEvent([event], event)?.id).toBe('sole');
  });

  it('rotates to next highest-severity event', () => {
    const current = makeEvent({ id: 'current', severity: 8 });
    const next = makeEvent({ id: 'next', severity: 6 });
    const low = makeEvent({ id: 'low', severity: 2 });
    expect(rotateFeaturedEvent([current, next, low], current)?.id).toBe('next');
  });

  it('uses timestamp tiebreaker when rotating', () => {
    const now = Date.now();
    const current = makeEvent({ id: 'current', severity: 8, timestamp: now });
    const a = makeEvent({ id: 'a', severity: 5, timestamp: now - 2000, type: 'weather' });
    const b = makeEvent({ id: 'b', severity: 5, timestamp: now - 1000, type: 'volcano' });
    expect(rotateFeaturedEvent([current, a, b], current)?.id).toBe('b');
  });

  it('selects best from all events when current is null', () => {
    const events = [makeEvent({ id: 'low', severity: 2 }), makeEvent({ id: 'high', severity: 9 })];
    expect(rotateFeaturedEvent(events, null)?.id).toBe('high');
  });

  it('wraps around: after last candidate returns most recent fallback', () => {
    // All events outside the 30-min window -> fallback path kicks in
    const staleTs = Date.now() - 2 * 60 * 60 * 1000;
    const current = makeEvent({ id: 'current', severity: 9, timestamp: staleTs });
    const other = makeEvent({ id: 'other', severity: 3, timestamp: staleTs + 1000 });
    // current excluded -> only 'other' remains -> returned
    expect(rotateFeaturedEvent([current, other], current)?.id).toBe('other');
  });

  it('prefers fresh events over stale when rotating', () => {
    const now = Date.now();
    const staleTs = now - 2 * 60 * 60 * 1000;
    const current = makeEvent({ id: 'current', severity: 9, timestamp: now });
    // 'stale-high' has higher numeric severity but is outside the 30-min window
    const staleHigh = makeEvent({ id: 'stale-high', severity: 8, timestamp: staleTs });
    // 'fresh-mid' is inside the 30-min window
    const freshMid = makeEvent({
      id: 'fresh-mid',
      severity: 6,
      timestamp: now - 1000,
      type: 'weather',
    });
    expect(rotateFeaturedEvent([current, staleHigh, freshMid], current)?.id).toBe('fresh-mid');
  });
});
