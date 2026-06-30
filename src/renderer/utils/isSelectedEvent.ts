import type { Event } from '@shared/types';

/** Whether `event` is the currently selected event, for consistent row-highlight checks across tickers. */
export function isSelectedEvent(event: Event, selectedEvent: Event | null): boolean {
  return event.id === selectedEvent?.id;
}
