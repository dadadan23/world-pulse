import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeismicWidget } from './SeismicWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { EarthquakeEvent, Event } from '@shared/types';

function mockQuake(
  id: string,
  magnitude: number,
  overrides?: Partial<EarthquakeEvent>
): EarthquakeEvent {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS Earthquake Hazards Program',
    location: { lat: 0, lon: 0, name: 'Test' },
    severity: magnitude,
    title: `M${magnitude} earthquake`,
    data: { magnitude, depth: 10, region: 'Test Region' },
    ...overrides,
  };
}

describe('SeismicWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there are no earthquake events', () => {
    const { container } = render(<SeismicWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when events exist but none are earthquakes', () => {
    useAppStore.setState({
      events: [
        {
          id: '1',
          timestamp: Date.now(),
          type: 'weather',
          source: 'Test',
          location: null,
          title: 'Weather event',
          data: {},
        } as Event,
      ],
    });
    const { container } = render(<SeismicWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a row per earthquake, most recent first', () => {
    useAppStore.setState({
      events: [mockQuake('1', 4.1, { timestamp: 1000 }), mockQuake('2', 7.2, { timestamp: 2000 })],
    });
    render(<SeismicWidget />);
    expect(screen.getByText('SEISMIC ACTIVITY', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('M7.2')).toBeInTheDocument();
    expect(screen.getByText('M4.1')).toBeInTheDocument();
  });

  it('caps rows at 6 most recent earthquakes', () => {
    const events = Array.from({ length: 10 }, (_, i) => mockQuake(`${i}`, 3.0, { timestamp: i }));
    useAppStore.setState({ events });
    render(<SeismicWidget />);
    const rows = screen.getAllByText('M3.0');
    expect(rows.length).toBe(6);
  });
});
