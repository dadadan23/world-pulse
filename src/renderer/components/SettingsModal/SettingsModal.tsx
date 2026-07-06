import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { EVENT_TYPE_LABELS } from '../../utils/eventTypeLabels';
import { TICKER_SPEED_OPTIONS } from '../../utils/tickerSpeed';
import { SEVERITY_LEVELS } from '@shared/types';
import { saveLocationOverride, clearLocationOverride } from '../../utils/locationSettingsApi';

/**
 * Slide-in settings modal (Modals z-50+ layer per DESIGN.md's HUD Layout table).
 */
export function SettingsModal() {
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);

  const mutedEventTypes = useSettingsStore((state) => state.mutedEventTypes);
  const toggleEventTypeMuted = useSettingsStore((state) => state.toggleEventTypeMuted);
  const tickerSpeed = useSettingsStore((state) => state.tickerSpeed);
  const setTickerSpeed = useSettingsStore((state) => state.setTickerSpeed);
  const severityThreshold = useSettingsStore((state) => state.severityThreshold);
  const setSeverityThreshold = useSettingsStore((state) => state.setSeverityThreshold);
  const audioChimeEnabled = useSettingsStore((state) => state.audioChimeEnabled);
  const setAudioChimeEnabled = useSettingsStore((state) => state.setAudioChimeEnabled);
  const locationOverride = useSettingsStore((state) => state.locationOverride);
  const setLocationOverride = useSettingsStore((state) => state.setLocationOverride);

  const [latInput, setLatInput] = useState(locationOverride ? String(locationOverride.lat) : '');
  const [lonInput, setLonInput] = useState(locationOverride ? String(locationOverride.lon) : '');
  const [nameInput, setNameInput] = useState(locationOverride?.name ?? '');
  const [countryInput, setCountryInput] = useState(locationOverride?.countryCode ?? '');
  const [locationError, setLocationError] = useState<string | null>(null);

  // The override lives in server memory (not disk) -- re-assert a persisted
  // override once on load in case the backend restarted since it was saved.
  useEffect(() => {
    if (locationOverride) {
      saveLocationOverride(locationOverride).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  async function handleSaveLocation(): Promise<void> {
    setLocationError(null);
    const lat = Number(latInput);
    const lon = Number(lonInput);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setLocationError('LATITUDE MUST BE -90 TO 90');
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setLocationError('LONGITUDE MUST BE -180 TO 180');
      return;
    }
    if (countryInput && !/^[A-Za-z]{2}$/.test(countryInput)) {
      setLocationError('COUNTRY CODE MUST BE 2 LETTERS');
      return;
    }

    try {
      const saved = await saveLocationOverride({
        lat,
        lon,
        name: nameInput.trim() || undefined,
        countryCode: countryInput.trim() || undefined,
      });
      setLocationOverride(saved);
    } catch {
      setLocationError('SAVE FAILED — CHECK CONNECTION');
    }
  }

  async function handleClearLocation(): Promise<void> {
    setLocationError(null);
    try {
      await clearLocationOverride();
      setLocationOverride(null);
      setLatInput('');
      setLonInput('');
      setNameInput('');
      setCountryInput('');
    } catch {
      setLocationError('CLEAR FAILED — CHECK CONNECTION');
    }
  }

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

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5">
          <section>
            <span className="ob-label text-ob-text-dim tracking-ultrawide">EVENT TYPES</span>
            <div className="flex flex-col gap-1.5 mt-2">
              {EVENT_TYPE_LABELS.map(({ type, label }) => {
                const isMuted = mutedEventTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleEventTypeMuted(type)}
                    aria-pressed={!isMuted}
                    className={`w-full flex items-center justify-between px-3 py-1.5 border transition-colors duration-150 cursor-pointer ${
                      isMuted
                        ? 'border-ob-border text-ob-text-dim'
                        : 'border-ob-cyan/40 text-ob-text'
                    }`}
                  >
                    <span className="ob-label">{label}</span>
                    <span className={`ob-label ${isMuted ? 'text-ob-text-dim' : 'text-ob-cyan'}`}>
                      {isMuted ? 'MUTED' : 'ON'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <span className="ob-label text-ob-text-dim tracking-ultrawide">TICKER SPEED</span>
            <div className="flex gap-2 mt-2">
              {TICKER_SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setTickerSpeed(speed)}
                  aria-pressed={tickerSpeed === speed}
                  className={`flex-1 ob-label py-1.5 border transition-colors duration-150 cursor-pointer ${
                    tickerSpeed === speed
                      ? 'border-ob-cyan/40 text-ob-cyan'
                      : 'border-ob-border text-ob-text-dim'
                  }`}
                >
                  {speed.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section>
            <span className="ob-label text-ob-text-dim tracking-ultrawide">SEVERITY ALERTS</span>
            <div className="flex flex-col gap-3 mt-2">
              <label className="flex flex-col gap-1.5">
                <span className="ob-label text-ob-text-dim">
                  THRESHOLD: {severityThreshold.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={SEVERITY_LEVELS.info}
                  max={SEVERITY_LEVELS.critical}
                  step={0.5}
                  value={severityThreshold}
                  onChange={(e) => setSeverityThreshold(Number(e.target.value))}
                  aria-label="Severity threshold"
                  className="w-full accent-ob-cyan"
                />
              </label>

              <button
                type="button"
                onClick={() => setAudioChimeEnabled(!audioChimeEnabled)}
                aria-pressed={audioChimeEnabled}
                className={`w-full flex items-center justify-between px-3 py-1.5 border transition-colors duration-150 cursor-pointer ${
                  audioChimeEnabled
                    ? 'border-ob-cyan/40 text-ob-text'
                    : 'border-ob-border text-ob-text-dim'
                }`}
              >
                <span className="ob-label">AUDIO CHIME</span>
                <span
                  className={`ob-label ${audioChimeEnabled ? 'text-ob-cyan' : 'text-ob-text-dim'}`}
                >
                  {audioChimeEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </section>

          <section>
            <span className="ob-label text-ob-text-dim tracking-ultrawide">NEAR YOU LOCATION</span>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="LAT"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  aria-label="Latitude"
                  className="w-1/2 ob-label bg-transparent border border-ob-border px-2 py-1.5 text-ob-text focus:border-ob-border-active focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="LON"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  aria-label="Longitude"
                  className="w-1/2 ob-label bg-transparent border border-ob-border px-2 py-1.5 text-ob-text focus:border-ob-border-active focus:outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="DISPLAY NAME (OPTIONAL)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                aria-label="Location display name"
                className="w-full ob-label bg-transparent border border-ob-border px-2 py-1.5 text-ob-text focus:border-ob-border-active focus:outline-none"
              />
              <input
                type="text"
                placeholder="COUNTRY CODE (E.G. US)"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value.toUpperCase())}
                maxLength={2}
                aria-label="Country code (for near-you news)"
                className="w-full ob-label bg-transparent border border-ob-border px-2 py-1.5 text-ob-text focus:border-ob-border-active focus:outline-none"
              />

              {locationError && (
                <span role="alert" className="ob-label text-ob-danger">
                  {locationError}
                </span>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveLocation()}
                  className="flex-1 ob-label py-1.5 border border-ob-cyan/40 text-ob-cyan transition-colors duration-150 cursor-pointer"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearLocation()}
                  disabled={!locationOverride}
                  className="flex-1 ob-label py-1.5 border border-ob-border text-ob-text-dim transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  CLEAR
                </button>
              </div>

              {locationOverride && (
                <span className="ob-label text-ob-text-dim">
                  ACTIVE:{' '}
                  {locationOverride.name ??
                    `${locationOverride.lat.toFixed(2)}, ${locationOverride.lon.toFixed(2)}`}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
