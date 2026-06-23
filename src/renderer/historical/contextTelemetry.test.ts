import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordContextQualitySample,
  getContextQualityLog,
  getContextQualitySummary,
  clearContextQualityLog,
} from './contextTelemetry';
import type { RelevanceScore } from './relevanceScoring';
import type { ScoredHistoricalMatch } from './sensitivityRules';

function makeScore(overrides: Partial<RelevanceScore> = {}): RelevanceScore {
  return {
    score: 0.7,
    confidence: 'high',
    distanceKm: 10,
    categoryFit: 1,
    significance: 1,
    geographyOnly: false,
    rejected: false,
    rejectionReasons: [],
    ...overrides,
  };
}

function makeMatch(overrides: Partial<RelevanceScore> = {}): ScoredHistoricalMatch {
  return {
    context: {
      id: 'ctx_1',
      title: 'Test Context',
      category: 'disaster',
      subcategory: 'flood',
      location: { lat: 0, lon: 0 },
      date: '1900',
      summary: 'summary',
      attribution: 'attribution',
      license: 'Public Domain',
      confidence: 'confirmed',
      sourceQuality: 'high',
    },
    score: makeScore(overrides),
  };
}

describe('contextTelemetry', () => {
  beforeEach(() => {
    clearContextQualityLog();
  });

  it('records candidate, shown, and suppressed counts', () => {
    const scored = [makeMatch(), makeMatch(), makeMatch({ rejected: true })];
    const shown = [scored[0], scored[1]];

    const sample = recordContextQualitySample('evt_1', scored, shown);

    expect(sample.candidateCount).toBe(3);
    expect(sample.shownCount).toBe(2);
    expect(sample.suppressedCount).toBe(1);
  });

  it('computes the low-confidence display rate from shown matches only', () => {
    const low = makeMatch({ confidence: 'low' });
    const high = makeMatch({ confidence: 'high' });
    const sample = recordContextQualitySample('evt_1', [low, high], [low, high]);

    expect(sample.confidenceCounts).toEqual({ high: 1, medium: 0, low: 1 });
    expect(sample.lowConfidenceDisplayRate).toBe(0.5);
  });

  it('reports a zero low-confidence rate when nothing is shown', () => {
    const sample = recordContextQualitySample('evt_1', [makeMatch({ rejected: true })], []);
    expect(sample.lowConfidenceDisplayRate).toBe(0);
  });

  it('warns when the low-confidence display rate exceeds 50%', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const low = makeMatch({ confidence: 'low' });
    recordContextQualitySample('evt_1', [low], [low]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[ContextTelemetry]'));
    warnSpy.mockRestore();
  });

  it('appends samples to a readable log', () => {
    recordContextQualitySample('evt_1', [makeMatch()], [makeMatch()]);
    recordContextQualitySample('evt_2', [makeMatch()], [makeMatch()]);
    expect(getContextQualityLog().map((s) => s.eventId)).toEqual(['evt_1', 'evt_2']);
  });

  it('caps the log at 200 entries (ring buffer, no unbounded growth)', () => {
    for (let i = 0; i < 205; i++) {
      recordContextQualitySample(`evt_${i}`, [makeMatch()], [makeMatch()]);
    }
    const log = getContextQualityLog();
    expect(log).toHaveLength(200);
    expect(log[0].eventId).toBe('evt_5');
    expect(log[199].eventId).toBe('evt_204');
  });

  it('summarizes empty log without dividing by zero', () => {
    expect(getContextQualitySummary()).toEqual({
      sampleCount: 0,
      totalCandidates: 0,
      totalShown: 0,
      totalSuppressed: 0,
      suppressionRate: 0,
      averageLowConfidenceDisplayRate: 0,
    });
  });

  it('aggregates shown/suppressed counts and rates across samples for threshold tuning', () => {
    recordContextQualitySample('evt_1', [makeMatch(), makeMatch()], [makeMatch()]);
    recordContextQualitySample(
      'evt_2',
      [makeMatch({ confidence: 'low' })],
      [makeMatch({ confidence: 'low' })]
    );

    const summary = getContextQualitySummary();
    expect(summary.sampleCount).toBe(2);
    expect(summary.totalCandidates).toBe(3);
    expect(summary.totalShown).toBe(2);
    expect(summary.totalSuppressed).toBe(1);
    expect(summary.suppressionRate).toBeCloseTo(1 / 3);
    expect(summary.averageLowConfidenceDisplayRate).toBeCloseTo(0.5);
  });
});
