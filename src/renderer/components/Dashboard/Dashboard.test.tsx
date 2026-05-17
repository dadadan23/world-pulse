import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { useAppStore } from '../../store/useAppStore';

// Mock the Globe component since it uses WebGL which isn't available in jsdom
vi.mock('../Globe/Globe', () => ({
  Globe: () => <div data-testid="globe-mock">Globe</div>,
}));

// Mock SkyMap since it uses canvas APIs
vi.mock('../SkyMap/SkyMap', () => ({
  SkyMap: () => <div data-testid="skymap-mock">SkyMap</div>,
}));

// Mock useGeolocation so tests don't trigger browser API
vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    useAppStore.setState({
      connectionStatus: 'connected',
      serverStatus: null,
      events: [],
      featuredEvent: null,
      selectedEvent: null,
      isInitialized: true,
      skyMapOpen: false,
      geolocationStatus: 'pending',
      userLat: null,
      userLon: null,
    });
  });

  it('renders the globe canvas', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('globe-mock')).toBeInTheDocument();
  });

  it('renders HudStatusPanel with WORLD PULSE heading', () => {
    render(<Dashboard />);
    expect(screen.getByText('WORLD PULSE')).toBeInTheDocument();
  });

  it('renders HudCollectorPanel with DATA SOURCES heading', () => {
    render(<Dashboard />);
    expect(screen.getByText('DATA SOURCES')).toBeInTheDocument();
  });

  it('renders the Ticker with empty state message when no events', () => {
    render(<Dashboard />);
    expect(screen.getByText('NO ACTIVE EVENTS')).toBeInTheDocument();
  });

  it('does not render SkyMapModal when skyMapOpen is false', () => {
    render(<Dashboard />);
    expect(screen.queryByTestId('skymap-mock')).not.toBeInTheDocument();
  });

  it('renders SkyMapModal when skyMapOpen is true', () => {
    useAppStore.setState({ skyMapOpen: true });
    render(<Dashboard />);
    expect(screen.getByTestId('skymap-mock')).toBeInTheDocument();
  });

  it('HudEventPanel is not visible when selectedEvent is null', () => {
    render(<Dashboard />);
    // The panel exists but is translated off-screen (selectedEvent is null)
    // Verify no event type label (e.g., "EARTHQUAKE EVENT") is shown
    expect(screen.queryByText(/EVENT$/)).not.toBeInTheDocument();
  });
});
