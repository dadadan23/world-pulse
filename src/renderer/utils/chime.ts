/**
 * Minimal Web Audio API chime for high-severity events, opt-in only (see
 * useSettingsStore.audioChimeEnabled). Browsers block audio playback before
 * a user gesture, so the shared AudioContext is created lazily and only on
 * the first user interaction (click/keydown/touchstart) -- calling
 * `playChime()` before that interaction is a documented silent no-op rather
 * than a thrown autoplay-policy error.
 */

import type { EventType } from '@shared/types';

/** Whether a batch of newly-arrived events should trigger the chime. */
export function shouldPlayChime(
  events: Array<{ type: EventType; severity?: number }>,
  options: { mutedEventTypes: EventType[]; severityThreshold: number }
): boolean {
  return events.some(
    (event) =>
      !options.mutedEventTypes.includes(event.type) &&
      (event.severity ?? 0) >= options.severityThreshold
  );
}

let audioContext: AudioContext | null = null;
let armed = false;

function handleFirstInteraction(): void {
  if (armed) return;
  armed = true;
  audioContext = new AudioContext();
  window.removeEventListener('pointerdown', handleFirstInteraction);
  window.removeEventListener('keydown', handleFirstInteraction);
}

/** Call once on app mount to arm the chime as soon as the user interacts with the page. */
export function armChimeOnFirstInteraction(): void {
  window.addEventListener('pointerdown', handleFirstInteraction);
  window.addEventListener('keydown', handleFirstInteraction);
}

/** Plays a single short chime tone. No-op if the user hasn't interacted with the page yet. */
export function playChime(): void {
  if (!armed || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.4);
}
