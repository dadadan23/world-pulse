/**
 * Server-side "near you" location override (Story #234).
 * Single in-memory value — this app assumes a single ambient display per
 * install, matching the rest of the "near you" news/weather feature.
 */

export interface LocationOverride {
  lat: number;
  lon: number;
  /** Display name shown in weather/news UI in place of the IP-geolocated city. */
  name?: string;
  /** ISO 3166-1 alpha-2 country code, used by NewsCollector's "near you" scope. */
  countryCode?: string;
}

let override: LocationOverride | null = null;

export function getLocationOverride(): LocationOverride | null {
  return override;
}

export function setLocationOverride(next: LocationOverride | null): void {
  override = next;
}
