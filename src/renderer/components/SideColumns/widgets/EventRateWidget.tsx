/* eslint-disable react-hooks/purity -- Date.now() anchors the rolling 24h bucket window against real time */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../../../store/useAppStore';

const BUCKET_COUNT = 24;
const BUCKET_MS = 60 * 60 * 1000;
const WIDTH = 180;
const HEIGHT = 50;
const PADDING_TOP = 6;
const PADDING_BOTTOM = 6;
// Generous upper bound on the polyline's geometric length within the WIDTH x HEIGHT
// viewBox, used as the dash length for the "draw-in" reveal animation.
const SPARKLINE_DASH_LENGTH = 400;

/** Left column widget: event volume over the last 24h as an hourly sparkline. */
export function EventRateWidget() {
  const events = useAppStore((state) => state.events);

  const buckets = useMemo(() => {
    const now = Date.now();
    const counts = new Array(BUCKET_COUNT).fill(0) as number[];
    for (const event of events) {
      const age = now - event.timestamp;
      if (age < 0 || age >= BUCKET_COUNT * BUCKET_MS) continue;
      const bucketsAgo = Math.floor(age / BUCKET_MS);
      counts[BUCKET_COUNT - 1 - bucketsAgo] += 1;
    }
    return counts;
  }, [events]);

  if (events.length === 0) return null;

  const max = Math.max(...buckets, 1);
  const points = buckets
    .map((count, i) => {
      const x = (i / (BUCKET_COUNT - 1)) * WIDTH;
      const y = HEIGHT - PADDING_BOTTOM - (count / max) * (HEIGHT - PADDING_TOP - PADDING_BOTTOM);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const sparklineStyle = { '--ob-sparkline-length': SPARKLINE_DASH_LENGTH } as CSSProperties;

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ EVENT RATE / 24H</span>
      </div>
      <svg className="ob-sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} height={HEIGHT}>
        <line
          x1={0}
          y1={HEIGHT * 0.25}
          x2={WIDTH}
          y2={HEIGHT * 0.25}
          className="ob-sparkline-grid"
        />
        <line x1={0} y1={HEIGHT * 0.5} x2={WIDTH} y2={HEIGHT * 0.5} className="ob-sparkline-grid" />
        <line
          x1={0}
          y1={HEIGHT * 0.75}
          x2={WIDTH}
          y2={HEIGHT * 0.75}
          className="ob-sparkline-grid"
        />
        <polyline
          className="ob-sparkline-path"
          points={points}
          strokeDasharray={SPARKLINE_DASH_LENGTH}
          style={sparklineStyle}
        />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="ob-label text-[9px]">-24H</span>
        <span className="ob-label text-[9px]">NOW</span>
      </div>
    </div>
  );
}
