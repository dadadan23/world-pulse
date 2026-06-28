import { useAppStore } from '../../../store/useAppStore';
import type { AuroraEvent } from '@shared/types';
import { SegBar } from '../SegBar';

const KP_SEGMENTS = 9;

const STORM_COLOR: Record<AuroraEvent['data']['stormLevel'], 'success' | 'amber' | 'danger'> = {
  quiet: 'success',
  unsettled: 'amber',
  storm: 'amber',
  severe: 'danger',
};

/** Right column widget: aurora Kp index as a linear gauge. */
export function AuroraWidget() {
  const events = useAppStore((state) => state.events);
  const aurora = events.find((e): e is AuroraEvent => e.type === 'aurora');

  if (!aurora) return null;

  const { kpIndex, stormLevel } = aurora.data;
  const color = STORM_COLOR[stormLevel];

  return (
    <div className="ob-hud-panel">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ AURORA · KP INDEX</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`ob-label w-9 shrink-0 text-ob-${color}`}>KP{kpIndex.toFixed(0)}</span>
        <SegBar total={KP_SEGMENTS} filled={kpIndex} color={color} />
      </div>
      <div className="flex justify-end mt-1">
        <span className={`ob-label text-[9px] text-ob-${color}`}>{stormLevel.toUpperCase()}</span>
      </div>
    </div>
  );
}
