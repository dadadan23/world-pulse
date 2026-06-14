import { describe, it, expect } from 'vitest';
import { validateVisualizationManifest } from './types';
import type { VisualizationManifest } from './types';

const valid: VisualizationManifest = {
  id: 'earthquake-marker',
  version: '1.0.0',
  displayName: 'Earthquake Markers',
  supportedEventTypes: ['earthquake'],
  renderOrder: 10,
  enabledByDefault: true,
};

describe('validateVisualizationManifest (#150)', () => {
  it('accepts a valid manifest', () => {
    expect(validateVisualizationManifest(valid)).toEqual({ valid: true });
  });

  it('accepts manifest with all optional fields', () => {
    const full: VisualizationManifest = {
      ...valid,
      dependencies: ['base-globe'],
      description: 'Renders seismic event markers on the globe',
    };
    expect(validateVisualizationManifest(full)).toEqual({ valid: true });
  });

  it('rejects null', () => {
    expect(validateVisualizationManifest(null).valid).toBe(false);
  });

  it('rejects empty id', () => {
    const r = validateVisualizationManifest({ ...valid, id: '' });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some((e) => /id/.test(e))).toBe(true);
  });

  it('rejects empty supportedEventTypes', () => {
    const r = validateVisualizationManifest({ ...valid, supportedEventTypes: [] });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some((e) => /supportedEventTypes/.test(e))).toBe(true);
  });

  it('rejects non-finite renderOrder', () => {
    const r = validateVisualizationManifest({ ...valid, renderOrder: NaN });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some((e) => /renderOrder/.test(e))).toBe(true);
  });

  it('rejects non-boolean enabledByDefault', () => {
    const r = validateVisualizationManifest({ ...valid, enabledByDefault: 1 });
    expect(r.valid).toBe(false);
  });

  it('rejects non-array dependencies', () => {
    const r = validateVisualizationManifest({ ...valid, dependencies: 'base' });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some((e) => /dependencies/.test(e))).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const r = validateVisualizationManifest({ ...valid, id: '', version: '' });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
