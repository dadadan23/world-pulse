import { useAppStore } from '../../store/useAppStore';

export function LoadingScreen() {
  const { connectionStatus, serverStatus } = useAppStore();

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'CONNECTING TO SERVER';
      case 'connected':
        return serverStatus?.ready ? 'LOADING DATA' : 'WAITING FOR COLLECTORS';
      case 'disconnected':
      case 'dormant-reconnecting':
        return 'RECONNECTING';
      case 'error':
        return 'CONNECTION ERROR // RETRYING';
    }
  };

  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'ob-status-nominal';
      case 'connecting':
      case 'dormant-reconnecting':
        return 'text-ob-cyan';
      case 'disconnected':
        return 'ob-status-warning';
      case 'error':
        return 'ob-status-critical';
    }
  };

  const activeCollectors = serverStatus?.collectors.filter((c) => c.running).length ?? 0;

  return (
    <div className="w-screen h-screen bg-ob-bg-primary flex items-center justify-center font-mono ob-dot-grid">
      <div className="ob-panel p-10 min-w-[360px]" role="status" aria-live="polite">
        <div className="ob-panel-inner">
          {/* Title */}
          <h1 className="ob-heading text-4xl text-center mb-2 ob-text-glow motion-reduce:![animation:none]">
            WORLD PULSE
          </h1>
          <div className="ob-label text-center mb-8">SYSTEM INITIALIZATION</div>

          {/* Pulse indicators */}
          <div className="flex justify-center gap-3 mb-8" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-ob-cyan rounded-full animate-pulse-slow motion-reduce:animate-none"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>

          {/* Status line */}
          <div className="ob-label text-center mb-6">{getStatusMessage()}</div>

          {/* Status indicators */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between px-2">
              <span className="ob-label">BACKEND</span>
              <span className={getStatusClass()}>
                {connectionStatus === 'connected' ? '[ONLINE]' : '[OFFLINE]'}
              </span>
            </div>
            {serverStatus && (
              <div className="flex items-center justify-between px-2">
                <span className="ob-label">COLLECTORS</span>
                <span className={activeCollectors > 0 ? 'ob-status-nominal' : 'ob-status-warning'}>
                  {activeCollectors} ACTIVE
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
