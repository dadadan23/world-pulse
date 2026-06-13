import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrimaryDegradedBanner } from './PrimaryDegradedBanner';
import { useAppStore } from '../../store/useAppStore';

describe('PrimaryDegradedBanner', () => {
  beforeEach(() => {
    useAppStore.setState({
      serverStatus: null,
    });
  });

  it('renders nothing when server status is missing', () => {
    const { container } = render(<PrimaryDegradedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no primary collectors are present', () => {
    useAppStore.setState({
      serverStatus: {
        ready: true,
        collectors: [
          {
            name: 'weather',
            status: 'degraded',
            lastFetchAt: null,
            errorCount: 2,
            isEnabled: true,
            qualityTier: 'supplementary',
            intervalMs: 60_000,
            isStale: false,
          },
        ],
      },
    });

    const { container } = render(<PrimaryDegradedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all primary collectors are healthy', () => {
    useAppStore.setState({
      serverStatus: {
        ready: true,
        collectors: [
          {
            name: 'earthquakes',
            status: 'healthy',
            lastFetchAt: null,
            errorCount: 0,
            isEnabled: true,
            qualityTier: 'primary',
            intervalMs: 60_000,
            isStale: false,
          },
        ],
      },
    });

    const { container } = render(<PrimaryDegradedBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders warning banner when a primary collector is degraded', () => {
    useAppStore.setState({
      serverStatus: {
        ready: true,
        collectors: [
          {
            name: 'earthquakes',
            status: 'degraded',
            lastFetchAt: null,
            errorCount: 1,
            isEnabled: true,
            qualityTier: 'primary',
            intervalMs: 60_000,
            isStale: false,
          },
        ],
      },
    });

    render(<PrimaryDegradedBanner />);

    expect(screen.getByTestId('primary-degraded-banner')).toBeInTheDocument();
    expect(screen.getByText('PRIMARY SOURCE UNAVAILABLE: earthquakes')).toBeInTheDocument();
  });

  it('renders warning banner when a primary collector is disabled', () => {
    useAppStore.setState({
      serverStatus: {
        ready: true,
        collectors: [
          {
            name: 'volcanoes',
            status: 'disabled',
            lastFetchAt: null,
            errorCount: 5,
            isEnabled: false,
            qualityTier: 'primary',
            intervalMs: 60_000,
            isStale: false,
          },
        ],
      },
    });

    render(<PrimaryDegradedBanner />);

    expect(screen.getByTestId('primary-degraded-banner')).toBeInTheDocument();
    expect(screen.getByText('PRIMARY SOURCE UNAVAILABLE: volcanoes')).toBeInTheDocument();
  });
});
