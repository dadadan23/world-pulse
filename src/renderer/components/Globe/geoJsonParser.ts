import type { CoastlineData, CoastlinePolyline } from './coastlineData';

/** Minimal GeoJSON types needed for coastline parsing. */
interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

interface GeoJsonMultiLineString {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonLineString | GeoJsonMultiLineString | { type: string };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)['type'] === 'FeatureCollection' &&
    Array.isArray((value as Record<string, unknown>)['features'])
  );
}

/**
 * Parse a GeoJSON FeatureCollection containing LineString or MultiLineString
 * features into the internal CoastlineData format used by textureRenderer.
 *
 * Each LineString becomes one CoastlinePolyline.
 * Each MultiLineString ring becomes a separate CoastlinePolyline.
 * Features with other geometry types are silently ignored.
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
    const { geometry } = feature;

    if (geometry.type === 'LineString') {
      const line = geometry as GeoJsonLineString;
      if (line.coordinates.length >= 2) {
        result.push(line.coordinates as CoastlinePolyline);
      }
    } else if (geometry.type === 'MultiLineString') {
      const multi = geometry as GeoJsonMultiLineString;
      for (const ring of multi.coordinates) {
        if (ring.length >= 2) {
          result.push(ring as CoastlinePolyline);
        }
      }
    }
    // Polygon / Point / other types are not coastline polylines; skip.
  }

  return result;
}
