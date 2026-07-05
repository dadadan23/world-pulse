import type { EventType } from '@shared/types';

/** All known event types with a human-readable label, in settings-panel display order. */
export const EVENT_TYPE_LABELS: Array<{ type: EventType; label: string }> = [
  { type: 'earthquake', label: 'Earthquakes' },
  { type: 'volcano', label: 'Volcanoes' },
  { type: 'weather', label: 'Weather' },
  { type: 'news', label: 'News' },
  { type: 'astronomy', label: 'Astronomy' },
  { type: 'iss', label: 'ISS' },
  { type: 'aurora', label: 'Aurora' },
  { type: 'asteroid', label: 'Asteroids' },
  { type: 'planet', label: 'Planets' },
  { type: 'music', label: 'Music' },
  { type: 'ocean', label: 'Ocean' },
  { type: 'calendar', label: 'Calendar' },
  { type: 'historical', label: 'Historical' },
];
