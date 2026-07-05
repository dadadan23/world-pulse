import { useVisibleEvents } from '../../../hooks/useVisibleEvents';
import { VerticalEventTicker } from './VerticalEventTicker';

/** Left column widget: scrolling feed of recent earthquake + volcano events. */
export function GeologicTicker() {
  const events = useVisibleEvents();

  const quakesAndVolcanoes = events
    .filter((e) => e.type === 'earthquake' || e.type === 'volcano')
    .sort((a, b) => b.timestamp - a.timestamp);

  return <VerticalEventTicker headerLabel="◆ GEOLOGIC PULSE" events={quakesAndVolcanoes} />;
}
