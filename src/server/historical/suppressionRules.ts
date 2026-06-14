import type { HistoricalContextCategory } from '@shared/types';
import type { ScoredContextResult } from './scorer';

// ---------------------------------------------------------------------------
// Suppression rule config
// ---------------------------------------------------------------------------

/**
 * Per-category overrides.
 * Sensitive categories like 'conflict' receive stricter confidence gates
 * and lower item caps to avoid overwhelming the ambient display.
 */
export interface CategoryOverride {
  /** Minimum confidence required to show results from this category. */
  minConfidence: number;
  /** Maximum items shown from this category in a single enrichment batch. */
  maxItems: number;
}

export interface SuppressionRules {
  /**
   * Global maximum number of historical context items to display at once.
   * Keeps the UI non-cluttered regardless of how many candidates match.
   */
  globalMaxItems: number;

  /**
   * Minimum confidence score for non-sensitive records.
   * Records below this threshold are suppressed even when the composite
   * score passes the acceptance threshold.
   */
  globalMinConfidence: number;

  /**
   * Minimum confidence for records flagged as `isSensitive`.
   * Should be strictly higher than globalMinConfidence.
   */
  sensitiveMinConfidence: number;

  /**
   * Per-category overrides. If a category is not listed here, the global
   * thresholds apply.
   */
  categoryOverrides: Partial<Record<HistoricalContextCategory, CategoryOverride>>;

  /**
   * When true, records matched only by geography (taxonomyScore ≤ geoOnlyThreshold)
   * are suppressed as "geography-only matches" that carry no meaningful context.
   */
  suppressGeoOnlyMatches: boolean;

  /**
   * Records with taxonomyScore at or below this value are considered geography-only.
   * Default: 0.15 (matches the taxonomy mismatch score from scorer.ts).
   */
  geoOnlyThreshold: number;
}

export const DEFAULT_SUPPRESSION_RULES: SuppressionRules = {
  globalMaxItems: 5,
  globalMinConfidence: 0.6,
  sensitiveMinConfidence: 0.8,
  suppressGeoOnlyMatches: true,
  geoOnlyThreshold: 0.15,
  categoryOverrides: {
    conflict: { minConfidence: 0.8, maxItems: 2 },
    disaster: { minConfidence: 0.65, maxItems: 4 },
    transport: { minConfidence: 0.6, maxItems: 3 },
    exploration: { minConfidence: 0.55, maxItems: 5 },
  },
};

// ---------------------------------------------------------------------------
// Suppression decision
// ---------------------------------------------------------------------------

export interface SuppressionDecision {
  suppressed: boolean;
  reason?: string;
}

/**
 * Decide whether a single scored result should be suppressed.
 *
 * Reasons are mutually exclusive in priority order:
 *  1. Record confidence below sensitive threshold (if isSensitive)
 *  2. Record confidence below category override minimum
 *  3. Record confidence below global minimum
 *  4. Geography-only match (taxonomyScore ≤ geoOnlyThreshold)
 */
export function shouldSuppress(
  result: ScoredContextResult,
  rules: SuppressionRules = DEFAULT_SUPPRESSION_RULES
): SuppressionDecision {
  const { record } = result;
  const { category, confidence, isSensitive } = record;

  // 1. Sensitive records need higher confidence
  if (isSensitive && confidence < rules.sensitiveMinConfidence) {
    return {
      suppressed: true,
      reason: `sensitive record confidence ${confidence.toFixed(2)} below sensitive threshold ${rules.sensitiveMinConfidence}`,
    };
  }

  // 2. Category-specific confidence override
  const override = rules.categoryOverrides[category];
  if (override && confidence < override.minConfidence) {
    return {
      suppressed: true,
      reason: `confidence ${confidence.toFixed(2)} below ${category} category minimum ${override.minConfidence}`,
    };
  }

  // 3. Global confidence floor
  if (confidence < rules.globalMinConfidence) {
    return {
      suppressed: true,
      reason: `confidence ${confidence.toFixed(2)} below global minimum ${rules.globalMinConfidence}`,
    };
  }

  // 4. Geography-only match suppression
  if (rules.suppressGeoOnlyMatches && result.taxonomyScore <= rules.geoOnlyThreshold) {
    return {
      suppressed: true,
      reason: `geography-only match (taxonomyScore ${result.taxonomyScore.toFixed(2)} ≤ ${rules.geoOnlyThreshold})`,
    };
  }

  return { suppressed: false };
}

/**
 * Apply suppression rules to a list of scored results and enforce item caps.
 *
 * Results are expected to already be sorted by score descending (from `topAccepted`).
 * This function applies confidence/sensitivity gates first, then the global item cap.
 *
 * Per-category caps are enforced independently before the global cap.
 */
export function applySuppression(
  results: ScoredContextResult[],
  rules: SuppressionRules = DEFAULT_SUPPRESSION_RULES
): ScoredContextResult[] {
  const perCategoryCounts = new Map<HistoricalContextCategory, number>();
  const kept: ScoredContextResult[] = [];

  for (const result of results) {
    if (kept.length >= rules.globalMaxItems) break;

    const decision = shouldSuppress(result, rules);
    if (decision.suppressed) continue;

    const cat = result.record.category;
    const override = rules.categoryOverrides[cat];
    if (override) {
      const count = perCategoryCounts.get(cat) ?? 0;
      if (count >= override.maxItems) continue;
      perCategoryCounts.set(cat, count + 1);
    }

    kept.push(result);
  }

  return kept;
}
