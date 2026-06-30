import { GeologicTicker } from './widgets/GeologicTicker';
import { SeismicWidget } from './widgets/SeismicWidget';
import { EventRateWidget } from './widgets/EventRateWidget';
import { TypeDistWidget } from './widgets/TypeDistWidget';
import { SeverityWidget } from './widgets/SeverityWidget';

/** Fixed, independently-scrollable left column of mission-control telemetry widgets. */
export function LeftColumn() {
  return (
    <div
      className="fixed left-5 top-[150px] z-10 w-[220px] overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 150px - 70px)' }}
    >
      <div className="flex flex-col gap-3">
        <GeologicTicker />
        <SeismicWidget />
        <EventRateWidget />
        <TypeDistWidget />
        <SeverityWidget />
      </div>
    </div>
  );
}
