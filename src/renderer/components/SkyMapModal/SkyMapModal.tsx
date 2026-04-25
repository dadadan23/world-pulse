import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SkyMap } from '../SkyMap/SkyMap';

/** Full-screen modal overlay for the SkyMap. Opened via HudCollectorPanel toggle. */
export function SkyMapModal() {
  const skyMapOpen = useAppStore((state) => state.skyMapOpen);
  const setSkyMapOpen = useAppStore((state) => state.setSkyMapOpen);
  const userLat = useAppStore((state) => state.userLat);
  const userLon = useAppStore((state) => state.userLon);

  useEffect(() => {
    if (!skyMapOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSkyMapOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [skyMapOpen, setSkyMapOpen]);

  if (!skyMapOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={() => setSkyMapOpen(false)}
    >
      <div
        className="ob-hud-panel flex flex-col"
        style={{ width: '80vw', height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sky-map-modal-title"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-ob-border">
          <span id="sky-map-modal-title" className="ob-heading text-ob-cyan tracking-ultrawide">
            SKY MAP -- CELESTIAL VIEW
          </span>
          <button
            onClick={() => setSkyMapOpen(false)}
            className="ob-label text-ob-text-dim border border-ob-border px-3 py-1 hover:border-ob-border-active hover:text-ob-text transition-colors duration-150 cursor-pointer"
          >
            [ ESC ] CLOSE
          </button>
        </div>

        {/* Sky Map canvas */}
        <div className="flex-1 min-h-0">
          <SkyMap observerLat={userLat ?? 30} observerLon={userLon ?? -40} />
        </div>
      </div>
    </div>
  );
}
