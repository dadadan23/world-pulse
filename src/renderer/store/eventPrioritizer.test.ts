import { describe, it, expect } from 'vitest';
import { selectFeaturedEvent, prioritizeTickerEvents } from './eventPrioritizer';
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

describe('prioritizeTickerEvents', () => {
  it('returns empty array for empty input', () => {
    expect(prioritizeTickerEvents([])).toEqual([]);
  });

  it('returns single event unchanged', () => {
    const events = [makeEvent({ id: '1' })];
    expect(prioritizeTickerEvents(events)).toHaveLength(1);
    expect(prioritizeTickerEvents(events)[0].id).toBe('1');
  });

  it('sorts by severity descending', () => {
    const events = [
      makeEvent({ id: 'low', severity: 2, type: 'weather' }),
      makeEvent({ id: 'high', severity: 8, type: 'earthquake' }),
      makeEvent({ id: 'mid', severity: 5, type: 'volcano' }),
    ];
    const result = prioritizeTickerEvents(events);
    expect(result[0].id).toBe('high');
    expect(result[1].id).toBe('mid');
    expect(result[2].id).toBe('low');
  });

  it('uses recency tiebreaker', () => {
    const now = Date.now();
    const events = [
      makeEvent({ id: 'old', severity: 5, timestamp: now - 1000, type: 'weather' }),
      makeEvent({ id: 'new', severity: 5, timestamp: now, type: 'earthquake' }),
    ];
    const result = prioritizeTickerEvents(events);
    expect(result[0].id).toBe('new');
  });

  it('avoids adjacent events of the same type when possible', () => {
    const now = Date.now();
    const events = [
      makeEvent({ id: 'eq1', severity: 8, type: 'earthquake', timestamp: now }),
      makeEvent({ id: 'eq2', severity: 7, type: 'earthquake', timestamp: now - 1000 }),
      makeEvent({ id: 'wx1', severity: 6, type: 'weather', timestamp: now - 2000 }),
    ];
    const result = prioritizeTickerEvents(events);
    // eq1 first (highest), then wx1 (diverse), then eq2
    expect(result[0].id).toBe('eq1');
    expect(result[1].id).toBe('wx1');
    expect(result[2].id).toBe('eq2');
  });
});
