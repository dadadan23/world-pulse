import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HudCollectorPanel } from './HudCollectorPanel';
import { useAppStore } from '../../store/useAppStore';
import type { CollectorHealth } from '@shared/types';

vi.mock('../../store/useAppStore');

const mockUseAppStore = vi.mocked(useAppStore);

function makeCollector(
  name: string,
  status: CollectorHealth['status'],
  errorCount = 0
): CollectorHealth {
  return {
    name,
    status,
    errorCount,
    lastFetchAt: Date.now(),
    isEnabled: status !== 'disabled',
    qualityTier: 'supplementary',
    intervalMs: 60_000,
    isStale: false,
  };
}

const defaultStore = {
  serverStatus: null,
  skyMapOpen: false,
  setSkyMapOpen: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAppStore.mockReturnValue(defaultStore as ReturnType<typeof useAppStore>);
});

describe('HudCollectorPanel', () => {
  it('shows AWAITING when no collectors', () => {
    render(<HudCollectorPanel />);
    expect(screen.getByText('AWAITING...')).toBeDefined();
  });

  it('shows ALL SOURCES ACTIVE summary when all collectors are healthy', () => {
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      serverStatus: {
        ready: true,
        collectors: [
          makeCollector('Earthquakes', 'healthy'),
          makeCollector('ISS', 'healthy'),
          makeCollector('Aurora', 'healthy'),
        ],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.getByText('ALL SOURCES ACTIVE')).toBeDefined();
    // No per-collector detail rows when all healthy
    expect(screen.queryByText('EARTHQUAKES')).toBeNull();
  });

  it('shows N/M summary and per-collector rows when some are degraded', () => {
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      serverStatus: {
        ready: true,
        collectors: [
          makeCollector('Earthquakes', 'healthy'),
          makeCollector('ISS', 'degraded', 3),
          makeCollector('Aurora', 'healthy'),
        ],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.getByText('SOURCES ACTIVE')).toBeDefined();
    expect(screen.getByText('2/3')).toBeDefined();
    // Per-collector rows are visible
    expect(screen.getByText('EARTHQUAKES')).toBeDefined();
    expect(screen.getByText('ISS')).toBeDefined();
  });

  it('shows DISABLED badge for disabled collector', () => {
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      serverStatus: {
        ready: true,
        collectors: [
          makeCollector('Earthquakes', 'healthy'),
          makeCollector('Volcanoes', 'disabled'),
        ],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.getByText('DISABLED')).toBeDefined();
  });

  it('shows 0/N badge state when all collectors are disabled', () => {
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      serverStatus: {
        ready: true,
        collectors: [makeCollector('Earthquakes', 'disabled'), makeCollector('ISS', 'disabled')],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.getByText('0/2')).toBeDefined();
  });
});
