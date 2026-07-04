import { describe, it, expect } from 'vitest';
import { sortByPriority, TICKER_HIGH_SEVERITY_THRESHOLD } from './sortByPriority';
import type { Event } from '@shared/types';

function mockEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'Test',
    location: null,
    title: `Event ${id}`,
    data: {},
    ...overrides,
  };
}

const HIGH = TICKER_HIGH_SEVERITY_THRESHOLD;
const LOW = HIGH - 1;

describe('sortByPriority', () => {
  it('returns an empty array for no events', () => {
    expect(sortByPriority([])).toEqual([]);
  });

  it('places high-severity events before routine events regardless of timestamp', () => {
    const now = Date.now();
    const routine = mockEvent('routine', { timestamp: now, severity: LOW });
    const high = mockEvent('high', { timestamp: now - 10_000, severity: HIGH });

    const result = sortByPriority([routine, high]);
    expect(result[0].id).toBe('high');
    expect(result[1].id).toBe('routine');
  });

  it('sorts multiple high-severity events by severity desc, then timestamp desc', () => {
    const now = Date.now();
    const critical = mockEvent('critical', { timestamp: now - 5_000, severity: 9 });
    const high = mockEvent('high', { timestamp: now, severity: HIGH });

    const result = sortByPriority([high, critical]);
    expect(result[0].id).toBe('critical');
    expect(result[1].id).toBe('high');
  });

  it('uses timestamp as tiebreaker among equal-severity high events', () => {
    const now = Date.now();
    const older = mockEvent('older', { timestamp: now - 2_000, severity: HIGH });
    const newer = mockEvent('newer', { timestamp: now, severity: HIGH });

    const result = sortByPriority([older, newer]);
    expect(result[0].id).toBe('newer');
  });

  it('sorts routine events by timestamp desc among themselves', () => {
    const now = Date.now();
    const old = mockEvent('old', { timestamp: now - 10_000, severity: LOW });
    const recent = mockEvent('recent', { timestamp: now, severity: LOW });

    const result = sortByPriority([old, recent]);
    expect(result[0].id).toBe('recent');
  });

  it('treats events with no severity as routine', () => {
    const now = Date.now();
    const noSev = mockEvent('no-sev', { timestamp: now - 1_000, severity: undefined });
    const high = mockEvent('high', { timestamp: now - 5_000, severity: HIGH });

    const result = sortByPriority([noSev, high]);
    expect(result[0].id).toBe('high');
    expect(result[1].id).toBe('no-sev');
  });

  it('does not mutate the input array', () => {
    const now = Date.now();
    const events = [
      mockEvent('a', { timestamp: now, severity: LOW }),
      mockEvent('b', { timestamp: now - 1_000, severity: HIGH }),
    ];
    const original = [...events];
    sortByPriority(events);
    expect(events).toEqual(original);
  });
});
