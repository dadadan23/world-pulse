import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * Slide-in settings modal (Modals z-50+ layer per DESIGN.md's HUD Layout table).
 * UI shell only -- functional controls (mute toggles, ticker speed, location
 * override) are wired in by their own stories.
 */
export function SettingsModal() {
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settingsOpen, setSettingsOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end ob-transition-fade"
      style={{
        background: settingsOpen ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
        backdropFilter: settingsOpen ? 'blur(4px)' : 'none',
        opacity: settingsOpen ? 1 : 0,
        pointerEvents: settingsOpen ? 'auto' : 'none',
      }}
      onClick={() => setSettingsOpen(false)}
      aria-hidden={!settingsOpen}
    >
      <div
        className="ob-hud-panel flex flex-col h-full"
        style={{
          width: '340px',
          transform: settingsOpen ? 'translateX(0)' : 'translateX(360px)',
          transition: `transform var(--ob-timing-fade) var(--ob-easing-mechanical)`,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-ob-border">
          <span id="settings-modal-title" className="ob-heading text-ob-cyan tracking-ultrawide">
            SETTINGS
          </span>
          <button
            onClick={() => setSettingsOpen(false)}
            tabIndex={settingsOpen ? 0 : -1}
            className="ob-label text-ob-text-dim border border-ob-border px-3 py-1 hover:border-ob-border-active hover:text-ob-text transition-colors duration-150 cursor-pointer"
          >
            [ ESC ] CLOSE
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto" />
      </div>
    </div>
  );
}
