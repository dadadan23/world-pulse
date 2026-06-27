import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeDistWidget } from './TypeDistWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, type: Event['type'], severity?: number): Event {
  return {
    id,
    timestamp: Date.now(),
    type,
    source: 'Test',
    location: null,
    severity,
    title: 'Test event',
    data: {},
  };
}

describe('TypeDistWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there are no events', () => {
    const { container } = render(<TypeDistWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a row per distinct type, sorted by count descending', () => {
    useAppStore.setState({
      events: [
        mockEvent('1', 'earthquake'),
        mockEvent('2', 'earthquake'),
        mockEvent('3', 'earthquake'),
        mockEvent('4', 'weather'),
      ],
    });
    render(<TypeDistWidget />);
    expect(screen.getByText('BY TYPE', { exact: false })).toBeInTheDocument();
    const counts = screen.getAllByText(/^[0-9]+$/).map((el) => el.textContent);
    expect(counts).toEqual(['3', '1']);
  });
});
