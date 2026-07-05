import { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { StarField } from './StarField';
import { CelestialObjects } from './CelestialObjects';
import { HorizonRing } from './HorizonRing';
import { BrightStars } from './BrightStars';
import { ConstellationLines } from './ConstellationLines';
import { CoordinateGrid } from './CoordinateGrid';
import { EclipticLine } from './EclipticLine';

interface SkyMapProps {
  observerLat?: number;
  observerLon?: number;
}

export function SkyMap({ observerLat = 40, observerLon = 0 }: SkyMapProps) {
  const { events } = useAppStore();

  const [observerTime, setObserverTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setObserverTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const celestialEvents = useMemo(
    () => events.filter((e) => e.type === 'planet' || e.type === 'asteroid'),
    [events]
  );

  const utcLabel =
    `${observerTime.getUTCHours().toString().padStart(2, '0')}:` +
    `${observerTime.getUTCMinutes().toString().padStart(2, '0')} UTC`;

  return (
    <div className="ob-panel p-4 flex flex-col h-full">
      <div className="ob-panel-inner flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ob-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="ob-heading text-sm text-ob-text tracking-wide">SKY MAP</span>
            <span className="ob-label text-ob-cyan">[CELESTIAL]</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-ob-amber animate-pulse" />
            <span className="ob-label text-[9px] text-ob-text-dim tabular-nums">{utcLabel}</span>
          </div>
        </div>

        {/* 3D Sky Canvas */}
        <div className="flex-1 min-h-0 relative">
          <Canvas
            camera={{ position: [0, 0, 0.01], fov: 75 }}
            style={{ background: 'transparent' }}
            gl={{ antialias: true, alpha: true }}
          >
            <StarField />
            <CoordinateGrid />
            <EclipticLine
              observerLat={observerLat}
              observerLon={observerLon}
              observerTime={observerTime}
            />
            <BrightStars
              observerLat={observerLat}
              observerLon={observerLon}
              observerTime={observerTime}
            />
            <ConstellationLines
              observerLat={observerLat}
              observerLon={observerLon}
              observerTime={observerTime}
            />
            <CelestialObjects events={celestialEvents} />
            <HorizonRing observerLat={observerLat} />
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={0.1}
              maxDistance={10}
              zoomSpeed={0.5}
            />
          </Canvas>
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-ob-border flex items-center gap-4 text-[10px] flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white opacity-90" />
            <span className="ob-label text-ob-text-dim">STARS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-px bg-ob-cyan opacity-40" />
            <span className="ob-label text-ob-text-dim">CONSTELLATIONS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-px bg-ob-amber opacity-40" />
            <span className="ob-label text-ob-text-dim">ECLIPTIC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-ob-amber" />
            <span className="ob-label text-ob-text-dim">PLANETS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-ob-cyan" />
            <span className="ob-label text-ob-text-dim">ASTEROIDS</span>
          </div>
          <span className="ml-auto ob-label text-ob-text-dim tabular-nums">
            {celestialEvents.length} OBJECTS
          </span>
        </div>
      </div>
    </div>
  );
}
