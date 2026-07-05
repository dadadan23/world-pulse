import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { TICKER_SPEED_DURATIONS } from '../utils/tickerSpeed';

/**
 * Syncs the persisted ticker speed preference to the --ob-timing-scroll CSS
 * custom property at the document root. Changing a CSS custom property that
 * drives a running `animation-duration` retimes the animation in place --
 * it does not restart from 0%, so speed changes apply mid-scroll cleanly.
 */
export function useTickerSpeedSync(): void {
  const tickerSpeed = useSettingsStore((state) => state.tickerSpeed);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--ob-timing-scroll',
      TICKER_SPEED_DURATIONS[tickerSpeed]
    );
  }, [tickerSpeed]);
}
