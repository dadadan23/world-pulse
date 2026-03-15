import { useState, useEffect } from 'react';
import { Header } from '../Header/Header';
import { Globe } from '../Globe/Globe';
import { SkyMap } from '../SkyMap/SkyMap';
import { EventPanel } from '../EventPanel/EventPanel';
import { Ticker } from '../Ticker/Ticker';
import { useAutoRotation } from '../../hooks/useAutoRotation';

export function Dashboard() {
  const [isBooted, setIsBooted] = useState(false);
  useAutoRotation();

  useEffect(() => {
    // Trigger boot sequence after mount
    const timer = setTimeout(() => setIsBooted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-ob-bg-primary text-ob-text font-mono ob-dot-grid ob-scanline">
      {/* Header */}
      <div className={isBooted ? 'ob-boot-fade-in ob-boot-delay-1' : 'opacity-0'}>
        <Header />
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-0 grid grid-cols-[1.5fr_0.5fr_0.5fr] grid-rows-[1fr] gap-4 p-4 overflow-hidden">
        <div className={`min-h-0 ${isBooted ? 'ob-boot-fade-in ob-boot-delay-2' : 'opacity-0'}`}>
          <Globe />
        </div>
        <div className={`min-h-0 ${isBooted ? 'ob-boot-fade-in ob-boot-delay-3' : 'opacity-0'}`}>
          <SkyMap />
        </div>
        <div className={`min-h-0 ${isBooted ? 'ob-boot-fade-in ob-boot-delay-4' : 'opacity-0'}`}>
          <EventPanel />
        </div>
      </main>

      {/* Ticker */}
      <div className={isBooted ? 'ob-boot-fade-in ob-boot-delay-5' : 'opacity-0'}>
        <Ticker />
      </div>
    </div>
  );
}
