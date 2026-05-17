import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
