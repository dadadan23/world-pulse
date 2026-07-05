import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HudEventPanel } from './HudEventPanel';
import { useAppStore } from '../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'Test Source',
    location: { lat: 0, lon: 0, name: 'Test Location' },
    data: {},
    title: `Event ${id}`,
    ...overrides,
  };
}

describe('HudEventPanel', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      events: [],
      selectedEvent: null,
      connectionStatus: 'connected',
    });
  });

  it('shows empty state when no events and connected', () => {
    useAppStore.setState({
      events: [],
      connectionStatus: 'connected',
      selectedEvent: null,
    });

    render(<HudEventPanel />);

    // Should show the default empty state message
    expect(screen.getByText('Waiting for world events...')).toBeDefined();
  });

  it('does not show empty state when disconnected', () => {
    useAppStore.setState({
      events: [],
      connectionStatus: 'disconnected',
      selectedEvent: null,
    });

    render(<HudEventPanel />);

    // Should not show the empty state message
    expect(screen.queryByText('Waiting for world events...')).toBeNull();
  });

  it('does not show empty state when events exist', () => {
    useAppStore.setState({
      events: [mockEvent('1')],
      connectionStatus: 'connected',
      selectedEvent: null,
    });

    render(<HudEventPanel />);

    // Should not show the empty state message
    expect(screen.queryByText('Waiting for world events...')).toBeNull();
  });

  it('shows selected event when one is set', () => {
    const selectedEvent = mockEvent('1', { title: 'Selected Event' });

    useAppStore.setState({
      events: [selectedEvent],
      selectedEvent,
      connectionStatus: 'connected',
    });

    render(<HudEventPanel />);

    // Should show the selected event title
    expect(screen.getByText('Selected Event')).toBeDefined();
    // Should not show empty state
    expect(screen.queryByText('Waiting for world events...')).toBeNull();
  });

  it('uses ob-transition-fade class for smooth transitions', () => {
    const { container } = render(<HudEventPanel />);
    const panel = container.querySelector('.ob-transition-fade');

    expect(panel).toBeDefined();
  });

  it('falls back to lat/lon coordinates when the location has no name', () => {
    const selectedEvent = mockEvent('1', { location: { lat: 12.3456, lon: -98.7654, name: '' } });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('12.35, -98.77')).toBeInTheDocument();
  });

  it('shows "--" for the region when there is no location', () => {
    const selectedEvent = mockEvent('1', { location: null });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('REGION')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('shows a CRITICAL severity row and danger intensity bar for severity >= 7', () => {
    const selectedEvent = mockEvent('1', { severity: 8.4 });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('8.4 CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('INTENSITY')).toBeInTheDocument();
  });

  it('shows a MODERATE severity row for severity in [4, 7)', () => {
    const selectedEvent = mockEvent('1', { severity: 5 });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('5.0 MODERATE')).toBeInTheDocument();
  });

  it('shows a LOW severity row for severity in (0, 4)', () => {
    const selectedEvent = mockEvent('1', { severity: 2 });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('2.0 LOW')).toBeInTheDocument();
  });

  it('shows "--" for severity 0 and omits the intensity bar', () => {
    const selectedEvent = mockEvent('1', { severity: 0 });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('SEVERITY')).toBeInTheDocument();
    expect(screen.queryByText('INTENSITY')).not.toBeInTheDocument();
  });

  it('omits the severity row entirely when severity is undefined', () => {
    const selectedEvent = mockEvent('1', { severity: undefined });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.queryByText('SEVERITY')).not.toBeInTheDocument();
  });

  it('renders the description when present', () => {
    const selectedEvent = mockEvent('1', { description: 'Detailed description text' });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);

    expect(screen.getByText('Detailed description text')).toBeInTheDocument();
  });

  it('omits the description block when absent', () => {
    const selectedEvent = mockEvent('1', { description: undefined });
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    const { container } = render(<HudEventPanel />);

    expect(container.querySelector('.leading-relaxed.border-t')).toBeNull();
  });

  it('closes the panel when the close button is clicked', async () => {
    const user = userEvent.setup();
    const selectedEvent = mockEvent('1');
    useAppStore.setState({ events: [selectedEvent], selectedEvent });

    render(<HudEventPanel />);
    await user.click(screen.getByText('[ CLOSE ]'));

    expect(useAppStore.getState().selectedEvent).toBeNull();
  });

  describe('auto-close timer', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('auto-closes the panel after 8 seconds', () => {
      const selectedEvent = mockEvent('1');
      useAppStore.setState({ events: [selectedEvent], selectedEvent });

      render(<HudEventPanel />);
      act(() => {
        vi.advanceTimersByTime(8_000);
      });

      expect(useAppStore.getState().selectedEvent).toBeNull();
    });
  });

  describe('relative timestamp formatting', () => {
    it('shows "now" for a just-detected event', () => {
      const selectedEvent = mockEvent('1', { timestamp: Date.now() });
      useAppStore.setState({ events: [selectedEvent], selectedEvent });
      render(<HudEventPanel />);
      expect(screen.getByText('now')).toBeInTheDocument();
    });

    it('shows minutes ago for an event under an hour old', () => {
      const selectedEvent = mockEvent('1', { timestamp: Date.now() - 5 * 60_000 });
      useAppStore.setState({ events: [selectedEvent], selectedEvent });
      render(<HudEventPanel />);
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('shows hours ago for an event under a day old', () => {
      const selectedEvent = mockEvent('1', { timestamp: Date.now() - 3 * 3_600_000 });
      useAppStore.setState({ events: [selectedEvent], selectedEvent });
      render(<HudEventPanel />);
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows days ago for an event a day or more old', () => {
      const selectedEvent = mockEvent('1', { timestamp: Date.now() - 2 * 86_400_000 });
      useAppStore.setState({ events: [selectedEvent], selectedEvent });
      render(<HudEventPanel />);
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });
});
