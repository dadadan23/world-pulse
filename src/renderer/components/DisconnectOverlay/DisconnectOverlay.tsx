import { useAppStore } from '../../store/useAppStore';

export function DisconnectOverlay() {
  const { connectionStatus } = useAppStore();

  const isDisconnected =
    connectionStatus === 'disconnected' ||
    connectionStatus === 'error' ||
    connectionStatus === 'dormant-reconnecting';

  if (!isDisconnected) return null;

  const message = connectionStatus === 'error' ? 'CONNECTION ERROR // RETRYING' : 'RECONNECTING';

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center motion-reduce:![animation:none]"
      role="alert"
      aria-live="assertive"
    >
      {/* Dim overlay on stale data */}
      <div className="absolute inset-0 bg-ob-bg-primary/40 transition-opacity duration-500" />

      {/* Banner */}
      <div className="relative mt-16 ob-panel px-6 py-3">
        <div className="ob-panel-inner flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full bg-ob-amber animate-pulse-slow motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="ob-label tracking-ultrawide">{message}</span>
        </div>
      </div>
    </div>
  );
}
