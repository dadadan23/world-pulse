import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCollectorHealthPolling } from './useCollectorHealthPolling';
import { useAppStore } from '../store/useAppStore';

vi.mock('../store/useAppStore');

const mockSetServerStatus = vi.fn();
const mockUseAppStore = vi.mocked(useAppStore);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockUseAppStore.mockReturnValue(mockSetServerStatus as unknown as ReturnType<typeof useAppStore>);

  // Mock useAppStore to return a selector result
  mockUseAppStore.mockImplementation((selector: unknown) => {
    if (typeof selector === 'function') {
      return selector({ setServerStatus: mockSetServerStatus } as unknown);
    }
    return mockSetServerStatus;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCollectorHealthPolling', () => {
  it('polls /api/status on 30-second interval', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ready',
        collectors: [
          {
            name: 'earthquakes',
            status: 'healthy',
            errorCount: 0,
            lastFetchAt: null,
            isEnabled: true,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    renderHook(() => useCollectorHealthPolling());

    expect(mockFetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('updates store when response is ok', async () => {
    const collectors = [
      { name: 'earthquakes', status: 'healthy', errorCount: 0, lastFetchAt: null, isEnabled: true },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ready', collectors }),
      })
    );

    renderHook(() => useCollectorHealthPolling());
    await vi.advanceTimersByTimeAsync(30_000);

    expect(mockSetServerStatus).toHaveBeenCalledWith({
      ready: true,
      collectors,
    });

    vi.unstubAllGlobals();
  });

  it('does not update store on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    renderHook(() => useCollectorHealthPolling());
    await vi.advanceTimersByTimeAsync(30_000);

    expect(mockSetServerStatus).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not update store when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    renderHook(() => useCollectorHealthPolling());
    await vi.advanceTimersByTimeAsync(30_000);

    expect(mockSetServerStatus).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('clears interval on unmount', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ready', collectors: [] }),
      })
    );

    const { unmount } = renderHook(() => useCollectorHealthPolling());
    unmount();

    await vi.advanceTimersByTimeAsync(60_000);
    // After unmount, fetch should not be called
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
