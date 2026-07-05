/**
 * Shared OpenWeatherMap fetch/parse logic.
 * Used by both the WeatherCollector (ambient default location) and the
 * /api/weather REST endpoint (client- or event-selected location).
 */

import axios from 'axios';
import type { ForecastDay, WeatherEvent } from '@shared/types';

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

export interface OWMCurrentResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{ main: string; description: string; id: number }>;
  wind: { speed: number };
  visibility?: number;
  name: string;
  coord: { lat: number; lon: number };
  sys: { country: string };
}

export interface OWMForecastItem {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ main: string; id: number }>;
  wind: { speed: number };
  rain?: { '3h': number };
  dt_txt: string;
}

export interface OWMForecastResponse {
  list: OWMForecastItem[];
  city: { name: string; coord: { lat: number; lon: number }; country: string };
}

export function validateCurrentResponse(data: unknown): data is OWMCurrentResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.main === 'object' &&
    obj.main !== null &&
    Array.isArray(obj.weather) &&
    obj.weather.length > 0
  );
}

export function aggregateForecast(items: OWMForecastItem[]): ForecastDay[] {
  const byDate = new Map<string, OWMForecastItem[]>();
  for (const item of items) {
    const date = item.dt_txt.split(' ')[0];
    const bucket = byDate.get(date) ?? [];
    bucket.push(item);
    byDate.set(date, bucket);
  }

  const days: ForecastDay[] = [];
  for (const [date, bucket] of byDate) {
    const temps = bucket.map((i) => i.main.temp);
    // Prefer noon reading for representative condition; fall back to middle item
    const rep =
      bucket.find((i) => i.dt_txt.includes('12:00:00')) ?? bucket[Math.floor(bucket.length / 2)];
    const rain = bucket.reduce((sum, i) => sum + (i.rain?.['3h'] ?? 0), 0);
    days.push({
      date,
      tempHigh: Math.max(...temps),
      tempLow: Math.min(...temps),
      condition: rep.weather[0]?.main ?? 'Clear',
      conditionCode: rep.weather[0]?.id ?? 800,
      precipitation: rain,
      windSpeed: rep.wind.speed,
    });
  }

  return days.slice(0, 5);
}

export interface WeatherFetchResult {
  data: WeatherEvent['data'];
  descriptionText: string;
}

/**
 * Fetch current conditions + 5-day forecast for a coordinate pair.
 * `fallbackLocationName` is used only when OWM returns no resolvable city name.
 */
export async function fetchWeatherData(
  lat: number,
  lon: number,
  apiKey: string,
  fallbackLocationName: string
): Promise<WeatherFetchResult> {
  const [currentRes, forecastRes] = await Promise.all([
    axios.get<OWMCurrentResponse>(`${OWM_BASE}/weather`, {
      params: { lat, lon, appid: apiKey, units: 'metric' },
      timeout: 10000,
    }),
    axios.get<OWMForecastResponse>(`${OWM_BASE}/forecast`, {
      params: { lat, lon, appid: apiKey, units: 'metric', cnt: 40 },
      timeout: 10000,
    }),
  ]);

  if (!validateCurrentResponse(currentRes.data)) {
    throw new Error('Invalid response from OpenWeatherMap');
  }

  const current = currentRes.data;
  const locationName = current.name
    ? `${current.name}, ${current.sys.country}`
    : fallbackLocationName;

  const forecast = aggregateForecast(forecastRes.data.list);
  const conditionCode = current.weather[0]?.id ?? 800;

  return {
    data: {
      temperature: current.main.temp,
      feelsLike: current.main.feels_like,
      condition: current.weather[0]?.main ?? 'Unknown',
      conditionCode,
      windSpeed: current.wind.speed,
      humidity: current.main.humidity,
      pressure: current.main.pressure,
      visibility: current.visibility ?? 10000,
      locationName,
      forecast,
    },
    descriptionText: current.weather[0]?.description ?? '',
  };
}
