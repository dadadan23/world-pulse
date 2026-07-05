import { useMemo } from 'react';
import { eclipticToEquatorial, raDecToAltAz } from './celestialMath';
import { altAzToVector3 } from './altAzToVector3';

const ECL_RADIUS = 47;
const ECL_STEPS = 180; // one point per 2° of ecliptic longitude

interface EclipticLineProps {
  observerLat: number;
  observerLon: number;
  observerTime: Date;
}

export function EclipticLine({ observerLat, observerLon, observerTime }: EclipticLineProps) {
  const { segPos, segCount } = useMemo(() => {
    type EclPt = { x: number; y: number; z: number; above: boolean };
    const pts: EclPt[] = [];

    for (let i = 0; i <= ECL_STEPS; i++) {
      const lambda = (360 * i) / ECL_STEPS;
      const { ra, dec } = eclipticToEquatorial(lambda);
      const altAz = raDecToAltAz(ra, dec, observerLat, observerLon, observerTime);
      const v = altAzToVector3(altAz.altitude, altAz.azimuth, ECL_RADIUS);
      pts.push({ x: v.x, y: v.y, z: v.z, above: altAz.altitude > 0 });
    }
    // Close the loop
    pts.push(pts[0]);

    const segs: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i].above || pts[i + 1].above) {
        segs.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      }
    }

    return { segPos: new Float32Array(segs), segCount: segs.length / 3 };
  }, [observerLat, observerLon, observerTime]);

  if (segCount === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[segPos, 3]}
          count={segCount}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#FF8C42" transparent opacity={0.35} />
    </lineSegments>
  );
}
