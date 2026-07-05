import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EventType } from '@shared/types';

export type TickerSpeed = 'slow' | 'normal' | 'fast';

interface SettingsState {
  mutedEventTypes: EventType[];
  tickerSpeed: TickerSpeed;

  muteEventType: (type: EventType) => void;
  unmuteEventType: (type: EventType) => void;
  toggleEventTypeMuted: (type: EventType) => void;
  setTickerSpeed: (speed: TickerSpeed) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      mutedEventTypes: [],
      tickerSpeed: 'normal',

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
    }),
    {
      name: 'world-pulse-settings',
    }
  )
);
