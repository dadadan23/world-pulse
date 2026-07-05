import { useMemo } from 'react';
import { raDecToAltAz } from './celestialMath';
import { altAzToVector3 } from './altAzToVector3';
import { BRIGHT_STARS } from './brightStarCatalog';
import { createTextTexture } from '../Globe/textTexture';

const CATALOG_RADIUS = 49;
const LABEL_MAG_THRESHOLD = 0.9; // Only label stars brighter than this magnitude

interface BrightStarsProps {
  observerLat: number;
  observerLon: number;
  observerTime: Date;
}

export function BrightStars({ observerLat, observerLon, observerTime }: BrightStarsProps) {
  const { brightPos, brightCount, dimPos, dimCount, labels } = useMemo(() => {
    const bright: number[] = [];
    const dim: number[] = [];
    const labelList: { name: string; x: number; y: number; z: number }[] = [];

    for (const star of BRIGHT_STARS) {
      const altAz = raDecToAltAz(star.ra, star.dec, observerLat, observerLon, observerTime);
      if (altAz.altitude < -2) continue;

      const v = altAzToVector3(altAz.altitude, altAz.azimuth, CATALOG_RADIUS);

      if (star.mag < 1.5) {
        bright.push(v.x, v.y, v.z);
      } else {
        dim.push(v.x, v.y, v.z);
      }

      if (star.mag < LABEL_MAG_THRESHOLD) {
        labelList.push({ name: star.name, x: v.x, y: v.y + 0.7, z: v.z });
      }
    }

    return {
      brightPos: new Float32Array(bright),
      brightCount: bright.length / 3,
      dimPos: new Float32Array(dim),
      dimCount: dim.length / 3,
      labels: labelList,
    };
  }, [observerLat, observerLon, observerTime]);

  return (
    <group>
      {brightCount > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[brightPos, 3]}
              count={brightCount}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial color="#EEF4FF" size={0.22} transparent opacity={0.95} sizeAttenuation />
        </points>
      )}
      {dimCount > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[dimPos, 3]}
              count={dimCount}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial color="#C8E6F0" size={0.12} transparent opacity={0.75} sizeAttenuation />
        </points>
      )}
      {labels.map((l) => (
        <StarLabel key={l.name} name={l.name} x={l.x} y={l.y} z={l.z} />
      ))}
    </group>
  );
}

function StarLabel({ name, x, y, z }: { name: string; x: number; y: number; z: number }) {
  const texture = useMemo(
    () => createTextTexture(name, { textColor: '#C8E6F0', glowIntensity: 4 }),
    [name]
  );

  return (
    <sprite position={[x, y, z]} scale={[0.9, 0.22, 1]}>
      <spriteMaterial map={texture} transparent opacity={0.65} depthTest={false} />
    </sprite>
  );
}
