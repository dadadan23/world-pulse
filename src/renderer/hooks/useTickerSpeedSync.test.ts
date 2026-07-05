import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTickerSpeedSync } from './useTickerSpeedSync';
import { useSettingsStore } from '../store/useSettingsStore';

describe('useTickerSpeedSync', () => {
  beforeEach(() => {
    useSettingsStore.setState({ tickerSpeed: 'normal' });
    document.documentElement.style.removeProperty('--ob-timing-scroll');
  });

  it('sets --ob-timing-scroll to the 30s default for normal speed', () => {
    renderHook(() => useTickerSpeedSync());
    expect(document.documentElement.style.getPropertyValue('--ob-timing-scroll')).toBe('30s');
  });

  it('updates --ob-timing-scroll when the speed preference changes', () => {
    const { rerender } = renderHook(() => useTickerSpeedSync());

    useSettingsStore.setState({ tickerSpeed: 'fast' });
    rerender();
    expect(document.documentElement.style.getPropertyValue('--ob-timing-scroll')).toBe('15s');

    useSettingsStore.setState({ tickerSpeed: 'slow' });
    rerender();
    expect(document.documentElement.style.getPropertyValue('--ob-timing-scroll')).toBe('45s');
  });
});
