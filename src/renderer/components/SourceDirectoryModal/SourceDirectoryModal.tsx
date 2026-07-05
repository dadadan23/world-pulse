import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  buildSourceDirectory,
  type SourceDirectoryEntry,
} from '../../sourceDirectory/sourceCatalog';
import StatusBadge from '../StatusBadge/StatusBadge';

const BADGE_STATE: Record<
  SourceDirectoryEntry['status'],
  'nominal' | 'warning' | 'critical' | 'info'
> = {
  healthy: 'nominal',
  degraded: 'warning',
  disabled: 'critical',
  unconfigured: 'warning',
  unknown: 'info',
};

const STATUS_LABELS: Record<SourceDirectoryEntry['status'], string> = {
  healthy: 'LIVE',
  degraded: 'DEGRADED',
  disabled: 'DISABLED',
  unconfigured: 'KEY MISSING',
  unknown: 'UNKNOWN',
};

function SourceCard({ entry }: { entry: SourceDirectoryEntry }) {
  const showStale = entry.isStale && entry.status === 'healthy';
  const badgeState = showStale ? 'warning' : BADGE_STATE[entry.status];
  const label = showStale ? 'STALE' : STATUS_LABELS[entry.status];

  return (
    <div className="ob-panel-inner flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="ob-label text-ob-text tracking-wide">{entry.displayName}</span>
        <StatusBadge state={badgeState}>{label}</StatusBadge>
      </div>
      <p className="text-sm text-ob-text-dim leading-relaxed">{entry.description}</p>
      <div className="flex items-center justify-between text-xs text-ob-text-dim ob-label">
        <span>{entry.cadenceLabel}</span>
        <span>{entry.visualizationIdentity}</span>
      </div>
      {entry.sourceUrl && (
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ob-cyan hover:text-ob-cyan-dim transition-colors duration-150"
        >
          {entry.sourceUrl}
        </a>
      )}
    </div>
  );
}

/** Full-screen modal overlay listing every registered data source. Opened via HudCollectorPanel toggle. */
export function SourceDirectoryModal() {
  const sourceDirectoryOpen = useAppStore((state) => state.sourceDirectoryOpen);
  const setSourceDirectoryOpen = useAppStore((state) => state.setSourceDirectoryOpen);
  const serverStatus = useAppStore((state) => state.serverStatus);
  const collectors = serverStatus?.collectors ?? [];

  useEffect(() => {
    if (!sourceDirectoryOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSourceDirectoryOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sourceDirectoryOpen, setSourceDirectoryOpen]);

  if (!sourceDirectoryOpen) return null;

  const directory = buildSourceDirectory(collectors);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={() => setSourceDirectoryOpen(false)}
    >
      <div
        className="ob-hud-panel flex flex-col"
        style={{ width: '70vw', height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-directory-modal-title"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-ob-border">
          <span
            id="source-directory-modal-title"
            className="ob-heading text-ob-cyan tracking-ultrawide"
          >
            SOURCE DIRECTORY
          </span>
          <button
            onClick={() => setSourceDirectoryOpen(false)}
            className="ob-label text-ob-text-dim border border-ob-border px-3 py-1 hover:border-ob-border-active hover:text-ob-text transition-colors duration-150 cursor-pointer"
          >
            [ ESC ] CLOSE
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-3 pr-1">
          {directory.map((entry) => (
            <SourceCard key={entry.collectorName} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
