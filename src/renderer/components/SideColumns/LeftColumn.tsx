import { GeologicTicker } from './widgets/GeologicTicker';
import { SeismicWidget } from './widgets/SeismicWidget';
import { EventRateWidget } from './widgets/EventRateWidget';
import { TypeDistWidget } from './widgets/TypeDistWidget';
import { SeverityWidget } from './widgets/SeverityWidget';

interface LeftColumnProps {
  /** Portrait (iPad) mode: collapse the vertical strip into a full-width horizontal band. */
  isPortrait?: boolean;
}

const WIDGETS = [GeologicTicker, SeismicWidget, EventRateWidget, TypeDistWidget, SeverityWidget];

/**
 * Fixed, independently-scrollable left column of mission-control telemetry widgets.
 * In portrait orientation this re-flows into a full-width band under the header
 * (DESIGN.md "Responsive Layout" addendum) -- same `fixed` elements, different
 * top/left/right/bottom values and flex direction, no positioning-strategy switch.
 */
export function LeftColumn({ isPortrait = false }: LeftColumnProps) {
  if (isPortrait) {
    return (
      <div className="fixed left-0 right-0 top-[64px] z-10 h-[132px] overflow-x-auto overflow-y-hidden px-5">
        <div className="flex flex-row gap-3 h-full">
          {WIDGETS.map((Widget) => (
            <div key={Widget.name} className="w-[220px] shrink-0">
              <Widget />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
