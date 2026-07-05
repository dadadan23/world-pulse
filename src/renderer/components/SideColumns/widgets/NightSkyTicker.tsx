import { useVisibleEvents } from '../../../hooks/useVisibleEvents';
import { VerticalEventTicker } from './VerticalEventTicker';

const NIGHT_SKY_TYPES = new Set(['iss', 'aurora', 'asteroid', 'planet']);

/** Right column widget: scrolling feed of recent ISS, aurora, asteroid, and planet events. */
export function NightSkyTicker() {
  const events = useVisibleEvents();

  const nightSkyEvents = events
    .filter((e) => NIGHT_SKY_TYPES.has(e.type))
    .sort((a, b) => b.timestamp - a.timestamp);

  return <VerticalEventTicker headerLabel="◆ NIGHT SKY" events={nightSkyEvents} />;
}
