import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrientation } from './useOrientation';

/** A minimal MediaQueryList stub whose `change` listeners can be triggered manually. */
function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mql = {
    get matches() {
      return matches;
    },
    media: '(orientation: portrait)',
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
  };

  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));

  return {
    fireChange: (nextMatches: boolean) => {
      matches = nextMatches;
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent));
    },
  };
}

describe('useOrientation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false for a landscape viewport', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe(false);
  });

  it('returns true for a portrait viewport', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe(true);
  });

  it('updates live when the media query change event fires (rotation)', () => {
    const { fireChange } = mockMatchMedia(false);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toBe(false);

    act(() => {
      fireChange(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      fireChange(false);
    });
    expect(result.current).toBe(false);
  });
});
