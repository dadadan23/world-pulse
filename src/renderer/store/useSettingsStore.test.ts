import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore, DEFAULT_SEVERITY_THRESHOLD } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      mutedEventTypes: [],
      tickerSpeed: 'normal',
      severityThreshold: DEFAULT_SEVERITY_THRESHOLD,
      audioChimeEnabled: false,
      locationOverride: null,
    });
  });

  it('defaults to all event types un-muted and normal ticker speed', () => {
    const state = useSettingsStore.getState();
    expect(state.mutedEventTypes).toEqual([]);
    expect(state.tickerSpeed).toBe('normal');
  });

  it('defaults severity threshold to the "high" level and audio chime to off', () => {
    const state = useSettingsStore.getState();
    expect(state.severityThreshold).toBe(DEFAULT_SEVERITY_THRESHOLD);
    expect(state.audioChimeEnabled).toBe(false);
  });

  it('sets severity threshold', () => {
    useSettingsStore.getState().setSeverityThreshold(5);
    expect(useSettingsStore.getState().severityThreshold).toBe(5);
  });

  it('sets audio chime enabled', () => {
    useSettingsStore.getState().setAudioChimeEnabled(true);
    expect(useSettingsStore.getState().audioChimeEnabled).toBe(true);
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

  it('defaults locationOverride to null and can set/clear it', () => {
    expect(useSettingsStore.getState().locationOverride).toBeNull();

    useSettingsStore.getState().setLocationOverride({ lat: 48.86, lon: 2.35, name: 'Paris, FR' });
    expect(useSettingsStore.getState().locationOverride).toEqual({
      lat: 48.86,
      lon: 2.35,
      name: 'Paris, FR',
    });

    useSettingsStore.getState().setLocationOverride(null);
    expect(useSettingsStore.getState().locationOverride).toBeNull();
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
