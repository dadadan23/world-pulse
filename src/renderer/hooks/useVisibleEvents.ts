import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Event } from '@shared/types';

/**
 * All cached events with muted event types (per useSettingsStore) filtered out.
 * Filtering happens client-side over the full cached event list, so un-muting
 * immediately restores already-cached events without a server refetch, and
 * newly muted types disappear without needing a socket reconnect.
 */
export function useVisibleEvents(): Event[] {
  const events = useAppStore((state) => state.events);
  const mutedEventTypes = useSettingsStore((state) => state.mutedEventTypes);

  return useMemo(
    () => events.filter((event) => !mutedEventTypes.includes(event.type)),
    [events, mutedEventTypes]
  );
}
