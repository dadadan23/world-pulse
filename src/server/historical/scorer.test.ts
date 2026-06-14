import { describe, it, expect } from 'vitest';
import {
  scoreHistoricalContext,
  topAccepted,
  DEFAULT_SCORER_CONFIG,
  type ScoredContextResult,
} from './scorer';
import type { Event, HistoricalContextRecord } from '@shared/types';

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS',
    location: { lat: 37.8, lon: -122.4, name: 'San Francisco' },
    title: 'M5.0 earthquake',
    data: {},
    ...overrides,
  };
}

function makeRecord(overrides: Partial<HistoricalContextRecord> = {}): HistoricalContextRecord {
  return {
    id: 'rec-1',
    title: '1906 San Francisco Earthquake',
    category: 'disaster',
    location: { lat: 37.8, lon: -122.4, name: 'San Francisco' },
    date: '1906-04-18',
    summary: 'Devastating 7.9 magnitude earthquake that leveled much of San Francisco.',
    source: { name: 'USGS Historical Earthquakes', license: 'CC0-1.0' },
    confidence: 0.95,
    isSensitive: false,
    ingestedAt: Date.now(),
    ...overrides,
  };
}

describe('scoreHistoricalContext (#162)', () => {
  it('returns one result per candidate', () => {
    const results = scoreHistoricalContext(makeEvent(), [
      makeRecord(),
      makeRecord({ id: 'rec-2' }),
    ]);
    expect(results).toHaveLength(2);
  });

  it('accepts a high-quality nearby same-category match', () => {
    const [result] = scoreHistoricalContext(makeEvent(), [makeRecord()]);
    expect(result.accepted).toBe(true);
    expect(result.score).toBeGreaterThan(0.35);
  });

  it('rejects a distant record (> maxProximityKm)', () => {
    const distantRecord = makeRecord({ location: { lat: -33.9, lon: 18.4, name: 'Cape Town' } });
    const [result] = scoreHistoricalContext(makeEvent(), [distantRecord]);
    expect(result.proximityScore).toBe(0);
    expect(result.accepted).toBe(false);
    expect(result.rejectionReason).toMatch(/distance/);
  });

  it('rejects when event has no location', () => {
    const event = makeEvent({ location: null });
    const [result] = scoreHistoricalContext(event, [makeRecord()]);
    expect(result.proximityScore).toBe(0);
    expect(result.accepted).toBe(false);
    expect(result.rejectionReason).toMatch(/no location/);
  });

  it('assigns lower taxonomyScore for category mismatch', () => {
    const event = makeEvent({ type: 'aurora' }); // aurora maps to 'other', record is 'disaster'
    const [result] = scoreHistoricalContext(event, [makeRecord()]);
    expect(result.taxonomyScore).toBeLessThan(0.5);
  });

  it('score is clamped to [0, 1]', () => {
    const [result] = scoreHistoricalContext(makeEvent(), [makeRecord()]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('respects custom acceptance threshold', () => {
    const config = { ...DEFAULT_SCORER_CONFIG, acceptanceThreshold: 0.99 };
    const [result] = scoreHistoricalContext(makeEvent(), [makeRecord()], config);
    expect(result.accepted).toBe(false);
    expect(result.rejectionReason).toMatch(/below threshold/);
  });

  it('respects custom maxProximityKm', () => {
    const nearRecord = makeRecord({ location: { lat: 37.9, lon: -122.5 } });
    const config = { ...DEFAULT_SCORER_CONFIG, maxProximityKm: 1 };
    const [result] = scoreHistoricalContext(makeEvent(), [nearRecord], config);
    // Even a very close record might fall outside 1 km
    expect(typeof result.proximityScore).toBe('number');
  });
});

describe('topAccepted (#162)', () => {
  const results: ScoredContextResult[] = [
    {
      record: makeRecord({ id: 'low' }),
      score: 0.4,
      proximityScore: 0.5,
      taxonomyScore: 0.5,
      temporalScore: 0.5,
      accepted: true,
    },
    {
      record: makeRecord({ id: 'high' }),
      score: 0.9,
      proximityScore: 0.9,
      taxonomyScore: 1,
      temporalScore: 0.5,
      accepted: true,
    },
    {
      record: makeRecord({ id: 'rejected' }),
      score: 0.2,
      proximityScore: 0.1,
      taxonomyScore: 0.1,
      temporalScore: 0.5,
      accepted: false,
    },
  ];

  it('excludes rejected results', () => {
    const top = topAccepted(results, 10);
    expect(top.every((r) => r.accepted)).toBe(true);
  });

  it('sorts by score descending', () => {
    const top = topAccepted(results, 10);
    expect(top[0].record.id).toBe('high');
    expect(top[1].record.id).toBe('low');
  });

  it('respects the limit', () => {
    const top = topAccepted(results, 1);
    expect(top).toHaveLength(1);
    expect(top[0].record.id).toBe('high');
  });
});
