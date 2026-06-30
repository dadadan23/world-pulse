import { Fragment } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { formatRelativeTime } from '../../../utils/time';
import { getEventIndicator } from '../../../utils/eventIndicators';
import { isSelectedEvent } from '../../../utils/isSelectedEvent';

const MAX_ROWS = 5;
const NIGHT_SKY_TYPES = new Set(['iss', 'aurora', 'asteroid', 'planet']);

/** Right column widget: scrolling feed of recent ISS, aurora, asteroid, and planet events. */
export function NightSkyTicker() {
  const events = useAppStore((state) => state.events);
  const selectedEvent = useAppStore((state) => state.selectedEvent);
  const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);

  const nightSkyEvents = events
    .filter((e) => NIGHT_SKY_TYPES.has(e.type))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ROWS);

  return (
    <div className="ob-hud-panel ob-scanline">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">◆ NIGHT SKY</span>
      </div>
      {nightSkyEvents.length > 0 ? (
        <div className="overflow-hidden" style={{ maxHeight: `${MAX_ROWS * 28}px` }}>
          <div className="flex flex-col animate-scroll-vertical">
            {[...nightSkyEvents, ...nightSkyEvents].map((event, index) => {
              const indicator = getEventIndicator(event.type, event.severity);
              const isSelected = isSelectedEvent(event, selectedEvent);
              return (
                <Fragment key={`${event.id}-${index}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className={`flex items-center gap-2 py-1.5 px-1 text-left cursor-pointer transition-colors duration-150 hover:bg-ob-cyan/5 ${
                      isSelected ? 'bg-ob-cyan/10' : ''
                    }`}
                    style={
                      isSelected ? { boxShadow: 'inset 0 0 8px var(--ob-glow-cyan)' } : undefined
                    }
                  >
                    <span className={`${indicator.color} text-[12px] shrink-0`} aria-hidden>
                      {indicator.symbol}
                    </span>
                    <span className="ob-label truncate flex-1 min-w-0">{event.title}</span>
                    <span className="ob-label text-ob-text-dim tabular-nums shrink-0">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <span className="ob-label text-ob-cyan">NO ACTIVE EVENTS</span>
      )}
    </div>
  );
}
