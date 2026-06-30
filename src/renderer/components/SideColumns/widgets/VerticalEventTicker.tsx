import { Fragment } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { formatRelativeTime } from '../../../utils/time';
import { getEventIndicator } from '../../../utils/eventIndicators';
import { isSelectedEvent } from '../../../utils/isSelectedEvent';
import type { Event } from '@shared/types';

const MAX_ROWS = 5;

interface VerticalEventTickerProps {
  headerLabel: string;
  /** Already filtered to the relevant event types and sorted by recency (most recent first). */
  events: Event[];
}

/**
 * Shared scrolling vertical feed used by GeologicTicker and NightSkyTicker: fixed ~5-row
 * viewport that loops via the `.animate-scroll-vertical` primitive once there's enough
 * content to actually scroll, click-to-select, and the consistent active-selection highlight.
 */
export function VerticalEventTicker({ headerLabel, events }: VerticalEventTickerProps) {
  const selectedEvent = useAppStore((state) => state.selectedEvent);
  const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);

  const rows = events.slice(0, MAX_ROWS);

  // Only loop the scroll animation (and duplicate rows) once there's enough
  // content to actually scroll through — otherwise a couple of rows just glitch in place.
  const shouldScroll = rows.length >= MAX_ROWS;
  const displayRows = shouldScroll ? [...rows, ...rows] : rows;

  return (
    <div className="ob-hud-panel ob-scanline">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-ob-border">
        <span className="ob-label text-ob-text-dim tracking-ultrawide">{headerLabel}</span>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-hidden" style={{ maxHeight: `${MAX_ROWS * 28}px` }}>
          <div className={`flex flex-col ${shouldScroll ? 'animate-scroll-vertical' : ''}`}>
            {displayRows.map((event, index) => {
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
