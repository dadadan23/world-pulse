import { create } from 'zustand';
import type { Event, ConnectionStatus } from '@shared/types';
import { selectFeaturedEvent } from './eventPrioritizer';

interface AppState {
  // Connection state
  connectionStatus: ConnectionStatus;
  serverStatus: {
    ready: boolean;
    collectors: Array<{
      name: string;
      enabled: boolean;
      running: boolean;
    }>;
  } | null;

  // Event data
  events: Event[];
  featuredEvent: Event | null;
  selectedEvent: Event | null;

  // UI state
  isInitialized: boolean;
  hasEverConnected: boolean;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setServerStatus: (status: AppState['serverStatus']) => void;
  setEvents: (events: Event[]) => void;
  addEvents: (events: Event[]) => void;
  setFeaturedEvent: (event: Event | null) => void;
  setSelectedEvent: (event: Event | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  connectionStatus: 'connecting',
  serverStatus: null,
  events: [],
  featuredEvent: null,
  selectedEvent: null,
  isInitialized: false,
  hasEverConnected: false,

  // Actions
  setConnectionStatus: (status) =>
    set((state) => ({
      connectionStatus: status,
      hasEverConnected: state.hasEverConnected || status === 'connected',
    })),

  setServerStatus: (status) => set({ serverStatus: status }),

  setEvents: (events) => {
    set({ events });
    // Auto-select featured event if none set
    if (!get().featuredEvent && events.length > 0) {
      set({ featuredEvent: selectFeaturedEvent(events) });
    }
  },

  addEvents: (newEvents) => {
    const { events } = get();

    // Deduplicate: Remove existing events with matching IDs
    const newIds = new Set(newEvents.map((e) => e.id));
    const filtered = events.filter((e) => !newIds.has(e.id));

    // Combine: new events first, then existing (without duplicates)
    const combined = [...newEvents, ...filtered].slice(0, 100);

    set({ events: combined });

    // Update featured to the highest-priority event from the new batch
    const best = selectFeaturedEvent(newEvents);
    if (best && (best.severity ?? 0) >= 5) {
      set({ featuredEvent: best });
    }
  },

  setFeaturedEvent: (event) => set({ featuredEvent: event }),

  setSelectedEvent: (event) => set({ selectedEvent: event }),

  setInitialized: (initialized) => set({ isInitialized: initialized }),
}));
