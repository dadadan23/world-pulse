import { SERVER_URL } from '../config';
import type { LocationOverride } from '../store/useSettingsStore';

export type LocationSettingsError =
  'invalid_coordinates' | 'invalid_name' | 'invalid_country_code' | 'invalid_body' | 'fetch_failed';

interface LocationSettingsResponse {
  override: LocationOverride | null;
}

interface LocationSettingsErrorBody {
  error: LocationSettingsError;
}

async function parseResponse(res: Response): Promise<LocationOverride | null> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Partial<LocationSettingsErrorBody>;
    const error: LocationSettingsError = body.error ?? 'fetch_failed';
    throw new Error(error);
  }
  const body = (await res.json()) as LocationSettingsResponse;
  return body.override;
}

/** Persists the "near you" location override server-side (#234). */
export async function saveLocationOverride(
  override: LocationOverride
): Promise<LocationOverride | null> {
  const res = await fetch(`${SERVER_URL}/api/settings/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(override),
  });
  return parseResponse(res);
}

/** Clears the server-side location override; WeatherCollector/NewsCollector resume IP geolocation. */
export async function clearLocationOverride(): Promise<void> {
  const res = await fetch(`${SERVER_URL}/api/settings/location`, { method: 'DELETE' });
  await parseResponse(res);
}
