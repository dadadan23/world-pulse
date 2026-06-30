import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NightSkyTicker } from './NightSkyTicker';
import { useAppStore } from '../../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'iss',
    source: 'Open Notify',
    location: { lat: 0, lon: 0, name: 'Test' },
    severity: 1,
    title: `Event ${id}`,
    data: {},
    ...overrides,
  };
}

describe('NightSkyTicker', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [], selectedEvent: null });
  });

  it('shows the NO ACTIVE EVENTS empty state when there are no night-sky events', () => {
    render(<NightSkyTicker />);
    expect(screen.getByText('NO ACTIVE EVENTS')).toBeInTheDocument();
    expect(screen.getByText('◆ NIGHT SKY', { exact: false })).toBeInTheDocument();
  });

  it('shows ISS, aurora, asteroid, and planet events sorted by recency, excluding other types', () => {
    const now = Date.now();
    useAppStore.setState({
      events: [
        mockEvent('iss-1', { type: 'iss', timestamp: now - 10000, title: 'ISS Pass' }),
        mockEvent('quake-1', { type: 'earthquake', timestamp: now, title: 'Quake' }),
        mockEvent('aurora-1', { type: 'aurora', timestamp: now - 1000, title: 'Aurora KP7' }),
        mockEvent('asteroid-1', {
          type: 'asteroid',
          timestamp: now - 5000,
          title: 'Asteroid Flyby',
        }),
        mockEvent('planet-1', { type: 'planet', timestamp: now - 2000, title: 'Venus Visible' }),
      ],
    });
    render(<NightSkyTicker />);

    expect(screen.queryByText('Quake')).not.toBeInTheDocument();
    const titles = screen
      .getAllByText(/ISS Pass|Aurora KP7|Asteroid Flyby|Venus Visible/)
      .map((el) => el.textContent);
    expect(titles[0]).toBe('Aurora KP7');
    expect(titles[1]).toBe('Venus Visible');
    expect(titles[2]).toBe('Asteroid Flyby');
    expect(titles[3]).toBe('ISS Pass');
  });

  it('calls setSelectedEvent when a row is clicked', async () => {
    const user = userEvent.setup();
    const aurora = mockEvent('aurora-1', { type: 'aurora', title: 'Click Me' });
    useAppStore.setState({ events: [aurora] });

    render(<NightSkyTicker />);
    await user.click(screen.getAllByText('Click Me')[0]);

    expect(useAppStore.getState().selectedEvent?.id).toBe('aurora-1');
  });

  it('highlights the row matching the current selection', () => {
    const planet = mockEvent('planet-1', { type: 'planet', title: 'Selected Planet' });
    useAppStore.setState({ events: [planet], selectedEvent: planet });

    render(<NightSkyTicker />);
    const row = screen.getAllByText('Selected Planet')[0].closest('button');
    expect(row?.className).toContain('bg-ob-cyan/10');
  });
});
