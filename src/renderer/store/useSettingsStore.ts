import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EventType } from '@shared/types';

export type TickerSpeed = 'slow' | 'normal' | 'fast';

interface SettingsState {
  /** Event types currently hidden from all tickers, globe markers, and side-column widgets. */
  mutedEventTypes: EventType[];
  /** Ticker scroll speed preset. */
  tickerSpeed: TickerSpeed;

  // Actions
  muteEventType: (type: EventType) => void;
  unmuteEventType: (type: EventType) => void;
  setTickerSpeed: (speed: TickerSpeed) => void;
  isEventTypeMuted: (type: EventType) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default state: nothing muted, normal scroll speed
      mutedEventTypes: [],
      tickerSpeed: 'normal',

      muteEventType: (type) =>
        set((state) => ({
          mutedEventTypes: state.mutedEventTypes.includes(type)
            ? state.mutedEventTypes
            : [...state.mutedEventTypes, type],
        })),

      unmuteEventType: (type) =>
        set((state) => ({
          mutedEventTypes: state.mutedEventTypes.filter((t) => t !== type),
        })),

      setTickerSpeed: (speed) => set({ tickerSpeed: speed }),

      isEventTypeMuted: (type) => get().mutedEventTypes.includes(type),
    }),
    {
      name: 'world-pulse-settings',
    }
  )
);
