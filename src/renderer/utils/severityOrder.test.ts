import { describe, it, expect } from 'vitest';
import { sortBySeverityThenRecency, DEFAULT_HIGH_SEVERITY_THRESHOLD } from './severityOrder';
import type { Event } from '@shared/types';

function mockEvent(id: string, timestamp: number, severity?: number): Event {
  return {
    id,
    timestamp,
    type: 'earthquake',
    source: 'Test Source',
    location: null,
    severity,
    title: `Event ${id}`,
    data: {},
  };
}

describe('sortBySeverityThenRecency', () => {
  it('defaults threshold to SEVERITY_LEVELS.high', () => {
    expect(DEFAULT_HIGH_SEVERITY_THRESHOLD).toBe(7);
  });

  it('pins a high-severity event ahead of more recent routine events', () => {
    const older = mockEvent('high', 1000, 8);
    const newer1 = mockEvent('routine-1', 3000, 2);
    const newer2 = mockEvent('routine-2', 2000, 3);

    const result = sortBySeverityThenRecency([newer1, newer2, older]);

    expect(result.map((e) => e.id)).toEqual(['high', 'routine-1', 'routine-2']);
  });

  it('orders multiple high-severity events by severity then timestamp among themselves', () => {
    const a = mockEvent('a', 1000, 9);
    const b = mockEvent('b', 2000, 9);
    const c = mockEvent('c', 500, 7);

    const result = sortBySeverityThenRecency([c, a, b]);

    // b and a tie on severity (9), b is more recent -> b before a; c is lower severity -> last
    expect(result.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts routine events by pure recency when none meet the threshold', () => {
    const older = mockEvent('older', 1000, 1);
    const newer = mockEvent('newer', 2000, 2);

    const result = sortBySeverityThenRecency([older, newer]);

    expect(result.map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('treats events with no severity as 0 (routine)', () => {
    const undefinedSeverity = mockEvent('no-sev', 5000);
    const high = mockEvent('high', 1000, 9);

    const result = sortBySeverityThenRecency([undefinedSeverity, high]);

    expect(result.map((e) => e.id)).toEqual(['high', 'no-sev']);
  });

  it('respects a custom threshold', () => {
    const medium = mockEvent('medium', 1000, 5);
    const low = mockEvent('low', 2000, 1);

    const result = sortBySeverityThenRecency([low, medium], 4);

    expect(result.map((e) => e.id)).toEqual(['medium', 'low']);
  });
});
