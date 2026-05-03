import * as THREE from 'three';

/** Bound projection function - maps one coordinate axis to canvas pixels. */
export type ProjectionFn = (coord: number) => number;

/** Equirectangular: longitude [-180, 180] -> canvas x [0, width]. */
export const toX = (lon: number, width: number): number => ((lon + 180) / 360) * width;

/** Equirectangular: latitude [90, -90] -> canvas y [0, height]. */
export const toY = (lat: number, height: number): number => ((90 - lat) / 180) * height;

/** Convert latitude/longitude to a 3D position on a sphere of the given radius. */
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
