import { useAppStore } from '../../../store/useAppStore';
import { VerticalEventTicker } from './VerticalEventTicker';

/** Left column widget: scrolling feed of recent earthquake + volcano events. */
export function GeologicTicker() {
  const events = useAppStore((state) => state.events);

  const quakesAndVolcanoes = events
    .filter((e) => e.type === 'earthquake' || e.type === 'volcano')
    .sort((a, b) => b.timestamp - a.timestamp);

  return <VerticalEventTicker headerLabel="◆ GEOLOGIC PULSE" events={quakesAndVolcanoes} />;
}
