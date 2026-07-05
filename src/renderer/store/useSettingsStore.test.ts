import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({ mutedEventTypes: [], tickerSpeed: 'normal' });
  });

  it('defaults to all event types un-muted and normal ticker speed', () => {
    const state = useSettingsStore.getState();
    expect(state.mutedEventTypes).toEqual([]);
    expect(state.tickerSpeed).toBe('normal');
  });

  it('mutes an event type', () => {
    useSettingsStore.getState().muteEventType('earthquake');
    expect(useSettingsStore.getState().mutedEventTypes).toEqual(['earthquake']);
  });

  it('does not duplicate an already-muted event type', () => {
    useSettingsStore.getState().muteEventType('earthquake');
    useSettingsStore.getState().muteEventType('earthquake');
    expect(useSettingsStore.getState().mutedEventTypes).toEqual(['earthquake']);
  });

  it('unmutes an event type', () => {
    useSettingsStore.setState({ mutedEventTypes: ['earthquake', 'volcano'] });
    useSettingsStore.getState().unmuteEventType('earthquake');
    expect(useSettingsStore.getState().mutedEventTypes).toEqual(['volcano']);
  });

  it('toggles an event type mute state', () => {
    useSettingsStore.getState().toggleEventTypeMuted('news');
    expect(useSettingsStore.getState().mutedEventTypes).toEqual(['news']);

    useSettingsStore.getState().toggleEventTypeMuted('news');
    expect(useSettingsStore.getState().mutedEventTypes).toEqual([]);
  });

  it('sets ticker speed', () => {
    useSettingsStore.getState().setTickerSpeed('fast');
    expect(useSettingsStore.getState().tickerSpeed).toBe('fast');
  });

  it('persists state to localStorage and rehydrates on reload', () => {
    useSettingsStore.getState().muteEventType('aurora');
    useSettingsStore.getState().setTickerSpeed('slow');

    const raw = localStorage.getItem('world-pulse-settings');
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw as string);
    expect(parsed.state.mutedEventTypes).toEqual(['aurora']);
    expect(parsed.state.tickerSpeed).toBe('slow');

    // Simulate a fresh module load rehydrating from the same localStorage key.
    useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().mutedEventTypes).toEqual(['aurora']);
    expect(useSettingsStore.getState().tickerSpeed).toBe('slow');
  });
});
