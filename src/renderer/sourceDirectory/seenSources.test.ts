import { describe, it, expect, beforeEach } from 'vitest';
import { getSeenSourceIds, hasUnseenSources, markSourcesSeen } from './seenSources';

beforeEach(() => {
  localStorage.clear();
});

describe('getSeenSourceIds', () => {
  it('returns an empty array when nothing has been stored', () => {
    expect(getSeenSourceIds()).toEqual([]);
  });

  it('returns an empty array for malformed stored data', () => {
    localStorage.setItem('world-pulse:seen-sources', 'not json');
    expect(getSeenSourceIds()).toEqual([]);
  });

  it('returns an empty array when the stored value is not an array', () => {
    localStorage.setItem('world-pulse:seen-sources', JSON.stringify({ foo: 'bar' }));
    expect(getSeenSourceIds()).toEqual([]);
  });
});

describe('markSourcesSeen', () => {
  it('persists ids so they are returned by getSeenSourceIds', () => {
    markSourcesSeen(['USGS Earthquakes', 'ISS Tracker']);
    expect(getSeenSourceIds().sort()).toEqual(['ISS Tracker', 'USGS Earthquakes']);
  });

  it('merges with previously seen ids without duplicating', () => {
    markSourcesSeen(['USGS Earthquakes']);
    markSourcesSeen(['USGS Earthquakes', 'ISS Tracker']);
    expect(getSeenSourceIds().sort()).toEqual(['ISS Tracker', 'USGS Earthquakes']);
  });
});

describe('hasUnseenSources', () => {
  it('is true when no sources have been seen yet', () => {
    expect(hasUnseenSources(['USGS Earthquakes'])).toBe(true);
  });

  it('is false once all given sources have been marked seen', () => {
    markSourcesSeen(['USGS Earthquakes', 'ISS Tracker']);
    expect(hasUnseenSources(['USGS Earthquakes', 'ISS Tracker'])).toBe(false);
  });

  it('is true when at least one source is new', () => {
    markSourcesSeen(['USGS Earthquakes']);
    expect(hasUnseenSources(['USGS Earthquakes', 'ISS Tracker'])).toBe(true);
  });
});
