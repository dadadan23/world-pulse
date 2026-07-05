import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shouldPlayChime, armChimeOnFirstInteraction, playChime } from './chime';

describe('shouldPlayChime', () => {
  it('returns false for an empty batch', () => {
    expect(shouldPlayChime([], { mutedEventTypes: [], severityThreshold: 7 })).toBe(false);
  });

  it('returns false when every event is below the severity threshold', () => {
    const events = [{ type: 'earthquake' as const, severity: 3 }];
    expect(shouldPlayChime(events, { mutedEventTypes: [], severityThreshold: 7 })).toBe(false);
  });

  it('returns true when an event meets the severity threshold', () => {
    const events = [{ type: 'earthquake' as const, severity: 7 }];
    expect(shouldPlayChime(events, { mutedEventTypes: [], severityThreshold: 7 })).toBe(true);
  });

  it('ignores high-severity events of a muted type', () => {
    const events = [{ type: 'earthquake' as const, severity: 9 }];
    expect(shouldPlayChime(events, { mutedEventTypes: ['earthquake'], severityThreshold: 7 })).toBe(
      false
    );
  });

  it('returns true if any event in a mixed batch qualifies', () => {
    const events = [
      { type: 'weather' as const, severity: 2 },
      { type: 'earthquake' as const, severity: 8 },
    ];
    expect(shouldPlayChime(events, { mutedEventTypes: [], severityThreshold: 7 })).toBe(true);
  });

  it('treats a missing severity as 0', () => {
    const events = [{ type: 'earthquake' as const }];
    expect(shouldPlayChime(events, { mutedEventTypes: [], severityThreshold: 0 })).toBe(true);
  });
});

describe('playChime arming', () => {
  const createOscillator = vi.fn();
  const createGain = vi.fn();

  function mockNode() {
    return {
      connect: vi.fn(),
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  class MockAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator = createOscillator.mockImplementation(mockNode);
    createGain = createGain.mockImplementation(mockNode);
  }

  beforeEach(() => {
    createOscillator.mockClear();
    createGain.mockClear();
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  it('does not create any audio nodes before the first user interaction', () => {
    playChime();
    expect(createOscillator).not.toHaveBeenCalled();
  });

  it('arms after a user interaction and then plays a tone', () => {
    armChimeOnFirstInteraction();
    window.dispatchEvent(new Event('pointerdown'));

    playChime();

    expect(createOscillator).toHaveBeenCalledTimes(1);
    expect(createGain).toHaveBeenCalledTimes(1);
  });
});
