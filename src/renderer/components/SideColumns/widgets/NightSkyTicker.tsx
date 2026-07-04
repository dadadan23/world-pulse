import { useAppStore } from '../../../store/useAppStore';
import { sortByPriority } from '../../../utils/sortByPriority';
import { VerticalEventTicker } from './VerticalEventTicker';

const NIGHT_SKY_TYPES = new Set(['iss', 'aurora', 'asteroid', 'planet']);

/** Right column widget: scrolling feed of recent ISS, aurora, asteroid, and planet events. */
export function NightSkyTicker() {
  const events = useAppStore((state) => state.events);

  const nightSkyEvents = sortByPriority(events.filter((e) => NIGHT_SKY_TYPES.has(e.type)));

  return <VerticalEventTicker headerLabel="◆ NIGHT SKY" events={nightSkyEvents} />;
}
