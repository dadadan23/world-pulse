import { Fragment } from 'react';
import { useAppStore } from '../../store/useAppStore';
import StatusBadge from '../StatusBadge/StatusBadge';
import { prioritizeTickerEvents } from '../../store/eventPrioritizer';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function getEventIndicator(type: string, severity?: number): { color: string; symbol: string } {
  // Color based on severity
  let color = 'text-ob-cyan';
  if (severity !== undefined) {
    if (severity >= 7) color = 'text-ob-danger';
    else if (severity >= 4) color = 'text-ob-amber';
  }

  // Symbol based on type
  const symbols: Record<string, string> = {
    earthquake: '\u25C6', // diamond
    weather: '\u25B2', // triangle
    news: '\u25A0', // square
    astronomy: '\u2605', // star
    volcano: '\u25B3', // triangle up (hollow)
    iss: '\u2302', // house/station
    aurora: '\u2248', // wavy lines
    asteroid: '\u2736', // six-pointed star
    planet: '\u25CB', // circle (hollow)
  };

  return { color, symbol: symbols[type] || '\u25CF' }; // default: circle
}

export function Ticker() {
  const { events, serverStatus } = useAppStore();

  // Prioritize by severity, recency, and type diversity
  const tickerEvents = prioritizeTickerEvents(events).slice(0, 10);
  const activeCollectors = serverStatus?.collectors.filter((c) => c.running).length || 0;

  return (
    <div className="ob-panel">
      {/* Scrolling ticker */}
      <div className="px-4 py-2 overflow-hidden border-b border-ob-border/50 ob-scanline">
        <div className="flex animate-scroll whitespace-nowrap text-sm gap-2 items-center">
          {tickerEvents.length > 0 ? (
            <>
              {[...tickerEvents, ...tickerEvents].map((event, index) => {
                const indicator = getEventIndicator(event.type, event.severity);
                return (
                  <Fragment key={`${event.id}-${index}`}>
                    <div className="inline-flex items-center gap-3 px-4 py-1 ob-panel bg-ob-bg-elevated/40 rounded">
                      <span className={`${indicator.color} text-[14px]`} aria-hidden>
                        {indicator.symbol}
                      </span>
                      <span className="text-ob-text text-[13px] truncate max-w-[36ch]">
                        {event.title}
                      </span>
                      <span className="ob-label text-ob-text-dim text-xs tabular-nums">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <span className="text-ob-border px-2">|</span>
                  </Fragment>
                );
              })}
            </>
          ) : (
            <span className="ob-label text-ob-text-dim">AWAITING EVENTS...</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 text-xs flex items-center gap-6 ob-panel-inner">
        {/* Sources */}
        <div className="flex items-center gap-2">
          <span className="ob-label text-ob-text-dim">SOURCES</span>
          <StatusBadge state={activeCollectors > 0 ? 'nominal' : 'warning'}>
            {activeCollectors}
          </StatusBadge>
        </div>

        <div className="h-3 w-px border-ob-border" />

        {/* Refresh interval */}
        <div className="flex items-center gap-2">
          <span className="ob-label text-ob-text-dim">INTERVAL</span>
          <span className="ob-value text-ob-text">5M</span>
        </div>

        <div className="h-3 w-px border-ob-border" />

        {/* Event count */}
        <div className="flex items-center gap-2">
          <span className="ob-label text-ob-text-dim">EVENTS</span>
          <StatusBadge state={events.length > 200 ? 'warning' : 'nominal'}>
            {events.length}
          </StatusBadge>
          <span className="ob-label text-ob-text-dim">(24H)</span>
        </div>

        {/* Version - right aligned */}
        <div className="ml-auto flex items-center gap-2">
          <span className="ob-label text-ob-text-dim">SYS</span>
          <span className="ob-label text-ob-text-dim">WORLD PULSE v0.2.0</span>
        </div>
      </div>
    </div>
  );
}
