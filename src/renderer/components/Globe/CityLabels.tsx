/* eslint-disable react/no-unknown-property */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/*
  react-three-fiber uses Three.js-specific JSX props (e.g., depthTest, sizeAttenuation)
  which ESLint incorrectly flags as unknown DOM props. Disable the rule for this file.
*/

import { useMemo } from 'react';
import { CITIES, type CityData } from './cityData';
import { latLonToVector3 } from './projection';
import { createTextTexture } from './textTexture';

const GLOBE_RADIUS = 1;

interface CityLabelProps {
  city: CityData;
  isVisible: boolean;
}

function CityLabel({ city, isVisible }: CityLabelProps) {
  // Position above globe surface (like EventMarkers)
  const position = useMemo(
    () => latLonToVector3(city.lat, city.lon, GLOBE_RADIUS * 1.04),
    [city.lat, city.lon]
  );

  // Create text texture (memoized per city)
  const texture = useMemo(() => createTextTexture(city.name), [city.name]);

  return (
    <sprite position={position} scale={[0.15, 0.06, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={isVisible ? 0.7 : 0}
        depthTest={false} // Prevent labels from being hidden behind globe
        sizeAttenuation={true}
      />
    </sprite>
  );
}

interface CityLabelsProps {
  cameraDistance: number;
  featuredEventLocation?: { lat: number; lon: number } | null;
}

/**
 * Renders city labels on the globe with tier-based visibility.
 * - Tier 1: Always visible (10 major capitals)
 * - Tier 2: Visible when zoomed (camera distance < 3.5)
 * - Tier 3: Visible when nearby event is featured
 */
export function CityLabels({ cameraDistance, featuredEventLocation }: CityLabelsProps) {
  // Determine which cities to show based on zoom level
  const visibleCities = useMemo(() => {
    const isZoomed = cameraDistance < 3.5;

    return CITIES.map((city) => {
      let isVisible = false;

      if (city.tier === 1) {
        // Tier 1: Always visible
        isVisible = true;
      } else if (city.tier === 2 && isZoomed) {
        // Tier 2: Show when zoomed
        isVisible = true;
      } else if (city.tier === 3 && featuredEventLocation) {
        // Tier 3: Show when nearby event is featured
        const distance = Math.sqrt(
          Math.pow(city.lat - featuredEventLocation.lat, 2) +
            Math.pow(city.lon - featuredEventLocation.lon, 2)
        );
        isVisible = distance < 20; // Within ~20 degrees
      }

      return { city, isVisible };
    });
  }, [cameraDistance, featuredEventLocation]);

  return (
    <group>
      {visibleCities.map(({ city, isVisible }) => (
        <CityLabel key={city.name} city={city} isVisible={isVisible} />
      ))}
    </group>
  );
}
