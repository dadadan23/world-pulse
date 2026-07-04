import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ticker } from './Ticker';
import { useAppStore } from '../../store/useAppStore';
import { TICKER_HIGH_SEVERITY_THRESHOLD } from '../../utils/sortByPriority';
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

  it('pins a high-severity news event before routine headlines regardless of timestamp', () => {
    const now = Date.now();
    useAppStore.setState({
      events: [
        mockNewsEvent('routine', 'global', { timestamp: now, title: 'Routine Headline' }),
        mockNewsEvent('breaking', 'global', {
          timestamp: now - 60_000,
          title: 'Breaking Alert',
          severity: TICKER_HIGH_SEVERITY_THRESHOLD,
        }),
      ],
    });
    render(<Ticker />);

    const buttons = screen.getAllByRole('button');
    const firstTitle = buttons[0].querySelector('.text-ob-text')?.textContent;
    expect(firstTitle).toBe('Breaking Alert');
  });
});
