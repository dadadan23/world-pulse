import { useGeolocation } from '../../hooks/useGeolocation';
import { Globe } from '../Globe/Globe';
import { HudStatusPanel } from '../HudStatusPanel/HudStatusPanel';
import { HudCollectorPanel } from '../HudCollectorPanel/HudCollectorPanel';
import { HudEventPanel } from '../HudEventPanel/HudEventPanel';
import { SkyMapModal } from '../SkyMapModal/SkyMapModal';
import { SourceDirectoryModal } from '../SourceDirectoryModal/SourceDirectoryModal';
import { Ticker } from '../Ticker/Ticker';
import { PrimaryDegradedBanner } from '../PrimaryDegradedBanner/PrimaryDegradedBanner';

/**
 * Globe-dominant layout.
 * The Three.js Globe canvas fills 100vw x 100vh.
 * All UI elements are fixed-position HUD overlays on top of the canvas.
 */
export function Dashboard() {
  // Request geolocation once on mount; result stored in Zustand
  useGeolocation();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ob-bg-primary">
      {/* Globe canvas -- fills entire viewport, z-0 */}
      <div className="fixed inset-0 z-0">
        <Globe />
      </div>

      {/* Ambient effects -- above globe, below HUD panels */}

      {/* Ambient overlays: dot grid (z-1) and scanline sweep (z-2) sit above globe (z-0) */}
      <div className="fixed inset-0 z-[1] pointer-events-none ob-dot-grid ob-dot-grid-animated" />
      <div className="fixed inset-0 z-[2] pointer-events-none ob-scanline" />

      {/* HUD overlays -- z-20 and above */}

      {/* Top-left: status + clock + location */}
      <HudStatusPanel />

      {/* Top-right: collector badges + sky map toggle */}
      <HudCollectorPanel />

      {/* Right center: event detail slide-in */}
      <HudEventPanel />

      {/* Bottom: scrolling event ticker */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <Ticker />
      </div>

      {/* Sky Map modal (fullscreen overlay) */}
      <SkyMapModal />

      {/* Source Directory modal (fullscreen overlay) */}
      <SourceDirectoryModal />

      {/* Primary source degradation warning -- z-40, below ConnectionBanner (z-50) */}
      <PrimaryDegradedBanner />
    </div>
  );
}
