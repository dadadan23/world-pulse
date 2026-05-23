/**
 * Globe rotation utilities: compute target Y-axis rotation for the globe group
 * so a given longitude faces the camera (which looks from +Z towards the origin).
 * Implements globe-centering behavior for issue #62 (event location markers).
 *
 * The globe group uses Three.js Y-axis rotation. A point in globe-local space at
 * longitude `lon` has local-space coordinates:
 *   x = -r * sin(phi) * cos(theta)
 *   z =  r * sin(phi) * sin(theta)
 * where theta = (lon + 180) * PI / 180.
 *
 * After the globe group is rotated by angle `ry` around Y, the world-space z of
 * that point is maximized (facing the camera) when:
 *   ry = atan2(cos(theta), sin(theta)) = PI/2 - theta = -(90 + lon) * PI/180
 */

const TWO_PI = 2 * Math.PI;

/**
 * Compute the target Y rotation (radians) for the globe group to bring the
 * given longitude to face the camera at +Z.
 */
export function lonToGlobeRotationY(lon: number): number {
  return -(90 + lon) * (Math.PI / 180);
}

/**
 * Find the shortest angular path from `from` to `to`, returning a value in (-PI, PI].
 * Accounts for wrap-around so the globe always takes the short way around.
 */
export function shortestAngleDiff(from: number, to: number): number {
  const fromN = ((from % TWO_PI) + TWO_PI) % TWO_PI;
  const toN = ((to % TWO_PI) + TWO_PI) % TWO_PI;
  let diff = toN - fromN;
  if (diff > Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return diff;
}
