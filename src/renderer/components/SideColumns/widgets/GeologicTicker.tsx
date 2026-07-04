import { useAppStore } from '../../../store/useAppStore';
import { sortByPriority } from '../../../utils/sortByPriority';
import { VerticalEventTicker } from './VerticalEventTicker';

/** Left column widget: scrolling feed of recent earthquake + volcano events. */
export function GeologicTicker() {
  const events = useAppStore((state) => state.events);

  const quakesAndVolcanoes = sortByPriority(
    events.filter((e) => e.type === 'earthquake' || e.type === 'volcano')
  );

  return <VerticalEventTicker headerLabel="◆ GEOLOGIC PULSE" events={quakesAndVolcanoes} />;
}
