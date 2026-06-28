import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchWeatherData, validateCurrentResponse, aggregateForecast } from './weatherClient';

vi.mock('axios');
const mockedGet = vi.mocked(axios.get);

function makeCurrentResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      main: { temp: 18.5, feels_like: 17.2, humidity: 65, pressure: 1013 },
      weather: [{ main: 'Clouds', description: 'broken clouds', id: 803 }],
      wind: { speed: 3.5 },
      visibility: 10000,
      name: 'Berlin',
      coord: { lat: 52.52, lon: 13.41 },
      sys: { country: 'DE' },
      ...overrides,
    },
  };
}

function makeForecastResponse() {
  const baseTime = new Date('2026-03-28T00:00:00Z').getTime();
  const items = Array.from({ length: 10 }, (_, i) => {
    const dt = baseTime + i * 3 * 60 * 60 * 1000;
    const dateStr = new Date(dt).toISOString().replace('T', ' ').substring(0, 19);
    return {
      dt: dt / 1000,
      main: { temp: 15 + i, temp_min: 14 + i, temp_max: 16 + i },
      weather: [{ main: 'Clear', id: 800 }],
      wind: { speed: 2.0 },
      dt_txt: dateStr,
    };
  });
  return {
    data: {
      list: items,
      city: { name: 'Berlin', coord: { lat: 52.52, lon: 13.41 }, country: 'DE' },
    },
  };
}

describe('weatherClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCurrentResponse', () => {
    it('accepts a valid response', () => {
      expect(validateCurrentResponse(makeCurrentResponse().data)).toBe(true);
    });

    it('rejects null', () => {
      expect(validateCurrentResponse(null)).toBe(false);
    });

    it('rejects an empty weather array', () => {
      expect(validateCurrentResponse({ main: {}, weather: [] })).toBe(false);
    });
  });

  describe('aggregateForecast', () => {
    it('caps output at 5 days', () => {
      const baseTime = new Date('2026-03-28T00:00:00Z').getTime();
      const items = Array.from({ length: 40 }, (_, i) => {
        const dt = baseTime + i * 3 * 60 * 60 * 1000;
        const dateStr = new Date(dt).toISOString().replace('T', ' ').substring(0, 19);
        return {
          dt: dt / 1000,
          main: { temp: 10, temp_min: 9, temp_max: 11 },
          weather: [{ main: 'Clear', id: 800 }],
          wind: { speed: 1 },
          dt_txt: dateStr,
        };
      });

      expect(aggregateForecast(items).length).toBeLessThanOrEqual(5);
    });
  });

  describe('fetchWeatherData', () => {
    it('returns parsed weather data and description text', async () => {
      mockedGet
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse());

      const result = await fetchWeatherData(52.52, 13.41, 'test-key', 'Fallback');

      expect(result.data.locationName).toBe('Berlin, DE');
      expect(result.data.temperature).toBe(18.5);
      expect(result.data.conditionCode).toBe(803);
      expect(result.descriptionText).toBe('broken clouds');
      expect(result.data.forecast.length).toBeGreaterThan(0);
    });

    it('falls back to the provided location name when OWM has none', async () => {
      mockedGet
        .mockResolvedValueOnce(makeCurrentResponse({ name: '' }))
        .mockResolvedValueOnce(makeForecastResponse());

      const result = await fetchWeatherData(52.52, 13.41, 'test-key', 'My Fallback');

      expect(result.data.locationName).toBe('My Fallback');
    });

    it('throws on an invalid OWM response', async () => {
      mockedGet
        .mockResolvedValueOnce({ data: { invalid: true } })
        .mockResolvedValueOnce(makeForecastResponse());

      await expect(fetchWeatherData(0, 0, 'test-key', 'Fallback')).rejects.toThrow(
        'Invalid response from OpenWeatherMap'
      );
    });
  });
});
