import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVisibleEvents } from './useVisibleEvents';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Event } from '@shared/types';

function mockEvent(id: string, type: Event['type']): Event {
  return {
    id,
    timestamp: Date.now(),
    type,
    source: 'Test',
    location: null,
    title: `Event ${id}`,
    data: {},
  };
}

describe('useVisibleEvents', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
    useSettingsStore.setState({ mutedEventTypes: [] });
  });

  it('returns all events when nothing is muted', () => {
    useAppStore.setState({
      events: [mockEvent('1', 'earthquake'), mockEvent('2', 'weather')],
    });

    const { result } = renderHook(() => useVisibleEvents());
    expect(result.current.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('filters out events of a muted type', () => {
    useAppStore.setState({
      events: [mockEvent('1', 'earthquake'), mockEvent('2', 'weather')],
    });
    useSettingsStore.setState({ mutedEventTypes: ['earthquake'] });

    const { result } = renderHook(() => useVisibleEvents());
    expect(result.current.map((e) => e.id)).toEqual(['2']);
  });

  it('restores already-cached events immediately when un-muted', () => {
    useAppStore.setState({ events: [mockEvent('1', 'earthquake')] });
    useSettingsStore.setState({ mutedEventTypes: ['earthquake'] });

    const { result, rerender } = renderHook(() => useVisibleEvents());
    expect(result.current).toHaveLength(0);

    useSettingsStore.setState({ mutedEventTypes: [] });
    rerender();

    expect(result.current.map((e) => e.id)).toEqual(['1']);
  });
});
