/* eslint-disable react-hooks/purity -- Date.now() fallback only used for events missing id/timestamp */

import { useMemo } from 'react';
import type * as THREE from 'three';
import type { Event } from '@shared/types';
import { altAzToVector3 } from './altAzToVector3';
import { createTextTexture } from '../Globe/textTexture';

const PLANET_RADIUS = 45; // Distance from center
const ASTEROID_RADIUS = 48; // Slightly farther out
const PLANET_COLOR = '#FF8C42'; // Amber (Oblivion accent)
const ASTEROID_COLOR = '#00D4FF'; // Cyan (Oblivion primary)

interface CelestialObjectProps {
  event: Event;
  position: THREE.Vector3;
  color: string;
  size: number;
}

function CelestialObject({ event, position, color, size }: CelestialObjectProps) {
  const label = useMemo(() => {
    if (event.type === 'planet' && event.data && 'planetName' in event.data) {
      return event.data.planetName as string;
    }
    return event.type.toUpperCase();
  }, [event]);

  const texture = useMemo(() => createTextTexture(label, { textColor: color }), [label, color]);

  return (
    <group position={position}>
      {/* Marker sphere */}
      <mesh>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Label sprite */}
      <sprite position={[0, size * 2, 0]} scale={[0.3, 0.12, 1]}>
        <spriteMaterial map={texture} transparent opacity={0.8} depthTest={false} />
      </sprite>
    </group>
  );
}

interface CelestialObjectsProps {
  events: Event[];
}

/**
 * Renders planets and asteroids as celestial markers in the sky map.
 */
export function CelestialObjects({ events }: CelestialObjectsProps) {
  const celestialObjects = useMemo(() => {
    return events.map((event) => {
      let position;
      let color;
      let size;

      if (event.type === 'planet' && event.data && 'altitude' in event.data) {
        // Planet positioning using alt/az from planets collector
        const { altitude, azimuth } = event.data as {
          altitude: number;
          azimuth: number;
        };
        position = altAzToVector3(altitude as number, azimuth as number, PLANET_RADIUS);
        color = PLANET_COLOR;
        size = 0.3;
      } else if (event.type === 'asteroid') {
        // Asteroids: deterministic placement based on event id so items remain visible
        const idStr = event.id || `${event.timestamp || Date.now()}`;
        // Simple hash -> deterministic pseudo-random angles
        let hash = 0;
        for (let i = 0; i < idStr.length; i++) {
          hash = (hash << 5) - hash + idStr.charCodeAt(i);
          hash |= 0;
        }
        const theta = ((hash >>> 0) % 360) * (Math.PI / 180);
        const phi = (((hash >>> 3) % 60) + 15) * (Math.PI / 180); // keep within upper hemisphere
        position = altAzToVector3(
          (phi * 180) / Math.PI - 90,
          (theta * 180) / Math.PI,
          ASTEROID_RADIUS
        );
        color = ASTEROID_COLOR;
        size = 0.18;
      } else {
        return null;
      }

      return { event, position, color, size };
    });
  }, [events]);

  return (
    <group>
      {celestialObjects.map((obj) =>
        obj ? (
          <CelestialObject
            key={obj.event.id}
            event={obj.event}
            position={obj.position}
            color={obj.color}
            size={obj.size}
          />
        ) : null
      )}
    </group>
  );
}
