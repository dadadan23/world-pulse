import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUpdateStatus } from './useUpdateStatus';

describe('useUpdateStatus', () => {
  afterEach(() => {
    delete window.electronAPI;
  });

  it('stays idle when window.electronAPI is undefined', () => {
    const { result } = renderHook(() => useUpdateStatus());
    expect(result.current).toBe('idle');
  });

  it('reflects the status pushed from the main process', () => {
    let pushed: (status: string) => void = () => {};
    window.electronAPI = {
      platform: 'darwin',
      onUpdateStatus: (callback) => {
        pushed = callback;
        return () => {};
      },
    };

    const { result } = renderHook(() => useUpdateStatus());
    expect(result.current).toBe('idle');

    act(() => pushed('downloading'));
    expect(result.current).toBe('downloading');
  });
});
