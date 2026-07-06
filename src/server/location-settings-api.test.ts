import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { getLocationOverride, setLocationOverride } from './locationOverride';

describe('POST/DELETE /api/settings/location', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    setLocationOverride(null);
  });

  afterEach(() => {
    app?.stopSweep();
    app?.httpServer.close();
    app?.io.close();
    setLocationOverride(null);
  });

  function setup() {
    app = createApp({ corsOrigin: '*' });
    return app;
  }

  it('persists a valid override and it is readable via getLocationOverride', async () => {
    const { app: expressApp } = setup();
    const res = await request(expressApp)
      .post('/api/settings/location')
      .send({ lat: 48.86, lon: 2.35, name: 'Paris, FR', countryCode: 'fr' });

    expect(res.status).toBe(200);
    expect(res.body.override).toEqual({
      lat: 48.86,
      lon: 2.35,
      name: 'Paris, FR',
      countryCode: 'FR',
    });
    expect(getLocationOverride()).toEqual(res.body.override);
  });

  it('accepts lat/lon with no name or country code', async () => {
    const { app: expressApp } = setup();
    const res = await request(expressApp).post('/api/settings/location').send({ lat: 1, lon: 2 });

    expect(res.status).toBe(200);
    expect(res.body.override).toEqual({ lat: 1, lon: 2 });
  });

  it('rejects an out-of-range latitude with 400 and does not persist it', async () => {
    const { app: expressApp } = setup();
    const res = await request(expressApp)
      .post('/api/settings/location')
      .send({ lat: 999, lon: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_coordinates');
    expect(getLocationOverride()).toBeNull();
  });

  it('rejects an out-of-range longitude with 400', async () => {
    const { app: expressApp } = setup();
    const res = await request(expressApp)
      .post('/api/settings/location')
      .send({ lat: 1, lon: 999 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_coordinates');
  });

  it('rejects a malformed country code with 400', async () => {
    const { app: expressApp } = setup();
    const res = await request(expressApp)
      .post('/api/settings/location')
      .send({ lat: 1, lon: 2, countryCode: 'USA' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_country_code');
  });

  it('rejects a non-string name with 400', async () => {
    const { app: expressApp } = setup();
    const res = await request(expressApp)
      .post('/api/settings/location')
      .send({ lat: 1, lon: 2, name: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_name');
  });

  it('clears the override via DELETE', async () => {
    const { app: expressApp } = setup();
    await request(expressApp).post('/api/settings/location').send({ lat: 1, lon: 2 });
    expect(getLocationOverride()).not.toBeNull();

    const res = await request(expressApp).delete('/api/settings/location');

    expect(res.status).toBe(200);
    expect(res.body.override).toBeNull();
    expect(getLocationOverride()).toBeNull();
  });
});
