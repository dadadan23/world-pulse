import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSettingsStore } from './useSettingsStore';
import type { EventType } from '@shared/types';

/** Reset the store to a clean default state before each test. */
function resetStore() {
  useSettingsStore.setState({ mutedEventTypes: [], tickerSpeed: 'normal' });
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Default state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('initializes with no muted event types', () => {
      expect(useSettingsStore.getState().mutedEventTypes).toEqual([]);
    });

    it('initializes with tickerSpeed "normal"', () => {
      expect(useSettingsStore.getState().tickerSpeed).toBe('normal');
    });
  });

  // ---------------------------------------------------------------------------
  // muteEventType
  // ---------------------------------------------------------------------------

  describe('muteEventType', () => {
    it('adds the event type to the muted list', () => {
      useSettingsStore.getState().muteEventType('earthquake');
      expect(useSettingsStore.getState().mutedEventTypes).toContain('earthquake');
    });

    it('is idempotent -- muting an already-muted type does not duplicate it', () => {
      useSettingsStore.getState().muteEventType('earthquake');
      useSettingsStore.getState().muteEventType('earthquake');
      const muted = useSettingsStore.getState().mutedEventTypes;
      expect(muted.filter((t) => t === 'earthquake')).toHaveLength(1);
    });

    it('can mute multiple types independently', () => {
      useSettingsStore.getState().muteEventType('earthquake');
      useSettingsStore.getState().muteEventType('news');
      const muted = useSettingsStore.getState().mutedEventTypes;
      expect(muted).toContain('earthquake');
      expect(muted).toContain('news');
    });
  });

  // ---------------------------------------------------------------------------
  // unmuteEventType
  // ---------------------------------------------------------------------------

  describe('unmuteEventType', () => {
    it('removes the event type from the muted list', () => {
      useSettingsStore.getState().muteEventType('earthquake');
      useSettingsStore.getState().unmuteEventType('earthquake');
      expect(useSettingsStore.getState().mutedEventTypes).not.toContain('earthquake');
    });

    it('is a no-op when the type was not muted', () => {
      useSettingsStore.getState().unmuteEventType('volcano');
      expect(useSettingsStore.getState().mutedEventTypes).toEqual([]);
    });

    it('does not affect other muted types', () => {
      useSettingsStore.getState().muteEventType('earthquake');
      useSettingsStore.getState().muteEventType('news');
      useSettingsStore.getState().unmuteEventType('earthquake');
      expect(useSettingsStore.getState().mutedEventTypes).not.toContain('earthquake');
      expect(useSettingsStore.getState().mutedEventTypes).toContain('news');
    });
  });

  // ---------------------------------------------------------------------------
  // isEventTypeMuted
  // ---------------------------------------------------------------------------

  describe('isEventTypeMuted', () => {
    it('returns false for an un-muted type', () => {
      expect(useSettingsStore.getState().isEventTypeMuted('weather')).toBe(false);
    });

    it('returns true for a muted type', () => {
      useSettingsStore.getState().muteEventType('weather');
      expect(useSettingsStore.getState().isEventTypeMuted('weather')).toBe(true);
    });

    it('returns false again after unmuting', () => {
      useSettingsStore.getState().muteEventType('weather');
      useSettingsStore.getState().unmuteEventType('weather');
      expect(useSettingsStore.getState().isEventTypeMuted('weather')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // setTickerSpeed
  // ---------------------------------------------------------------------------

  describe('setTickerSpeed', () => {
    it('updates the ticker speed', () => {
      useSettingsStore.getState().setTickerSpeed('fast');
      expect(useSettingsStore.getState().tickerSpeed).toBe('fast');
    });

    it('accepts all valid presets', () => {
      const speeds = ['slow', 'normal', 'fast'] as const;
      for (const speed of speeds) {
        useSettingsStore.getState().setTickerSpeed(speed);
        expect(useSettingsStore.getState().tickerSpeed).toBe(speed);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Persistence round-trip
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    it('writes state to localStorage under the world-pulse-settings key', () => {
      useSettingsStore.getState().muteEventType('earthquake');
      useSettingsStore.getState().setTickerSpeed('slow');

      const raw = localStorage.getItem('world-pulse-settings');
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw!);
      const state = stored.state as { mutedEventTypes: EventType[]; tickerSpeed: string };
      expect(state.mutedEventTypes).toContain('earthquake');
      expect(state.tickerSpeed).toBe('slow');
    });

    it('rehydrates from localStorage on store initialization', () => {
      // Pre-populate localStorage as if a previous session had saved settings
      localStorage.setItem(
        'world-pulse-settings',
        JSON.stringify({
          state: { mutedEventTypes: ['volcano', 'news'], tickerSpeed: 'fast' },
          version: 0,
        })
      );

      // Force a re-initialization by creating a new store snapshot via rehydrate
      useSettingsStore.persist.rehydrate();

      expect(useSettingsStore.getState().mutedEventTypes).toContain('volcano');
      expect(useSettingsStore.getState().mutedEventTypes).toContain('news');
      expect(useSettingsStore.getState().tickerSpeed).toBe('fast');
    });
  });
});
