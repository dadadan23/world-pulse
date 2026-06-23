import { describe, it, expect, beforeEach } from 'vitest';
import { getPastEchoes } from './pastEchoes';
import { clearContextQualityLog, getContextQualityLog } from './contextTelemetry';
import type { Event, HistoricalEvent } from '@shared/types';

function makeHistoricalEvent(
  overrides: Partial<HistoricalEvent['data']['context']> = {}
): HistoricalEvent {
  const context = {
    id: 'battle_thermopylae',
    title: 'Battle of Thermopylae',
    category: 'conflict' as const,
    subcategory: 'land_battle',
    location: { lat: 38.8, lon: 22.55, name: 'Thermopylae Pass, Greece' },
    date: '480',
    summary: 'A last stand against the Persian army.',
    attribution: 'Herodotus, Histories',
    license: 'Public Domain',
    confidence: 'confirmed' as const,
    sourceQuality: 'high' as const,
    ...overrides,
  };
  return {
    id: `historical_${context.id}`,
    timestamp: Date.now(),
    type: 'historical',
    source: context.attribution,
    location: context.location,
    severity: 1,
    title: context.title,
    description: context.summary,
    data: { context },
  };
}

function makeLiveEvent(overrides: Partial<Event> = {}): Event {
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

describe('getPastEchoes', () => {
  beforeEach(() => {
    clearContextQualityLog();
  });

  it('records a context-quality telemetry sample for every call (#164)', () => {
    const liveEvent = makeLiveEvent({ type: 'news' });
    getPastEchoes(liveEvent, [makeHistoricalEvent()]);
    const log = getContextQualityLog();
    expect(log).toHaveLength(1);
    expect(log[0].eventId).toBe(liveEvent.id);
    expect(log[0].shownCount).toBe(1);
  });

  it('returns no matches for a historical live event (no historical-to-historical matching)', () => {
    const liveEvent = makeLiveEvent({ type: 'historical' });
    const historical = [makeHistoricalEvent()];
    expect(getPastEchoes(liveEvent, historical)).toEqual([]);
  });

  it('returns a meaningful match for a nearby, category-relevant historical record', () => {
    const liveEvent = makeLiveEvent({ type: 'news' });
    const historical = [makeHistoricalEvent()];
    const result = getPastEchoes(liveEvent, historical);
    expect(result).toHaveLength(1);
    expect(result[0].context.id).toBe('battle_thermopylae');
  });

  it('excludes geography-only matches with no category fit', () => {
    const liveEvent = makeLiveEvent({ type: 'planet' });
    const historical = [
      makeHistoricalEvent({ category: 'transport', confidence: 'uncertain', sourceQuality: 'low' }),
    ];
    expect(getPastEchoes(liveEvent, historical)).toEqual([]);
  });

  it('excludes far-away records', () => {
    const liveEvent = makeLiveEvent();
    const historical = [makeHistoricalEvent({ location: { lat: -38.8, lon: -157.45 } })];
    expect(getPastEchoes(liveEvent, historical)).toEqual([]);
  });
});
