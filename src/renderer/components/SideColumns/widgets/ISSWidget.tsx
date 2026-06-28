import { useAppStore } from '../../../store/useAppStore';
import type { ISSEvent } from '@shared/types';

const ALT_MIN = 380;
const ALT_MAX = 430;
const GAUGE_SIZE = 72;
const RADIUS = 30;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Right column widget: ISS altitude as an arc gauge plus velocity/visibility readout. */
export function ISSWidget() {
  const events = useAppStore((state) => state.events);
  const iss = events.find((e): e is ISSEvent => e.type === 'iss');

  if (!iss) return null;

  const { altitude, velocity, visibility } = iss.data;
  const fraction = Math.max(0, Math.min(1, (altitude - ALT_MIN) / (ALT_MAX - ALT_MIN)));
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const center = GAUGE_SIZE / 2;

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ ISS TELEMETRY</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="ob-arc-gauge" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
          <svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
            <circle
              className="ob-arc-gauge-track"
              cx={center}
              cy={center}
              r={RADIUS}
              strokeWidth={STROKE_WIDTH}
            />
            <circle
              className="ob-arc-gauge-fill"
              cx={center}
              cy={center}
              r={RADIUS}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="ob-arc-gauge-value text-xs">{Math.round(altitude)}km</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="ob-stat-readout">
            <span className="ob-stat-readout-value text-base">{Math.round(velocity)}</span>
            <span className="ob-stat-readout-unit">km/h</span>
          </div>
          <span
            className={`ob-label ${visibility === 'daylight' ? 'text-ob-amber' : 'text-ob-text-dim'}`}
          >
            ● {visibility === 'daylight' ? 'DAYLIGHT' : 'ECLIPSED'}
          </span>
        </div>
      </div>
    </div>
  );
}
