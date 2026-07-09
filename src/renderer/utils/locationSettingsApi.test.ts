import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveLocationOverride, clearLocationOverride } from './locationSettingsApi';

describe('locationSettingsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the override and resolves with the server-echoed value', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ override: { lat: 1, lon: 2, name: 'Test' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await saveLocationOverride({ lat: 1, lon: 2, name: 'Test' });

    expect(result).toEqual({ lat: 1, lon: 2, name: 'Test' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/location'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws the server error code on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'invalid_coordinates' }) })
    );

    await expect(saveLocationOverride({ lat: 999, lon: 2 })).rejects.toThrow('invalid_coordinates');
  });

  it('sends a DELETE request to clear the override', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ override: null }) });
    vi.stubGlobal('fetch', fetchMock);

    await clearLocationOverride();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/settings/location'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
