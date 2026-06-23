import type { Event, HistoricalEvent } from '@shared/types';
import { recordContextQualitySample } from './contextTelemetry';
import { DEFAULT_RELEVANCE_CONFIG, scoreRelevance, type RelevanceConfig } from './relevanceScoring';
import {
  applySensitivityRules,
  DEFAULT_SENSITIVITY_OPTIONS,
  type ScoredHistoricalMatch,
  type SensitivityOptions,
} from './sensitivityRules';

export type { ScoredHistoricalMatch };

/**
 * Compute the "Past Echoes" matches for a selected live event (#165).
 * Historical-to-historical matching is intentionally excluded — Past Echoes
 * only enrich live signal, never other historical context. Records a
 * context-quality telemetry sample (shown vs suppressed, confidence mix) on
 * every call for iterative threshold tuning (#164).
 */
export function getPastEchoes(
  liveEvent: Event,
  historicalEvents: HistoricalEvent[],
  relevanceConfig: RelevanceConfig = DEFAULT_RELEVANCE_CONFIG,
  sensitivityOptions: SensitivityOptions = DEFAULT_SENSITIVITY_OPTIONS
): ScoredHistoricalMatch[] {
  if (liveEvent.type === 'historical') return [];

  const scored = historicalEvents.map((event) => ({
    context: event.data.context,
    score: scoreRelevance(liveEvent, event.data.context, relevanceConfig),
  }));

  const matches = applySensitivityRules(scored, sensitivityOptions);
  recordContextQualitySample(liveEvent.id, scored, matches);
  return matches;
}
