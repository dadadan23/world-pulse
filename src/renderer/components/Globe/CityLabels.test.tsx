import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { CityLabels } from './CityLabels';
import { CITIES, getCitiesByTier, getCitiesUpToTier } from './cityData';

describe('CityLabels', () => {
  it('should render without errors', () => {
    const { container } = render(
      <Canvas>
        <CityLabels cameraDistance={2.4} featuredEventLocation={null} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });

  it('should show tier 1 cities when not zoomed', () => {
    // Tier 1 cities should be visible at default camera distance (2.4)
    const tier1Cities = getCitiesByTier(1);
    expect(tier1Cities.length).toBe(10);
  });

  it('should show tier 1 and tier 2 cities when zoomed', () => {
    // When camera distance < 3.5, tier 2 should also be visible
    const citiesUpToTier2 = getCitiesUpToTier(2);
    expect(citiesUpToTier2.length).toBe(30); // 10 tier 1 + 20 tier 2
  });

  it('should have correct city data structure', () => {
    const city = CITIES[0];
    expect(city).toHaveProperty('name');
    expect(city).toHaveProperty('fullName');
    expect(city).toHaveProperty('lat');
    expect(city).toHaveProperty('lon');
    expect(city).toHaveProperty('tier');
    expect(city.tier).toBeGreaterThanOrEqual(1);
    expect(city.tier).toBeLessThanOrEqual(3);
  });

  it('should have valid lat/lon coordinates', () => {
    for (const city of CITIES) {
      expect(city.lat).toBeGreaterThanOrEqual(-90);
      expect(city.lat).toBeLessThanOrEqual(90);
      expect(city.lon).toBeGreaterThanOrEqual(-180);
      expect(city.lon).toBeLessThanOrEqual(180);
    }
  });

  it('should have 58 total cities', () => {
    expect(CITIES.length).toBe(58);
  });

  it('should not have duplicate city codes', () => {
    const names = CITIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('cityData utilities', () => {
  it('getCitiesByTier should filter correctly', () => {
    const tier1 = getCitiesByTier(1);
    const tier2 = getCitiesByTier(2);
    const tier3 = getCitiesByTier(3);

    expect(tier1.every((c) => c.tier === 1)).toBe(true);
    expect(tier2.every((c) => c.tier === 2)).toBe(true);
    expect(tier3.every((c) => c.tier === 3)).toBe(true);

    expect(tier1.length + tier2.length + tier3.length).toBe(CITIES.length);
  });

  it('getCitiesUpToTier should include all lower tiers', () => {
    const upTo1 = getCitiesUpToTier(1);
    const upTo2 = getCitiesUpToTier(2);
    const upTo3 = getCitiesUpToTier(3);

    expect(upTo1.every((c) => c.tier <= 1)).toBe(true);
    expect(upTo2.every((c) => c.tier <= 2)).toBe(true);
    expect(upTo3.every((c) => c.tier <= 3)).toBe(true);

    expect(upTo3.length).toBe(CITIES.length); // All cities
  });
});
