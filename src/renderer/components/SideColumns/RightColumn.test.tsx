import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RightColumn } from './RightColumn';
import { useAppStore } from '../../store/useAppStore';
import type { AsteroidEvent, AuroraEvent, ISSEvent } from '@shared/types';

const issEvent: ISSEvent = {
  id: 'iss-1',
  timestamp: Date.now(),
  type: 'iss',
  source: 'Open Notify',
  location: { lat: 0, lon: 0, name: 'ISS' },
  title: 'ISS Pass',
  data: { altitude: 408, velocity: 27600, visibility: 'daylight' },
};

const auroraEvent: AuroraEvent = {
  id: 'aurora-1',
  timestamp: Date.now(),
  type: 'aurora',
  source: 'NOAA',
  location: null,
  title: 'Aurora Activity',
  data: { kpIndex: 4, stormLevel: 'unsettled', hemisphere: 'north' },
};

const asteroidEvent: AsteroidEvent = {
  id: 'asteroid-1',
  timestamp: Date.now(),
  type: 'asteroid',
  source: 'NASA NeoWs',
  location: null,
  title: 'Near-Earth Asteroid',
  data: {
    name: 'Test Asteroid',
    diameterMin: 10,
    diameterMax: 20,
    velocity: 50000,
    missDistance: 1_000_000,
    hazardous: false,
    approachDate: '2026-07-05',
  },
};

describe('RightColumn', () => {
  beforeEach(() => {
    useAppStore.setState({
      events: [issEvent, auroraEvent, asteroidEvent],
      selectedEvent: null,
    });
  });

  it('renders all five widgets in landscape (default)', () => {
    render(<RightColumn />);
    expect(screen.getByText('◆ NIGHT SKY', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('◆ ISS TELEMETRY')).toBeInTheDocument();
    expect(screen.getByText('◆ AURORA · KP INDEX')).toBeInTheDocument();
    expect(screen.getByText('◆ ASTEROID PROX')).toBeInTheDocument();
  });

  it('renders all five widgets in portrait, nothing dropped', () => {
    render(<RightColumn isPortrait />);
    expect(screen.getByText('◆ NIGHT SKY', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('◆ ISS TELEMETRY')).toBeInTheDocument();
    expect(screen.getByText('◆ AURORA · KP INDEX')).toBeInTheDocument();
    expect(screen.getByText('◆ ASTEROID PROX')).toBeInTheDocument();
  });

  it('uses a fixed vertical strip in landscape and a full-width fixed band in portrait', () => {
    const { container: landscapeContainer } = render(<RightColumn />);
    const landscapeRoot = landscapeContainer.firstChild as HTMLElement;
    expect(landscapeRoot.className).toContain('fixed');
    expect(landscapeRoot.className).toContain('w-[220px]');
    expect(landscapeRoot.className).not.toContain('overflow-x-auto');

    const { container: portraitContainer } = render(<RightColumn isPortrait />);
    const portraitRoot = portraitContainer.firstChild as HTMLElement;
    expect(portraitRoot.className).toContain('fixed');
    expect(portraitRoot.className).toContain('left-0');
    expect(portraitRoot.className).toContain('right-0');
    expect(portraitRoot.className).toContain('overflow-x-auto');
  });
});
