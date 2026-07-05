import type { TickerSpeed } from '../store/useSettingsStore';

/**
 * Scroll duration (--ob-timing-scroll) for each ticker speed preset.
 * "normal" matches DESIGN.md's documented 30s default -- presets only ever
 * adjust this one timing token, never introduce a new one.
 */
export const TICKER_SPEED_DURATIONS: Record<TickerSpeed, string> = {
  slow: '45s',
  normal: '30s',
  fast: '15s',
};

export const TICKER_SPEED_OPTIONS: TickerSpeed[] = ['slow', 'normal', 'fast'];
