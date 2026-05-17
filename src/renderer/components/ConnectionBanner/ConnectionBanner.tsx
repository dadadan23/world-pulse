import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

/**
 * ConnectionBanner - Non-destructive banner showing connection state changes
 *
 * States:
 * - 'disconnected' | 'error' -> "Connection lost -- reconnecting..." (amber)
 * - 'dormant-reconnecting' -> "Connection lost -- retrying in Xs" (amber, countdown)
 * - reconnect success -> "Reconnected" (cyan, 2s fade)
 * - 'connected' | 'connecting' -> hidden
 */
export function ConnectionBanner() {
  const { connectionStatus } = useAppStore();
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);
  const [dormantCountdown, setDormantCountdown] = useState(30);
  const prevStatusRef = useRef<typeof connectionStatus>(connectionStatus);

  // Detect reconnection success: transition from disconnected/error/dormant -> connected
  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    if (prevStatus !== connectionStatus) {
      const wasDisconnected =
        prevStatus === 'disconnected' ||
        prevStatus === 'error' ||
        prevStatus === 'dormant-reconnecting';
      const nowConnected = connectionStatus === 'connected';

      if (wasDisconnected && nowConnected) {
        // Show success banner
        setShowReconnectedBanner(true);
        // Auto-hide after 2 seconds
        const timeout = setTimeout(() => {
          setShowReconnectedBanner(false);
        }, 2000);

        prevStatusRef.current = connectionStatus;
        return () => clearTimeout(timeout);
      }

      prevStatusRef.current = connectionStatus;
    }
  }, [connectionStatus]);

  // Countdown timer for dormant-reconnecting
  useEffect(() => {
    if (connectionStatus === 'dormant-reconnecting') {
      // Reset countdown when entering dormant mode
      setDormantCountdown(30);

      const interval = setInterval(() => {
        setDormantCountdown((prev) => {
          if (prev <= 1) return 30; // Reset when reaching 0
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  // Determine visibility and message
  const isDisconnected =
    connectionStatus === 'disconnected' ||
    connectionStatus === 'error' ||
    connectionStatus === 'dormant-reconnecting';

  const showBanner = isDisconnected || showReconnectedBanner;

  if (!showBanner) return null;

  // Message and styling
  let message: string;
  let bannerClass: string;

  if (showReconnectedBanner) {
    message = 'Reconnected';
    bannerClass = 'ob-banner-success';
  } else if (connectionStatus === 'dormant-reconnecting') {
    message = `Connection lost -- retrying in ${dormantCountdown}s`;
    bannerClass = 'ob-banner-warning';
  } else {
    // disconnected or error
    message = 'Connection lost -- reconnecting...';
    bannerClass = 'ob-banner-warning';
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none flex justify-center"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`ob-banner ${bannerClass} ${showReconnectedBanner ? 'ob-banner-fade-out' : ''}`}
        data-testid="connection-banner"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              showReconnectedBanner
                ? 'bg-ob-accent-cyan'
                : 'bg-ob-accent-amber animate-pulse-slow motion-reduce:animate-none'
            }`}
            aria-hidden="true"
          />
          <span className="ob-label tracking-ultrawide">{message}</span>
        </div>
      </div>
    </div>
  );
}
