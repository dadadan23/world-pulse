import { describe, it, expect } from 'vitest';
import { gmstHours, lstHours, raDecToAltAz, eclipticToEquatorial } from './celestialMath';

// Reference epoch: 2000-01-01 12:00 UTC (J2000.0) - GMST ~ 18.697 hours
const J2000 = new Date('2000-01-01T12:00:00Z');

describe('gmstHours', () => {
  it('returns ~18.697 at J2000 epoch', () => {
    const gmst = gmstHours(J2000);
    expect(gmst).toBeCloseTo(18.697, 1);
  });

  it('stays in range 0-24', () => {
    const dates = [
      new Date('2024-06-15T00:00:00Z'),
      new Date('2024-12-25T18:00:00Z'),
      new Date('2026-01-01T06:30:00Z'),
    ];
    for (const d of dates) {
      const gmst = gmstHours(d);
      expect(gmst).toBeGreaterThanOrEqual(0);
      expect(gmst).toBeLessThan(24);
    }
  });
});

describe('lstHours', () => {
  it('returns 0–24 for any longitude', () => {
    const lons = [-180, -90, 0, 90, 180];
    for (const lon of lons) {
      const lst = lstHours(J2000, lon);
      expect(lst).toBeGreaterThanOrEqual(0);
      expect(lst).toBeLessThan(24);
    }
  });

  it('shifts by longitude correctly (15° = 1 hour)', () => {
    const base = lstHours(J2000, 0);
    const shifted = lstHours(J2000, 15);
    const diff = (((shifted - base) % 24) + 24) % 24;
    expect(diff).toBeCloseTo(1.0, 3);
  });
});

describe('raDecToAltAz', () => {
  it('returns altitude in -90 to 90 range', () => {
    const result = raDecToAltAz(6.75, -16.72, 40, 0, J2000);
    expect(result.altitude).toBeGreaterThanOrEqual(-90);
    expect(result.altitude).toBeLessThanOrEqual(90);
  });

  it('returns azimuth in 0 to 360 range', () => {
    const result = raDecToAltAz(6.75, -16.72, 40, 0, J2000);
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThanOrEqual(360);
  });

  it('circumpolar star stays above horizon at north pole', () => {
    // Polaris RA≈2.53h, Dec≈+89.26° is always above horizon at 90°N
    const result = raDecToAltAz(2.53, 89.26, 90, 0, J2000);
    expect(result.altitude).toBeGreaterThan(80);
  });

  it('star on meridian has azimuth near 0 or 180', () => {
    // Star at Dec=10° at HA=0 (on meridian) from lat 40°N should be due South (az≈180°)
    // LST at lon=0 at J2000 ≈ 18.697h, so star RA=18.697h is on the meridian
    const lstAtJ2000 = gmstHours(J2000);
    const result = raDecToAltAz(lstAtJ2000, 10, 40, 0, J2000);
    // Should be near South (180°) since Dec < Lat
    expect(Math.abs(result.azimuth - 180)).toBeLessThan(5);
  });
});

describe('eclipticToEquatorial', () => {
  it('vernal equinox (λ=0) maps to RA=0, Dec=0', () => {
    const { ra, dec } = eclipticToEquatorial(0);
    expect(ra).toBeCloseTo(0, 2);
    expect(dec).toBeCloseTo(0, 2);
  });

  it('summer solstice (λ=90) maps to Dec≈+23.44°', () => {
    const { dec } = eclipticToEquatorial(90);
    expect(dec).toBeCloseTo(23.44, 1);
  });

  it('winter solstice (λ=270) maps to Dec≈-23.44°', () => {
    const { dec } = eclipticToEquatorial(270);
    expect(dec).toBeCloseTo(-23.44, 1);
  });

  it('returns RA in 0–24 range', () => {
    for (let lambda = 0; lambda < 360; lambda += 30) {
      const { ra } = eclipticToEquatorial(lambda);
      expect(ra).toBeGreaterThanOrEqual(0);
      expect(ra).toBeLessThan(24);
    }
  });
});
