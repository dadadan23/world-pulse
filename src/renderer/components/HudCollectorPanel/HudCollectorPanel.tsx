import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import CollectorHealthBadge from '../CollectorHealthBadge/CollectorHealthBadge';
import StatusBadge from '../StatusBadge/StatusBadge';
import { hasUnseenSources, markSourcesSeen } from '../../sourceDirectory/seenSources';

function CollectorSummary({ total, healthy }: { total: number; healthy: number }) {
  if (healthy === total) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-ob-success animate-pulse" />
        <span className="ob-label text-ob-success">ALL SOURCES ACTIVE</span>
      </div>
    );
  }

  const badgeState = healthy === 0 ? 'critical' : 'warning';
  return (
    <div className="flex items-center justify-between">
      <span className="ob-label text-ob-text-dim">SOURCES ACTIVE</span>
      <StatusBadge state={badgeState}>
        {healthy}/{total}
      </StatusBadge>
    </div>
  );
}

/** Top-right HUD: data source / collector health badges + sky map / source directory toggles */
export function HudCollectorPanel() {
  const { serverStatus, skyMapOpen, setSkyMapOpen, sourceDirectoryOpen, setSourceDirectoryOpen } =
    useAppStore();

  const collectors = serverStatus?.collectors ?? [];
  const healthyCount = collectors.filter((c) => c.status === 'healthy').length;

  const collectorNames = collectors.map((c) => c.name);
  const [dismissed, setDismissed] = useState(false);
  const hasNewSources = !dismissed && collectorNames.length > 0 && hasUnseenSources(collectorNames);

  const openSourceDirectory = () => {
    const next = !sourceDirectoryOpen;
    setSourceDirectoryOpen(next);
    if (next) {
      markSourcesSeen(collectorNames);
      setDismissed(true);
    }
  };

  return (
    <div className="fixed top-5 right-5 z-20 w-[220px] flex flex-col gap-2">
      {/* Collector health panel */}
      <div className="ob-hud-panel">
        <div className="ob-label text-ob-text-dim tracking-ultrawide mb-3 pb-2 border-b border-ob-border">
          DATA SOURCES
        </div>
        {collectors.length === 0 ? (
          <div className="ob-label text-ob-text-dim">AWAITING...</div>
        ) : (
          <div className="flex flex-col gap-2">
            <CollectorSummary total={collectors.length} healthy={healthyCount} />
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-ob-border">
              {collectors.map((c) => (
                <CollectorHealthBadge
                  key={c.name}
                  name={c.name}
                  status={c.status}
                  errorCount={c.errorCount}
                  isStale={c.isStale}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sky Map toggle */}
      <button
        onClick={() => setSkyMapOpen(!skyMapOpen)}
        className={`ob-hud-panel text-center ob-label tracking-ultrawide cursor-pointer transition-colors duration-150
          ${skyMapOpen ? 'text-ob-cyan border-ob-cyan/50' : 'text-ob-text-dim hover:text-ob-text'}`}
        style={{ padding: '8px 16px' }}
      >
        [ SKY MAP ]
      </button>

      {/* Source Directory toggle */}
      <button
        onClick={openSourceDirectory}
        className={`ob-hud-panel relative text-center ob-label tracking-ultrawide cursor-pointer transition-colors duration-150
          ${sourceDirectoryOpen ? 'text-ob-cyan border-ob-cyan/50' : 'text-ob-text-dim hover:text-ob-text'}`}
        style={{ padding: '8px 16px' }}
      >
        [ SOURCES ]
        {hasNewSources && (
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-ob-amber animate-pulse"
            title="New source available"
            aria-label="New source available"
          />
        )}
      </button>
    </div>
  );
}
