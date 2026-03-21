import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventPanel } from './EventPanel';
import { useAppStore } from '../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS Earthquake Hazards Program',
    location: { lat: 35.7, lon: 139.7, name: 'Near Tokyo' },
    severity: 3,
    title: `M3.0 - Event ${id}`,
    description: 'Depth: 10.0 km',
    data: {},
    ...overrides,
  };
}

describe('EventPanel', () => {
  beforeEach(() => {
    useAppStore.setState({
      events: [],
      featuredEvent: null,
    });
  });

  it('should render the events header', () => {
    render(<EventPanel />);
    expect(screen.getByText('EVENTS')).toBeInTheDocument();
  });

  it('should show event count in header', () => {
    useAppStore.setState({ events: [mockEvent('1'), mockEvent('2')] });
    render(<EventPanel />);
    // New format: "EVENTS" + "[2]" in separate elements
    expect(screen.getByText('EVENTS')).toBeInTheDocument();
    expect(screen.getByText('[2]')).toBeInTheDocument();
  });

  it('should show waiting message when no events', () => {
    render(<EventPanel />);
    expect(screen.getByText('AWAITING DATA')).toBeInTheDocument();
  });

  it('should render event titles', () => {
    useAppStore.setState({ events: [mockEvent('1'), mockEvent('2')] });
    render(<EventPanel />);
    expect(screen.getByText('M3.0 - Event 1')).toBeInTheDocument();
    expect(screen.getByText('M3.0 - Event 2')).toBeInTheDocument();
  });

  it('should render event type label', () => {
    useAppStore.setState({ events: [mockEvent('1')] });
    render(<EventPanel />);
    expect(screen.getByText('SEISMIC')).toBeInTheDocument();
  });

  it('should render event location', () => {
    useAppStore.setState({ events: [mockEvent('1')] });
    render(<EventPanel />);
    expect(screen.getByText('Near Tokyo')).toBeInTheDocument();
  });

  it('should render event description', () => {
    useAppStore.setState({ events: [mockEvent('1')] });
    render(<EventPanel />);
    expect(screen.getByText('Depth: 10.0 km')).toBeInTheDocument();
  });

  it('should show FEATURED label for featured event', () => {
    const event = mockEvent('1');
    useAppStore.setState({ events: [event], featuredEvent: event });
    render(<EventPanel />);
    expect(screen.getByText('FEATURED')).toBeInTheDocument();
  });

  it('should set featured event on click', () => {
    const events = [mockEvent('1'), mockEvent('2')];
    useAppStore.setState({ events, featuredEvent: null });
    render(<EventPanel />);

    fireEvent.click(screen.getByText('M3.0 - Event 2'));
    expect(useAppStore.getState().featuredEvent?.id).toBe('2');
  });

  it('should limit displayed events to 20', () => {
    const events = Array.from({ length: 30 }, (_, i) => mockEvent(`${i}`));
    useAppStore.setState({ events });
    render(<EventPanel />);

    // Should show 20 event items, not 30
    const eventItems = screen.getAllByText('SEISMIC');
    expect(eventItems.length).toBeLessThanOrEqual(20);
  });

  it('should show coordinates when location has no name', () => {
    const event = mockEvent('1', {
      location: { lat: 35.7, lon: 139.7 },
    });
    useAppStore.setState({ events: [event] });
    render(<EventPanel />);
    // New format uses 2 decimal places
    expect(screen.getByText('35.70, 139.70')).toBeInTheDocument();
  });

  it('should show STALE indicator for events older than 30 minutes', () => {
    const staleEvent = mockEvent('stale', {
      timestamp: Date.now() - 31 * 60 * 1000, // 31 minutes ago
    });
    useAppStore.setState({ events: [staleEvent] });
    render(<EventPanel />);
    expect(screen.getByText('STALE')).toBeInTheDocument();
  });

  it('should show relative time instead of absolute time', () => {
    const recentEvent = mockEvent('recent', {
      timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    });
    useAppStore.setState({ events: [recentEvent] });
    render(<EventPanel />);
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });
});
