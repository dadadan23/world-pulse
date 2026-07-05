import { describe, it, expect } from 'vitest';
import { auroraZoneOpacity, auroraHemispheres } from './auroraZone';

describe('auroraZoneOpacity', () => {
  it('maps severity 0 to the minimum opacity (0.05)', () => {
    expect(auroraZoneOpacity(0)).toBeCloseTo(0.05, 5);
  });

  it('maps severity 10 to the maximum opacity (0.3)', () => {
    expect(auroraZoneOpacity(10)).toBeCloseTo(0.3, 5);
  });

  it('maps mid severity proportionally', () => {
    expect(auroraZoneOpacity(5)).toBeCloseTo(0.175, 5);
  });

  it('clamps out-of-range severity', () => {
    expect(auroraZoneOpacity(-5)).toBeCloseTo(0.05, 5);
    expect(auroraZoneOpacity(99)).toBeCloseTo(0.3, 5);
  });
});

describe('auroraHemispheres', () => {
  it('returns both poles for "both"', () => {
    expect(auroraHemispheres('both')).toEqual(['north', 'south']);
  });

  it('returns only the north pole for "north"', () => {
    expect(auroraHemispheres('north')).toEqual(['north']);
  });

  it('returns only the south pole for "south"', () => {
    expect(auroraHemispheres('south')).toEqual(['south']);
  });
});
