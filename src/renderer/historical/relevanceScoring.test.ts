import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  scoreRelevance,
  DEFAULT_RELEVANCE_CONFIG,
  type RelevanceConfig,
} from './relevanceScoring';
import type { Event, HistoricalContext } from '@shared/types';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'eq_1',
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS',
    location: { lat: 38.8, lon: 22.55 },
    title: 'M5.2 earthquake',
    data: {},
    ...overrides,
  };
}

function makeContext(overrides: Partial<HistoricalContext> = {}): HistoricalContext {
  return {
    id: 'battle_thermopylae',
    title: 'Battle of Thermopylae',
    category: 'conflict',
    subcategory: 'land_battle',
    location: { lat: 38.8, lon: 22.55, name: 'Thermopylae Pass, Greece' },
    date: '480',
    summary: 'A last stand against the Persian army.',
    attribution: 'Herodotus, Histories',
    license: 'Public Domain',
    confidence: 'probable',
    sourceQuality: 'medium',
    ...overrides,
  };
}

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceKm({ lat: 10, lon: 10 }, { lat: 10, lon: 10 })).toBe(0);
  });

  it('computes a known distance (roughly London to Paris, ~340km)', () => {
    const london = { lat: 51.5074, lon: -0.1278 };
    const paris = { lat: 48.8566, lon: 2.3522 };
    const distance = haversineDistanceKm(london, paris);
    expect(distance).toBeGreaterThan(330);
    expect(distance).toBeLessThan(350);
  });
});

describe('scoreRelevance', () => {
  it('rejects when the live event has no location', () => {
    const result = scoreRelevance(makeEvent({ location: null }), makeContext());
    expect(result.rejected).toBe(true);
    expect(result.rejectionReasons).toEqual(['live event has no location']);
  });

  it('rejects matches beyond maxDistanceKm', () => {
    const farContext = makeContext({ location: { lat: -38.8, lon: -157.45 } });
    const result = scoreRelevance(makeEvent(), farContext);
    expect(result.rejected).toBe(true);
    expect(result.rejectionReasons[0]).toMatch(/exceeds max/);
  });

  it('accepts a close earthquake-to-disaster match with high category fit', () => {
    const disasterContext = makeContext({
      category: 'disaster',
      confidence: 'confirmed',
      sourceQuality: 'high',
    });
    const result = scoreRelevance(makeEvent(), disasterContext);
    expect(result.rejected).toBe(false);
    expect(result.categoryFit).toBe(1);
    expect(result.confidence).toBe('high');
  });

  it('flags geography-only matches when there is no category affinity or significance', () => {
    const irrelevantContext = makeContext({
      category: 'exploration',
      confidence: 'uncertain',
      sourceQuality: 'low',
    });
    const result = scoreRelevance(makeEvent({ type: 'weather' }), irrelevantContext);
    expect(result.categoryFit).toBe(0);
    expect(result.geographyOnly).toBe(true);
  });

  it('is deterministic for identical inputs', () => {
    const a = scoreRelevance(makeEvent(), makeContext());
    const b = scoreRelevance(makeEvent(), makeContext());
    expect(a).toEqual(b);
  });

  it('respects a custom config', () => {
    const tightConfig: RelevanceConfig = {
      ...DEFAULT_RELEVANCE_CONFIG,
      maxDistanceKm: 10,
    };
    const nearbyButOutsideTight = makeContext({ location: { lat: 38.9, lon: 22.55 } });
    const result = scoreRelevance(makeEvent(), nearbyButOutsideTight, tightConfig);
    expect(result.rejected).toBe(true);
  });
});
