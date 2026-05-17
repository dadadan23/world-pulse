import { useAppStore } from '../../store/useAppStore';
import CollectorHealthBadge from '../CollectorHealthBadge/CollectorHealthBadge';
import StatusBadge from '../StatusBadge/StatusBadge';

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

/** Top-right HUD: data source / collector health badges + sky map toggle */
export function HudCollectorPanel() {
  const { serverStatus, skyMapOpen, setSkyMapOpen } = useAppStore();

  const collectors = serverStatus?.collectors ?? [];
  const healthyCount = collectors.filter((c) => c.status === 'healthy').length;
  const allHealthy = collectors.length > 0 && healthyCount === collectors.length;

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
            {!allHealthy && (
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-ob-border">
                {collectors.map((c) => (
                  <CollectorHealthBadge
                    key={c.name}
                    name={c.name}
                    status={c.status}
                    errorCount={c.errorCount}
                  />
                ))}
              </div>
            )}
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
    </div>
  );
}
