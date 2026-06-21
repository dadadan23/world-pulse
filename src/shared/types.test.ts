import { describe, it, expect } from 'vitest';
import { validateManifest, validateEventPayload, validateVisualizationManifest } from './types';
import type { CollectorManifest, Event, VisualizationManifest, HistoricalContext } from './types';

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

// ---------------------------------------------------------------------------
// #150 - Visualization plugin manifest validation
// ---------------------------------------------------------------------------

const validVisualizationManifest: VisualizationManifest = {
  id: 'earthquake_markers',
  version: '1.0.0',
  displayName: 'Earthquake Markers',
  supportedEventTypes: ['earthquake'],
  renderOrder: 'overlay',
};

describe('validateVisualizationManifest (#150)', () => {
  it('accepts a valid manifest', () => {
    expect(validateVisualizationManifest(validVisualizationManifest)).toEqual({ valid: true });
  });

  it('accepts a manifest with optional fields', () => {
    const full: VisualizationManifest = {
      ...validVisualizationManifest,
      dependencies: ['base_globe'],
      description: 'Renders earthquake markers on the globe',
    };
    expect(validateVisualizationManifest(full)).toEqual({ valid: true });
  });

  it('rejects non-snake_case id', () => {
    const result = validateVisualizationManifest({
      ...validVisualizationManifest,
      id: 'My-Plugin',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects id starting with a digit', () => {
    const result = validateVisualizationManifest({ ...validVisualizationManifest, id: '3d_globe' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid renderOrder', () => {
    const result = validateVisualizationManifest({
      ...validVisualizationManifest,
      renderOrder: 'ground',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toMatch(/renderOrder/);
  });

  it('rejects empty supportedEventTypes', () => {
    const result = validateVisualizationManifest({
      ...validVisualizationManifest,
      supportedEventTypes: [],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects dependencies that is not an array', () => {
    const result = validateVisualizationManifest({
      ...validVisualizationManifest,
      dependencies: 'base_globe',
    });
    expect(result.valid).toBe(false);
  });

  it('accepts all three renderOrder tiers', () => {
    for (const order of ['base', 'overlay', 'hud'] as const) {
      expect(
        validateVisualizationManifest({ ...validVisualizationManifest, renderOrder: order })
      ).toEqual({ valid: true });
    }
  });
});

// ---------------------------------------------------------------------------
// #159 - HistoricalContext schema compile-time shape check
// ---------------------------------------------------------------------------

describe('HistoricalContext schema (#159)', () => {
  it('accepts a well-formed historical context record', () => {
    const ctx: HistoricalContext = {
      id: 'wreck_titanic',
      title: 'RMS Titanic',
      category: 'transport',
      subcategory: 'shipwreck',
      location: { lat: 41.7325, lon: -49.9469, name: 'North Atlantic' },
      date: '1912-04-15',
      era: 'Edwardian Era',
      summary:
        'The RMS Titanic sank on 15 April 1912 after striking an iceberg, killing 1,514 people.',
      attribution: 'NOAA Office of Ocean Exploration',
      license: 'Public Domain',
      confidence: 'confirmed',
      sourceQuality: 'high',
      sourceUrl: 'https://oceanexplorer.noaa.gov/facts/titanic.html',
    };
    // Type assertion — if TypeScript compiles, the schema is valid.
    expect(ctx.id).toBe('wreck_titanic');
    expect(ctx.category).toBe('transport');
    expect(ctx.confidence).toBe('confirmed');
  });

  it('supports all defined categories', () => {
    const categories: HistoricalContext['category'][] = [
      'disaster',
      'conflict',
      'transport',
      'exploration',
      'other',
    ];
    expect(categories).toHaveLength(5);
  });

  it('supports all confidence levels', () => {
    const levels: HistoricalContext['confidence'][] = ['confirmed', 'probable', 'uncertain'];
    expect(levels).toHaveLength(3);
  });
});
