import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AsteroidWidget } from './AsteroidWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { AsteroidEvent } from '@shared/types';

function mockAsteroid(
  id: string,
  missDistance: number,
  overrides?: Partial<AsteroidEvent['data']>
): AsteroidEvent {
  return {
    id,
    timestamp: Date.now(),
    type: 'asteroid',
    source: 'NASA NeoWs',
    location: null,
    title: `Asteroid ${id}`,
    data: {
      name: `Asteroid ${id}`,
      diameterMin: 10,
      diameterMax: 20,
      velocity: 50000,
      missDistance,
      hazardous: false,
      approachDate: '2026-06-27',
      ...overrides,
    },
  };
}

describe('AsteroidWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there are no asteroid events', () => {
    const { container } = render(<AsteroidWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders rows sorted by ascending miss distance, capped at 3', () => {
    useAppStore.setState({
      events: [
        mockAsteroid('1', 3000000),
        mockAsteroid('2', 500000),
        mockAsteroid('3', 1000000),
        mockAsteroid('4', 2000000),
      ],
    });
    render(<AsteroidWidget />);
    expect(screen.getByText('ASTEROID PROX', { exact: false })).toBeInTheDocument();
    const names = screen.getAllByTitle(/Asteroid/).map((el) => el.textContent);
    expect(names).toEqual(['Asteroid 2', 'Asteroid 3', 'Asteroid 4']);
  });

  it('shows a hazard marker for hazardous asteroids', () => {
    useAppStore.setState({ events: [mockAsteroid('1', 500000, { hazardous: true })] });
    render(<AsteroidWidget />);
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });
});
