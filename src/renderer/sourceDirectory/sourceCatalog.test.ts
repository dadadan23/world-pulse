import { describe, it, expect } from 'vitest';
import type { CollectorHealth } from '@shared/types';
import {
  ALL_SOURCE_IDS,
  SOURCE_CATALOG,
  buildSourceDirectory,
  formatCadence,
} from './sourceCatalog';

function makeCollector(overrides: Partial<CollectorHealth> = {}): CollectorHealth {
  return {
    name: 'USGS Earthquakes',
    status: 'healthy',
    lastFetchAt: Date.now(),
    errorCount: 0,
    isEnabled: true,
    qualityTier: 'primary',
    intervalMs: 5 * 60 * 1000,
    isStale: false,
    ...overrides,
  };
}

describe('formatCadence', () => {
  it('formats sub-minute intervals as seconds', () => {
    expect(formatCadence(10 * 1000)).toBe('Every 10s');
  });

  it('formats sub-hour intervals as minutes', () => {
    expect(formatCadence(5 * 60 * 1000)).toBe('Every 5 min');
  });

  it('formats sub-day intervals as hours', () => {
    expect(formatCadence(3 * 60 * 60 * 1000)).toBe('Every 3h');
  });

  it('formats multi-day intervals as days', () => {
    expect(formatCadence(2 * 24 * 60 * 60 * 1000)).toBe('Every 2d');
  });

  it('returns Unknown for non-finite or non-positive values', () => {
    expect(formatCadence(0)).toBe('Unknown');
    expect(formatCadence(-100)).toBe('Unknown');
    expect(formatCadence(NaN)).toBe('Unknown');
    expect(formatCadence(Infinity)).toBe('Unknown');
  });
});

describe('buildSourceDirectory', () => {
  it('joins live collector health onto every catalog entry', () => {
    const collectors: CollectorHealth[] = [
      makeCollector({ name: 'USGS Earthquakes', status: 'healthy', intervalMs: 5 * 60 * 1000 }),
    ];
    const directory = buildSourceDirectory(collectors);

    expect(directory).toHaveLength(SOURCE_CATALOG.length);
    const earthquakes = directory.find((d) => d.collectorName === 'USGS Earthquakes');
    expect(earthquakes).toBeDefined();
    expect(earthquakes?.status).toBe('healthy');
    expect(earthquakes?.qualityTier).toBe('primary');
    expect(earthquakes?.cadenceLabel).toBe('Every 5 min');
    expect(earthquakes?.errorCount).toBe(0);
    expect(earthquakes?.isStale).toBe(false);
  });

  it('falls back to unknown status for catalog entries with no live match', () => {
    const directory = buildSourceDirectory([]);

    for (const entry of directory) {
      expect(entry.status).toBe('unknown');
      expect(entry.qualityTier).toBeNull();
      expect(entry.cadenceLabel).toBe('Unknown');
      expect(entry.errorCount).toBe(0);
      expect(entry.isStale).toBe(false);
    }
  });

  it('preserves errorCount and isStale from live data', () => {
    const collectors: CollectorHealth[] = [
      makeCollector({ name: 'USGS Volcanoes', status: 'degraded', errorCount: 3, isStale: true }),
    ];
    const directory = buildSourceDirectory(collectors);
    const volcanoes = directory.find((d) => d.collectorName === 'USGS Volcanoes');
    expect(volcanoes?.status).toBe('degraded');
    expect(volcanoes?.errorCount).toBe(3);
    expect(volcanoes?.isStale).toBe(true);
  });
});

describe('ALL_SOURCE_IDS', () => {
  it('is a sorted, deduplicated-by-construction snapshot of every catalog collectorName', () => {
    const expected = SOURCE_CATALOG.map((s) => s.collectorName).sort();
    expect(ALL_SOURCE_IDS).toEqual(expected);
  });
});
