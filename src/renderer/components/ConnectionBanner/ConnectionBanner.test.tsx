import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConnectionBanner } from './ConnectionBanner';
import { useAppStore } from '../../store/useAppStore';

describe('ConnectionBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppStore.setState({
      connectionStatus: 'connected',
      hasEverConnected: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should render nothing when connected', () => {
    const { container } = render(<ConnectionBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when connecting', () => {
    useAppStore.setState({ connectionStatus: 'connecting' });
    const { container } = render(<ConnectionBanner />);
    expect(container.firstChild).toBeNull();
  });

  describe('Disconnect state', () => {
    it('should show disconnect banner with amber styling when disconnected', () => {
      useAppStore.setState({ connectionStatus: 'disconnected' });
      render(<ConnectionBanner />);

      const banner = screen.getByTestId('connection-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass('ob-banner-warning');
      expect(screen.getByText('Connection lost -- reconnecting...')).toBeInTheDocument();
    });

    it('should show disconnect banner when connection error occurs', () => {
      useAppStore.setState({ connectionStatus: 'error' });
      render(<ConnectionBanner />);

      expect(screen.getByText('Connection lost -- reconnecting...')).toBeInTheDocument();
      expect(screen.getByTestId('connection-banner')).toHaveClass('ob-banner-warning');
    });

    it('should have role="alert" and aria-live="assertive"', () => {
      useAppStore.setState({ connectionStatus: 'disconnected' });
      render(<ConnectionBanner />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Dormant retry state', () => {
    it('should show countdown timer for dormant-reconnecting state', () => {
      useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
      render(<ConnectionBanner />);

      expect(screen.getByText('Connection lost -- retrying in 30s')).toBeInTheDocument();
    });

    it('should decrement countdown every second', () => {
      useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
      render(<ConnectionBanner />);

      expect(screen.getByText('Connection lost -- retrying in 30s')).toBeInTheDocument();

      // Advance time by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Connection lost -- retrying in 29s')).toBeInTheDocument();

      // Advance time by another second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Connection lost -- retrying in 28s')).toBeInTheDocument();
    });

    it('should reset countdown when reaching 0', () => {
      useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
      render(<ConnectionBanner />);

      // Advance time to near end of countdown
      act(() => {
        vi.advanceTimersByTime(29000);
      });
      expect(screen.getByText('Connection lost -- retrying in 1s')).toBeInTheDocument();

      // Advance one more second to trigger reset
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('Connection lost -- retrying in 30s')).toBeInTheDocument();
    });
  });

  describe('Reconnect success state', () => {
    it('should show "Reconnected" banner with cyan styling on reconnection', () => {
      // Start disconnected
      useAppStore.setState({ connectionStatus: 'disconnected' });
      const { rerender } = render(<ConnectionBanner />);
      expect(screen.getByText('Connection lost -- reconnecting...')).toBeInTheDocument();

      // Reconnect
      act(() => {
        useAppStore.setState({ connectionStatus: 'connected' });
      });
      rerender(<ConnectionBanner />);

      const banner = screen.getByTestId('connection-banner');
      expect(banner).toHaveClass('ob-banner-success');
      expect(screen.getByText('Reconnected')).toBeInTheDocument();
    });

    it('should auto-fade after 2 seconds', () => {
      // Start disconnected
      useAppStore.setState({ connectionStatus: 'disconnected' });
      const { rerender } = render(<ConnectionBanner />);

      // Reconnect
      act(() => {
        useAppStore.setState({ connectionStatus: 'connected' });
      });
      rerender(<ConnectionBanner />);

      expect(screen.getByText('Reconnected')).toBeInTheDocument();

      // Advance time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Reconnected')).not.toBeInTheDocument();
    });

    it('should apply fade-out class to success banner', () => {
      useAppStore.setState({ connectionStatus: 'disconnected' });
      const { rerender } = render(<ConnectionBanner />);

      act(() => {
        useAppStore.setState({ connectionStatus: 'connected' });
      });
      rerender(<ConnectionBanner />);

      const banner = screen.getByTestId('connection-banner');
      expect(banner).toHaveClass('ob-banner-fade-out');
    });
  });

  describe('State transition handling', () => {
    it('should transition from error to reconnected', () => {
      useAppStore.setState({ connectionStatus: 'error' });
      const { rerender } = render(<ConnectionBanner />);
      expect(screen.getByText('Connection lost -- reconnecting...')).toBeInTheDocument();

      act(() => {
        useAppStore.setState({ connectionStatus: 'connected' });
      });
      rerender(<ConnectionBanner />);

      expect(screen.getByText('Reconnected')).toBeInTheDocument();
    });

    it('should transition from dormant-reconnecting to reconnected', () => {
      useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
      const { rerender } = render(<ConnectionBanner />);
      expect(screen.getByText(/Connection lost -- retrying in/)).toBeInTheDocument();

      act(() => {
        useAppStore.setState({ connectionStatus: 'connected' });
      });
      rerender(<ConnectionBanner />);

      expect(screen.getByText('Reconnected')).toBeInTheDocument();
    });
  });

  describe('prefers-reduced-motion support', () => {
    it('should apply motion-reduce class to pulsing indicator', () => {
      useAppStore.setState({ connectionStatus: 'disconnected' });
      const { container } = render(<ConnectionBanner />);

      const pulsingDot = container.querySelector('.animate-pulse-slow');
      expect(pulsingDot).toBeInTheDocument();
      expect(pulsingDot).toHaveClass('motion-reduce:animate-none');
    });

    it('should not animate indicator when prefers-reduced-motion is set', () => {
      useAppStore.setState({ connectionStatus: 'disconnected' });
      const { container } = render(<ConnectionBanner />);

      const pulsingDot = container.querySelector(
        '.animate-pulse-slow.motion-reduce\\:animate-none'
      );
      expect(pulsingDot).toBeInTheDocument();
    });
  });
});
