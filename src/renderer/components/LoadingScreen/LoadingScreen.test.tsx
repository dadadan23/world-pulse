import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingScreen } from './LoadingScreen';
import { useAppStore } from '../../store/useAppStore';
import type { CollectorHealth } from '@shared/types';

function makeCollector(overrides: Partial<CollectorHealth> = {}): CollectorHealth {
  return {
    name: 'test-collector',
    status: 'healthy',
    lastFetchAt: Date.now(),
    errorCount: 0,
    isEnabled: true,
    qualityTier: 'supplementary',
    intervalMs: 60_000,
    isStale: false,
    ...overrides,
  };
}

describe('LoadingScreen', () => {
  beforeEach(() => {
    useAppStore.setState({ connectionStatus: 'connecting', serverStatus: null });
  });

  it('has role="status" and aria-live="polite" on the panel', () => {
    render(<LoadingScreen />);
    const panel = screen.getByRole('status');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-live', 'polite');
  });

  it('applies ob-scanline to the root element', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstElementChild).toHaveClass('ob-scanline');
  });

  it('applies ob-boot-fade-in to staggered content sections', () => {
    const { container } = render(<LoadingScreen />);
    const animated = container.querySelectorAll('.ob-boot-fade-in');
    expect(animated.length).toBeGreaterThanOrEqual(3);
  });

  it('shows CONNECTING TO SERVER when connecting', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('CONNECTING TO SERVER')).toBeInTheDocument();
  });

  it('shows LOADING DATA when connected and serverStatus is ready', () => {
    useAppStore.setState({
      connectionStatus: 'connected',
      serverStatus: { ready: true, collectors: [] },
    });
    render(<LoadingScreen />);
    expect(screen.getByText('LOADING DATA')).toBeInTheDocument();
  });

  it('shows WAITING FOR COLLECTORS when connected but not ready', () => {
    useAppStore.setState({
      connectionStatus: 'connected',
      serverStatus: { ready: false, collectors: [] },
    });
    render(<LoadingScreen />);
    expect(screen.getByText('WAITING FOR COLLECTORS')).toBeInTheDocument();
  });

  it('shows RECONNECTING when disconnected', () => {
    useAppStore.setState({ connectionStatus: 'disconnected' });
    render(<LoadingScreen />);
    expect(screen.getByText('RECONNECTING')).toBeInTheDocument();
  });

  it('shows RECONNECTING when dormant-reconnecting', () => {
    useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
    render(<LoadingScreen />);
    expect(screen.getByText('RECONNECTING')).toBeInTheDocument();
  });

  it('shows CONNECTION ERROR // RETRYING when error', () => {
    useAppStore.setState({ connectionStatus: 'error' });
    render(<LoadingScreen />);
    expect(screen.getByText('CONNECTION ERROR // RETRYING')).toBeInTheDocument();
  });

  it('shows [ONLINE] for BACKEND when connected', () => {
    useAppStore.setState({
      connectionStatus: 'connected',
      serverStatus: { ready: true, collectors: [] },
    });
    render(<LoadingScreen />);
    expect(screen.getByText('[ONLINE]')).toBeInTheDocument();
  });

  it('shows [OFFLINE] for BACKEND when not connected', () => {
    useAppStore.setState({ connectionStatus: 'disconnected' });
    render(<LoadingScreen />);
    expect(screen.getByText('[OFFLINE]')).toBeInTheDocument();
  });

  it('hides COLLECTORS row when serverStatus is null', () => {
    useAppStore.setState({ connectionStatus: 'connecting', serverStatus: null });
    render(<LoadingScreen />);
    expect(screen.queryByText('COLLECTORS')).not.toBeInTheDocument();
  });

  it('shows COLLECTORS row with correct active count', () => {
    useAppStore.setState({
      connectionStatus: 'connected',
      serverStatus: {
        ready: true,
        collectors: [
          makeCollector({ isEnabled: true, status: 'healthy' }),
          makeCollector({ isEnabled: true, status: 'degraded' }),
          makeCollector({ isEnabled: false, status: 'disabled' }),
          makeCollector({ isEnabled: true, status: 'disabled' }),
        ],
      },
    });
    render(<LoadingScreen />);
    // 3 collectors match isEnabled && status !== 'disabled': healthy + degraded + (isEnabled but disabled-status is excluded) = 2
    expect(screen.getByText('2 ACTIVE')).toBeInTheDocument();
  });

  it('renders WORLD PULSE title', () => {
    render(<LoadingScreen />);
    expect(screen.getByRole('heading', { name: 'WORLD PULSE' })).toBeInTheDocument();
  });

  it('renders three pulse indicator dots', () => {
    const { container } = render(<LoadingScreen />);
    // Dots are aria-hidden so not accessible by role; find by class
    const dots = container.querySelectorAll('.ob-glow');
    expect(dots).toHaveLength(3);
  });
});
