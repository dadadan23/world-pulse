import { describe, it, expect } from 'vitest';
import { getEventIndicator } from './eventIndicators';

describe('getEventIndicator', () => {
  it('returns the diamond symbol for earthquake', () => {
    expect(getEventIndicator('earthquake').symbol).toBe('◆');
  });

  it('returns the default circle symbol for unknown types', () => {
    expect(getEventIndicator('unknown-type').symbol).toBe('●');
  });

  it('defaults to cyan when no severity is given', () => {
    expect(getEventIndicator('earthquake').color).toBe('text-ob-cyan');
  });

  it('returns amber for moderate severity', () => {
    expect(getEventIndicator('earthquake', 5).color).toBe('text-ob-amber');
  });

  it('returns danger for high severity', () => {
    expect(getEventIndicator('earthquake', 8).color).toBe('text-ob-danger');
  });
});
