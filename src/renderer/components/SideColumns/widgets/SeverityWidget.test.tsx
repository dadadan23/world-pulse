import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityWidget } from './SeverityWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, severity?: number): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'Test',
    location: null,
    severity,
    title: 'Test event',
    data: {},
  };
}

describe('SeverityWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there are no events', () => {
    const { container } = render(<SeverityWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no events have a severity', () => {
    useAppStore.setState({ events: [mockEvent('1')] });
    const { container } = render(<SeverityWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('buckets events by severity threshold', () => {
    useAppStore.setState({
      events: [mockEvent('1', 9), mockEvent('2', 6), mockEvent('3', 4), mockEvent('4', 1)],
    });
    render(<SeverityWidget />);
    expect(screen.getByText('SEVERITY DIST', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MODERATE')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });
});
