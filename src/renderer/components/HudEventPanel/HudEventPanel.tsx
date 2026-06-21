import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { Event, HistoricalEvent } from '@shared/types';
import EmptyState from '../EmptyState/EmptyState';
import { PastEchoes } from './PastEchoes';

const AUTO_CLOSE_MS = 8_000;

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function getSeverityLabel(severity?: number): string {
  if (!severity) return '--';
  if (severity >= 7) return `${severity.toFixed(1)} CRITICAL`;
  if (severity >= 4) return `${severity.toFixed(1)} MODERATE`;
  return `${severity.toFixed(1)} LOW`;
}

function getSeverityClass(severity?: number): string {
  if (!severity) return 'text-ob-text-dim';
  if (severity >= 7) return 'text-ob-danger';
  if (severity >= 4) return 'text-ob-amber';
  return 'text-ob-cyan';
}

function MetaRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-ob-border/40 last:border-0">
      <span className="ob-label text-ob-text-dim shrink-0">{label}</span>
      <span className={`ob-label text-right ${valueClass ?? 'text-ob-text'}`}>{value}</span>
    </div>
  );
}

interface HudEventDetailProps {
  event: Event;
  historicalEvents: HistoricalEvent[];
  onClose: () => void;
}

function HudEventDetail({ event, historicalEvents, onClose }: HudEventDetailProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [event.id, onClose]);

  const typeLabel = event.type.toUpperCase();
  const locationStr = event.location
    ? event.location.name || `${event.location.lat.toFixed(2)}, ${event.location.lon.toFixed(2)}`
    : '--';

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-ob-border">
        <span className="ob-label text-ob-amber tracking-ultrawide">{typeLabel} EVENT</span>
        <button
          onClick={onClose}
          className="ob-label text-ob-text-dim border border-ob-border px-2 py-0.5 hover:border-ob-border-active hover:text-ob-text transition-colors duration-150 cursor-pointer"
        >
          [ CLOSE ]
        </button>
      </div>

      {/* Event title */}
      <div className="text-ob-text font-medium text-sm mb-4 leading-snug">{event.title}</div>

      {/* Meta grid */}
      <div className="flex flex-col mb-4">
        <MetaRow label="REGION" value={locationStr} />
        <MetaRow label="TYPE" value={typeLabel} />
        {event.severity !== undefined && (
          <MetaRow
            label="SEVERITY"
            value={getSeverityLabel(event.severity)}
            valueClass={getSeverityClass(event.severity)}
          />
        )}
        <MetaRow label="DETECTED" value={formatRelativeTime(event.timestamp)} />
      </div>

      {/* Description */}
      {event.description && (
        <div className="text-ob-text-dim text-[11px] leading-relaxed border-t border-ob-border pt-3">
          {event.description}
        </div>
      )}

      {/* Severity bar */}
      {event.severity !== undefined && event.severity > 0 && (
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="ob-label text-ob-text-dim">INTENSITY</span>
            <span className={`ob-label ${getSeverityClass(event.severity)}`}>
              {event.severity.toFixed(1)} / 10
            </span>
          </div>
          <div className="h-[1px] bg-ob-border overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                event.severity >= 7
                  ? 'bg-ob-danger'
                  : event.severity >= 4
                    ? 'bg-ob-amber'
                    : 'bg-ob-cyan'
              }`}
              style={{ width: `${Math.min(event.severity * 10, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Past Echoes — historical context for live events */}
      <PastEchoes event={event} historicalEvents={historicalEvents} />
    </div>
  );
}

/**
 * Slide-in event detail panel, anchored right.
 * Shows EmptyState when no events available; otherwise renders selected event detail.
 * Auto-closes after 8 seconds when showing event details.
 */
export function HudEventPanel() {
  const selectedEvent = useAppStore((state) => state.selectedEvent);
  const events = useAppStore((state) => state.events);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);

  const historicalEvents = useMemo(
    () => events.filter((e): e is HistoricalEvent => e.type === 'historical'),
    [events]
  );

  const showEmptyState = events.length === 0 && connectionStatus === 'connected';
  const visible = selectedEvent !== null || showEmptyState;

  const handleClose = useCallback(() => setSelectedEvent(null), [setSelectedEvent]);

  return (
    <div
      className="fixed top-1/2 right-5 z-20 w-[310px] ob-hud-panel ob-transition-fade"
      style={{
        transform: visible
          ? 'translateY(-50%) translateX(0)'
          : 'translateY(-50%) translateX(340px)',
        opacity: visible ? 1 : 0,
      }}
    >
      {showEmptyState ? (
        <EmptyState />
      ) : (
        selectedEvent && (
          <HudEventDetail
            event={selectedEvent}
            historicalEvents={historicalEvents}
            onClose={handleClose}
          />
        )
      )}
    </div>
  );
}
