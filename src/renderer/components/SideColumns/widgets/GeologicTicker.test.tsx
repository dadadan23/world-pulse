import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeologicTicker } from './GeologicTicker';
import { useAppStore } from '../../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS Earthquake Hazards Program',
    location: { lat: 0, lon: 0, name: 'Test' },
    severity: 3,
    title: `Event ${id}`,
    data: {},
    ...overrides,
  };
}

describe('GeologicTicker', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [], selectedEvent: null });
  });

  it('shows the NO ACTIVE EVENTS empty state and the GEOLOGIC PULSE header when there are no geologic events', () => {
    render(<GeologicTicker />);
    expect(screen.getByText('NO ACTIVE EVENTS')).toBeInTheDocument();
    expect(screen.getByText('◆ GEOLOGIC PULSE', { exact: false })).toBeInTheDocument();
  });

  it('only shows earthquake and volcano events, sorted by recency', () => {
    const now = Date.now();
    useAppStore.setState({
      events: [
        mockEvent('quake-old', { type: 'earthquake', timestamp: now - 10000, title: 'Old Quake' }),
        mockEvent('weather-1', { type: 'weather', timestamp: now, title: 'Sunny' }),
        mockEvent('volcano-1', { type: 'volcano', timestamp: now - 1000, title: 'Volcano Alert' }),
      ],
    });
    render(<GeologicTicker />);

    expect(screen.queryByText('Sunny')).not.toBeInTheDocument();
    const titles = screen.getAllByText(/Old Quake|Volcano Alert/).map((el) => el.textContent);
    expect(titles[0]).toBe('Volcano Alert');
  });
});
