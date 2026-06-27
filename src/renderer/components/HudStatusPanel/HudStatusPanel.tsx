import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';

function formatUTC(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

function formatCoord(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return '--';
  const latStr = lat >= 0 ? `${lat.toFixed(2)}N` : `${Math.abs(lat).toFixed(2)}S`;
  const lonStr = lon >= 0 ? `${lon.toFixed(2)}E` : `${Math.abs(lon).toFixed(2)}W`;
  return `${latStr} ${lonStr}`;
}

/** Top-left HUD: system status, UTC clock, event count, user location */
export function HudStatusPanel() {
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const events = useAppStore((state) => state.events);
  const userLat = useAppStore((state) => state.userLat);
  const userLon = useAppStore((state) => state.userLon);
  const geolocationStatus = useAppStore((state) => state.geolocationStatus);
  const placeName = useReverseGeocode(userLat, userLon);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusConfig = {
    connected: { label: 'LIVE', cls: 'ob-status-nominal ob-text-glow' },
    connecting: { label: 'CONNECTING', cls: 'text-ob-warning' },
    disconnected: { label: 'OFFLINE', cls: 'text-ob-danger' },
    error: { label: 'ERROR', cls: 'text-ob-danger' },
    'dormant-reconnecting': { label: 'RECONNECTING', cls: 'text-ob-warning' },
  } as const;

  const status = statusConfig[connectionStatus] ?? { label: 'UNKNOWN', cls: 'text-ob-warning' };

  return (
    <div className="fixed top-5 left-5 z-20 w-[270px] ob-hud-panel">
      {/* Logo row */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-ob-border">
        <div className="w-2 h-2 bg-ob-cyan ob-glow" />
        <span className="ob-heading text-ob-cyan tracking-ultrawide text-[13px]">WORLD PULSE</span>
      </div>

      {/* Status rows */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="ob-label text-ob-text-dim">STATUS</span>
          <span data-testid="connection-status" className={`ob-label font-medium ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="ob-label text-ob-text-dim">UTC</span>
          <span className="ob-label text-ob-text tabular-nums font-medium">{formatUTC(time)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="ob-label text-ob-text-dim">EVENTS</span>
          <span className="ob-label text-ob-cyan font-medium">{events.length}</span>
        </div>
        {geolocationStatus !== 'pending' && (
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <span className="ob-label text-ob-text-dim">LOCATION</span>
              <span className="ob-label text-ob-text-dim tabular-nums">
                {formatCoord(userLat, userLon)}
              </span>
            </div>
            {placeName && (
              <div className="flex justify-end">
                <span className="ob-label text-ob-cyan text-right">{placeName}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
