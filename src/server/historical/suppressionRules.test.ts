import { describe, it, expect } from 'vitest';
import {
  shouldSuppress,
  applySuppression,
  DEFAULT_SUPPRESSION_RULES,
  type SuppressionRules,
} from './suppressionRules';
import type { ScoredContextResult } from './scorer';
import type { HistoricalContextRecord } from '@shared/types';

function makeRecord(overrides: Partial<HistoricalContextRecord> = {}): HistoricalContextRecord {
  return {
    id: 'rec-1',
    title: '1906 San Francisco Earthquake',
    category: 'disaster',
    location: { lat: 37.8, lon: -122.4 },
    summary: 'Historic earthquake.',
    source: { name: 'USGS', license: 'CC0-1.0' },
    confidence: 0.9,
    isSensitive: false,
    ingestedAt: Date.now(),
    ...overrides,
  };
}

function makeResult(
  overrides: Partial<
    ScoredContextResult & { recordOverrides: Partial<HistoricalContextRecord> }
  > = {}
): ScoredContextResult {
  const { recordOverrides, ...rest } = overrides;
  return {
    record: makeRecord(recordOverrides),
    score: 0.75,
    proximityScore: 0.8,
    taxonomyScore: 1.0,
    temporalScore: 0.5,
    accepted: true,
    ...rest,
  };
}

describe('shouldSuppress (#163)', () => {
  it('does not suppress a high-confidence, non-sensitive result', () => {
    const decision = shouldSuppress(makeResult());
    expect(decision.suppressed).toBe(false);
  });

  it('suppresses sensitive records below sensitiveMinConfidence', () => {
    const result = makeResult({ recordOverrides: { isSensitive: true, confidence: 0.7 } });
    const decision = shouldSuppress(result, DEFAULT_SUPPRESSION_RULES);
    expect(decision.suppressed).toBe(true);
    expect(decision.reason).toMatch(/sensitive/);
  });

  it('does not suppress sensitive records above sensitiveMinConfidence', () => {
    const result = makeResult({ recordOverrides: { isSensitive: true, confidence: 0.85 } });
    const decision = shouldSuppress(result, DEFAULT_SUPPRESSION_RULES);
    expect(decision.suppressed).toBe(false);
  });

  it('suppresses conflict records below category override minimum', () => {
    const result = makeResult({ recordOverrides: { category: 'conflict', confidence: 0.6 } });
    const decision = shouldSuppress(result, DEFAULT_SUPPRESSION_RULES);
    expect(decision.suppressed).toBe(true);
    expect(decision.reason).toMatch(/conflict/);
  });

  it('suppresses records below global minimum confidence', () => {
    // Use 'exploration' category which has minConfidence: 0.55 in overrides,
    // so confidence 0.4 falls below the category override and triggers suppression.
    // We just verify it IS suppressed (the exact rule that fires is an impl detail).
    const result = makeResult({ recordOverrides: { category: 'other', confidence: 0.4 } });
    const decision = shouldSuppress(result, DEFAULT_SUPPRESSION_RULES);
    expect(decision.suppressed).toBe(true);
    expect(decision.reason).toMatch(/global minimum/);
  });

  it('suppresses geography-only matches (low taxonomyScore)', () => {
    const result = makeResult({ taxonomyScore: 0.1 });
    const decision = shouldSuppress(result, DEFAULT_SUPPRESSION_RULES);
    expect(decision.suppressed).toBe(true);
    expect(decision.reason).toMatch(/geography-only/);
  });

  it('does not suppress when suppressGeoOnlyMatches is false', () => {
    const rules: SuppressionRules = {
      ...DEFAULT_SUPPRESSION_RULES,
      suppressGeoOnlyMatches: false,
    };
    const result = makeResult({ taxonomyScore: 0.1 });
    const decision = shouldSuppress(result, rules);
    expect(decision.suppressed).toBe(false);
  });
});

describe('applySuppression (#163)', () => {
  it('passes high-quality results through', () => {
    const results = [makeResult(), makeResult({ recordOverrides: { id: 'rec-2' } })];
    const kept = applySuppression(results);
    expect(kept).toHaveLength(2);
  });

  it('filters out suppressed results', () => {
    const results = [
      makeResult(),
      makeResult({ recordOverrides: { confidence: 0.3 } }), // below global min
    ];
    const kept = applySuppression(results);
    expect(kept).toHaveLength(1);
  });

  it('enforces globalMaxItems', () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult({ recordOverrides: { id: `rec-${i}` } })
    );
    const kept = applySuppression(results, { ...DEFAULT_SUPPRESSION_RULES, globalMaxItems: 3 });
    expect(kept).toHaveLength(3);
  });

  it('enforces per-category item caps (conflict max = 2)', () => {
    const results = Array.from({ length: 5 }, (_, i) =>
      makeResult({
        recordOverrides: { id: `conflict-${i}`, category: 'conflict', confidence: 0.9 },
      })
    );
    const kept = applySuppression(results);
    expect(kept.filter((r) => r.record.category === 'conflict')).toHaveLength(2);
  });

  it('returns empty array when all results are suppressed', () => {
    const results = [makeResult({ recordOverrides: { confidence: 0.1 } })];
    expect(applySuppression(results)).toHaveLength(0);
  });
});
