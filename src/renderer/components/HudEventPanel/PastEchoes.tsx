import { useMemo, useState } from 'react';
import type { Event, HistoricalCategory, HistoricalEvent } from '@shared/types';
import { getPastEchoes } from '../../historical/pastEchoes';

function formatYear(date: string): string {
  const match = /^-?\d+/.exec(date);
  return match ? match[0] : date;
}

type CategoryFilter = HistoricalCategory | 'all';

/** Fixed filter set per #166 — deliberately narrower than the full taxonomy. */
const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'disaster', label: 'DISASTERS' },
  { value: 'conflict', label: 'CONFLICT' },
  { value: 'transport', label: 'TRANSPORT' },
];

interface PastEchoesProps {
  event: Event;
  historicalEvents: HistoricalEvent[];
}

/**
 * Compact, collapsed-by-default historical context section (#165).
 * Surfaces curated "Past Echoes" matches for a selected live event without
 * competing with live signal — collapsed by default, clearly labeled as
 * historical context, never rendered for historical events themselves.
 *
 * Category filtering (#166) operates on the already sensitivity/density-capped
 * `matches` list, never on the unfiltered candidate pool — filtering narrows
 * what's shown, it never raises the visible item cap (#167).
 */
export function PastEchoes({ event, historicalEvents }: PastEchoesProps) {
  const [expanded, setExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const matches = useMemo(() => getPastEchoes(event, historicalEvents), [event, historicalEvents]);

  const visibleMatches = useMemo(
    () =>
      categoryFilter === 'all'
        ? matches
        : matches.filter(({ context }) => context.category === categoryFilter),
    [matches, categoryFilter]
  );

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
          <div
            className="flex gap-2 flex-wrap"
            role="group"
            aria-label="Filter past echoes by category"
          >
            {CATEGORY_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategoryFilter(value)}
                aria-pressed={categoryFilter === value}
                className={`ob-label px-1.5 py-0.5 border cursor-pointer ${
                  categoryFilter === value
                    ? 'border-ob-cyan text-ob-cyan'
                    : 'border-ob-border text-ob-text-dim'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleMatches.length === 0 ? (
            <div className="ob-label text-ob-text-dim opacity-60">NO MATCHES IN THIS CATEGORY</div>
          ) : (
            visibleMatches.map(({ context }) => (
              <div key={context.id} className="border-l border-ob-border pl-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="ob-label text-ob-amber">{formatYear(context.date)}</span>
                  <span className="ob-label text-ob-text-dim">
                    {context.category.toUpperCase()}
                  </span>
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
