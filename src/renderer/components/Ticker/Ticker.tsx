import { Fragment } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { prioritizeTickerEvents } from '../../store/eventPrioritizer';
import { formatRelativeTime } from '../../utils/time';

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
  const { events } = useAppStore();

  // Prioritize by severity, recency, and type diversity
  const tickerEvents = prioritizeTickerEvents(events).slice(0, 10);

  return (
    <div
      className="px-4 py-2 overflow-hidden ob-scanline"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(10,10,15,0.75)' }}
    >
      <div className="flex animate-scroll whitespace-nowrap text-sm gap-2 items-center h-9">
        {tickerEvents.length > 0 ? (
          <>
            {[...tickerEvents, ...tickerEvents].map((event, index) => {
              const indicator = getEventIndicator(event.type, event.severity);
              return (
                <Fragment key={`${event.id}-${index}`}>
                  <div className="inline-flex items-center gap-3 px-4 py-1 bg-ob-bg-elevated/40 rounded">
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
          <span className="ob-label text-ob-cyan">NO ACTIVE EVENTS</span>
        )}
      </div>
    </div>
  );
}
