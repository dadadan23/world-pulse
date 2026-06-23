import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PastEchoes } from './PastEchoes';
import type { Event, HistoricalEvent } from '@shared/types';

function makeLiveEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'eq_1',
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS',
    location: { lat: 38.8, lon: 22.55 },
    title: 'M5.2 earthquake',
    data: {},
    ...overrides,
  };
}

function makeHistoricalEvent(
  overrides: Partial<HistoricalEvent['data']['context']> = {}
): HistoricalEvent {
  const context = {
    id: 'battle_thermopylae',
    title: 'Battle of Thermopylae',
    category: 'disaster' as const,
    subcategory: 'land_battle',
    location: { lat: 38.8, lon: 22.55, name: 'Thermopylae Pass, Greece' },
    date: '480',
    summary: 'A last stand against the Persian army.',
    attribution: 'Herodotus, Histories',
    license: 'Public Domain',
    confidence: 'confirmed' as const,
    sourceQuality: 'high' as const,
    ...overrides,
  };
  return {
    id: `historical_${context.id}`,
    timestamp: Date.now(),
    type: 'historical',
    source: context.attribution,
    location: context.location,
    severity: 1,
    title: context.title,
    description: context.summary,
    data: { context },
  };
}

describe('PastEchoes', () => {
  it('renders nothing when there are no meaningful matches', () => {
    const { container } = render(<PastEchoes event={makeLiveEvent()} historicalEvents={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for a selected historical event', () => {
    const { container } = render(
      <PastEchoes
        event={makeLiveEvent({ type: 'historical' })}
        historicalEvents={[makeHistoricalEvent()]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows a collapsed section header with a match count', () => {
    render(<PastEchoes event={makeLiveEvent()} historicalEvents={[makeHistoricalEvent()]} />);
    expect(screen.getByText('PAST ECHOES (1)')).toBeDefined();
    expect(screen.queryByText('Battle of Thermopylae')).toBeNull();
  });

  it('expands to show match details labeled as historical context', async () => {
    const user = userEvent.setup();
    render(<PastEchoes event={makeLiveEvent()} historicalEvents={[makeHistoricalEvent()]} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Battle of Thermopylae')).toBeDefined();
    expect(screen.getByText('480')).toBeDefined();
    expect(screen.getByText('HISTORICAL CONTEXT')).toBeDefined();
  });

  describe('category filter overlay controls (#166)', () => {
    function renderPanel(historicalEvents: HistoricalEvent[]) {
      return render(
        <PastEchoes event={makeLiveEvent({ type: 'news' })} historicalEvents={historicalEvents} />
      );
    }

    it('defaults to the "ALL" filter and shows every match', async () => {
      const user = userEvent.setup();
      renderPanel([
        makeHistoricalEvent({ id: 'disaster_1', category: 'disaster' }),
        makeHistoricalEvent({ id: 'conflict_1', category: 'conflict' }),
      ]);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));

      expect(screen.getByRole('button', { name: 'ALL', pressed: true })).toBeDefined();
      expect(screen.getAllByText('HISTORICAL CONTEXT')).toHaveLength(2);
    });

    it('narrows the visible list to the selected category', async () => {
      const user = userEvent.setup();
      renderPanel([
        makeHistoricalEvent({ id: 'disaster_1', category: 'disaster', title: 'Disaster Match' }),
        makeHistoricalEvent({ id: 'conflict_1', category: 'conflict', title: 'Conflict Match' }),
      ]);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));
      await user.click(screen.getByRole('button', { name: 'DISASTERS' }));

      expect(screen.getByText('Disaster Match')).toBeDefined();
      expect(screen.queryByText('Conflict Match')).toBeNull();
    });

    it('shows a non-blocking empty state when no match fits the selected category', async () => {
      const user = userEvent.setup();
      renderPanel([makeHistoricalEvent({ id: 'disaster_1', category: 'disaster' })]);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));
      await user.click(screen.getByRole('button', { name: 'CONFLICT' }));

      expect(screen.getByText('NO MATCHES IN THIS CATEGORY')).toBeDefined();
    });

    it('returns to the full list when "ALL" is reselected', async () => {
      const user = userEvent.setup();
      renderPanel([
        makeHistoricalEvent({ id: 'disaster_1', category: 'disaster', title: 'Disaster Match' }),
        makeHistoricalEvent({ id: 'conflict_1', category: 'conflict', title: 'Conflict Match' }),
      ]);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));
      await user.click(screen.getByRole('button', { name: 'DISASTERS' }));
      await user.click(screen.getByRole('button', { name: 'ALL' }));

      expect(screen.getByText('Disaster Match')).toBeDefined();
      expect(screen.getByText('Conflict Match')).toBeDefined();
    });

    it('clears the filter session when the panel closes and a new one mounts (#166)', async () => {
      const user = userEvent.setup();
      const { unmount } = renderPanel([
        makeHistoricalEvent({ id: 'disaster_1', category: 'disaster' }),
      ]);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));
      await user.click(screen.getByRole('button', { name: 'DISASTERS' }));
      unmount();

      renderPanel([makeHistoricalEvent({ id: 'disaster_2', category: 'disaster' })]);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));
      expect(screen.getByRole('button', { name: 'ALL', pressed: true })).toBeDefined();
    });
  });

  describe('readability budget under filtering (#167)', () => {
    it('never shows more items than the existing density cap, regardless of category filter', async () => {
      const user = userEvent.setup();
      const disasters = Array.from({ length: 5 }, (_, i) =>
        makeHistoricalEvent({ id: `disaster_${i}`, category: 'disaster', title: `Disaster ${i}` })
      );
      render(<PastEchoes event={makeLiveEvent({ type: 'news' })} historicalEvents={disasters} />);
      await user.click(screen.getByRole('button', { name: /PAST ECHOES/ }));
      await user.click(screen.getByRole('button', { name: 'DISASTERS' }));

      expect(screen.getAllByText('HISTORICAL CONTEXT')).toHaveLength(3);
    });
  });
});
