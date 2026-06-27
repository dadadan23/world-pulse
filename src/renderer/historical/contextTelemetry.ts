import type { RelevanceScore } from './relevanceScoring';
import type { ScoredHistoricalMatch } from './sensitivityRules';

/** One Past Echoes scoring outcome for a single live event (#164). */
export interface ContextQualitySample {
  eventId: string;
  timestamp: number;
  candidateCount: number;
  shownCount: number;
  suppressedCount: number;
  confidenceCounts: Record<RelevanceScore['confidence'], number>;
  /** Share of *shown* matches with low confidence — the metric threshold tuning watches. */
  lowConfidenceDisplayRate: number;
}

/** Aggregate view across the current log, for iterative threshold tuning (#164). */
export interface ContextQualitySummary {
  sampleCount: number;
  totalCandidates: number;
  totalShown: number;
  totalSuppressed: number;
  suppressionRate: number;
  averageLowConfidenceDisplayRate: number;
}

/** Ring-buffer cap — mirrors the project's event-cache cap pattern, avoids unbounded growth. */
const MAX_LOG_SIZE = 200;

let log: ContextQualitySample[] = [];

/**
 * Record a Past Echoes scoring outcome (shown vs suppressed, confidence mix) for the
 * context-quality review workflow (#164). Called once per `getPastEchoes()` invocation.
 */
export function recordContextQualitySample(
  eventId: string,
  scored: { score: RelevanceScore }[],
  shown: ScoredHistoricalMatch[]
): ContextQualitySample {
  const confidenceCounts: Record<RelevanceScore['confidence'], number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const { score } of shown) {
    confidenceCounts[score.confidence] += 1;
  }

  const shownCount = shown.length;
  const lowConfidenceDisplayRate = shownCount === 0 ? 0 : confidenceCounts.low / shownCount;

  const sample: ContextQualitySample = {
    eventId,
    timestamp: Date.now(),
    candidateCount: scored.length,
    shownCount,
    suppressedCount: scored.length - shownCount,
    confidenceCounts,
    lowConfidenceDisplayRate,
  };

  log.push(sample);
  if (log.length > MAX_LOG_SIZE) log.shift();

  if (shownCount > 0 && lowConfidenceDisplayRate > 0.5) {
    console.warn(
      `[ContextTelemetry] High low-confidence display rate for event "${eventId}": ` +
        `${(lowConfidenceDisplayRate * 100).toFixed(0)}%`
    );
  }

  return sample;
}

/** Read-only snapshot of recorded samples for review tooling (#164). */
export function getContextQualityLog(): ContextQualitySample[] {
  return [...log];
}

/** Aggregate shown/suppressed counts and confidence rates across the current log (#164). */
export function getContextQualitySummary(): ContextQualitySummary {
  if (log.length === 0) {
    return {
      sampleCount: 0,
      totalCandidates: 0,
      totalShown: 0,
      totalSuppressed: 0,
      suppressionRate: 0,
      averageLowConfidenceDisplayRate: 0,
    };
  }

  const totalCandidates = log.reduce((sum, s) => sum + s.candidateCount, 0);
  const totalShown = log.reduce((sum, s) => sum + s.shownCount, 0);
  const totalSuppressed = log.reduce((sum, s) => sum + s.suppressedCount, 0);
  const averageLowConfidenceDisplayRate =
    log.reduce((sum, s) => sum + s.lowConfidenceDisplayRate, 0) / log.length;

  return {
    sampleCount: log.length,
    totalCandidates,
    totalShown,
    totalSuppressed,
    suppressionRate: totalCandidates === 0 ? 0 : totalSuppressed / totalCandidates,
    averageLowConfidenceDisplayRate,
  };
}

/** Clears the in-memory log. Exposed for test isolation. */
export function clearContextQualityLog(): void {
  log = [];
}
