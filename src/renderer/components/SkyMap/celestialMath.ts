export interface AltAzDeg {
  altitude: number; // degrees above horizon (-90 to 90)
  azimuth: number; // degrees clockwise from North (0–360)
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / 86_400_000;
}

/** Greenwich Mean Sidereal Time in decimal hours (0–24). */
export function gmstHours(date: Date): number {
  const D = daysSinceJ2000(date);
  return (((18.697374558 + 24.06570982441908 * D) % 24) + 24) % 24;
}

/** Local Sidereal Time in decimal hours (0–24). */
export function lstHours(date: Date, lonDeg: number): number {
  return (((gmstHours(date) + lonDeg / 15) % 24) + 24) % 24;
}

/**
 * Convert equatorial (RA, Dec) to horizontal (Alt, Az) coordinates.
 * @param ra  Right Ascension in decimal hours (0–24)
 * @param dec Declination in degrees (−90 to +90)
 * @param lat Observer latitude in degrees (north positive)
 * @param lon Observer longitude in degrees (east positive)
 * @param date Observation UTC date/time
 */
export function raDecToAltAz(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  date: Date
): AltAzDeg {
  const LST = lstHours(date, lon);
  const haHours = (((LST - ra) % 24) + 24) % 24;
  const haRad = toRad(haHours * 15);
  const decRad = toRad(dec);
  const latRad = toRad(lat);

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

  const altRad = toRad(altitude);
  const denom = Math.cos(altRad) * Math.cos(latRad);
  const cosAz = denom > 1e-9 ? (Math.sin(decRad) - Math.sin(altRad) * Math.sin(latRad)) / denom : 0;
  let azimuth = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}

/**
 * Convert ecliptic longitude to equatorial RA/Dec.
 * Uses mean obliquity ε = 23.4393°.
 */
export function eclipticToEquatorial(lambdaDeg: number): { ra: number; dec: number } {
  const l = toRad(lambdaDeg);
  const eps = toRad(23.4393);
  const ra = ((toDeg(Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l))) + 360) % 360) / 15;
  const dec = toDeg(Math.asin(Math.sin(eps) * Math.sin(l)));
  return { ra, dec };
}
