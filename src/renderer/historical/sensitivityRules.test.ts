import { describe, it, expect } from 'vitest';
import { applySensitivityRules, DEFAULT_SENSITIVITY_OPTIONS } from './sensitivityRules';
import type { ScoredHistoricalMatch } from './sensitivityRules';
import type { HistoricalContext } from '@shared/types';
import type { RelevanceScore } from './relevanceScoring';

function makeContext(overrides: Partial<HistoricalContext> = {}): HistoricalContext {
  return {
    id: 'ctx_1',
    title: 'Some Event',
    category: 'transport',
    subcategory: 'shipwreck',
    location: { lat: 0, lon: 0 },
    date: '1900',
    summary: 'summary',
    attribution: 'attribution',
    license: 'Public Domain',
    confidence: 'probable',
    sourceQuality: 'medium',
    ...overrides,
  };
}

function makeScore(overrides: Partial<RelevanceScore> = {}): RelevanceScore {
  return {
    score: 0.7,
    confidence: 'high',
    distanceKm: 10,
    categoryFit: 0.8,
    significance: 0.6,
    geographyOnly: false,
    rejected: false,
    rejectionReasons: [],
    ...overrides,
  };
}

function makeMatch(overrides: Partial<ScoredHistoricalMatch> = {}): ScoredHistoricalMatch {
  return {
    context: makeContext(),
    score: makeScore(),
    ...overrides,
  };
}

describe('applySensitivityRules', () => {
  it('drops rejected matches', () => {
    const matches = [makeMatch({ score: makeScore({ rejected: true }) })];
    expect(applySensitivityRules(matches)).toEqual([]);
  });

  it('drops geography-only matches', () => {
    const matches = [makeMatch({ score: makeScore({ geographyOnly: true }) })];
    expect(applySensitivityRules(matches)).toEqual([]);
  });

  it('applies a stricter threshold to sensitive categories', () => {
    const weakConflict = makeMatch({
      context: makeContext({ category: 'conflict' }),
      score: makeScore({ score: 0.4 }),
    });
    expect(applySensitivityRules([weakConflict])).toEqual([]);

    const strongConflict = makeMatch({
      context: makeContext({ category: 'conflict' }),
      score: makeScore({ score: 0.6 }),
    });
    expect(applySensitivityRules([strongConflict])).toEqual([strongConflict]);
  });

  it('does not apply the stricter threshold to non-sensitive categories', () => {
    const weakTransport = makeMatch({
      context: makeContext({ category: 'transport' }),
      score: makeScore({ score: 0.4 }),
    });
    expect(applySensitivityRules([weakTransport])).toEqual([weakTransport]);
  });

  it('sorts by score descending and caps to maxVisibleItems', () => {
    const matches = [
      makeMatch({ context: makeContext({ id: 'low' }), score: makeScore({ score: 0.3 }) }),
      makeMatch({ context: makeContext({ id: 'high' }), score: makeScore({ score: 0.9 }) }),
      makeMatch({ context: makeContext({ id: 'mid' }), score: makeScore({ score: 0.5 }) }),
      makeMatch({ context: makeContext({ id: 'extra' }), score: makeScore({ score: 0.4 }) }),
    ];
    const result = applySensitivityRules(matches, {
      ...DEFAULT_SENSITIVITY_OPTIONS,
      maxVisibleItems: 2,
    });
    expect(result.map((m) => m.context.id)).toEqual(['high', 'mid']);
  });
});
