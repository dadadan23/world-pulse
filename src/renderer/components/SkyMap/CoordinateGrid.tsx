/* eslint-disable react/no-unknown-property */
import { useMemo } from 'react';
import { altAzToVector3 } from './altAzToVector3';
import { createTextTexture } from '../Globe/textTexture';

const GRID_RADIUS = 46;
const ALT_CIRCLES = [15, 30, 45, 60, 75]; // altitude degrees
const AZ_LINE_STEP = 30; // degrees between azimuth meridians
const CIRCLE_STEPS = 120; // segments per altitude circle
const AZ_ARC_STEPS = 30; // segments per azimuth arc (horizon to zenith)

const CARDINALS = [
  { label: 'N', az: 0 },
  { label: 'NE', az: 45 },
  { label: 'E', az: 90 },
  { label: 'SE', az: 135 },
  { label: 'S', az: 180 },
  { label: 'SW', az: 225 },
  { label: 'W', az: 270 },
  { label: 'NW', az: 315 },
];

export function CoordinateGrid() {
  const { horizonPos, horizonCount, gridPos, gridCount } = useMemo(() => {
    const horizonSegs: number[] = [];
    const gridSegs: number[] = [];

    // Horizon circle at alt=0 (brighter, drawn separately)
    for (let i = 0; i < CIRCLE_STEPS; i++) {
      const az0 = (360 * i) / CIRCLE_STEPS;
      const az1 = (360 * (i + 1)) / CIRCLE_STEPS;
      const p0 = altAzToVector3(0, az0, GRID_RADIUS);
      const p1 = altAzToVector3(0, az1, GRID_RADIUS);
      horizonSegs.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }

    // Altitude circles (above horizon)
    for (const altDeg of ALT_CIRCLES) {
      for (let i = 0; i < CIRCLE_STEPS; i++) {
        const az0 = (360 * i) / CIRCLE_STEPS;
        const az1 = (360 * (i + 1)) / CIRCLE_STEPS;
        const p0 = altAzToVector3(altDeg, az0, GRID_RADIUS);
        const p1 = altAzToVector3(altDeg, az1, GRID_RADIUS);
        gridSegs.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }

    // Azimuth meridian lines from horizon to zenith
    for (let azDeg = 0; azDeg < 360; azDeg += AZ_LINE_STEP) {
      for (let j = 0; j < AZ_ARC_STEPS; j++) {
        const alt0 = (90 * j) / AZ_ARC_STEPS;
        const alt1 = (90 * (j + 1)) / AZ_ARC_STEPS;
        const p0 = altAzToVector3(alt0, azDeg, GRID_RADIUS);
        const p1 = altAzToVector3(alt1, azDeg, GRID_RADIUS);
        gridSegs.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
    }

    return {
      horizonPos: new Float32Array(horizonSegs),
      horizonCount: horizonSegs.length / 3,
      gridPos: new Float32Array(gridSegs),
      gridCount: gridSegs.length / 3,
    };
  }, []);

  return (
    <group>
      {/* Horizon ring */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[horizonPos, 3]}
            count={horizonCount}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00D4FF" transparent opacity={0.45} />
      </lineSegments>

      {/* Altitude circles + azimuth lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[gridPos, 3]}
            count={gridCount}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00D4FF" transparent opacity={0.1} />
      </lineSegments>

      {/* Cardinal direction labels just above the horizon */}
      {CARDINALS.map((c) => (
        <CardinalLabel key={c.label} label={c.label} az={c.az} />
      ))}
    </group>
  );
}

function CardinalLabel({ label, az }: { label: string; az: number }) {
  const texture = useMemo(
    () =>
      createTextTexture(label, {
        textColor: az % 90 === 0 ? '#00D4FF' : '#4A7A8A',
        glowIntensity: az % 90 === 0 ? 10 : 4,
        fontSize: az % 90 === 0 ? 28 : 20,
      }),
    [label, az]
  );

  const pos = altAzToVector3(3, az, GRID_RADIUS);

  return (
    <sprite position={[pos.x, pos.y, pos.z]} scale={[0.6, 0.18, 1]}>
      <spriteMaterial map={texture} transparent opacity={0.85} depthTest={false} />
    </sprite>
  );
}
