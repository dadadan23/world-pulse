import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { useAppStore } from '../../store/useAppStore';

/** Stubs matchMedia to report a fixed orientation (no live change events needed here). */
function stubOrientation(isPortrait: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: isPortrait,
      media: '(orientation: portrait)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })
  );
}

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

  it('renders the Ticker and side-column tickers with empty state messages when no events', () => {
    render(<Dashboard />);
    // GeologicTicker and NightSkyTicker show "NO ACTIVE EVENTS"
    expect(screen.getAllByText('NO ACTIVE EVENTS').length).toBe(2);
    // Bottom Ticker shows "AWAITING DATA..." when no events of any type exist
    expect(screen.getByText('AWAITING DATA...')).toBeInTheDocument();
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

  describe('portrait orientation', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('keeps the existing widescreen layout in landscape', () => {
      stubOrientation(false);
      const { container } = render(<Dashboard />);
      expect(container.querySelector('.overflow-x-auto')).toBeNull();
    });

    it('re-flows the side columns into full-width bands in portrait', () => {
      stubOrientation(true);
      const { container } = render(<Dashboard />);
      // Both LeftColumn and RightColumn switch to the portrait band layout
      expect(container.querySelectorAll('.overflow-x-auto')).toHaveLength(2);
      // Both columns still render every widget, just re-flowed -- see LeftColumn/RightColumn tests
      // GeologicTicker + NightSkyTicker show "NO ACTIVE EVENTS"; bottom Ticker shows "AWAITING DATA..."
      expect(screen.getAllByText('NO ACTIVE EVENTS').length).toBe(2);
      expect(screen.getByText('AWAITING DATA...')).toBeInTheDocument();
    });
  });
});
