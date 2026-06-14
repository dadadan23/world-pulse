/**
 * Shared types used across frontend, backend, and Electron layers
 */

/**
 * Base event type for all data sources
 */
export interface Event {
  id: string;
  timestamp: number; // Unix timestamp in ms
  type: EventType;
  source: string; // Human-readable data source name (e.g. 'USGS Earthquake Hazards Program')
  location: GeoLocation | null;
  severity?: number; // 0-10 scale for visualization
  title: string;
  description?: string;
  data: Record<string, unknown>; // Source-specific data
}

/**
 * Source-level metadata for a data collector
 */
export interface CollectorMeta {
  name: string; // Collector identifier (e.g. 'earthquakes')
  source: string; // Human-readable data source name
  type: EventType;
  url?: string; // API or data source URL
}

/**
 * Connection status for WebSocket lifecycle, including dormant-reconnecting phase.
 * Exported from shared types so frontend and backend use identical values.
 */
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'dormant-reconnecting';

/**
 * Named severity levels for events, ordered from highest to lowest.
 * Maps to the numeric 0-10 severity scale used on the Event interface.
 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Canonical numeric value for each named severity level (0-10 scale).
 * Use these constants when creating events or comparing against Event.severity
 * rather than using raw numbers, so that prioritization thresholds stay
 * consistent across the codebase.
 *
 * Example: `{ severity: SEVERITY_LEVELS.critical }` produces severity 9.
 */
export const SEVERITY_LEVELS: Record<SeverityLevel, number> = {
  critical: 9,
  high: 7,
  medium: 5,
  low: 3,
  info: 1,
};

export type EventType =
  | 'earthquake'
  | 'weather'
  | 'news'
  | 'astronomy'
  | 'volcano'
  | 'iss'
  | 'aurora'
  | 'asteroid'
  | 'planet'
  | 'music'
  | 'ocean'
  | 'calendar'
  | 'historical';

export interface GeoLocation {
  lat: number;
  lon: number;
  name?: string; // City/region name
}

/**
 * A single day's forecast summary
 */
export interface ForecastDay {
  date: string; // ISO date string 'YYYY-MM-DD'
  tempHigh: number; // Celsius
  tempLow: number; // Celsius
  condition: string; // e.g. 'Rain', 'Clear'
  conditionCode: number; // OpenWeatherMap weather code
  precipitation: number; // mm total for the day
  windSpeed: number; // m/s
}

/**
 * Weather-specific event data
 */
export interface WeatherEvent extends Event {
  type: 'weather';
  data: {
    temperature: number; // Celsius
    feelsLike: number; // Celsius
    condition: string; // 'Clear', 'Rain', 'Thunderstorm', etc.
    conditionCode: number; // OpenWeatherMap weather code
    windSpeed: number; // m/s
    humidity: number; // percentage
    pressure: number; // hPa
    visibility: number; // meters
    locationName: string; // resolved city name
    forecast: ForecastDay[];
  };
}

/**
 * Earthquake-specific event data
 */
export interface EarthquakeEvent extends Event {
  type: 'earthquake';
  data: {
    magnitude: number;
    depth: number; // km
    region: string;
  };
}

/**
 * News-specific event data
 */
export interface NewsEvent extends Event {
  type: 'news';
  data: {
    headline: string;
    publisher: string;
    url: string;
    sentiment: number; // -1 to 1 (negative to positive)
    category: string;
  };
}

/**
 * Volcano-specific event data
 */
export interface VolcanoEvent extends Event {
  type: 'volcano';
  data: {
    volcanoName: string;
    alertLevel: 'normal' | 'advisory' | 'watch' | 'warning';
    colorCode: 'green' | 'yellow' | 'orange' | 'red';
  };
}

/**
 * ISS position event data
 */
export interface ISSEvent extends Event {
  type: 'iss';
  data: {
    altitude: number; // km
    velocity: number; // km/h
    visibility: 'daylight' | 'eclipsed';
  };
}

/**
 * Aurora/Space Weather event data
 */
export interface AuroraEvent extends Event {
  type: 'aurora';
  data: {
    kpIndex: number; // 0-9
    stormLevel: 'quiet' | 'unsettled' | 'storm' | 'severe';
    hemisphere: 'north' | 'south' | 'both';
  };
}

/**
 * Near-Earth Asteroid event data
 */
export interface AsteroidEvent extends Event {
  type: 'asteroid';
  data: {
    name: string;
    diameterMin: number; // meters
    diameterMax: number; // meters
    velocity: number; // km/h
    missDistance: number; // km
    hazardous: boolean;
    approachDate: string;
  };
}

/**
 * Planet visibility event data
 */
export interface PlanetEvent extends Event {
  type: 'planet';
  data: {
    planetName: string;
    constellation: string;
    magnitude: number; // apparent brightness
    altitude: number; // degrees above horizon
    azimuth: number; // compass direction
    riseTime: string;
    setTime: string;
    phase?: number; // for Moon, 0-1
  };
}

/**
 * Data collector plugin interface
 */
export interface DataCollector {
  name: string;
  type: EventType;
  interval: number; // ms between fetches
  enabled: boolean;
  fetch(): Promise<Event[]>;
  validate(data: unknown): boolean;
}

/**
 * Collector health status for API responses
 */
export type CollectorHealthStatus = 'healthy' | 'degraded' | 'disabled';

/**
 * Quality tier for data collectors.
 * Primary collectors provide core event data; supplementary collectors enrich the display.
 */
export type QualityTier = 'primary' | 'supplementary';

export interface CollectorHealth {
  name: string;
  status: CollectorHealthStatus;
  lastFetchAt: number | null;
  errorCount: number;
  isEnabled: boolean;
  qualityTier: QualityTier;
  intervalMs: number;
  isStale: boolean;
}

/**
 * Application state shape
 */
export interface AppState {
  events: Event[];
  selectedEvent: Event | null;
  activeCollectors: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * User settings
 */
export interface UserSettings {
  theme: 'dark' | 'light';
  enabledDataSources: EventType[];
  personalLocation: GeoLocation | null;
  updateInterval: number; // minutes
  notificationsEnabled: boolean;
}

/**
 * WebSocket message types
 */
export interface WSMessage {
  type: 'event' | 'update' | 'error' | 'ping';
  payload: Event | Event[] | string | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// #150 — Visualization Layer Extension Contract
// ---------------------------------------------------------------------------

/**
 * The render context provided to each visualization module's render function.
 * Modules receive this object and must not mutate shared Three.js state outside
 * their own scene objects.
 */
export interface VizRenderContext {
  /** Globe radius in scene units (always 1). */
  globeRadius: number;
  /** Current elapsed time in seconds (for animations). */
  elapsedTime: number;
  /** Whether the viewer prefers reduced motion. */
  prefersReducedMotion: boolean;
}

/**
 * Manifest for a visualization layer module.
 * Must be provided when registering with VizLayerRegistry.
 */
export interface VisualizationManifest {
  /** Unique stable identifier (kebab-case, e.g. 'earthquake-marker'). */
  id: string;
  /** Semantic version string (e.g. '1.0.0'). */
  version: string;
  /** Human-readable display name. */
  displayName: string;
  /** Event types this module knows how to render. */
  supportedEventTypes: EventType[];
  /**
   * Render order relative to other modules (lower renders first / further back).
   * Globe texture = 0; markers default to 10; overlays default to 20.
   */
  renderOrder: number;
  /** IDs of other visualization modules this module depends on being registered first. */
  dependencies?: string[];
  /** Whether this module is enabled by default. */
  enabledByDefault: boolean;
  /** Short description of what this module renders. */
  description?: string;
}

export type VizManifestValidationResult = { valid: true } | { valid: false; errors: string[] };

/**
 * Validate a VisualizationManifest.
 * Returns `{ valid: true }` or `{ valid: false, errors }`.
 */
export function validateVisualizationManifest(manifest: unknown): VizManifestValidationResult {
  if (typeof manifest !== 'object' || manifest === null) {
    return { valid: false, errors: ['manifest must be an object'] };
  }
  const m = manifest as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof m.id !== 'string' || m.id.trim() === '') errors.push('id must be a non-empty string');
  if (typeof m.version !== 'string' || m.version.trim() === '')
    errors.push('version must be a non-empty string');
  if (typeof m.displayName !== 'string' || m.displayName.trim() === '')
    errors.push('displayName must be a non-empty string');
  if (!Array.isArray(m.supportedEventTypes) || m.supportedEventTypes.length === 0)
    errors.push('supportedEventTypes must be a non-empty array');
  if (typeof m.renderOrder !== 'number' || !Number.isFinite(m.renderOrder))
    errors.push('renderOrder must be a finite number');
  if (typeof m.enabledByDefault !== 'boolean') errors.push('enabledByDefault must be a boolean');
  if (m.dependencies !== undefined && !Array.isArray(m.dependencies))
    errors.push('dependencies must be an array when provided');
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ---------------------------------------------------------------------------
// #159 — Historical Context Schema and Taxonomy
// ---------------------------------------------------------------------------

/**
 * Top-level taxonomy for historical context records.
 * 'other' is the escape hatch for entries that don't fit a primary category.
 */
export type HistoricalContextCategory =
  | 'disaster'
  | 'conflict'
  | 'transport'
  | 'exploration'
  | 'other';

/**
 * Sub-categories provide finer classification within a top-level category.
 * These are informational and do not affect suppression logic.
 */
export type HistoricalContextSubCategory =
  | 'shipwreck'
  | 'plane-crash'
  | 'earthquake'
  | 'volcano'
  | 'flood'
  | 'battle'
  | 'siege'
  | 'expedition'
  | 'discovery'
  | 'other';

/**
 * Source attribution and licensing for a historical context record.
 * Both fields are required — records without attribution must not be ingested.
 */
export interface HistoricalContextSource {
  /** Name of the dataset or institution (e.g. 'Wreck Site Database'). */
  name: string;
  /** SPDX license identifier or 'proprietary' (e.g. 'CC-BY-4.0'). */
  license: string;
  /** Canonical URL for the original data entry. */
  url?: string;
}

/**
 * A single historical context record, as stored and retrieved for enrichment.
 *
 * Design constraints:
 * - `confidence` 0–1: quality signal from the ingestion pipeline.
 *   Below the suppression threshold the record is never shown.
 * - `isSensitive` marks records requiring extra display care (e.g. recent conflicts,
 *   mass-casualty events). Sensitive records use stricter confidence gates.
 * - `era` is a human-readable period when a precise date is unavailable
 *   (e.g. 'Late Bronze Age', '14th century').
 */
export interface HistoricalContextRecord {
  /** Stable UUID for this record. */
  id: string;
  /** Short display title (max 120 chars). */
  title: string;
  /** Top-level category for matching and suppression logic. */
  category: HistoricalContextCategory;
  /** Optional sub-category for richer display and filtering. */
  subCategory?: HistoricalContextSubCategory;
  /** Geographic anchor for proximity matching. */
  location: GeoLocation;
  /** ISO 8601 date string when known (e.g. '1912-04-15'). */
  date?: string;
  /** Human-readable era/period when a precise date is unavailable. */
  era?: string;
  /** One-paragraph summary suitable for the Past Echoes panel (max 500 chars). */
  summary: string;
  /** Source attribution — required. */
  source: HistoricalContextSource;
  /** Ingestion confidence score (0–1). Records below threshold are suppressed. */
  confidence: number;
  /**
   * Whether this record requires extra sensitivity in display.
   * Sensitive records use stricter confidence thresholds and item caps.
   */
  isSensitive: boolean;
  /** Unix timestamp (ms) when this record was ingested. */
  ingestedAt: number;
}
