import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerticalEventTicker } from './VerticalEventTicker';
import { useAppStore } from '../../../store/useAppStore';
import { useSettingsStore, DEFAULT_SEVERITY_THRESHOLD } from '../../../store/useSettingsStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'Test',
    location: null,
    title: `Event ${id}`,
    data: {},
    ...overrides,
  };
}

describe('VerticalEventTicker', () => {
  beforeEach(() => {
    useAppStore.setState({ selectedEvent: null });
    useSettingsStore.setState({ severityThreshold: DEFAULT_SEVERITY_THRESHOLD });
  });

  it('shows the NO ACTIVE EVENTS empty state and header label when there are no events', () => {
    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={[]} />);
    expect(screen.getByText('NO ACTIVE EVENTS')).toBeInTheDocument();
    expect(screen.getByText('◆ TEST FEED')).toBeInTheDocument();
  });

  it('caps the displayed rows at 5 even when given more events', () => {
    const events = Array.from({ length: 8 }, (_, i) => mockEvent(`${i}`, { title: `Row ${i}` }));
    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={events} />);

    expect(screen.queryByText('Row 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Row 7')).not.toBeInTheDocument();
  });

  it('does not duplicate rows for the scroll loop when under the 5-row threshold', () => {
    const events = [mockEvent('1', { title: 'Lonely Row' })];
    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={events} />);

    expect(screen.getAllByText('Lonely Row')).toHaveLength(1);
  });

  it('duplicates rows for the seamless scroll loop once at the 5-row threshold', () => {
    const events = Array.from({ length: 5 }, (_, i) => mockEvent(`${i}`, { title: `Row ${i}` }));
    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={events} />);

    expect(screen.getAllByText('Row 0')).toHaveLength(2);
  });

  it('calls setSelectedEvent when a row is clicked', async () => {
    const user = userEvent.setup();
    render(
      <VerticalEventTicker
        headerLabel="◆ TEST FEED"
        events={[mockEvent('1', { title: 'Click Me' })]}
      />
    );

    await user.click(screen.getAllByText('Click Me')[0]);

    expect(useAppStore.getState().selectedEvent?.id).toBe('1');
  });

  it('highlights the row matching the current selection', () => {
    const event = mockEvent('1', { title: 'Selected Row' });
    useAppStore.setState({ selectedEvent: event });

    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={[event]} />);

    const row = screen.getAllByText('Selected Row')[0].closest('button');
    expect(row?.className).toContain('bg-ob-cyan/10');
  });

  it('pins a high-severity row ahead of more recent routine rows', () => {
    const now = Date.now();
    const older = mockEvent('high', {
      title: 'High Severity',
      timestamp: now - 60_000,
      severity: 8,
    });
    const newer1 = mockEvent('r1', { title: 'Routine Newest', timestamp: now, severity: 1 });
    const newer2 = mockEvent('r2', { title: 'Routine Newer', timestamp: now - 1000, severity: 2 });

    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={[newer1, newer2, older]} />);

    const rowTitles = screen
      .getAllByText(/Routine|High Severity/)
      .slice(0, 3)
      .map((el) => el.textContent);
    expect(rowTitles).toEqual(['High Severity', 'Routine Newest', 'Routine Newer']);
  });

  it('shows a pulsing severity badge only for high-severity rows', () => {
    const events = [
      mockEvent('high', { title: 'High Row', severity: 9 }),
      mockEvent('routine', { title: 'Routine Row', severity: 2 }),
    ];
    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={events} />);

    expect(screen.getByText('9.0 CRIT')).toBeInTheDocument();
    expect(screen.queryByText('2.0 CRIT')).not.toBeInTheDocument();
  });

  it('respects a lowered configurable severity threshold for the pulse badge', () => {
    useSettingsStore.setState({ severityThreshold: 4 });
    const events = [mockEvent('mid', { title: 'Mid Row', severity: 5 })];

    render(<VerticalEventTicker headerLabel="◆ TEST FEED" events={events} />);
    expect(screen.getByText('5.0 CRIT')).toBeInTheDocument();
  });
});
