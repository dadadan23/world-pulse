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
});
