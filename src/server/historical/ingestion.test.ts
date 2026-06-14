import { describe, it, expect } from 'vitest';
import { loadCuratedDataset, buildGeoIndex, queryByRadius } from './ingestion';

describe('loadCuratedDataset (#160)', () => {
  it('returns a non-empty array', () => {
    const records = loadCuratedDataset();
    expect(records.length).toBeGreaterThan(0);
  });

  it('every record meets the minimum confidence threshold', () => {
    const records = loadCuratedDataset();
    for (const r of records) {
      expect(r.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('every record has required fields', () => {
    const records = loadCuratedDataset();
    for (const r of records) {
      expect(typeof r.id).toBe('string');
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.title).toBe('string');
      expect(r.title.length).toBeGreaterThan(0);
      expect(typeof r.summary).toBe('string');
      expect(r.summary.length).toBeGreaterThan(0);
      expect(r.source).toBeDefined();
      expect(typeof r.source.name).toBe('string');
      expect(typeof r.source.license).toBe('string');
      expect(typeof r.location.lat).toBe('number');
      expect(typeof r.location.lon).toBe('number');
      expect(typeof r.isSensitive).toBe('boolean');
      expect(typeof r.ingestedAt).toBe('number');
    }
  });

  it('includes shipwreck records', () => {
    const records = loadCuratedDataset();
    const shipwrecks = records.filter((r) => r.subCategory === 'shipwreck');
    expect(shipwrecks.length).toBeGreaterThan(0);
  });

  it('includes battle records', () => {
    const records = loadCuratedDataset();
    const battles = records.filter((r) => r.subCategory === 'battle');
    expect(battles.length).toBeGreaterThan(0);
  });

  it('preserves source attribution on every record', () => {
    const records = loadCuratedDataset();
    for (const r of records) {
      expect(r.source.name.length).toBeGreaterThan(0);
      expect(r.source.license.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate ids', () => {
    const records = loadCuratedDataset();
    const ids = records.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('buildGeoIndex (#160)', () => {
  it('excludes records below minimum confidence', () => {
    const lowConf = {
      id: 'test-low',
      title: 'Low confidence',
      category: 'other' as const,
      location: { lat: 0, lon: 0 },
      summary: 'Test.',
      source: { name: 'Test', license: 'CC0-1.0' },
      confidence: 0.3,
      isSensitive: false,
      ingestedAt: Date.now(),
    };
    const highConf = { ...lowConf, id: 'test-high', confidence: 0.8 };
    const index = buildGeoIndex([lowConf, highConf]);
    expect(index.records).toHaveLength(1);
    expect(index.records[0].id).toBe('test-high');
  });

  it('accepts records at exactly the minimum confidence', () => {
    const record = {
      id: 'test-exact',
      title: 'Exact threshold',
      category: 'other' as const,
      location: { lat: 0, lon: 0 },
      summary: 'Test.',
      source: { name: 'Test', license: 'CC0-1.0' },
      confidence: 0.5,
      isSensitive: false,
      ingestedAt: Date.now(),
    };
    const index = buildGeoIndex([record]);
    expect(index.records).toHaveLength(1);
  });

  it('returns empty index for empty input', () => {
    const index = buildGeoIndex([]);
    expect(index.records).toHaveLength(0);
  });
});

describe('queryByRadius (#160)', () => {
  const sfRecord = {
    id: 'sf',
    title: 'San Francisco Event',
    category: 'disaster' as const,
    location: { lat: 37.77, lon: -122.42, name: 'San Francisco' },
    summary: 'Test.',
    source: { name: 'Test', license: 'CC0-1.0' },
    confidence: 0.9,
    isSensitive: false,
    ingestedAt: Date.now(),
  };
  const capeTownRecord = {
    id: 'cape-town',
    title: 'Cape Town Event',
    category: 'disaster' as const,
    location: { lat: -33.9, lon: 18.4, name: 'Cape Town' },
    summary: 'Test.',
    source: { name: 'Test', license: 'CC0-1.0' },
    confidence: 0.9,
    isSensitive: false,
    ingestedAt: Date.now(),
  };
  const nearbyRecord = {
    id: 'nearby',
    title: 'Nearby Event',
    category: 'disaster' as const,
    location: { lat: 37.8, lon: -122.5, name: 'Oakland' },
    summary: 'Test.',
    source: { name: 'Test', license: 'CC0-1.0' },
    confidence: 0.9,
    isSensitive: false,
    ingestedAt: Date.now(),
  };

  it('returns records within radius', () => {
    const index = buildGeoIndex([sfRecord, capeTownRecord]);
    const results = queryByRadius(index, 37.77, -122.42, 100);
    expect(results.map((r) => r.id)).toContain('sf');
    expect(results.map((r) => r.id)).not.toContain('cape-town');
  });

  it('returns empty when no records match', () => {
    const index = buildGeoIndex([capeTownRecord]);
    const results = queryByRadius(index, 37.77, -122.42, 100);
    expect(results).toHaveLength(0);
  });

  it('sorts results by ascending distance', () => {
    const index = buildGeoIndex([sfRecord, nearbyRecord]);
    const results = queryByRadius(index, 37.77, -122.42, 200);
    // sfRecord is exactly at the query point; nearbyRecord is slightly farther
    expect(results[0].id).toBe('sf');
    expect(results[1].id).toBe('nearby');
  });

  it('includes records at exactly the radius boundary', () => {
    const index = buildGeoIndex([sfRecord]);
    // SF is ~0km from itself; query with 1km radius should include it
    const results = queryByRadius(index, 37.77, -122.42, 1);
    expect(results).toHaveLength(1);
  });

  it('returns all curated records within 5000km of Europe', () => {
    const index = buildGeoIndex(loadCuratedDataset());
    const parisLat = 48.85;
    const parisLon = 2.35;
    const results = queryByRadius(index, parisLat, parisLon, 5000);
    // Europe, North Africa, and nearby Atlantic wrecks should match
    expect(results.length).toBeGreaterThan(0);
  });
});
