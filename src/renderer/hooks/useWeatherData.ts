import { useEffect, useState } from 'react';
import type { WeatherEvent } from '@shared/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export type WeatherUnavailableReason = 'not_configured' | 'fetch_failed' | 'invalid_coordinates';

export type WeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unavailable'; reason: WeatherUnavailableReason }
  | { status: 'ready'; data: WeatherEvent['data'] };

interface WeatherApiResponse {
  data: WeatherEvent['data'];
}

interface WeatherApiError {
  error: WeatherUnavailableReason;
}

/**
 * Fetches current conditions + 5-day forecast for a coordinate pair via the
 * server's /api/weather proxy. Pass null lat/lon to leave the hook idle
 * (e.g. while client geolocation is still pending and no event is selected).
 */
export function useWeatherData(
  lat: number | null,
  lon: number | null,
  locationName?: string
): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'idle' });

  useEffect(() => {
    if (lat === null || lon === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when coordinates become unavailable, not a render-loop sync
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (locationName) params.set('name', locationName);

    fetch(`${SERVER_URL}/api/weather?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as Partial<WeatherApiError>;
          throw new Error(body.error ?? 'fetch_failed');
        }
        return (await res.json()) as WeatherApiResponse;
      })
      .then((body) => {
        if (!cancelled) setState({ status: 'ready', data: body.data });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        const reason: WeatherUnavailableReason =
          err.message === 'not_configured' || err.message === 'invalid_coordinates'
            ? err.message
            : 'fetch_failed';
        setState({ status: 'unavailable', reason });
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, locationName]);

  return state;
}
