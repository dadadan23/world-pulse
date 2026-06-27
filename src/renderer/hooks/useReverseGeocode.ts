import { useState, useEffect } from 'react';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  address: NominatimAddress;
}

function formatPlace(address: NominatimAddress): string {
  const locality = address.city ?? address.town ?? address.village ?? address.county ?? '';
  const isUS = address.country_code?.toLowerCase() === 'us';

  if (isUS) {
    const parts = [locality, address.state].filter(Boolean);
    return parts.join(', ');
  }

  const parts = [locality, address.country].filter(Boolean);
  return parts.join(', ');
}

/**
 * Reverse-geocodes a lat/lon pair using the Nominatim OSM API.
 * Returns a human-readable place name (e.g. "Chicago, Illinois" or
 * "London, England") or null while loading / on error.
 */
export function useReverseGeocode(lat: number | null, lon: number | null): string | null {
  const [place, setPlace] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) return;

    let cancelled = false;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then((r) => r.json())
      .then((data: NominatimResult) => {
        if (!cancelled && data?.address) {
          setPlace(formatPlace(data.address));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  return place;
}
