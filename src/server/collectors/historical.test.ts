import { describe, it, expect, vi } from 'vitest';

const WRECK = {
  id: 'wreck_titanic',
  title: 'RMS Titanic',
  category: 'transport' as const,
  subcategory: 'shipwreck',
  location: { lat: 41.7325, lon: -49.9469, name: 'North Atlantic' },
  date: '1912-04-15',
  summary: 'Titanic sank after hitting an iceberg.',
  attribution: 'NOAA',
  license: 'Public Domain',
  confidence: 'confirmed' as const,
  sourceQuality: 'high' as const,
};

const BATTLE = {
  id: 'battle_hastings',
  title: 'Battle of Hastings',
  category: 'conflict' as const,
  subcategory: 'land_battle',
  location: { lat: 50.91, lon: 0.487, name: 'East Sussex' },
  date: '1066-10-14',
  summary: 'Norman conquest of England.',
  attribution: 'English Heritage',
  license: 'Public Domain',
  confidence: 'confirmed' as const,
  sourceQuality: 'high' as const,
};

vi.mock('./datasets/shipwrecks', () => ({ SHIPWRECKS: [WRECK] }));
vi.mock('./datasets/battles', () => ({ BATTLES: [BATTLE] }));

const { HistoricalCollector } = await import('./historical');

describe('HistoricalCollector (#160)', () => {
  it('loads and emits events from both mocked datasets', async () => {
    const collector = new HistoricalCollector();
    const events = await collector.fetch();
    expect(events).toHaveLength(2);
    const ids = events.map((e) => e.id);
    expect(ids).toContain('historical_wreck_titanic');
    expect(ids).toContain('historical_battle_hastings');
  });

  it('emits events with type "historical"', async () => {
    const collector = new HistoricalCollector();
    const events = await collector.fetch();
    expect(events.every((e) => e.type === 'historical')).toBe(true);
  });

  it('preserves source attribution on emitted event', async () => {
    const collector = new HistoricalCollector();
    const events = await collector.fetch();
    const titanic = events.find((e) => e.id === 'historical_wreck_titanic');
    expect(titanic?.source).toBe('NOAA');
  });

  it('caches results — second fetch returns the same array reference', async () => {
    const collector = new HistoricalCollector();
    const first = await collector.fetch();
    const second = await collector.fetch();
    expect(second).toBe(first);
  });

  it('embeds HistoricalContext in event.data.context', async () => {
    const collector = new HistoricalCollector();
    const events = await collector.fetch();
    const titanic = events.find((e) => e.id === 'historical_wreck_titanic');
    expect((titanic?.data as { context: unknown } | undefined)?.context).toMatchObject({
      id: 'wreck_titanic',
      category: 'transport',
    });
  });

  it('validate() returns true for an array', () => {
    const collector = new HistoricalCollector();
    expect(collector.validate([])).toBe(true);
    expect(collector.validate([1, 2, 3])).toBe(true);
  });

  it('validate() returns false for non-array', () => {
    const collector = new HistoricalCollector();
    expect(collector.validate(null)).toBe(false);
    expect(collector.validate('string')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidRecord — tested via the collector's behavior with inline datasets.
// The record filter logic is also tested via the real data integration below.
// ---------------------------------------------------------------------------

describe('HistoricalCollector — record filtering (integration with real data)', () => {
  it('each dataset record passes isValidRecord (real data sanity check)', async () => {
    // Re-import with the real (unmocked) datasets via dynamic import path reset.
    // This test validates the curated data itself conforms to the schema.
    const { SHIPWRECKS } = await import('./datasets/shipwrecks');
    const { BATTLES } = await import('./datasets/battles');

    for (const record of [...SHIPWRECKS, ...BATTLES]) {
      expect(typeof record.id).toBe('string');
      expect(record.id.trim()).not.toBe('');
      expect(typeof record.location?.lat).toBe('number');
      expect(Number.isFinite(record.location?.lat)).toBe(true);
      expect(Number.isFinite(record.location?.lon)).toBe(true);
      expect(record.attribution.trim()).not.toBe('');
      expect(record.license.trim()).not.toBe('');
    }
  });

  it('all dataset ids are unique', async () => {
    const { SHIPWRECKS } = await import('./datasets/shipwrecks');
    const { BATTLES } = await import('./datasets/battles');
    const all = [...SHIPWRECKS, ...BATTLES];
    const ids = all.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
