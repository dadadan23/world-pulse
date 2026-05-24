import { describe, it, expect } from 'vitest';
import { parseGeoJsonBoundaries, parseGeoJsonCoastlines } from './geoJsonParser';
import type { GeoJsonFeatureCollection } from './geoJsonParser';
import ne110mRaw from './ne_110m_coastline.geojson';
import ne110mAdminBoundaryRaw from './ne_110m_admin_0_boundary_lines_land.geojson';

const MIN_BOUNDARY_SEGMENTS = 100;

describe('parseGeoJsonCoastlines', () => {
  it('should return empty array for non-FeatureCollection input', () => {
    expect(parseGeoJsonCoastlines(null)).toHaveLength(0);
    expect(parseGeoJsonCoastlines(undefined)).toHaveLength(0);
    expect(parseGeoJsonCoastlines({ type: 'Feature' })).toHaveLength(0);
    expect(parseGeoJsonCoastlines('not an object')).toHaveLength(0);
  });

  it('should silently skip features with missing or null geometry', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null },
        { type: 'Feature' }, // no geometry key at all
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(1);
  });

  it('should silently skip coordinate pairs with non-finite numbers', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            // mix of valid, NaN, Infinity, wrong types
            coordinates: [
              [0, 0],
              [NaN, 1],
              [Infinity, 1],
              ['x', 1],
              [1, 2],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    // Only the 2 fully-finite pairs [0,0] and [1,2] survive
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      [0, 0],
      [1, 2],
    ]);
  });

  it('should silently skip a LineString whose coordinates field is not an array', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: 'bad' },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(0);
  });

  it('should silently skip a MultiLineString whose coordinates field is not an array', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'MultiLineString', coordinates: null },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(0);
  });

  it('should silently skip non-object entries in the features array', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        null,
        42,
        'string',
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [5, 10],
              [6, 11],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(1);
  });

  it('should parse a single LineString feature', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-10, 36],
              [-9, 38],
              [-9, 40],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      [-10, 36],
      [-9, 38],
      [-9, 40],
    ]);
  });

  it('should parse a MultiLineString feature into separate polylines', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
              ],
              [
                [10, 10],
                [11, 10],
              ],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect(result[1]).toEqual([
      [10, 10],
      [11, 10],
    ]);
  });

  it('should skip LineString features with fewer than 2 coordinates', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[-10, 36]],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(0);
  });

  it('should skip unsupported geometry types', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon' },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(0);
  });

  it('should handle an empty FeatureCollection', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(0);
  });

  it('should parse multiple mixed LineString features', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point' }, // should be skipped
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [10, 10],
              [20, 20],
              [30, 30],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result).toHaveLength(2);
  });

  it('should preserve coordinate precision from the source GeoJSON', () => {
    const coords: [number, number][] = [
      [-163.712896, -78.595667],
      [-163.105801, -78.223339],
      [-161.245113, -78.380177],
    ];
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result[0]).toEqual(coords);
  });

  it('should produce coordinates in [longitude, latitude] order', () => {
    // Verify that the first coordinate is treated as [lon, lat]
    // (GeoJSON spec requires this order)
    const coords: [number, number][] = [
      [139.7, 35.7], // [lon=139.7, lat=35.7] Tokyo area
      [2.35, 48.85], // [lon=2.35, lat=48.85] Paris area
    ];
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
        },
      ],
    };

    const result = parseGeoJsonCoastlines(input);
    expect(result[0][0][0]).toBe(139.7); // longitude
    expect(result[0][0][1]).toBe(35.7); // latitude
  });
});

// Integration test: exercise the real Natural Earth 110m dataset through the full pipeline.
describe('ne_110m_coastline.geojson integration', () => {
  it('parses to a non-empty CoastlineData array', () => {
    const result = parseGeoJsonCoastlines(ne110mRaw);
    // Natural Earth 110m coastline has ~4 000+ line features
    expect(result.length).toBeGreaterThan(100);
  });

  it('every polyline has at least 2 coordinate pairs', () => {
    const result = parseGeoJsonCoastlines(ne110mRaw);
    for (const polyline of result) {
      expect(polyline.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('all coordinates are valid [lon, lat] pairs within bounds', () => {
    const result = parseGeoJsonCoastlines(ne110mRaw);
    for (const polyline of result) {
      for (const [lon, lat] of polyline) {
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    }
  });

  it('includes coastlines near Europe (lon 0..30, lat 35..70)', () => {
    const result = parseGeoJsonCoastlines(ne110mRaw);
    const europeFeature = result.find((polyline) =>
      polyline.some(([lon, lat]) => lon >= 0 && lon <= 30 && lat >= 35 && lat <= 70)
    );
    expect(europeFeature).toBeDefined();
  });

  it('includes coastlines near North America (lon -130..-60, lat 25..70)', () => {
    const result = parseGeoJsonCoastlines(ne110mRaw);
    const naFeature = result.find((polyline) =>
      polyline.some(([lon, lat]) => lon >= -130 && lon <= -60 && lat >= 25 && lat <= 70)
    );
    expect(naFeature).toBeDefined();
  });

  it('includes coastlines near East Asia (lon 100..150, lat 0..50)', () => {
    const result = parseGeoJsonCoastlines(ne110mRaw);
    const asiaFeature = result.find((polyline) =>
      polyline.some(([lon, lat]) => lon >= 100 && lon <= 150 && lat >= 0 && lat <= 50)
    );
    expect(asiaFeature).toBeDefined();
  });
});

describe('ne_110m_admin_0_boundary_lines_land.geojson integration', () => {
  it('parses to a non-empty CoastlineData array', () => {
    const result = parseGeoJsonCoastlines(ne110mAdminBoundaryRaw);
    expect(result.length).toBeGreaterThan(MIN_BOUNDARY_SEGMENTS);
  });

  it('includes boundary segments in central Europe', () => {
    const result = parseGeoJsonCoastlines(ne110mAdminBoundaryRaw);
    const europeBoundary = result.find((polyline) =>
      polyline.some(([lon, lat]) => lon >= 5 && lon <= 25 && lat >= 45 && lat <= 55)
    );
    expect(europeBoundary).toBeDefined();
  });
});

describe('parseGeoJsonBoundaries', () => {
  it('classifies disputed and land boundaries from FEATURECLA', () => {
    const input: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { FEATURECLA: 'International boundary (verify)' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { FEATURECLA: 'Disputed (please verify)' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [10, 10],
              [11, 11],
            ],
          },
        },
      ],
    };

    const result = parseGeoJsonBoundaries(input);
    expect(result).toHaveLength(2);
    expect(result[0].style).toBe('land');
    expect(result[1].style).toBe('disputed');
  });

  it('parses Natural Earth boundaries and preserves both style classes', () => {
    const result = parseGeoJsonBoundaries(ne110mAdminBoundaryRaw);

    expect(result.length).toBeGreaterThan(MIN_BOUNDARY_SEGMENTS);
    expect(result.some((segment) => segment.style === 'land')).toBe(true);
    expect(result.some((segment) => segment.style === 'disputed')).toBe(true);
  });
});
