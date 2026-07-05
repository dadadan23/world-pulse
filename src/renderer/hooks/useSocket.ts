import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/useAppStore';
import { SERVER_URL } from '../config';
import type { Event } from '@shared/types';

/** Dormant retry interval after Socket.io exhausts its reconnection attempts */
const DORMANT_RETRY_MS = 30_000;

interface EventsPayload {
  events: Event[];
  timestamp: number;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const dormantTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setConnectionStatus, setServerStatus, setEvents, addEvents, setInitialized } =
    useAppStore();

  useEffect(() => {
    // Fetch initial server status
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/status`);
        if (response.ok) {
          const status = await response.json();
          setServerStatus({
            ready: status.status === 'ready' || status.status === 'degraded',
            collectors: status.collectors || [],
          });
        }
      } catch (error) {
        console.error('[Socket] Failed to fetch server status:', error);
      }
    };

    const clearDormantTimer = () => {
      if (dormantTimerRef.current) {
        clearInterval(dormantTimerRef.current);
        dormantTimerRef.current = null;
      }
    };

    /** Enter dormant-retry: periodically try to reconnect via a fresh connect() */
    const startDormantRetry = (socket: Socket) => {
      clearDormantTimer();
      setConnectionStatus('dormant-reconnecting');
      console.warn('[Socket] Entering dormant-retry mode (every 30s)');

      dormantTimerRef.current = setInterval(() => {
        console.warn('[Socket] Dormant retry attempt');
        // Reset Socket.io internal reconnection state and try again
        socket.io.opts.reconnectionAttempts = 10;
        socket.connect();
      }, DORMANT_RETRY_MS);
    };

    // Initialize socket connection
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.warn('[Socket] Connected to server');
      clearDormantTimer();
      setConnectionStatus('connected');
      checkServerStatus();
    });

    socket.on('disconnect', () => {
      console.warn('[Socket] Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      setConnectionStatus('error');
    });

    // When Socket.io exhausts all reconnection attempts, enter dormant retry
    socket.io.on('reconnect_failed', () => {
      console.warn('[Socket] Reconnection attempts exhausted');
      startDormantRetry(socket);
    });

    // Handle initial events on connection
    socket.on('events:initial', (data: EventsPayload) => {
      console.warn(`[Socket] Received ${data.events.length} initial events`);
      setEvents(data.events);
      setInitialized(true);
    });

    // Handle new events
    socket.on('events:new', (data: EventsPayload) => {
      console.warn(`[Socket] Received ${data.events.length} new events`);
      addEvents(data.events);
    });

    // Cleanup on unmount
    return () => {
      clearDormantTimer();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setConnectionStatus, setServerStatus, setEvents, addEvents, setInitialized]);
}
