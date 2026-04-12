/**
 * Local Weather Collector
 * Fetches current conditions and 5-day forecast from OpenWeatherMap.
 * Location is auto-detected via IP geolocation on first fetch, then cached.
 */

import axios from 'axios';
import type { Event, WeatherEvent, ForecastDay } from '@shared/types';
import { BaseCollector } from './base';

interface OWMCurrentResponse {
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

interface OWMForecastItem {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: Array<{ main: string; id: number }>;
  wind: { speed: number };
  rain?: { '3h': number };
  dt_txt: string;
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
  city: { name: string; coord: { lat: number; lon: number }; country: string };
}

interface IPGeoResponse {
  latitude: number;
  longitude: number;
  city: string;
  country_name: string;
}

export class WeatherCollector extends BaseCollector {
  private readonly owmBase = 'https://api.openweathermap.org/data/2.5';
  private readonly ipGeoUrl = 'https://ipapi.co/json/';
  private cachedLocation: { lat: number; lon: number; name: string } | null = null;

  constructor() {
    super('Local Weather', 'weather', 15 * 60 * 1000); // 15 minutes
  }

  async fetch(): Promise<Event[]> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY not configured');
    }

    if (!this.cachedLocation) {
      this.cachedLocation = await this.detectLocation();
    }

    const { lat, lon } = this.cachedLocation;

    const [currentRes, forecastRes] = await Promise.all([
      axios.get<OWMCurrentResponse>(`${this.owmBase}/weather`, {
        params: { lat, lon, appid: apiKey, units: 'metric' },
        timeout: 10000,
      }),
      axios.get<OWMForecastResponse>(`${this.owmBase}/forecast`, {
        params: { lat, lon, appid: apiKey, units: 'metric', cnt: 40 },
        timeout: 10000,
      }),
    ]);

    if (!this.validate(currentRes.data)) {
      throw new Error('Invalid response from OpenWeatherMap');
    }

    const current = currentRes.data;
    const locationName = current.name
      ? `${current.name}, ${current.sys.country}`
      : this.cachedLocation.name;

    const forecast = this.aggregateForecast(forecastRes.data.list);
    const conditionCode = current.weather[0]?.id ?? 800;

    const event: WeatherEvent = {
      id: 'weather-local',
      timestamp: Date.now(),
      type: 'weather',
      source: 'OpenWeatherMap',
      location: { lat, lon, name: locationName },
      severity: this.severityFromCode(conditionCode),
      title: `${locationName}: ${current.weather[0]?.main ?? 'Unknown'} ${Math.round(current.main.temp)}°C`,
      description: current.weather[0]?.description,
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
    };

    return [event];
  }

  validate(data: unknown): data is OWMCurrentResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.main === 'object' &&
      obj.main !== null &&
      Array.isArray(obj.weather) &&
      obj.weather.length > 0
    );
  }

  private async detectLocation(): Promise<{ lat: number; lon: number; name: string }> {
    try {
      const res = await axios.get<IPGeoResponse>(this.ipGeoUrl, { timeout: 5000 });
      const { latitude, longitude, city, country_name } = res.data;
      return { lat: latitude, lon: longitude, name: `${city}, ${country_name}` };
    } catch (_err) {
      console.warn('[WeatherCollector] IP geolocation failed, defaulting to London');
      return { lat: 51.5074, lon: -0.1278, name: 'London, GB' };
    }
  }

  private aggregateForecast(items: OWMForecastItem[]): ForecastDay[] {
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

  private severityFromCode(code: number): number {
    if (code >= 200 && code < 300) return 7; // Thunderstorm
    if (code >= 300 && code < 400) return 2; // Drizzle
    if (code >= 500 && code < 510) return code >= 502 ? 6 : 3; // Rain / Heavy rain
    if (code >= 511 && code < 532) return 4; // Freezing/shower rain
    if (code >= 600 && code < 700) return 4; // Snow
    if (code >= 700 && code < 800) return 3; // Atmosphere (fog, haze)
    if (code >= 900 && code < 910) return 9; // Extreme
    return 1; // Clear or clouds
  }
}
