import { describe, it, expect } from 'vitest';
import { isSelectedEvent } from './isSelectedEvent';
import type { Event } from '@shared/types';

function mockEvent(id: string): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'Test',
    location: null,
    title: `Event ${id}`,
    data: {},
  };
}

describe('isSelectedEvent', () => {
  it('returns true when the event id matches the selected event id', () => {
    expect(isSelectedEvent(mockEvent('1'), mockEvent('1'))).toBe(true);
  });

  it('returns false when the event id does not match', () => {
    expect(isSelectedEvent(mockEvent('1'), mockEvent('2'))).toBe(false);
  });

  it('returns false when there is no selected event', () => {
    expect(isSelectedEvent(mockEvent('1'), null)).toBe(false);
  });
});
