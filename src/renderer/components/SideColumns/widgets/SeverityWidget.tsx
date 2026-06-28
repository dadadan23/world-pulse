import { useAppStore } from '../../../store/useAppStore';
import { SegBar } from '../SegBar';

const SEGMENTS = 20;

type SeverityBucket = 'critical' | 'high' | 'moderate' | 'low';

const BUCKETS: {
  key: SeverityBucket;
  label: string;
  color: 'danger' | 'amber' | 'cyan' | 'success';
}[] = [
  { key: 'critical', label: 'CRITICAL', color: 'danger' },
  { key: 'high', label: 'HIGH', color: 'amber' },
  { key: 'moderate', label: 'MODERATE', color: 'cyan' },
  { key: 'low', label: 'LOW', color: 'success' },
];

function bucketFor(severity: number): SeverityBucket {
  if (severity >= 7) return 'critical';
  if (severity >= 5) return 'high';
  if (severity >= 3) return 'moderate';
  return 'low';
}

/** Left column widget: event severity distribution as a histogram. */
export function SeverityWidget() {
  const events = useAppStore((state) => state.events);

  const rated = events.filter(
    (e): e is typeof e & { severity: number } => e.severity !== undefined
  );
  if (rated.length === 0) return null;

  const counts: Record<SeverityBucket, number> = { critical: 0, high: 0, moderate: 0, low: 0 };
  for (const event of rated) {
    counts[bucketFor(event.severity)] += 1;
  }

  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ SEVERITY DIST</span>
      </div>
      <div className="flex flex-col gap-2">
        {BUCKETS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="ob-label w-16 shrink-0">{label}</span>
            <SegBar total={SEGMENTS} filled={(counts[key] / maxCount) * SEGMENTS} color={color} />
            <span className="ob-label w-5 shrink-0 text-right text-ob-text-dim">{counts[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
