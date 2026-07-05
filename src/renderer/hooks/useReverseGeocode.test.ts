import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReverseGeocode } from './useReverseGeocode';

function mockFetchResolving(address: Record<string, string>) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => ({ address }),
    })
  );
}

describe('useReverseGeocode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when lat/lon are null (no fetch performed)', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(() => useReverseGeocode(null, null));
    expect(result.current).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('formats a US city with state and appends "US"', async () => {
    mockFetchResolving({ city: 'Chicago', state: 'Illinois', country_code: 'us' });
    const { result } = renderHook(() => useReverseGeocode(41.88, -87.63));
    await waitFor(() => expect(result.current).toBe('Chicago, Illinois, US'));
  });

  it('falls back to county when no city/town/village/municipality/suburb is present (US)', async () => {
    mockFetchResolving({ county: 'Cook County', state: 'Illinois', country_code: 'us' });
    const { result } = renderHook(() => useReverseGeocode(41.88, -87.63));
    await waitFor(() => expect(result.current).toBe('Cook County, Illinois, US'));
  });

  it('formats a non-US locality with country, no "US" suffix', async () => {
    mockFetchResolving({ city: 'London', country: 'United Kingdom', country_code: 'gb' });
    const { result } = renderHook(() => useReverseGeocode(51.51, -0.13));
    await waitFor(() => expect(result.current).toBe('London, United Kingdom'));
  });

  it('prefers town over village/municipality/suburb when both are present', async () => {
    mockFetchResolving({ town: 'Small Town', suburb: 'Some Suburb', country: 'France' });
    const { result } = renderHook(() => useReverseGeocode(48.85, 2.35));
    await waitFor(() => expect(result.current).toBe('Small Town, France'));
  });

  it('omits missing parts (no country) instead of leaving empty separators', async () => {
    mockFetchResolving({ village: 'Remote Village' });
    const { result } = renderHook(() => useReverseGeocode(0, 0));
    await waitFor(() => expect(result.current).toBe('Remote Village'));
  });

  it('stays null when the response has no address field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({}) }));
    const { result } = renderHook(() => useReverseGeocode(10, 10));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toBeNull();
  });

  it('stays null and does not throw when the fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const { result } = renderHook(() => useReverseGeocode(10, 10));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toBeNull();
  });

  it('re-fetches when lat/lon change', async () => {
    mockFetchResolving({ city: 'Paris', country: 'France' });
    const { result, rerender } = renderHook(({ lat, lon }) => useReverseGeocode(lat, lon), {
      initialProps: { lat: 48.85, lon: 2.35 },
    });
    await waitFor(() => expect(result.current).toBe('Paris, France'));

    mockFetchResolving({ city: 'Berlin', country: 'Germany' });
    rerender({ lat: 52.52, lon: 13.4 });
    await waitFor(() => expect(result.current).toBe('Berlin, Germany'));
  });
});
