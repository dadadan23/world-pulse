import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const GEOLOCATION_TIMEOUT_MS = 10_000;

/**
 * Requests the user's geolocation once per session on mount.
 * On success: stores lat/lon and sets status 'granted'.
 * On failure/timeout: sets fallback position (lat:30, lon:-40) and status 'denied'.
 * Results are cached in the Zustand store -- safe to call multiple times.
 */
export function useGeolocation(): void {
  const { geolocationStatus, setGeolocation, setGeolocationDenied } = useAppStore();

  useEffect(() => {
    // Only request once
    if (geolocationStatus !== 'pending') return;

    if (!navigator.geolocation) {
      setGeolocationDenied();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocation(position.coords.latitude, position.coords.longitude);
      },
      () => {
        // Denied or unavailable -- use neutral mid-Atlantic fallback silently
        setGeolocationDenied();
      },
      {
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 3_600_000, // Accept cached position up to 1 hour old
        enableHighAccuracy: false,
      }
    );
  }, [geolocationStatus, setGeolocation, setGeolocationDenied]);
}
