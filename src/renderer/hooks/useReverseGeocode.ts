import { useState, useEffect } from 'react';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  address: NominatimAddress;
}

function formatPlace(address: NominatimAddress): string {
  // Prefer a named place over the administrative county boundary
  const locality =
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? '';

  const isUS = address.country_code?.toLowerCase() === 'us';

  if (isUS) {
    // Always append 'US' so country is visible in the panel
    const parts = [locality || address.county, address.state, 'US'].filter(Boolean);
    return parts.join(', ');
  }

  const parts = [locality || address.county, address.country].filter(Boolean);
  return parts.join(', ');
}

/**
 * Reverse-geocodes a lat/lon pair using the Nominatim OSM API.
 * Returns a human-readable place name (e.g. "Chicago, Illinois, US" or
 * "London, England") or null while loading / on error.
 */
export function useReverseGeocode(lat: number | null, lon: number | null): string | null {
  const [place, setPlace] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) return;

    let cancelled = false;

    // No zoom param — let Nominatim resolve at the most specific level, then
    // we pick the right named place from address fields ourselves.
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
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
