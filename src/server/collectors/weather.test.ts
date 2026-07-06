import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherCollector } from './weather';
import { setLocationOverride } from '../locationOverride';
import axios from 'axios';

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

describe('WeatherCollector', () => {
  let collector: WeatherCollector;

  beforeEach(() => {
    collector = new WeatherCollector();
    vi.clearAllMocks();
    process.env.OPENWEATHER_API_KEY = 'test-key';
    setLocationOverride(null);
  });

  describe('constructor', () => {
    it('has correct name and type', () => {
      expect(collector.name).toBe('Local Weather');
      expect(collector.type).toBe('weather');
    });

    it('is enabled by default', () => {
      expect(collector.enabled).toBe(true);
    });

    it('uses 15-minute interval', () => {
      expect(collector.interval).toBe(15 * 60 * 1000);
    });
  });

  describe('validate', () => {
    it('accepts valid OWM current weather response', () => {
      expect(
        collector.validate({
          main: { temp: 20, feels_like: 19, humidity: 60, pressure: 1010 },
          weather: [{ main: 'Clear', id: 800 }],
          wind: { speed: 1 },
          name: 'Test',
          coord: { lat: 0, lon: 0 },
          sys: { country: 'XX' },
        })
      ).toBe(true);
    });

    it('rejects null', () => {
      expect(collector.validate(null)).toBe(false);
    });

    it('rejects missing main', () => {
      expect(collector.validate({ weather: [{ main: 'Clear', id: 800 }] })).toBe(false);
    });

    it('rejects empty weather array', () => {
      expect(collector.validate({ main: { temp: 10 }, weather: [] })).toBe(false);
    });
  });

  describe('fetch', () => {
    it('throws when API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      await expect(collector.fetch()).rejects.toThrow('OPENWEATHER_API_KEY not configured');
    });

    it('returns a weather event with correct structure', async () => {
      // First call: IP geolocation; second: current weather; third: forecast
      mockedGet
        .mockResolvedValueOnce({
          data: { latitude: 52.52, longitude: 13.41, city: 'Berlin', country_name: 'Germany' },
        })
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse());

      const events = await collector.fetch();

      expect(events).toHaveLength(1);
      const event = events[0];
      expect(event.id).toBe('weather-local');
      expect(event.type).toBe('weather');
      expect(event.source).toBe('OpenWeatherMap');
      expect(event.title).toContain('Berlin');
      expect(event.title).toContain('°C');
    });

    it('populates weather data fields correctly', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: { latitude: 52.52, longitude: 13.41, city: 'Berlin', country_name: 'Germany' },
        })
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse());

      const events = await collector.fetch();
      const data = events[0].data as Record<string, unknown>;

      expect(data.temperature).toBe(18.5);
      expect(data.feelsLike).toBe(17.2);
      expect(data.humidity).toBe(65);
      expect(data.pressure).toBe(1013);
      expect(data.windSpeed).toBe(3.5);
      expect(data.condition).toBe('Clouds');
      expect(data.conditionCode).toBe(803);
      expect(data.locationName).toBe('Berlin, DE');
      expect(Array.isArray(data.forecast)).toBe(true);
    });

    it('uses cached location on second fetch', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: { latitude: 52.52, longitude: 13.41, city: 'Berlin', country_name: 'Germany' },
        })
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse())
        // Second fetch: no ip geo call expected
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse());

      await collector.fetch();
      await collector.fetch();

      // IP geo called once; current+forecast called twice each = 5 total
      expect(mockedGet).toHaveBeenCalledTimes(5);
    });

    it('falls back to London when IP geolocation fails', async () => {
      mockedGet
        .mockRejectedValueOnce(new Error('IP geo timeout'))
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse());

      const events = await collector.fetch();
      expect(events[0].location?.name).toBe('Berlin, DE'); // OWM name takes precedence
    });

    it('throws on invalid OWM response', async () => {
      mockedGet
        .mockResolvedValueOnce({
          data: { latitude: 51.5, longitude: -0.1, city: 'London', country_name: 'UK' },
        })
        .mockResolvedValueOnce({ data: { invalid: true } })
        .mockResolvedValueOnce(makeForecastResponse());

      await expect(collector.fetch()).rejects.toThrow('Invalid response from OpenWeatherMap');
    });
  });

  describe('location override (#234)', () => {
    it('uses the override coordinates instead of calling ipapi.co', async () => {
      setLocationOverride({ lat: 48.86, lon: 2.35, name: 'Paris, FR' });
      mockedGet.mockResolvedValueOnce(makeCurrentResponse()).mockResolvedValueOnce(makeForecastResponse());

      const events = await collector.fetch();

      expect(mockedGet).toHaveBeenCalledTimes(2); // current + forecast only, no IP geo lookup
      expect(mockedGet.mock.calls.every(([url]) => !(url as string).includes('ipapi.co'))).toBe(
        true
      );
      expect(events).toHaveLength(1);
    });

    it('queries OpenWeatherMap with the override coordinates', async () => {
      setLocationOverride({ lat: 48.86, lon: 2.35 });
      mockedGet.mockResolvedValueOnce(makeCurrentResponse()).mockResolvedValueOnce(makeForecastResponse());

      await collector.fetch();

      const currentCall = mockedGet.mock.calls.find(([url]) => (url as string).includes('/weather'));
      expect(currentCall?.[1]).toMatchObject({ params: { lat: 48.86, lon: 2.35 } });
    });

    it('resumes IP geolocation once the override is cleared', async () => {
      setLocationOverride({ lat: 48.86, lon: 2.35, name: 'Paris, FR' });
      mockedGet.mockResolvedValueOnce(makeCurrentResponse()).mockResolvedValueOnce(makeForecastResponse());
      await collector.fetch();

      setLocationOverride(null);
      mockedGet
        .mockResolvedValueOnce({
          data: { latitude: 51.5, longitude: -0.1, city: 'London', country_name: 'UK' },
        })
        .mockResolvedValueOnce(makeCurrentResponse())
        .mockResolvedValueOnce(makeForecastResponse());
      await collector.fetch();

      const geoCalls = mockedGet.mock.calls.filter(([url]) => (url as string).includes('ipapi.co'));
      expect(geoCalls).toHaveLength(1);
    });
  });
});
