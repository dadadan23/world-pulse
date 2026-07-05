/**
 * Local Weather Collector
 * Fetches current conditions and 5-day forecast from OpenWeatherMap.
 * Location is auto-detected via IP geolocation on first fetch, then cached.
 */

import axios from 'axios';
import type { Event, WeatherEvent } from '@shared/types';
import { BaseCollector } from './base';
import {
  fetchWeatherData,
  validateCurrentResponse,
  type OWMCurrentResponse,
} from './weatherClient';

interface IPGeoResponse {
  latitude: number;
  longitude: number;
  city: string;
  country_name: string;
}

export class WeatherCollector extends BaseCollector {
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

    const { lat, lon, name } = this.cachedLocation;

    const { data, descriptionText } = await fetchWeatherData(lat, lon, apiKey, name);

    const event: WeatherEvent = {
      id: 'weather-local',
      timestamp: Date.now(),
      type: 'weather',
      source: 'OpenWeatherMap',
      location: { lat, lon, name: data.locationName },
      severity: this.severityFromCode(data.conditionCode),
      title: `${data.locationName}: ${data.condition} ${Math.round(data.temperature)}°C`,
      description: descriptionText,
      data,
    };

    return [event];
  }

  validate(data: unknown): data is OWMCurrentResponse {
    return validateCurrentResponse(data);
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
