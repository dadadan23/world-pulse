import { describe, it, expect } from 'vitest';
import { latLonToVector3, toX, toY } from './projection';
import { COASTLINES } from './coastlineData';
import type { CoastlineData } from './coastlineData';
import type { CoastlineSource } from './textureRenderer';

describe('latLonToVector3', () => {
  it('should place north pole at top of sphere', () => {
    const v = latLonToVector3(90, 0, 1);
    expect(v.y).toBeCloseTo(1, 5);
    expect(Math.abs(v.x)).toBeLessThan(0.001);
    expect(Math.abs(v.z)).toBeLessThan(0.001);
  });

  it('should place south pole at bottom of sphere', () => {
    const v = latLonToVector3(-90, 0, 1);
    expect(v.y).toBeCloseTo(-1, 5);
    expect(Math.abs(v.x)).toBeLessThan(0.001);
    expect(Math.abs(v.z)).toBeLessThan(0.001);
  });

  it('should place equator points at y=0', () => {
    const v = latLonToVector3(0, 45, 1);
    expect(v.y).toBeCloseTo(0, 5);
  });

  it('should produce vectors of the given radius', () => {
    const positions: [number, number][] = [
      [0, 0],
      [45, 90],
      [-45, -90],
      [30, 120],
      [-60, -150],
    ];
    for (const [lat, lon] of positions) {
      const v = latLonToVector3(lat, lon, 1);
      expect(v.length()).toBeCloseTo(1, 5);
    }
  });

  it('should respect the radius parameter', () => {
    const v = latLonToVector3(0, 0, 5);
    expect(v.length()).toBeCloseTo(5, 5);
  });

  it('should place northern hemisphere points at positive y', () => {
    const v = latLonToVector3(35.7, 139.7, 1); // Tokyo
    expect(v.y).toBeGreaterThan(0);
  });

  it('should place southern hemisphere points at negative y', () => {
    const v = latLonToVector3(-33.9, 151.2, 1); // Sydney
    expect(v.y).toBeLessThan(0);
  });

  it('should produce different positions for different coordinates', () => {
    const tokyo = latLonToVector3(35.7, 139.7, 1);
    const london = latLonToVector3(51.5, -0.1, 1);
    const distance = tokyo.distanceTo(london);
    expect(distance).toBeGreaterThan(0.5);
  });

  it('should place antipodal points on opposite sides', () => {
    const a = latLonToVector3(0, 0, 1);
    const b = latLonToVector3(0, 180, 1);
    const distance = a.distanceTo(b);
    expect(distance).toBeCloseTo(2, 1); // Diameter
  });
});

describe('toX / toY equirectangular projection', () => {
  it('maps lon -180 to x=0', () => {
    expect(toX(-180, 360)).toBe(0);
  });

  it('maps lon 180 to x=width', () => {
    expect(toX(180, 360)).toBe(360);
  });

  it('maps lon 0 to x=width/2', () => {
    expect(toX(0, 360)).toBe(180);
  });

  it('maps lat 90 (north) to y=0', () => {
    expect(toY(90, 180)).toBe(0);
  });

  it('maps lat -90 (south) to y=height', () => {
    expect(toY(-90, 180)).toBe(180);
  });

  it('maps lat 0 (equator) to y=height/2', () => {
    expect(toY(0, 180)).toBe(90);
  });

  it('scales linearly with canvas dimensions', () => {
    expect(toX(0, 1024)).toBe(512);
    expect(toY(0, 512)).toBe(256);
  });
});

describe('coastlineData', () => {
  it('exports a non-empty COASTLINES array', () => {
    expect(Array.isArray(COASTLINES)).toBe(true);
    expect(COASTLINES.length).toBeGreaterThan(0);
  });

  it('each polyline is an array of [lon, lat] pairs', () => {
    for (const polyline of COASTLINES) {
      expect(Array.isArray(polyline)).toBe(true);
      for (const point of polyline) {
        expect(point).toHaveLength(2);
        const [lon, lat] = point;
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    }
  });

  it('COASTLINES is assignable to CoastlineData type', () => {
    const data: CoastlineData = COASTLINES;
    expect(data).toBeDefined();
  });
});

describe('module re-exports (earthTexture public API)', () => {
  it('CoastlineSource type is exported from textureRenderer', () => {
    // Verify the type is usable as a function signature
    const source: CoastlineSource = () => COASTLINES;
    expect(source()).toBe(COASTLINES);
  });
});

// createEarthTextures requires a real Canvas 2D context which jsdom does not provide.
// These tests would need a browser environment or the 'canvas' npm package.
// Visual correctness is best verified via integration/e2e tests.
