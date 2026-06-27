import { useAppStore } from '../../../store/useAppStore';
import type { EarthquakeEvent } from '@shared/types';
import { SegBar } from '../SegBar';
import { severityTier } from '../severityTier';

const SEGMENTS = 20;
const MAX_ROWS = 6;

/** Left column widget: recent earthquakes as magnitude segmented bars. */
export function SeismicWidget() {
  const events = useAppStore((state) => state.events);

  const quakes = events
    .filter((e): e is EarthquakeEvent => e.type === 'earthquake')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ROWS);

  if (quakes.length === 0) return null;

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ SEISMIC ACTIVITY</span>
      </div>
      <div className="flex flex-col gap-2">
        {quakes.map((quake) => {
          const magnitude = quake.data.magnitude;
          const tier = severityTier(quake.severity ?? magnitude);
          return (
            <div key={quake.id} className="flex items-center gap-2">
              <span className={`ob-label w-9 shrink-0 text-ob-${tier}`}>
                M{magnitude.toFixed(1)}
              </span>
              <SegBar total={SEGMENTS} filled={(magnitude / 10) * SEGMENTS} color={tier} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
