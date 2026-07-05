import { NightSkyTicker } from './widgets/NightSkyTicker';
import { ISSWidget } from './widgets/ISSWidget';
import { AuroraWidget } from './widgets/AuroraWidget';
import { AsteroidWidget } from './widgets/AsteroidWidget';
import { WeatherWidget } from '../WeatherWidget/WeatherWidget';

interface RightColumnProps {
  /** Portrait (iPad) mode: collapse the vertical strip into a full-width horizontal band. */
  isPortrait?: boolean;
}

const WIDGETS = [NightSkyTicker, ISSWidget, AuroraWidget, AsteroidWidget, WeatherWidget];

/**
 * Fixed, independently-scrollable right column of mission-control telemetry widgets.
 * In portrait orientation this re-flows into a full-width band above the ticker
 * (DESIGN.md "Responsive Layout" addendum) -- same `fixed` elements, different
 * top/left/right/bottom values and flex direction, no positioning-strategy switch.
 */
export function RightColumn({ isPortrait = false }: RightColumnProps) {
  if (isPortrait) {
    return (
      <div className="fixed left-0 right-0 bottom-[42px] z-10 h-[132px] overflow-x-auto overflow-y-hidden px-5">
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
      className="fixed right-5 top-[460px] z-10 w-[220px] overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 460px - 70px)' }}
    >
      <div className="flex flex-col gap-3">
        <NightSkyTicker />
        <ISSWidget />
        <AuroraWidget />
        <AsteroidWidget />
        <WeatherWidget />
      </div>
    </div>
  );
}
