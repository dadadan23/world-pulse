import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import axios from 'axios';

vi.mock('axios');
const mockedGet = vi.mocked(axios.get);

function makeCurrentResponse() {
  return {
    data: {
      main: { temp: 22.1, feels_like: 21.0, humidity: 50, pressure: 1015 },
      weather: [{ main: 'Clear', description: 'clear sky', id: 800 }],
      wind: { speed: 2.1 },
      visibility: 10000,
      name: 'Tokyo',
      coord: { lat: 35.68, lon: 139.69 },
      sys: { country: 'JP' },
    },
  };
}

function makeForecastResponse() {
  const baseTime = new Date('2026-06-28T00:00:00Z').getTime();
  const items = Array.from({ length: 8 }, (_, i) => {
    const dt = baseTime + i * 3 * 60 * 60 * 1000;
    const dateStr = new Date(dt).toISOString().replace('T', ' ').substring(0, 19);
    return {
      dt: dt / 1000,
      main: { temp: 20 + i, temp_min: 19 + i, temp_max: 21 + i },
      weather: [{ main: 'Clear', id: 800 }],
      wind: { speed: 1.5 },
      dt_txt: dateStr,
    };
  });
  return {
    data: {
      list: items,
      city: { name: 'Tokyo', coord: { lat: 35.68, lon: 139.69 }, country: 'JP' },
    },
  };
}

describe('GET /api/weather', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENWEATHER_API_KEY = 'test-key';
  });

  afterEach(() => {
    app?.stopSweep();
    app?.httpServer.close();
    app?.io.close();
    delete process.env.OPENWEATHER_API_KEY;
  });

  function setup() {
    app = createApp({ corsOrigin: '*' });
    return app;
  }

  it('returns weather data for valid coordinates', async () => {
    mockedGet
      .mockResolvedValueOnce(makeCurrentResponse())
      .mockResolvedValueOnce(makeForecastResponse());
    const { app: expressApp } = setup();

    const res = await request(expressApp).get('/api/weather?lat=35.68&lon=139.69');

    expect(res.status).toBe(200);
    expect(res.body.data.locationName).toBe('Tokyo, JP');
    expect(res.body.data.temperature).toBe(22.1);
    expect(Array.isArray(res.body.data.forecast)).toBe(true);
  });

  it('rejects out-of-range coordinates', async () => {
    const { app: expressApp } = setup();

    const res = await request(expressApp).get('/api/weather?lat=999&lon=0');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_coordinates');
  });

  it('rejects non-numeric coordinates', async () => {
    const { app: expressApp } = setup();

    const res = await request(expressApp).get('/api/weather?lat=abc&lon=0');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_coordinates');
  });

  it('returns 503 when OPENWEATHER_API_KEY is not configured', async () => {
    delete process.env.OPENWEATHER_API_KEY;
    const { app: expressApp } = setup();

    const res = await request(expressApp).get('/api/weather?lat=35.68&lon=139.69');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('not_configured');
  });

  it('returns 502 when the upstream fetch fails', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network error'));
    const { app: expressApp } = setup();

    const res = await request(expressApp).get('/api/weather?lat=35.68&lon=139.69');

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('fetch_failed');
  });

  it('caches results for the same rounded coordinates', async () => {
    mockedGet
      .mockResolvedValueOnce(makeCurrentResponse())
      .mockResolvedValueOnce(makeForecastResponse());
    const { app: expressApp } = setup();

    const first = await request(expressApp).get('/api/weather?lat=35.68&lon=139.69');
    const second = await request(expressApp).get('/api/weather?lat=35.6801&lon=139.6899');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.locationName).toBe('Tokyo, JP');
    // Only one upstream round-trip (current + forecast) despite two requests
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('passes the name query param as a fallback location name', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        main: { temp: 10, feels_like: 9, humidity: 40, pressure: 1000 },
        weather: [{ main: 'Clouds', description: 'overcast', id: 804 }],
        wind: { speed: 1 },
        name: '',
        coord: { lat: 1, lon: 1 },
        sys: { country: '' },
      },
    });
    mockedGet.mockResolvedValueOnce(makeForecastResponse());
    const { app: expressApp } = setup();

    const res = await request(expressApp).get(
      '/api/weather?lat=1&lon=1&name=Selected%20Event%20Site'
    );

    expect(res.status).toBe(200);
    expect(res.body.data.locationName).toBe('Selected Event Site');
  });
});
