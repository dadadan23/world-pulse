import type { Event, HistoricalContext, HistoricalEvent, QualityTier } from '@shared/types';
import { BaseCollector } from './base';
import { SHIPWRECKS } from './datasets/shipwrecks';
import { BATTLES } from './datasets/battles';

const DATASETS: HistoricalContext[] = [...SHIPWRECKS, ...BATTLES];

function isValidRecord(ctx: HistoricalContext): boolean {
  return (
    typeof ctx.id === 'string' &&
    ctx.id.trim() !== '' &&
    typeof ctx.location === 'object' &&
    ctx.location !== null &&
    typeof ctx.location.lat === 'number' &&
    Number.isFinite(ctx.location.lat) &&
    typeof ctx.location.lon === 'number' &&
    Number.isFinite(ctx.location.lon) &&
    typeof ctx.title === 'string' &&
    ctx.title.trim() !== '' &&
    typeof ctx.attribution === 'string' &&
    ctx.attribution.trim() !== '' &&
    typeof ctx.license === 'string' &&
    ctx.license.trim() !== ''
  );
}

function contextToEvent(ctx: HistoricalContext): HistoricalEvent {
  return {
    id: `historical_${ctx.id}`,
    timestamp: Date.now(),
    type: 'historical',
    source: ctx.attribution,
    location: ctx.location,
    severity: 1,
    title: ctx.title,
    description: ctx.summary,
    data: { context: ctx },
  };
}

/**
 * Historical geo-context collector (#160).
 *
 * Emits curated static records (shipwrecks, battles) as historical events.
 * Data is bundled at build time via TypeScript imports — no runtime I/O.
 * The collector fetches once and caches; the 24-hour interval is a scheduler
 * safeguard so BaseCollector's timer infrastructure stays satisfied.
 */
export class HistoricalCollector extends BaseCollector {
  public readonly qualityTier: QualityTier = 'supplementary';
  private cached: HistoricalEvent[] | null = null;

  constructor() {
    super('Historical Context', 'historical', 24 * 60 * 60 * 1000);
  }

  async fetch(): Promise<Event[]> {
    if (this.cached !== null) return this.cached;

    const seen = new Set<string>();
    const result: HistoricalEvent[] = [];

    for (const ctx of DATASETS) {
      if (!isValidRecord(ctx)) {
        console.warn(
          `[HistoricalCollector] Skipping record with poor geospatial quality: ${ctx.id ?? 'unknown'}`
        );
        continue;
      }
      if (seen.has(ctx.id)) {
        console.warn(`[HistoricalCollector] Duplicate id filtered: ${ctx.id}`);
        continue;
      }
      seen.add(ctx.id);
      result.push(contextToEvent(ctx));
    }

    this.cached = result;
    return result;
  }

  validate(data: unknown): boolean {
    return Array.isArray(data);
  }
}
