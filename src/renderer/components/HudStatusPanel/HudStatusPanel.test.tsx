import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HudStatusPanel } from './HudStatusPanel';
import { useAppStore } from '../../store/useAppStore';

describe('HudStatusPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({}) }));
    useAppStore.setState({
      connectionStatus: 'connecting',
      events: [],
      userLat: null,
      userLon: null,
      geolocationStatus: 'pending',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows LIVE for a connected status', () => {
    useAppStore.setState({ connectionStatus: 'connected' });
    render(<HudStatusPanel />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('LIVE');
  });

  it('shows CONNECTING for a connecting status', () => {
    useAppStore.setState({ connectionStatus: 'connecting' });
    render(<HudStatusPanel />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('CONNECTING');
  });

  it('shows OFFLINE for a disconnected status', () => {
    useAppStore.setState({ connectionStatus: 'disconnected' });
    render(<HudStatusPanel />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('OFFLINE');
  });

  it('shows ERROR for an error status', () => {
    useAppStore.setState({ connectionStatus: 'error' });
    render(<HudStatusPanel />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('ERROR');
  });

  it('shows RECONNECTING for a dormant-reconnecting status', () => {
    useAppStore.setState({ connectionStatus: 'dormant-reconnecting' });
    render(<HudStatusPanel />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('RECONNECTING');
  });

  it('shows the live event count', () => {
    useAppStore.setState({
      events: [
        {
          id: '1',
          timestamp: Date.now(),
          type: 'earthquake',
          source: 'Test',
          location: null,
          title: 'Event',
          data: {},
        },
      ],
    });
    render(<HudStatusPanel />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('hides the LOCATION row while geolocation is pending', () => {
    useAppStore.setState({ geolocationStatus: 'pending' });
    render(<HudStatusPanel />);
    expect(screen.queryByText('LOCATION')).not.toBeInTheDocument();
  });

  it('shows "--" coordinates when geolocation was denied', () => {
    useAppStore.setState({ geolocationStatus: 'denied', userLat: null, userLon: null });
    render(<HudStatusPanel />);
    expect(screen.getByText('LOCATION')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('formats northern/eastern coordinates once granted', () => {
    useAppStore.setState({ geolocationStatus: 'granted', userLat: 41.88, userLon: 12.49 });
    render(<HudStatusPanel />);
    expect(screen.getByText('41.88N 12.49E')).toBeInTheDocument();
  });

  it('formats southern/western coordinates once granted', () => {
    useAppStore.setState({ geolocationStatus: 'granted', userLat: -33.87, userLon: -70.65 });
    render(<HudStatusPanel />);
    expect(screen.getByText('33.87S 70.65W')).toBeInTheDocument();
  });

  it('hides the UPDATE row outside Electron (no window.electronAPI)', () => {
    render(<HudStatusPanel />);
    expect(screen.queryByText('UPDATE')).not.toBeInTheDocument();
  });

  it('shows a passive READY glyph once the main process reports an update is ready', () => {
    window.electronAPI = {
      platform: 'darwin',
      onUpdateStatus: (callback) => {
        callback('ready');
        return () => {};
      },
    };
    render(<HudStatusPanel />);
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
    delete window.electronAPI;
  });
});
