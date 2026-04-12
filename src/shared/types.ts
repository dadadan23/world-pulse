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

export interface CollectorHealth {
  name: string;
  status: CollectorHealthStatus;
  lastFetchAt: number | null;
  errorCount: number;
  isEnabled: boolean;
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
