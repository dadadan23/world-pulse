import { create } from 'zustand';
import type { Event, ConnectionStatus, CollectorHealth } from '@shared/types';
import {
  selectFeaturedEvent,
  rotateFeaturedEvent as rotateFeaturedEventFn,
} from './eventPrioritizer';

export type GeolocationStatus = 'pending' | 'granted' | 'denied';

interface AppState {
  // Connection state
  connectionStatus: ConnectionStatus;
  serverStatus: {
    ready: boolean;
    collectors: CollectorHealth[];
  } | null;

  // Event data
  events: Event[];
  featuredEvent: Event | null;
  selectedEvent: Event | null;

  // UI state
  isInitialized: boolean;
  hasEverConnected: boolean;
  skyMapOpen: boolean;

  // Geolocation
  userLat: number | null;
  userLon: number | null;
  geolocationStatus: GeolocationStatus;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setServerStatus: (status: AppState['serverStatus']) => void;
  setEvents: (events: Event[]) => void;
  addEvents: (events: Event[]) => void;
  setFeaturedEvent: (event: Event | null) => void;
  rotateFeaturedEvent: () => void;
  setSelectedEvent: (event: Event | null) => void;
  setInitialized: (initialized: boolean) => void;
  setSkyMapOpen: (open: boolean) => void;
  setGeolocation: (lat: number, lon: number) => void;
  setGeolocationDenied: () => void;
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
  skyMapOpen: false,
  userLat: null,
  userLon: null,
  geolocationStatus: 'pending',

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

  rotateFeaturedEvent: () => {
    const { events, featuredEvent } = get();
    set({ featuredEvent: rotateFeaturedEventFn(events, featuredEvent) });
  },

  setSelectedEvent: (event) => set({ selectedEvent: event }),

  setInitialized: (initialized) => set({ isInitialized: initialized }),

  setSkyMapOpen: (open) => set({ skyMapOpen: open }),

  setGeolocation: (lat, lon) => set({ userLat: lat, userLon: lon, geolocationStatus: 'granted' }),

  setGeolocationDenied: () => set({ userLat: null, userLon: null, geolocationStatus: 'denied' }),
}));
