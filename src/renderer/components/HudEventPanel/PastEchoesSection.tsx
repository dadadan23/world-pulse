import { useState } from 'react';
import type { HistoricalContextRecord } from '@shared/types';

function extractYear(record: HistoricalContextRecord): string {
  if (record.date) {
    // Negative ISO dates represent BC years (e.g. '-0480-08-09')
    if (record.date.startsWith('-')) {
      return `${record.date.substring(1, 5)} BC`;
    }
    return record.date.substring(0, 4);
  }
  return record.era ?? '—';
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: 'TRANSPORT',
  conflict: 'CONFLICT',
  disaster: 'DISASTER',
  exploration: 'EXPLORATION',
  other: 'OTHER',
};

const CATEGORY_CLASSES: Record<string, string> = {
  transport: 'text-ob-cyan',
  conflict: 'text-ob-danger',
  disaster: 'text-ob-amber',
  exploration: 'text-ob-success',
  other: 'text-ob-text-dim',
};

interface PastEchoesSectionProps {
  records: HistoricalContextRecord[];
}

/**
 * Collapsible historical context section for the event detail panel.
 * Renders nothing when the records array is empty.
 */
export function PastEchoesSection({ records }: PastEchoesSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (records.length === 0) return null;

  const echoLabel = records.length === 1 ? 'ECHO' : 'ECHOES';

  return (
    <div className="mt-4 pt-3 border-t border-ob-border" data-testid="past-echoes-section">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="past-echoes-list"
      >
        <span className="ob-label text-ob-amber tracking-ultrawide">PAST ECHOES</span>
        <span className="ob-label text-ob-text-dim">
          {expanded ? '[ COLLAPSE ]' : `[ ${records.length} ${echoLabel} ]`}
        </span>
      </button>

      {expanded && (
        <ul
          id="past-echoes-list"
          className="mt-2 space-y-2"
          aria-label="Historical context records"
        >
          {records.map((record) => {
            const categoryLabel = CATEGORY_LABELS[record.category] ?? record.category.toUpperCase();
            const categoryClass = CATEGORY_CLASSES[record.category] ?? 'text-ob-text-dim';
            const year = extractYear(record);

            return (
              <li key={record.id} className="p-2 bg-ob-bg-elevated border border-ob-border">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="ob-label text-ob-text-dim" data-testid="echo-year">
                    {year}
                  </span>
                  <span className={`ob-label ${categoryClass}`} data-testid="echo-category">
                    {categoryLabel}
                  </span>
                  {record.location.name && (
                    <span className="ob-label text-ob-text-dim truncate">
                      {record.location.name}
                    </span>
                  )}
                </div>

                <div className="text-ob-text text-[11px] font-medium mb-1 leading-snug">
                  {record.title}
                </div>

                <div className="text-ob-text-dim text-[10px] leading-relaxed line-clamp-3">
                  {record.summary}
                </div>

                <div className="mt-1.5">
                  <span
                    className="ob-label opacity-50"
                    aria-label="This is historical context, not a live event"
                  >
                    HISTORICAL CONTEXT
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
