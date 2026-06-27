import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ISSWidget } from './ISSWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { ISSEvent, Event } from '@shared/types';

function mockIss(overrides?: Partial<ISSEvent['data']>): ISSEvent {
  return {
    id: 'iss-1',
    timestamp: Date.now(),
    type: 'iss',
    source: 'Open Notify',
    location: { lat: 0, lon: 0 },
    title: 'ISS position',
    data: { altitude: 408, velocity: 27600, visibility: 'daylight', ...overrides },
  };
}

describe('ISSWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there is no ISS event', () => {
    const { container } = render(<ISSWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when events exist but none are ISS', () => {
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
    const { container } = render(<ISSWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders altitude, velocity, and visibility', () => {
    useAppStore.setState({ events: [mockIss()] });
    render(<ISSWidget />);
    expect(screen.getByText('ISS TELEMETRY', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('408km')).toBeInTheDocument();
    expect(screen.getByText('27600')).toBeInTheDocument();
    expect(screen.getByText('DAYLIGHT', { exact: false })).toBeInTheDocument();
  });

  it('shows eclipsed visibility', () => {
    useAppStore.setState({ events: [mockIss({ visibility: 'eclipsed' })] });
    render(<ISSWidget />);
    expect(screen.getByText('ECLIPSED', { exact: false })).toBeInTheDocument();
  });
});
