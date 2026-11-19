/**
 * Subsolar point (where the sun is directly overhead) for a UTC instant, using the NOAA
 * fractional-year approximation (accurate to well under 1 degree). Pure and clock-injectable:
 * pass a `Date` for tests and screenshots, omit it for the current time.
 */

export interface SolarPosition {
  /** Subsolar latitude in degrees (the sun's declination), [-23.45, 23.45]. */
  lat: number;
  /** Subsolar longitude in degrees, [-180, 180). */
  lon: number;
  /** Unit vector toward the sun in globe space (same axes as `latLonToVector3`). */
  direction: { x: number; y: number; z: number };
}

const DEG = Math.PI / 180;
const MS_PER_DAY = 86_400_000;

/** Wrap an angle in degrees to [-180, 180). */
function wrapLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Subsolar point for the given UTC instant (defaults to now). */
export function getSolarPosition(date: Date = new Date()): SolarPosition {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - yearStart) / MS_PER_DAY);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const daysInYear = Date.UTC(date.getUTCFullYear() + 1, 0, 1) - yearStart;
  // Fractional year in radians.
  const g = ((2 * Math.PI) / (daysInYear / MS_PER_DAY)) * (dayOfYear + (utcHours - 12) / 24);

  const declination =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const equationOfTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));

  const lat = declination / DEG;
  const lon = wrapLongitude(-15 * (utcHours - 12 + equationOfTimeMinutes / 60));

  // Same convention as latLonToVector3 in components/Globe/projection.ts (radius 1).
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return {
    lat,
    lon,
    direction: {
      x: -Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
    },
  };
}
