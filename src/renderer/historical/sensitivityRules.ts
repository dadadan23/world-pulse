import type { HistoricalCategory, HistoricalContext } from '@shared/types';
import type { RelevanceScore } from './relevanceScoring';

/** Categories that warrant a stricter confidence bar before surfacing to users. */
export const SENSITIVE_CATEGORIES: ReadonlySet<HistoricalCategory> = new Set([
  'conflict',
  'disaster',
]);

export interface SensitivityOptions {
  /** Minimum score required for sensitive categories (stricter than the base relevance threshold). */
  sensitiveMinScore: number;
  /** Maximum number of items surfaced to the user at once (visual density cap). */
  maxVisibleItems: number;
}

export const DEFAULT_SENSITIVITY_OPTIONS: SensitivityOptions = {
  sensitiveMinScore: 0.55,
  maxVisibleItems: 3,
};

export interface ScoredHistoricalMatch {
  context: HistoricalContext;
  score: RelevanceScore;
}

/**
 * Apply sensitivity and density rules to scored historical matches (#163).
 *
 * - Drops rejected matches (see relevanceScoring.ts).
 * - Drops geography-only matches: nearby records with no taxonomy or
 *   significance signal are coincidental, not meaningful context.
 * - Applies a stricter confidence bar to sensitive categories (conflict,
 *   disaster) so painful history isn't surfaced on weak geographic overlap.
 * - Caps the result to a small number of items, highest score first, to
 *   preserve ambient readability.
 */
export function applySensitivityRules(
  matches: ScoredHistoricalMatch[],
  options: SensitivityOptions = DEFAULT_SENSITIVITY_OPTIONS
): ScoredHistoricalMatch[] {
  const filtered = matches.filter(({ context, score }) => {
    if (score.rejected) return false;
    if (score.geographyOnly) return false;
    if (SENSITIVE_CATEGORIES.has(context.category) && score.score < options.sensitiveMinScore) {
      return false;
    }
    return true;
  });

  return filtered.sort((a, b) => b.score.score - a.score.score).slice(0, options.maxVisibleItems);
}
