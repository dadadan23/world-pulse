import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeologicTicker } from './GeologicTicker';
import { useAppStore } from '../../../store/useAppStore';
import { TICKER_HIGH_SEVERITY_THRESHOLD } from '../../../utils/sortByPriority';
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

  it('pins a high-severity event above older routine events', () => {
    const now = Date.now();
    useAppStore.setState({
      events: [
        mockEvent('routine', {
          type: 'earthquake',
          timestamp: now,
          title: 'Minor Tremor',
          severity: 2,
        }),
        mockEvent('critical', {
          type: 'volcano',
          timestamp: now - 60_000,
          title: 'Major Eruption',
          severity: TICKER_HIGH_SEVERITY_THRESHOLD,
        }),
      ],
    });
    render(<GeologicTicker />);

    const titles = screen.getAllByText(/Minor Tremor|Major Eruption/).map((el) => el.textContent);
    expect(titles[0]).toBe('Major Eruption');
  });

  it('orders multiple high-severity events by severity descending', () => {
    const now = Date.now();
    useAppStore.setState({
      events: [
        mockEvent('high', {
          type: 'earthquake',
          timestamp: now,
          title: 'Strong Quake',
          severity: TICKER_HIGH_SEVERITY_THRESHOLD,
        }),
        mockEvent('critical', {
          type: 'volcano',
          timestamp: now - 1000,
          title: 'Catastrophic Eruption',
          severity: 9,
        }),
      ],
    });
    render(<GeologicTicker />);

    const titles = screen
      .getAllByText(/Strong Quake|Catastrophic Eruption/)
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Catastrophic Eruption');
  });
});
