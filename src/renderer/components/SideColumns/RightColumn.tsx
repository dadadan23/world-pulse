import { NightSkyTicker } from './widgets/NightSkyTicker';
import { ISSWidget } from './widgets/ISSWidget';
import { AuroraWidget } from './widgets/AuroraWidget';
import { AsteroidWidget } from './widgets/AsteroidWidget';
import { WeatherWidget } from '../WeatherWidget/WeatherWidget';

/** Fixed, independently-scrollable right column of mission-control telemetry widgets. */
export function RightColumn() {
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
