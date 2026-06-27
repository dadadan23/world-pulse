import { useAppStore } from '../../../store/useAppStore';
import type { AsteroidEvent } from '@shared/types';
import { SegBar } from '../SegBar';

const SEGMENTS = 20;
const MAX_ROWS = 3;
const LUNAR_DISTANCE_KM = 384400;
const DISTANCE_SCALE = 10 * LUNAR_DISTANCE_KM;

/** Right column widget: nearest asteroids by miss distance. */
export function AsteroidWidget() {
  const events = useAppStore((state) => state.events);

  const asteroids = events
    .filter((e): e is AsteroidEvent => e.type === 'asteroid')
    .sort((a, b) => a.data.missDistance - b.data.missDistance)
    .slice(0, MAX_ROWS);

  if (asteroids.length === 0) return null;

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ ASTEROID PROX</span>
      </div>
      <div className="flex flex-col gap-2">
        {asteroids.map((asteroid) => {
          const { name, missDistance, hazardous } = asteroid.data;
          const fraction = Math.min(1, missDistance / DISTANCE_SCALE);
          const color = hazardous ? 'danger' : 'cyan';
          const lunarDistances = missDistance / LUNAR_DISTANCE_KM;
          return (
            <div key={asteroid.id} className="flex items-center gap-2">
              <span className={`ob-label w-4 shrink-0 ${hazardous ? 'text-ob-danger' : ''}`}>
                {hazardous ? '⚠' : ''}
              </span>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="ob-label truncate" title={name}>
                  {name}
                </span>
                <SegBar total={SEGMENTS} filled={fraction * SEGMENTS} color={color} />
              </div>
              <span className="ob-label w-10 shrink-0 text-right text-ob-text-dim">
                {lunarDistances.toFixed(1)}LD
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
