import { Fragment } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useVisibleEvents } from '../../hooks/useVisibleEvents';
import { formatRelativeTime } from '../../utils/time';
import { getEventIndicator } from '../../utils/eventIndicators';
import { isSelectedEvent } from '../../utils/isSelectedEvent';
import { sortBySeverityThenRecency } from '../../utils/severityOrder';
import { SeverityPulseBadge } from '../SeverityPulseBadge/SeverityPulseBadge';
import type { Event, NewsEvent } from '@shared/types';

const MAX_HEADLINES = 10;

export function Ticker() {
  const events = useVisibleEvents();
  const selectedEvent = useAppStore((state) => state.selectedEvent);
  const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);
  const severityThreshold = useSettingsStore((state) => state.severityThreshold);

  const tickerEvents = sortBySeverityThenRecency(
    events.filter((e): e is NewsEvent => e.type === 'news'),
    severityThreshold
  ).slice(0, MAX_HEADLINES);

  const usingFallback = newsEvents.length === 0;
  const tickerEvents: Event[] = usingFallback
    ? sortBySeverityThenRecency(events).slice(0, MAX_HEADLINES)
    : newsEvents;

  return (
    <div
      className="border-t border-ob-border ob-scanline"
      style={{ backdropFilter: 'blur(10px) saturate(1.4)', background: 'rgba(10,10,15,0.82)' }}
    >
      <div className="flex overflow-hidden h-[42px]">
        {/* Fixed label */}
        <div className="flex-shrink-0 flex items-center px-4 border-r border-ob-border">
          <span className="ob-label text-ob-cyan tracking-ultrawide">LIVE FEED</span>
        </div>

        {/* Scrolling content */}
        <div className="flex-1 overflow-hidden flex items-center">
          <div className="flex animate-scroll whitespace-nowrap">
            {tickerEvents.length > 0 ? (
              <>
                {[...tickerEvents, ...tickerEvents].map((event, index) => {
                  const indicator = getEventIndicator(event.type, event.severity);
                  const isSelected = isSelectedEvent(event, selectedEvent);
                  const isLocal = event.data.scope === 'local';
                  const isHighSeverity = (event.severity ?? 0) >= severityThreshold;
                  return (
                    <Fragment key={`${event.id}-${index}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={`inline-flex items-center gap-2.5 px-6 border-r border-ob-border h-[42px] cursor-pointer transition-colors duration-150 hover:bg-ob-cyan/5 ${
                          isSelected ? 'bg-ob-cyan/10' : ''
                        }`}
                      >
                        <span className={`${indicator.color} text-[12px]`} aria-hidden>
                          {indicator.symbol}
                        </span>
                        {isHighSeverity && <SeverityPulseBadge severity={event.severity ?? 0} />}
                        {isNews && (
                          <span
                            className={`ob-label ${isLocal ? 'text-ob-amber' : 'text-ob-cyan'}`}
                          >
                            {isLocal ? '[NEAR YOU]' : '[GLOBAL]'}
                          </span>
                        )}
                        <span className="text-ob-text text-[11px] truncate max-w-[36ch]">
                          {event.title}
                        </span>
                        <span className="ob-label text-ob-text-dim tabular-nums">
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </button>
                    </Fragment>
                  );
                })}
              </>
            ) : (
              <span className="ob-label text-ob-cyan px-6">AWAITING DATA...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
