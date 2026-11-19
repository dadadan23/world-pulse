import { describe, it, expect } from 'vitest';
import { latLonToVector3 } from '../components/Globe/projection';
import { getSolarPosition } from './solarPosition';

const at = (iso: string) => getSolarPosition(new Date(iso));

describe('getSolarPosition', () => {
  it('puts the sun over the Tropic of Cancer at the June solstice', () => {
    expect(at('2026-06-21T12:00:00Z').lat).toBeCloseTo(23.44, 0);
  });

  it('puts the sun over the Tropic of Capricorn at the December solstice', () => {
    expect(at('2026-12-21T12:00:00Z').lat).toBeCloseTo(-23.44, 0);
  });

  it('puts the sun near the equator at the equinoxes', () => {
    expect(Math.abs(at('2026-03-20T12:00:00Z').lat)).toBeLessThan(1);
    expect(Math.abs(at('2026-09-23T12:00:00Z').lat)).toBeLessThan(1);
  });

  it('is over the prime meridian near 12:00 UTC (within the equation of time)', () => {
    for (const iso of ['2026-02-11T12:00:00Z', '2026-11-03T12:00:00Z', '2026-06-21T12:00:00Z']) {
      expect(Math.abs(at(iso).lon)).toBeLessThan(4.5);
    }
  });

  it('is on the date line near 00:00 UTC and wraps into [-180, 180)', () => {
    const { lon } = at('2026-06-21T00:00:00Z');
    expect(Math.abs(lon)).toBeGreaterThan(175);
    for (let h = 0; h < 24; h += 1) {
      const p = getSolarPosition(new Date(Date.UTC(2026, 5, 21, h)));
      expect(p.lon).toBeGreaterThanOrEqual(-180);
      expect(p.lon).toBeLessThan(180);
    }
  });

  it('moves west by about 15 degrees per hour', () => {
    const a = at('2026-04-10T06:00:00Z').lon;
    const b = at('2026-04-10T07:00:00Z').lon;
    expect(((a - b + 540) % 360) - 180).toBeCloseTo(15, 0);
  });

  it('returns a unit vector matching the globe projection', () => {
    const p = at('2026-08-01T09:30:00Z');
    const { x, y, z } = p.direction;
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10);
    const v = latLonToVector3(p.lat, p.lon, 1);
    expect(x).toBeCloseTo(v.x, 10);
    expect(y).toBeCloseTo(v.y, 10);
    expect(z).toBeCloseTo(v.z, 10);
  });

  it('is deterministic for an injected clock and handles leap years', () => {
    expect(at('2028-02-29T12:00:00Z')).toEqual(at('2028-02-29T12:00:00Z'));
    // Independent Astronomical Almanac low-precision value: -7.66 degrees.
    expect(at('2028-02-29T12:00:00Z').lat).toBeCloseTo(-7.66, 0);
  });

  it('defaults to the current time', () => {
    const p = getSolarPosition();
    expect(Number.isFinite(p.lat)).toBe(true);
  });
});
