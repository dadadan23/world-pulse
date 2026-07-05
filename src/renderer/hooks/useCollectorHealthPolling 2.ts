import { useEffect } from 'react';
import type { CollectorHealth } from '@shared/types';
import { useAppStore } from '../store/useAppStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 30_000;

interface StatusResponse {
  status: string;
  collectors: CollectorHealth[];
}

export function useCollectorHealthPolling() {
  const setServerStatus = useAppStore((state) => state.setServerStatus);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/status`);
        if (res.ok) {
          const data = (await res.json()) as StatusResponse;
          setServerStatus({
            ready: data.status === 'ready' || data.status === 'degraded',
            collectors: data.collectors ?? [],
          });
        }
      } catch {
        // Keep existing store state on network failure
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [setServerStatus]);
}
