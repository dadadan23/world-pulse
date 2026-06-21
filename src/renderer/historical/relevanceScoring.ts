import type { Event, EventType, HistoricalCategory, HistoricalContext } from '@shared/types';

export interface RelevanceWeights {
  proximity: number;
  categoryFit: number;
  significance: number;
}

export interface RelevanceConfig {
  /** Matches beyond this distance are rejected outright. */
  maxDistanceKm: number;
  /** Distance (km) at which proximity score decays to ~0.5. */
  proximityHalfLifeKm: number;
  /** Minimum combined score required to accept a match. */
  minScore: number;
  weights: RelevanceWeights;
}

export const DEFAULT_RELEVANCE_CONFIG: RelevanceConfig = {
  maxDistanceKm: 500,
  proximityHalfLifeKm: 150,
  minScore: 0.25,
  weights: {
    proximity: 0.5,
    categoryFit: 0.3,
    significance: 0.2,
  },
};

/**
 * Affinity (0-1) between a live event type and historical categories.
 * Drives the categoryFit component of the relevance score. Event types not
 * listed here have no taxonomy affinity (categoryFit will be 0 for them).
 */
const CATEGORY_AFFINITY: Partial<Record<EventType, Partial<Record<HistoricalCategory, number>>>> = {
  earthquake: { disaster: 1 },
  volcano: { disaster: 1 },
  weather: { disaster: 0.5 },
  news: { conflict: 0.7, disaster: 0.5, other: 0.3 },
  ocean: { transport: 0.8, disaster: 0.4 },
  asteroid: { disaster: 0.3, exploration: 0.3 },
  iss: { exploration: 0.6 },
  planet: { exploration: 0.4 },
};

const CONFIDENCE_WEIGHT: Record<HistoricalContext['confidence'], number> = {
  confirmed: 1,
  probable: 0.66,
  uncertain: 0.33,
};

const SOURCE_QUALITY_WEIGHT: Record<HistoricalContext['sourceQuality'], number> = {
  high: 1,
  medium: 0.66,
  low: 0.33,
};

export interface RelevanceScore {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  distanceKm: number;
  categoryFit: number;
  significance: number;
  /** True when the only meaningful component is proximity (no taxonomy or significance signal). */
  geographyOnly: boolean;
  rejected: boolean;
  rejectionReasons: string[];
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lon points, in kilometers. */
export function haversineDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function categoryFitFor(eventType: EventType, category: HistoricalCategory): number {
  return CATEGORY_AFFINITY[eventType]?.[category] ?? 0;
}

function confidenceFromScore(score: number): RelevanceScore['confidence'] {
  if (score >= 0.66) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Score how relevant a curated historical record is to a live event.
 * Deterministic: same inputs always produce the same output, with every
 * rejection carrying a human-readable reason for quality review (#162).
 */
export function scoreRelevance(
  liveEvent: Event,
  candidate: HistoricalContext,
  config: RelevanceConfig = DEFAULT_RELEVANCE_CONFIG
): RelevanceScore {
  const reasons: string[] = [];

  if (!liveEvent.location) {
    return {
      score: 0,
      confidence: 'low',
      distanceKm: Infinity,
      categoryFit: 0,
      significance: 0,
      geographyOnly: false,
      rejected: true,
      rejectionReasons: ['live event has no location'],
    };
  }

  const distanceKm = haversineDistanceKm(liveEvent.location, candidate.location);
  if (distanceKm > config.maxDistanceKm) {
    reasons.push(`distance ${distanceKm.toFixed(0)}km exceeds max ${config.maxDistanceKm}km`);
  }

  const proximity = Math.exp(-distanceKm / config.proximityHalfLifeKm);
  const categoryFit = categoryFitFor(liveEvent.type, candidate.category);
  const significance =
    (CONFIDENCE_WEIGHT[candidate.confidence] + SOURCE_QUALITY_WEIGHT[candidate.sourceQuality]) / 2;

  const { weights } = config;
  const score =
    proximity * weights.proximity +
    categoryFit * weights.categoryFit +
    significance * weights.significance;

  if (score < config.minScore) {
    reasons.push(`score ${score.toFixed(2)} below threshold ${config.minScore}`);
  }

  const geographyOnly = categoryFit === 0 && significance < 0.5;

  return {
    score,
    confidence: confidenceFromScore(score),
    distanceKm,
    categoryFit,
    significance,
    geographyOnly,
    rejected: reasons.length > 0,
    rejectionReasons: reasons,
  };
}
