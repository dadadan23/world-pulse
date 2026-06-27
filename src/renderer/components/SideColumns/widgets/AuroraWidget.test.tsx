import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuroraWidget } from './AuroraWidget';
import { useAppStore } from '../../../store/useAppStore';
import type { AuroraEvent } from '@shared/types';

function mockAurora(overrides?: Partial<AuroraEvent['data']>): AuroraEvent {
  return {
    id: 'aurora-1',
    timestamp: Date.now(),
    type: 'aurora',
    source: 'NOAA SWPC',
    location: null,
    title: 'Aurora activity',
    data: { kpIndex: 3, stormLevel: 'quiet', hemisphere: 'north', ...overrides },
  };
}

describe('AuroraWidget', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] });
  });

  it('renders nothing when there is no aurora event', () => {
    const { container } = render(<AuroraWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the kp index and storm level', () => {
    useAppStore.setState({ events: [mockAurora({ kpIndex: 6, stormLevel: 'storm' })] });
    render(<AuroraWidget />);
    expect(screen.getByText('AURORA · KP INDEX', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('KP6')).toBeInTheDocument();
    expect(screen.getByText('STORM')).toBeInTheDocument();
  });
});
