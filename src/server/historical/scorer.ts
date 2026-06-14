import type { Event, HistoricalContextRecord, HistoricalContextCategory } from '@shared/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScorerWeights {
  /** Weight for geographic proximity (0–1). Default 0.5. */
  proximity: number;
  /** Weight for taxonomy/category match (0–1). Default 0.35. */
  taxonomyFit: number;
  /** Weight for temporal relevance within the same era (0–1). Default 0.15. */
  temporalRelevance: number;
}

export interface ScoredContextResult {
  record: HistoricalContextRecord;
  /** Final composite score in [0, 1]. Higher is more relevant. */
  score: number;
  /** Proximity sub-score (0–1). */
  proximityScore: number;
  /** Taxonomy match sub-score (0–1). */
  taxonomyScore: number;
  /** Temporal relevance sub-score (0–1). */
  temporalScore: number;
  /** True when the record was accepted (score ≥ threshold). */
  accepted: boolean;
  /** Human-readable reason when the record was rejected. */
  rejectionReason?: string;
}

export interface ScorerConfig {
  weights: ScorerWeights;
  /** Minimum composite score to accept a result. Default 0.35. */
  acceptanceThreshold: number;
  /** Maximum distance in km to consider a geo-proximity match. Default 500. */
  maxProximityKm: number;
  /** Category mapping from live EventType → HistoricalContextCategory. */
  categoryMap: Partial<Record<string, HistoricalContextCategory>>;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

export const DEFAULT_SCORER_CONFIG: ScorerConfig = {
  weights: { proximity: 0.5, taxonomyFit: 0.35, temporalRelevance: 0.15 },
  acceptanceThreshold: 0.35,
  maxProximityKm: 500,
  categoryMap: {
    earthquake: 'disaster',
    volcano: 'disaster',
    weather: 'disaster',
    aurora: 'other',
    iss: 'other',
    asteroid: 'other',
    planet: 'other',
    news: 'other',
  },
};

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// Sub-scorers
// ---------------------------------------------------------------------------

function proximityScore(event: Event, record: HistoricalContextRecord, maxKm: number): number {
  if (!event.location) return 0;
  const km = haversineKm(
    event.location.lat,
    event.location.lon,
    record.location.lat,
    record.location.lon
  );
  if (km > maxKm) return 0;
  // Linear decay from 1 at distance 0 to 0 at maxKm
  return 1 - km / maxKm;
}

function taxonomyScore(
  event: Event,
  record: HistoricalContextRecord,
  categoryMap: ScorerConfig['categoryMap']
): number {
  const mapped = categoryMap[event.type];
  if (!mapped) return 0.1; // unknown mapping — weak match
  return mapped === record.category ? 1 : 0.1;
}

function temporalScore(): number {
  // Phase-1 stub: no live-event timestamps to compare against historical eras.
  // Returns a neutral score so it contributes minimally without skewing results.
  return 0.5;
}

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------

/**
 * Score a set of historical context records against a live event.
 *
 * Scoring is deterministic and configurable. The output includes confidence,
 * sub-scores, and rejection reasons so results can be audited.
 */
export function scoreHistoricalContext(
  event: Event,
  candidates: HistoricalContextRecord[],
  config: ScorerConfig = DEFAULT_SCORER_CONFIG
): ScoredContextResult[] {
  const { weights, acceptanceThreshold, maxProximityKm, categoryMap } = config;

  return candidates.map((record): ScoredContextResult => {
    const prox = proximityScore(event, record, maxProximityKm);
    const taxon = taxonomyScore(event, record, categoryMap);
    const temporal = temporalScore();

    const score =
      prox * weights.proximity + taxon * weights.taxonomyFit + temporal * weights.temporalRelevance;

    // Clamp to [0, 1] to absorb floating-point drift
    const clampedScore = Math.max(0, Math.min(1, score));

    // Proximity is a hard gate: if it's 0 (no location or out of range),
    // reject immediately regardless of taxonomy or temporal scores.
    let accepted = clampedScore >= acceptanceThreshold;
    let rejectionReason: string | undefined;
    if (prox === 0) {
      accepted = false;
      if (!event.location) {
        rejectionReason = 'live event has no location';
      } else {
        rejectionReason = `geographic distance exceeds ${maxProximityKm} km limit`;
      }
    } else if (!accepted) {
      rejectionReason = `composite score ${clampedScore.toFixed(3)} below threshold ${acceptanceThreshold}`;
    }

    return {
      record,
      score: clampedScore,
      proximityScore: prox,
      taxonomyScore: taxon,
      temporalScore: temporal,
      accepted,
      rejectionReason,
    };
  });
}

/**
 * Filter and rank scorer results to the top-N accepted results.
 * Rejected results are excluded.
 */
export function topAccepted(results: ScoredContextResult[], limit: number): ScoredContextResult[] {
  return results
    .filter((r) => r.accepted)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
