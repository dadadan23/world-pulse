import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { EventRateWidget } from './EventRateWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, timestamp: number): Event {
  return {
    id,
    timestamp,
    type: 'earthquake',
    source: 'Test',
    location: null,
    title: 'Test event',
    data: {},
  };
}

describe('EventRateWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there are no events', () => {
    const { container } = render(<EventRateWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a sparkline panel when events exist', () => {
    useAppStore.setState({ events: [mockEvent('1', Date.now())] });
    const { container, getByText } = render(<EventRateWidget />);
    expect(getByText('EVENT RATE / 24H', { exact: false })).toBeInTheDocument();
    expect(container.querySelector('polyline.ob-sparkline-path')).not.toBeNull();
  });

  it('ignores events older than 24h', () => {
    const now = Date.now();
    useAppStore.setState({
      events: [mockEvent('old', now - 25 * 60 * 60 * 1000)],
    });
    const { container } = render(<EventRateWidget />);
    const polyline = container.querySelector('polyline.ob-sparkline-path');
    expect(polyline).not.toBeNull();
    const points = polyline?.getAttribute('points') ?? '';
    const ys = points
      .trim()
      .split(' ')
      .map((p) => parseFloat(p.split(',')[1]));
    expect(new Set(ys).size).toBe(1);
  });
});
