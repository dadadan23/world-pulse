import { useMemo, useState } from 'react';
import type { Event, HistoricalEvent } from '@shared/types';
import { getPastEchoes } from '../../historical/pastEchoes';

function formatYear(date: string): string {
  const match = /^-?\d+/.exec(date);
  return match ? match[0] : date;
}

interface PastEchoesProps {
  event: Event;
  historicalEvents: HistoricalEvent[];
}

/**
 * Compact, collapsed-by-default historical context section (#165).
 * Surfaces curated "Past Echoes" matches for a selected live event without
 * competing with live signal — collapsed by default, clearly labeled as
 * historical context, never rendered for historical events themselves.
 */
export function PastEchoes({ event, historicalEvents }: PastEchoesProps) {
  const [expanded, setExpanded] = useState(false);

  const matches = useMemo(() => getPastEchoes(event, historicalEvents), [event, historicalEvents]);

  if (matches.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-ob-border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between cursor-pointer"
        aria-expanded={expanded}
      >
        <span className="ob-label text-ob-text-dim tracking-ultrawide">
          PAST ECHOES ({matches.length})
        </span>
        <span className="ob-label text-ob-cyan">{expanded ? '[ HIDE ]' : '[ SHOW ]'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 mt-3">
          {matches.map(({ context }) => (
            <div key={context.id} className="border-l border-ob-border pl-3">
              <div className="flex items-center justify-between gap-2">
                <span className="ob-label text-ob-amber">{formatYear(context.date)}</span>
                <span className="ob-label text-ob-text-dim">{context.category.toUpperCase()}</span>
              </div>
              <div className="text-ob-text text-[11px] font-medium leading-snug mt-1">
                {context.title}
              </div>
              {context.location.name && (
                <div className="ob-label text-ob-text-dim mt-0.5">{context.location.name}</div>
              )}
              <div className="text-ob-text-dim text-[11px] leading-relaxed mt-1">
                {context.summary}
              </div>
              <div className="ob-label text-ob-text-dim mt-1 opacity-60">HISTORICAL CONTEXT</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
