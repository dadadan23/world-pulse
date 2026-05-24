import type { CoastlineData, CoastlinePolyline } from './coastlineData';

/**
 * Minimal exported type for callers that need to type-annotate GeoJSON input.
 * The parser validates the full structure at runtime, so this is intentionally
 * loose -- only the top-level shape is described here.
 */
export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: unknown[];
}

export type ParsedBoundaryStyle = 'land' | 'disputed';

export interface ParsedBoundaryPolyline {
  points: CoastlinePolyline;
  style: ParsedBoundaryStyle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  return (
    isRecord(value) && value['type'] === 'FeatureCollection' && Array.isArray(value['features'])
  );
}

/** Return true when v is a finite number (not NaN, not Infinity). */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

/** Validate that a value is a [lon, lat] coordinate pair with finite numbers. */
function isCoordPair(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length >= 2 && isFiniteNumber(v[0]) && isFiniteNumber(v[1]);
}

/** Extract valid coordinate pairs from a raw coordinates array, silently dropping bad entries. */
function safeCoords(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isCoordPair);
}

function getFeatureClassification(feature: Record<string, unknown>): string {
  const props = feature['properties'];
  if (!isRecord(props)) return '';

  const raw = props['FEATURECLA'] ?? props['featurecla'];
  return typeof raw === 'string' ? raw.toLowerCase() : '';
}

function classifyBoundaryStyle(classification: string): ParsedBoundaryStyle {
  const disputedTokens = [
    'disputed',
    'line of control',
    'claim boundary',
    'indefinite',
    'indeterminant',
  ];

  return disputedTokens.some((token) => classification.includes(token)) ? 'disputed' : 'land';
}

/**
 * Parse a GeoJSON FeatureCollection containing LineString or MultiLineString
 * features into the internal CoastlineData format used by textureRenderer.
 *
 * Each LineString becomes one CoastlinePolyline.
 * Each MultiLineString ring becomes a separate CoastlinePolyline.
 * Features with other geometry types are silently ignored.
 * Malformed features (missing geometry, missing/invalid coordinates) are skipped.
 *
 * Coordinates are expected as [longitude, latitude] pairs (standard GeoJSON).
 *
 * Accepts `unknown` input so that direct JSON imports (typed as
 * `Record<string, unknown>`) require no double-cast at the call site.
 */
export function parseGeoJsonCoastlines(geojson: unknown): CoastlineData {
  if (!isFeatureCollection(geojson)) {
    return [];
  }

  const result: CoastlineData = [];

  for (const feature of geojson.features) {
    // Skip any non-object entries in the features array.
    if (!isRecord(feature)) continue;

    const geometry = feature['geometry'];
    if (!isRecord(geometry)) continue;

    const geoType = geometry['type'];

    if (geoType === 'LineString') {
      const coords = safeCoords(geometry['coordinates']);
      if (coords.length >= 2) {
        result.push(coords as CoastlinePolyline);
      }
    } else if (geoType === 'MultiLineString') {
      const rings = geometry['coordinates'];
      if (!Array.isArray(rings)) continue;
      for (const ring of rings) {
        const coords = safeCoords(ring);
        if (coords.length >= 2) {
          result.push(coords as CoastlinePolyline);
        }
      }
    }
    // Polygon / Point / other types are not coastline polylines; skip.
  }

  return result;
}

/**
 * Parse boundary line GeoJSON and classify each segment for style rendering.
 *
 * Classification uses Natural Earth FEATURECLA metadata. Any segment marked as
 * disputed / line-of-control / claim / indefinite frontier is tagged as
 * `disputed`; all others default to `land`.
 */
export function parseGeoJsonBoundaries(geojson: unknown): ParsedBoundaryPolyline[] {
  if (!isFeatureCollection(geojson)) {
    return [];
  }

  const result: ParsedBoundaryPolyline[] = [];

  for (const feature of geojson.features) {
    if (!isRecord(feature)) continue;

    const geometry = feature['geometry'];
    if (!isRecord(geometry)) continue;

    const style = classifyBoundaryStyle(getFeatureClassification(feature));
    const geoType = geometry['type'];

    if (geoType === 'LineString') {
      const coords = safeCoords(geometry['coordinates']);
      if (coords.length >= 2) {
        result.push({ points: coords as CoastlinePolyline, style });
      }
    } else if (geoType === 'MultiLineString') {
      const rings = geometry['coordinates'];
      if (!Array.isArray(rings)) continue;

      for (const ring of rings) {
        const coords = safeCoords(ring);
        if (coords.length >= 2) {
          result.push({ points: coords as CoastlinePolyline, style });
        }
      }
    }
  }

  return result;
}
