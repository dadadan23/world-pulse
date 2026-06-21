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
// #147 - Collector module manifest schema
// ---------------------------------------------------------------------------

/**
 * Manifest for a collector module.
 * Must be provided when registering a collector with CollectorRegistry.
 */
export interface CollectorManifest {
  /** Unique stable identifier (snake_case, e.g. 'earthquakes'). */
  id: string;
  /** Semantic version string (e.g. '1.0.0'). */
  version: string;
  /** Human-readable display name used in logs and health UI. */
  displayName: string;
  /** Event types this collector can emit. */
  capabilities: EventType[];
  /** Quality tier - used for degraded-state prioritization. */
  qualityTier: QualityTier;
  /** Whether this collector should be started automatically. */
  enabledByDefault: boolean;
  /** Optional description of the upstream data source. */
  description?: string;
  /** Optional canonical URL for the upstream data source. */
  sourceUrl?: string;
  /** Names of environment variables that must be set for this collector to function. */
  requiredEnvVars?: string[];
}

export type ManifestValidationResult = { valid: true } | { valid: false; errors: string[] };

/**
 * Validate a collector manifest object.
 * Returns `{ valid: true }` or `{ valid: false, errors }`.
 * An invalid manifest causes the registry to reject registration safely.
 */
export function validateManifest(manifest: unknown): ManifestValidationResult {
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
  if (!Array.isArray(m.capabilities) || m.capabilities.length === 0)
    errors.push('capabilities must be a non-empty array');
  if (m.qualityTier !== 'primary' && m.qualityTier !== 'supplementary')
    errors.push('qualityTier must be "primary" or "supplementary"');
  if (typeof m.enabledByDefault !== 'boolean') errors.push('enabledByDefault must be a boolean');
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ---------------------------------------------------------------------------
// #149 - Normalized event payload validation
// ---------------------------------------------------------------------------

export type EventValidationResult =
  | { valid: true; event: Event }
  | { valid: false; reason: string };

/**
 * Validate that an unknown value conforms to the Event contract.
 * Invalid events are dropped at the registry boundary so downstream
 * consumers always receive well-formed payloads.
 */
export function validateEventPayload(payload: unknown): EventValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, reason: 'payload must be an object' };
  }
  const e = payload as Record<string, unknown>;
  if (typeof e.id !== 'string' || e.id.trim() === '')
    return { valid: false, reason: 'id must be a non-empty string' };
  if (typeof e.timestamp !== 'number' || !Number.isFinite(e.timestamp))
    return { valid: false, reason: 'timestamp must be a finite number' };
  if (typeof e.type !== 'string' || e.type.trim() === '')
    return { valid: false, reason: 'type must be a non-empty string' };
  if (typeof e.source !== 'string' || e.source.trim() === '')
    return { valid: false, reason: 'source must be a non-empty string' };
  if (typeof e.title !== 'string' || e.title.trim() === '')
    return { valid: false, reason: 'title must be a non-empty string' };
  if (e.location !== null && e.location !== undefined) {
    if (typeof e.location !== 'object' || Array.isArray(e.location))
      return { valid: false, reason: 'location must be an object or null' };
    const loc = e.location as Record<string, unknown>;
    if (typeof loc.lat !== 'number' || !Number.isFinite(loc.lat))
      return { valid: false, reason: 'location.lat must be a finite number' };
    if (typeof loc.lon !== 'number' || !Number.isFinite(loc.lon))
      return { valid: false, reason: 'location.lon must be a finite number' };
  }
  if (e.severity !== undefined) {
    if (
      typeof e.severity !== 'number' ||
      !Number.isFinite(e.severity) ||
      e.severity < 0 ||
      e.severity > 10
    )
      return { valid: false, reason: 'severity must be a number between 0 and 10' };
  }
  if (typeof e.data !== 'object' || e.data === null || Array.isArray(e.data))
    return { valid: false, reason: 'data must be a plain object' };
  return { valid: true, event: payload as Event };
}

// ---------------------------------------------------------------------------
// #150 - Visualization plugin manifest and registration API
// ---------------------------------------------------------------------------

/**
 * Render order tier for visualization layers.
 * Layers render bottom-to-top: base → overlay → hud.
 */
export type VisualizationLayerOrder = 'base' | 'overlay' | 'hud';

/**
 * Manifest for a visualization plugin module.
 * Must be provided when registering a plugin with VisualizationRegistry.
 */
export interface VisualizationManifest {
  /** Unique stable identifier (snake_case, e.g. 'earthquake_markers'). */
  id: string;
  /** Semantic version string (e.g. '1.0.0'). */
  version: string;
  /** Human-readable display name used in UI. */
  displayName: string;
  /** Event types this plugin can render. */
  supportedEventTypes: EventType[];
  /** Render layer order: base (globe surface) → overlay (above globe) → hud (screen-space). */
  renderOrder: VisualizationLayerOrder;
  /** Other plugin ids that must be initialized before this one. */
  dependencies?: string[];
  /** Optional description of what this plugin renders. */
  description?: string;
}

export type VisualizationManifestValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

/**
 * Validate a visualization plugin manifest.
 * Returns `{ valid: true }` or `{ valid: false, errors }`.
 * An invalid manifest causes the registry to reject registration safely.
 */
export function validateVisualizationManifest(
  manifest: unknown
): VisualizationManifestValidationResult {
  if (typeof manifest !== 'object' || manifest === null) {
    return { valid: false, errors: ['manifest must be an object'] };
  }
  const m = manifest as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof m.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(m.id))
    errors.push('id must be snake_case and start with a letter');
  if (typeof m.version !== 'string' || m.version.trim() === '')
    errors.push('version must be a non-empty string');
  if (typeof m.displayName !== 'string' || m.displayName.trim() === '')
    errors.push('displayName must be a non-empty string');
  if (!Array.isArray(m.supportedEventTypes) || m.supportedEventTypes.length === 0)
    errors.push('supportedEventTypes must be a non-empty array');
  if (m.renderOrder !== 'base' && m.renderOrder !== 'overlay' && m.renderOrder !== 'hud')
    errors.push('renderOrder must be "base", "overlay", or "hud"');
  if (m.dependencies !== undefined && !Array.isArray(m.dependencies))
    errors.push('dependencies must be an array if provided');
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

// ---------------------------------------------------------------------------
// #159 - Historical context schema and taxonomy
// ---------------------------------------------------------------------------

/**
 * Supported top-level categories for historical events.
 * New categories can be added here without breaking existing records.
 */
export type HistoricalCategory = 'disaster' | 'conflict' | 'transport' | 'exploration' | 'other';

/**
 * Confidence level for a historical record's geospatial and temporal data.
 * 'confirmed' = primary source; 'probable' = corroborated secondary; 'uncertain' = estimated.
 */
export type HistoricalConfidenceLevel = 'confirmed' | 'probable' | 'uncertain';

/**
 * Quality classification of the upstream data source for a historical record.
 */
export type HistoricalSourceQuality = 'high' | 'medium' | 'low';

/**
 * Core schema for a single historical geo-context record.
 * Designed as an open system: `meta` carries any category-specific extras.
 */
export interface HistoricalContext {
  /** Unique stable identifier for this record (e.g. 'wreck_titanic'). */
  id: string;
  /** Short display title. */
  title: string;
  /** Top-level category. */
  category: HistoricalCategory;
  /** Subcategory within the category (e.g. 'shipwreck', 'naval_battle'). */
  subcategory: string;
  /** Geospatial coordinates — required; records without location are filtered during ingestion. */
  location: GeoLocation;
  /**
   * ISO 8601 date or partial date string when the event occurred.
   * Partial dates are allowed: '1912', '1912-04', '1912-04-15'.
   */
  date: string;
  /** Human-readable era label (e.g. 'World War II', 'Age of Sail'). */
  era?: string;
  /** One-to-three sentence summary suitable for HUD display. */
  summary: string;
  /** Human-readable attribution: author, institution, or dataset name. */
  attribution: string;
  /** SPDX license identifier or 'Public Domain'. */
  license: string;
  /** Confidence in the geospatial and temporal accuracy of this record. */
  confidence: HistoricalConfidenceLevel;
  /** Quality of the upstream data source. */
  sourceQuality: HistoricalSourceQuality;
  /** URL for the upstream data source or record. */
  sourceUrl?: string;
  /** Category-specific extra fields. */
  meta?: Record<string, unknown>;
}

/**
 * Historical event as emitted by the historical collector.
 * Wraps HistoricalContext in the standard Event envelope so the globe
 * and event panel can handle it without special-casing.
 */
export interface HistoricalEvent extends Event {
  type: 'historical';
  data: {
    context: HistoricalContext;
  };
}
