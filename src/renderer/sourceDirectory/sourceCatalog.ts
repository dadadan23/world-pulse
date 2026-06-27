import type { CollectorHealth, CollectorHealthStatus, EventType, QualityTier } from '@shared/types';

/**
 * Static identity metadata for each registered data source.
 *
 * `collectorName` must match the human-readable name a collector passes to
 * `BaseCollector`'s constructor (see `src/server/collectors/*.ts`) — that's
 * the only field the client receives via `CollectorHealth` to join live
 * status against. This is duplicated rather than fetched because the
 * server's `/api/status` endpoint only exposes operational health, not
 * source identity (description, source URL, visualization mapping) — see
 * `docs/extensions/AUTHORING_GUIDE.md` for the registration contract new
 * sources should follow.
 */
export interface SourceCatalogEntry {
  collectorName: string;
  eventType: EventType;
  displayName: string;
  description: string;
  sourceUrl?: string;
  /** Human label for how this source's events are visualized on the globe/HUD. */
  visualizationIdentity: string;
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  {
    collectorName: 'USGS Earthquakes',
    eventType: 'earthquake',
    displayName: 'USGS Earthquake Hazards',
    description: 'Real-time earthquake data from the USGS Earthquake Hazards Program.',
    sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
    visualizationIdentity: 'Globe marker, sized and colored by magnitude',
  },
  {
    collectorName: 'ISS Tracker',
    eventType: 'iss',
    displayName: 'ISS Tracker',
    description: 'Real-time International Space Station position.',
    sourceUrl: 'http://api.open-notify.org/iss-now.json',
    visualizationIdentity: 'Live-tracked orbit marker on the globe',
  },
  {
    collectorName: 'Aurora/Space Weather',
    eventType: 'aurora',
    displayName: 'NOAA Aurora Forecast',
    description: 'Aurora borealis activity from NOAA Space Weather Prediction Center.',
    sourceUrl: 'https://services.swpc.noaa.gov/',
    visualizationIdentity: 'Polar glow overlay on the globe',
  },
  {
    collectorName: 'Near-Earth Asteroids',
    eventType: 'asteroid',
    displayName: 'NASA Near-Earth Objects',
    description: 'Near-Earth asteroid close-approach data from NASA JPL.',
    sourceUrl: 'https://api.nasa.gov/neo/rest/v1/feed',
    visualizationIdentity: 'Close-approach marker in the Sky Map',
  },
  {
    collectorName: 'USGS Volcanoes',
    eventType: 'volcano',
    displayName: 'Volcano Discovery',
    description: 'Active volcano eruption reports.',
    sourceUrl: 'https://www.volcanodiscovery.com/',
    visualizationIdentity: 'Globe marker with eruption-severity glow',
  },
  {
    collectorName: 'Planet Visibility',
    eventType: 'planet',
    displayName: 'Planet Visibility',
    description: 'Nightly visibility data for planets observable from Earth.',
    visualizationIdentity: 'Visibility marker in the Sky Map',
  },
  {
    collectorName: 'Local Weather',
    eventType: 'weather',
    displayName: 'OpenWeatherMap',
    description: 'Current conditions and forecast from OpenWeatherMap.',
    sourceUrl: 'https://openweathermap.org/',
    visualizationIdentity: 'HUD weather widget + globe marker',
  },
  {
    collectorName: 'Historical Context',
    eventType: 'historical',
    displayName: 'Historical Geo-Context',
    description: 'Curated historical events (shipwrecks, battles) for globe enrichment.',
    visualizationIdentity: 'Past Echoes panel on selected events',
  },
];

/** Stable, sorted snapshot of every source's identity — used to detect newly-added sources. */
export const ALL_SOURCE_IDS: readonly string[] = SOURCE_CATALOG.map((s) => s.collectorName).sort();

export interface SourceDirectoryEntry extends SourceCatalogEntry {
  /** 'unknown' when the server hasn't reported this source yet. */
  status: CollectorHealthStatus | 'unknown';
  qualityTier: QualityTier | null;
  cadenceLabel: string;
  errorCount: number;
  isStale: boolean;
}

/** Formats a poll interval as a short human-readable cadence, e.g. "Every 5 min". */
export function formatCadence(intervalMs: number): string {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return 'Unknown';
  const seconds = intervalMs / 1000;
  if (seconds < 60) return `Every ${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `Every ${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `Every ${Math.round(hours)}h`;
  return `Every ${Math.round(hours / 24)}d`;
}

/**
 * Joins the static catalog with live collector health by `collectorName`.
 * Sources with no matching live entry are surfaced with status 'unknown'
 * rather than omitted, so the directory stays complete even on first paint.
 */
export function buildSourceDirectory(collectors: CollectorHealth[]): SourceDirectoryEntry[] {
  const byName = new Map(collectors.map((c) => [c.name, c]));

  return SOURCE_CATALOG.map((entry) => {
    const live = byName.get(entry.collectorName);
    return {
      ...entry,
      status: live?.status ?? 'unknown',
      qualityTier: live?.qualityTier ?? null,
      cadenceLabel: live ? formatCadence(live.intervalMs) : 'Unknown',
      errorCount: live?.errorCount ?? 0,
      isStale: live?.isStale ?? false,
    };
  });
}
