import { describe, it, expect } from 'vitest';
import { parseGeoJsonCoastlines } from './geoJsonParser';
import type { GeoJsonFeatureCollection } from './geoJsonParser';

describe('parseGeoJsonCoastlines', () => {
  it('should return empty array for non-FeatureCollection input', () => {
    expect(parseGeoJsonCoastlines(null)).toHaveLength(0);
    expect(parseGeoJsonCoastlines(undefined)).toHaveLength(0);
    expect(parseGeoJsonCoastlines({ type: 'Feature' })).toHaveLength(0);
    expect(parseGeoJsonCoastlines('not an object')).toHaveLength(0);
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
