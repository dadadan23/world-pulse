import { useAppStore } from '../../store/useAppStore';

/** Top-right HUD: data source / collector health badges + sky map toggle */
export function HudCollectorPanel() {
  const { serverStatus, skyMapOpen, setSkyMapOpen } = useAppStore();

  const collectors = serverStatus?.collectors ?? [];

  return (
    <div className="fixed top-5 right-5 z-20 w-[220px] flex flex-col gap-2">
      {/* Collector badges panel */}
      <div className="ob-hud-panel">
        <div className="ob-label text-ob-text-dim tracking-ultrawide mb-3 pb-2 border-b border-ob-border">
          DATA SOURCES
        </div>
        {collectors.length === 0 ? (
          <div className="ob-label text-ob-text-dim">AWAITING...</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {collectors.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="ob-label text-ob-text">{c.name.toUpperCase()}</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      !c.isEnabled || c.status === 'disabled'
                        ? 'bg-ob-text-dim'
                        : c.status === 'healthy'
                          ? 'bg-ob-success animate-pulse'
                          : 'bg-ob-danger'
                    }`}
                  />
                  <span
                    className={`ob-label text-[9px] ${
                      !c.isEnabled || c.status === 'disabled'
                        ? 'text-ob-text-dim'
                        : c.status === 'healthy'
                          ? 'text-ob-success'
                          : 'text-ob-danger'
                    }`}
                  >
                    {!c.isEnabled || c.status === 'disabled'
                      ? 'OFF'
                      : c.status === 'healthy'
                        ? 'LIVE'
                        : 'ERR'}
                  </span>
                </div>
              </div>
            ))}
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
