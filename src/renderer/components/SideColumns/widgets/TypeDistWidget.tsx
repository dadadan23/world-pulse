import { useAppStore } from '../../../store/useAppStore';
import { getEventIndicator } from '../../../utils/eventIndicators';
import { SegBar } from '../SegBar';
import { severityTier } from '../severityTier';

const SEGMENTS = 20;

/** Left column widget: event counts grouped by type, sorted by volume. */
export function TypeDistWidget() {
  const events = useAppStore((state) => state.events);

  if (events.length === 0) return null;

  const groups = new Map<string, { count: number; severitySum: number; severityCount: number }>();
  for (const event of events) {
    const group = groups.get(event.type) ?? { count: 0, severitySum: 0, severityCount: 0 };
    group.count += 1;
    if (event.severity !== undefined) {
      group.severitySum += event.severity;
      group.severityCount += 1;
    }
    groups.set(event.type, group);
  }

  const rows = Array.from(groups.entries())
    .map(([type, { count, severitySum, severityCount }]) => ({
      type,
      count,
      avgSeverity: severityCount > 0 ? severitySum / severityCount : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ BY TYPE</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ type, count, avgSeverity }) => {
          const tier = severityTier(avgSeverity);
          const { symbol } = getEventIndicator(type);
          return (
            <div key={type} className="flex items-center gap-2">
              <span className="ob-label w-4 shrink-0 text-center">{symbol}</span>
              <SegBar total={SEGMENTS} filled={(count / maxCount) * SEGMENTS} color={tier} />
              <span className="ob-label w-5 shrink-0 text-right text-ob-text-dim">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
