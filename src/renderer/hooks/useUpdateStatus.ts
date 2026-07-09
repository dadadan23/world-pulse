import { useEffect, useState } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready';

/**
 * Subscribes to main-process auto-update status pushed over the Electron
 * IPC bridge (src/main/preload.ts). Always 'idle' outside Electron (e.g. the
 * plain web dev server), since window.electronAPI is undefined there.
 */
export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>('idle');

  useEffect(() => {
    if (!window.electronAPI) return;
    return window.electronAPI.onUpdateStatus((next) => setStatus(next as UpdateStatus));
  }, []);

  return status;
}
