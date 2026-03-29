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
    // Text is split across nodes (symbol + title), so use a function matcher
    const titles = screen.getAllByText((_content, element) => {
      return !!(element?.textContent?.includes('Event 1') && element?.tagName === 'SPAN');
    });
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('should show source count', () => {
    useAppStore.setState({
      serverStatus: {
        ready: true,
        collectors: [
          {
            name: 'test',
            status: 'healthy' as const,
            lastFetchAt: null,
            errorCount: 0,
            isEnabled: true,
          },
          {
            name: 'test2',
            status: 'disabled' as const,
            lastFetchAt: null,
            errorCount: 5,
            isEnabled: false,
          },
        ],
      },
    });
    render(<Ticker />);
    // New format: "SOURCES" label + value "1"
    expect(screen.getByText('SOURCES')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show event count', () => {
    const events = [mockEvent('1'), mockEvent('2'), mockEvent('3')];
    useAppStore.setState({ events });
    render(<Ticker />);
    // New format: "EVENTS" label + value "3" + "(24H)"
    expect(screen.getByText('EVENTS')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('(24H)')).toBeInTheDocument();
  });

  it('should show version number', () => {
    render(<Ticker />);
    expect(screen.getByText('WORLD PULSE v0.2.0')).toBeInTheDocument();
  });

  it('should show refresh interval', () => {
    render(<Ticker />);
    // New format: "INTERVAL" label + "5M" value
    expect(screen.getByText('INTERVAL')).toBeInTheDocument();
    expect(screen.getByText('5M')).toBeInTheDocument();
  });

  it('should limit ticker to 10 events', () => {
    const events = Array.from({ length: 20 }, (_, i) => mockEvent(`${i}`));
    useAppStore.setState({ events });
    render(<Ticker />);
    // Event 10+ should not be in the ticker (only 0-9, each doubled = 20 renders)
    expect(screen.queryByText('Event 15')).not.toBeInTheDocument();
  });
});
