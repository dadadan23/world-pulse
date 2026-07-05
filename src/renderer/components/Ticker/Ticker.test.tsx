import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ticker } from './Ticker';
import { useAppStore } from '../../store/useAppStore';
import type { Event, NewsEvent } from '@shared/types';

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

function mockNewsEvent(
  id: string,
  scope: 'global' | 'local',
  overrides?: Partial<NewsEvent>
): NewsEvent {
  return {
    id,
    timestamp: Date.now(),
    type: 'news',
    source: 'NewsAPI',
    location: null,
    title: `Headline ${id}`,
    data: {
      headline: `Headline ${id}`,
      publisher: 'NewsAPI',
      url: `https://example.com/${id}`,
      category: 'general',
      scope,
    },
    ...overrides,
  };
}

describe('Ticker', () => {
  beforeEach(() => {
    useAppStore.setState({
      events: [],
      selectedEvent: null,
      serverStatus: null,
    });
  });

  it('should show no active events message when no events', () => {
    render(<Ticker />);
    expect(screen.getByText('NO ACTIVE EVENTS')).toBeInTheDocument();
  });

  it('should render only news events, excluding other event types', () => {
    useAppStore.setState({
      events: [mockEvent('1'), mockNewsEvent('news-1', 'global')],
    });
    render(<Ticker />);
    expect(screen.queryByText('Event 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('Headline news-1').length).toBeGreaterThanOrEqual(1);
  });

  it('should limit ticker to 10 headlines', () => {
    const now = Date.now();
    // Explicit descending timestamps so the most-recent-10 cutoff is deterministic
    // regardless of how fast the test loop runs.
    const events = Array.from({ length: 20 }, (_, i) =>
      mockNewsEvent(`${i}`, 'global', { timestamp: now - i * 1000 })
    );
    useAppStore.setState({ events });
    render(<Ticker />);
    expect(screen.queryByText('Headline 15')).not.toBeInTheDocument();
  });

  it('shows a [GLOBAL] badge for global-scope headlines and [NEAR YOU] for local-scope', () => {
    useAppStore.setState({
      events: [mockNewsEvent('news-global', 'global'), mockNewsEvent('news-local', 'local')],
    });
    render(<Ticker />);
    expect(screen.getAllByText('[GLOBAL]').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('[NEAR YOU]').length).toBeGreaterThanOrEqual(1);
  });

  it('calls setSelectedEvent when a headline is clicked', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ events: [mockNewsEvent('news-1', 'global')] });

    render(<Ticker />);
    await user.click(screen.getAllByText('Headline news-1')[0]);

    expect(useAppStore.getState().selectedEvent?.id).toBe('news-1');
  });

  it('pins a high-severity headline ahead of more recent routine headlines', () => {
    const now = Date.now();
    const older = mockNewsEvent('high-sev', 'global', { timestamp: now - 60_000, severity: 9 });
    const newer1 = mockNewsEvent('routine-1', 'global', { timestamp: now, severity: 2 });
    const newer2 = mockNewsEvent('routine-2', 'global', { timestamp: now - 1000, severity: 1 });

    useAppStore.setState({ events: [newer1, newer2, older] });
    render(<Ticker />);

    const titles = screen
      .getAllByText(/^Headline /)
      .slice(0, 3)
      .map((el) => el.textContent);
    expect(titles).toEqual(['Headline high-sev', 'Headline routine-1', 'Headline routine-2']);
  });

  it('shows a pulsing severity badge only for high-severity headlines', () => {
    useAppStore.setState({
      events: [
        mockNewsEvent('high', 'global', { severity: 9 }),
        mockNewsEvent('routine', 'global', { severity: 2 }),
      ],
    });
    render(<Ticker />);

    expect(screen.getAllByText('9.0 CRIT').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('2.0 CRIT')).not.toBeInTheDocument();
  });
});
