import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeftColumn } from './LeftColumn';
import { useAppStore } from '../../store/useAppStore';
import type { Event } from '@shared/types';

function mockEarthquake(id: string): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS Earthquake Hazards Program',
    location: { lat: 0, lon: 0, name: 'Test' },
    severity: 5,
    title: `Event ${id}`,
    data: { magnitude: 5.5, depth: 10, region: 'Test Region' },
  };
}

describe('LeftColumn', () => {
  beforeEach(() => {
    // A single earthquake event is enough to make every left-column widget
    // (all filtered by earthquake/volcano type) render actual content instead
    // of their empty-state `null`.
    useAppStore.setState({ events: [mockEarthquake('1')], selectedEvent: null });
  });

  it('renders all five widgets in landscape (default)', () => {
    render(<LeftColumn />);
    expect(screen.getByText('◆ GEOLOGIC PULSE', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('◆ SEISMIC ACTIVITY')).toBeInTheDocument();
    expect(screen.getByText('◆ EVENT RATE / 24H')).toBeInTheDocument();
    expect(screen.getByText('◆ BY TYPE')).toBeInTheDocument();
    expect(screen.getByText('◆ SEVERITY DIST')).toBeInTheDocument();
  });

  it('renders all five widgets in portrait, nothing dropped', () => {
    render(<LeftColumn isPortrait />);
    expect(screen.getByText('◆ GEOLOGIC PULSE', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('◆ SEISMIC ACTIVITY')).toBeInTheDocument();
    expect(screen.getByText('◆ EVENT RATE / 24H')).toBeInTheDocument();
    expect(screen.getByText('◆ BY TYPE')).toBeInTheDocument();
    expect(screen.getByText('◆ SEVERITY DIST')).toBeInTheDocument();
  });

  it('uses a fixed vertical strip in landscape and a full-width fixed band in portrait', () => {
    const { container: landscapeContainer } = render(<LeftColumn />);
    const landscapeRoot = landscapeContainer.firstChild as HTMLElement;
    expect(landscapeRoot.className).toContain('fixed');
    expect(landscapeRoot.className).toContain('w-[220px]');
    expect(landscapeRoot.className).not.toContain('overflow-x-auto');

    const { container: portraitContainer } = render(<LeftColumn isPortrait />);
    const portraitRoot = portraitContainer.firstChild as HTMLElement;
    expect(portraitRoot.className).toContain('fixed');
    expect(portraitRoot.className).toContain('left-0');
    expect(portraitRoot.className).toContain('right-0');
    expect(portraitRoot.className).toContain('overflow-x-auto');
  });
});
