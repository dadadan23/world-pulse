import { useMemo } from 'react';
import { raDecToAltAz } from './celestialMath';
import { altAzToVector3 } from './altAzToVector3';
import { BRIGHT_STARS, type CatalogStar } from './brightStarCatalog';
import { CONSTELLATION_LINES } from './constellationData';
import { createTextTexture } from '../Globe/textTexture';

const CONST_RADIUS = 48.5;

interface ConstellationLinesProps {
  observerLat: number;
  observerLon: number;
  observerTime: Date;
}

export function ConstellationLines({
  observerLat,
  observerLon,
  observerTime,
}: ConstellationLinesProps) {
  const { segPositions, segCount, labels } = useMemo(() => {
    const starMap = new Map<string, CatalogStar>(BRIGHT_STARS.map((s) => [s.id, s]));

    type StarPos = { x: number; y: number; z: number; altitude: number };
    const posCache = new Map<string, StarPos>();

    function getPos(id: string): StarPos | null {
      if (posCache.has(id)) return posCache.get(id)!;
      const star = starMap.get(id);
      if (!star) return null;
      const altAz = raDecToAltAz(star.ra, star.dec, observerLat, observerLon, observerTime);
      const v = altAzToVector3(altAz.altitude, altAz.azimuth, CONST_RADIUS);
      const pos = { x: v.x, y: v.y, z: v.z, altitude: altAz.altitude };
      posCache.set(id, pos);
      return pos;
    }

    const segs: number[] = [];
    const labelList: { name: string; x: number; y: number; z: number }[] = [];

    for (const constellation of CONSTELLATION_LINES) {
      const visibleStarPositions: StarPos[] = [];

      for (const [id1, id2] of constellation.segments) {
        const p1 = getPos(id1);
        const p2 = getPos(id2);
        if (!p1 || !p2) continue;
        if (p1.altitude < -2 && p2.altitude < -2) continue;
        segs.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        if (p1.altitude > 0) visibleStarPositions.push(p1);
        if (p2.altitude > 0) visibleStarPositions.push(p2);
      }

      if (visibleStarPositions.length >= 2) {
        const cx = visibleStarPositions.reduce((s, p) => s + p.x, 0) / visibleStarPositions.length;
        const cy = visibleStarPositions.reduce((s, p) => s + p.y, 0) / visibleStarPositions.length;
        const cz = visibleStarPositions.reduce((s, p) => s + p.z, 0) / visibleStarPositions.length;
        labelList.push({ name: constellation.name, x: cx, y: cy + 1.2, z: cz });
      }
    }

    return {
      segPositions: new Float32Array(segs),
      segCount: segs.length / 3,
      labels: labelList,
    };
  }, [observerLat, observerLon, observerTime]);

  return (
    <group>
      {segCount > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[segPositions, 3]}
              count={segCount}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00D4FF" transparent opacity={0.3} />
        </lineSegments>
      )}
      {labels.map((l) => (
        <ConstellationLabel key={l.name} name={l.name} x={l.x} y={l.y} z={l.z} />
      ))}
    </group>
  );
}

function ConstellationLabel({ name, x, y, z }: { name: string; x: number; y: number; z: number }) {
  const texture = useMemo(
    () =>
      createTextTexture(name.toUpperCase(), {
        textColor: '#00D4FF',
        glowIntensity: 6,
        fontSize: 18,
      }),
    [name]
  );

  return (
    <sprite position={[x, y, z]} scale={[1.4, 0.28, 1]}>
      <spriteMaterial map={texture} transparent opacity={0.5} depthTest={false} />
    </sprite>
  );
}
