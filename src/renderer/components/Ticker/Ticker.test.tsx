import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Ticker } from './Ticker';
import { useAppStore } from '../../store/useAppStore';
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

describe('Ticker', () => {
  beforeEach(() => {
    useAppStore.setState({
      events: [],
      serverStatus: null,
    });
  });

  it('should show waiting message when no events', () => {
    render(<Ticker />);
    expect(screen.getByText('AWAITING EVENTS...')).toBeInTheDocument();
  });

  it('should render event titles in ticker', () => {
    useAppStore.setState({ events: [mockEvent('1')] });
    render(<Ticker />);
    const titles = screen.getAllByText((_content, element) => {
      return !!(element?.textContent?.includes('Event 1') && element?.tagName === 'SPAN');
    });
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('should limit ticker to 10 events', () => {
    const events = Array.from({ length: 20 }, (_, i) => mockEvent(`${i}`));
    useAppStore.setState({ events });
    render(<Ticker />);
    expect(screen.queryByText('Event 15')).not.toBeInTheDocument();
  });
});
