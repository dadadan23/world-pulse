/* eslint-disable react-hooks/purity -- decorative star positions are generated once via useMemo([]) */

import { useMemo } from 'react';

const STAR_COUNT = 2000;
const STAR_RADIUS = 50; // Large sphere radius
const STAR_COLOR = '#C8E6F0'; // Pale cyan (Oblivion stars color)

/**
 * Background star field for the sky map.
 * Generates 2000 random stars distributed on a celestial sphere.
 */
export function StarField() {
  const { positions, sizes } = useMemo(() => {
    const posArray = new Float32Array(STAR_COUNT * 3);
    const sizeArray = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Spherical distribution (uniform on sphere surface)
      const theta = Math.random() * Math.PI * 2; // Azimuth
      const phi = Math.acos(2 * Math.random() - 1); // Polar angle (uniform distribution)

      const x = STAR_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = STAR_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = STAR_RADIUS * Math.cos(phi);

      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;

      // Varying star sizes for depth
      sizeArray[i] = 0.03 + Math.random() * 0.04; // 0.03-0.07
    }

    return { positions: posArray, sizes: sizeArray };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={STAR_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={STAR_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial color={STAR_COLOR} size={0.05} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}
