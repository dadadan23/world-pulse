/**
 * Approximate ISS ground-track geometry for the orbital arc visualization.
 *
 * No TLE feed is available client-side (see PRD OQ-3), so the track is a
 * great-circle approximation through the ISS's current position using its
 * known orbital inclination (~51.64°) rather than true TLE propagation. It's
 * accurate enough to draw a convincing few-minutes-wide ground track, not for
 * precise prediction.
 */

const ISS_INCLINATION_DEG = 51.64;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Degrees of arc rendered behind the ISS's current position. */
export const ISS_ARC_BACK_DEG = 6;
/** Degrees of arc rendered ahead of the ISS's current position. */
export const ISS_ARC_FORWARD_DEG = 28;

const ARC_SAMPLES = 24;

/**
 * Ground-track heading (degrees clockwise from north) for a circular orbit of
 * the given inclination passing through latitude `latDeg`, ascending pass.
 * Standard spherical-trig relation for inclined orbits:
 * sin(heading) = cos(inclination) / cos(latitude).
 */
export function groundTrackHeadingDeg(
  latDeg: number,
  inclinationDeg: number = ISS_INCLINATION_DEG
): number {
  const latRad = latDeg * DEG_TO_RAD;
  const incRad = inclinationDeg * DEG_TO_RAD;
  const ratio = Math.max(-1, Math.min(1, Math.cos(incRad) / Math.cos(latRad)));
  return Math.asin(ratio) * RAD_TO_DEG;
}

/**
 * Great-circle destination point given a start lat/lon, bearing (degrees
 * clockwise from north), and angular distance (radians). Standard
 * great-circle "direct" formula.
 */
export function destinationPoint(
  latDeg: number,
  lonDeg: number,
  bearingDeg: number,
  angularDistanceRad: number
): { lat: number; lon: number } {
  const lat1 = latDeg * DEG_TO_RAD;
  const lon1 = lonDeg * DEG_TO_RAD;
  const bearing = bearingDeg * DEG_TO_RAD;
  const d = angularDistanceRad;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: lat2 * RAD_TO_DEG,
    lon: ((lon2 * RAD_TO_DEG + 540) % 360) - 180,
  };
}

/**
 * Sample a ground-track arc through the ISS's current position: a short trail
 * behind it and a longer lead-in ahead, in its direction of travel.
 */
export function buildIssGroundTrack(
  latDeg: number,
  lonDeg: number
): { lat: number; lon: number }[] {
  const heading = groundTrackHeadingDeg(latDeg);
  const totalDeg = ISS_ARC_BACK_DEG + ISS_ARC_FORWARD_DEG;
  const points: { lat: number; lon: number }[] = [];

  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const deg = -ISS_ARC_BACK_DEG + (i / ARC_SAMPLES) * totalDeg;
    points.push(destinationPoint(latDeg, lonDeg, heading, deg * DEG_TO_RAD));
  }

  return points;
}
