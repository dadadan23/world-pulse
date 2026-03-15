import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { selectFeaturedEvent } from '../store/eventPrioritizer';

/** Rotation interval (ms) -- cycle featured event every 60 seconds */
const ROTATION_INTERVAL_MS = 60_000;

/**
 * Auto-rotates the featured event every 60 seconds.
 * Picks the next-best event that is not the current featured event,
 * falling back to the top pick when only one candidate remains.
 */
export function useAutoRotation(): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const { events, featuredEvent, setFeaturedEvent } = useAppStore.getState();
      if (events.length === 0) return;

      // Exclude the current featured event so we rotate to something new
      const candidates = featuredEvent ? events.filter((e) => e.id !== featuredEvent.id) : events;

      const next = selectFeaturedEvent(candidates.length > 0 ? candidates : events);
      if (next) setFeaturedEvent(next);
    }, ROTATION_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
