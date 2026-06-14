import { describe, it, expect } from 'vitest';
import { validateManifest, validateEventPayload } from './types';
import type { CollectorManifest, Event } from './types';

const validManifest: CollectorManifest = {
  id: 'earthquakes',
  version: '1.0.0',
  displayName: 'USGS Earthquakes',
  capabilities: ['earthquake'],
  qualityTier: 'primary',
  enabledByDefault: true,
};

const validEvent: Event = {
  id: 'evt-1',
  timestamp: Date.now(),
  type: 'earthquake',
  source: 'USGS',
  location: null,
  title: 'M4.2 earthquake near Ridgecrest',
  data: { mag: 4.2 },
};

describe('validateManifest (#147)', () => {
  it('accepts a valid manifest', () => {
    expect(validateManifest(validManifest)).toEqual({ valid: true });
  });

  it('accepts a manifest with optional fields', () => {
    const full: CollectorManifest = {
      ...validManifest,
      description: 'Real-time seismic data',
      sourceUrl: 'https://earthquake.usgs.gov/',
      requiredEnvVars: ['USGS_API_KEY'],
    };
    expect(validateManifest(full)).toEqual({ valid: true });
  });

  it('rejects null', () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
  });

  it('rejects non-object', () => {
    const result = validateManifest('string');
    expect(result.valid).toBe(false);
  });

  it('rejects empty id', () => {
    const result = validateManifest({ ...validManifest, id: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => /id/.test(e))).toBe(true);
  });

  it('rejects missing version', () => {
    const { version: _v, ...rest } = validManifest;
    const result = validateManifest(rest);
    expect(result.valid).toBe(false);
  });

  it('rejects empty capabilities array', () => {
    const result = validateManifest({ ...validManifest, capabilities: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => /capabilities/.test(e))).toBe(true);
  });

  it('rejects invalid qualityTier', () => {
    const result = validateManifest({ ...validManifest, qualityTier: 'gold' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((e) => /qualityTier/.test(e))).toBe(true);
  });

  it('rejects non-boolean enabledByDefault', () => {
    const result = validateManifest({ ...validManifest, enabledByDefault: 1 });
    expect(result.valid).toBe(false);
  });

  it('accumulates multiple errors', () => {
    const result = validateManifest({ ...validManifest, id: '', version: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateEventPayload (#149)', () => {
  it('accepts a valid event', () => {
    const result = validateEventPayload(validEvent);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.event).toBe(validEvent);
  });

  it('rejects null', () => {
    expect(validateEventPayload(null).valid).toBe(false);
  });

  it('rejects a plain string', () => {
    expect(validateEventPayload('event').valid).toBe(false);
  });

  it('rejects event with empty id', () => {
    const result = validateEventPayload({ ...validEvent, id: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/id/);
  });

  it('rejects event with non-numeric timestamp', () => {
    const result = validateEventPayload({ ...validEvent, timestamp: '2026-01-01' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/timestamp/);
  });

  it('rejects event with NaN timestamp', () => {
    const result = validateEventPayload({ ...validEvent, timestamp: NaN });
    expect(result.valid).toBe(false);
  });

  it('rejects event with empty type', () => {
    const result = validateEventPayload({ ...validEvent, type: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/type/);
  });

  it('rejects event with empty source', () => {
    const result = validateEventPayload({ ...validEvent, source: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects event with empty title', () => {
    const result = validateEventPayload({ ...validEvent, title: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects event where data is an array', () => {
    const result = validateEventPayload({ ...validEvent, data: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/data/);
  });

  it('rejects event where data is null', () => {
    const result = validateEventPayload({ ...validEvent, data: null });
    expect(result.valid).toBe(false);
  });

  it('accepts event with extra optional fields', () => {
    const withExtras = { ...validEvent, severity: 5.5, description: 'Minor quake' };
    const result = validateEventPayload(withExtras);
    expect(result.valid).toBe(true);
  });
});
