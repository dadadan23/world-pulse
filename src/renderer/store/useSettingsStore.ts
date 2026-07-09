import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EventType } from '@shared/types';
import { SEVERITY_LEVELS } from '@shared/types';

export type TickerSpeed = 'slow' | 'normal' | 'fast';

/** Default severity threshold at/above which ticker rows are pinned + pulsed. */
export const DEFAULT_SEVERITY_THRESHOLD = SEVERITY_LEVELS.high;

/** "Near you" location override (#234), mirrors src/server/locationOverride.ts. */
export interface LocationOverride {
  lat: number;
  lon: number;
  name?: string;
  countryCode?: string;
}

interface SettingsState {
  mutedEventTypes: EventType[];
  tickerSpeed: TickerSpeed;
  severityThreshold: number;
  audioChimeEnabled: boolean;
  locationOverride: LocationOverride | null;

  muteEventType: (type: EventType) => void;
  unmuteEventType: (type: EventType) => void;
  toggleEventTypeMuted: (type: EventType) => void;
  setTickerSpeed: (speed: TickerSpeed) => void;
  setSeverityThreshold: (threshold: number) => void;
  setAudioChimeEnabled: (enabled: boolean) => void;
  setLocationOverride: (override: LocationOverride | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      mutedEventTypes: [],
      tickerSpeed: 'normal',
      severityThreshold: DEFAULT_SEVERITY_THRESHOLD,
      audioChimeEnabled: false,
      locationOverride: null,

      muteEventType: (type) => {
        const { mutedEventTypes } = get();
        if (mutedEventTypes.includes(type)) return;
        set({ mutedEventTypes: [...mutedEventTypes, type] });
      },

      unmuteEventType: (type) => {
        set({ mutedEventTypes: get().mutedEventTypes.filter((t) => t !== type) });
      },

      toggleEventTypeMuted: (type) => {
        const { mutedEventTypes } = get();
        if (mutedEventTypes.includes(type)) {
          set({ mutedEventTypes: mutedEventTypes.filter((t) => t !== type) });
        } else {
          set({ mutedEventTypes: [...mutedEventTypes, type] });
        }
      },

      setTickerSpeed: (speed) => set({ tickerSpeed: speed }),
      setSeverityThreshold: (threshold) => set({ severityThreshold: threshold }),
      setAudioChimeEnabled: (enabled) => set({ audioChimeEnabled: enabled }),
      setLocationOverride: (override) => set({ locationOverride: override }),
    }),
    {
      name: 'world-pulse-settings',
    }
  )
);
