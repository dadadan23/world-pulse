import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  sourceDirectoryOpen: false,
  setSourceDirectoryOpen: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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

  it('shows a new-source indicator when a collector has not been seen before', () => {
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      serverStatus: {
        ready: true,
        collectors: [makeCollector('Earthquakes', 'healthy')],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.getByLabelText('New source available')).toBeDefined();
  });

  it('clears the new-source indicator and opens the directory when SOURCES is clicked', () => {
    const setSourceDirectoryOpen = vi.fn();
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      setSourceDirectoryOpen,
      serverStatus: {
        ready: true,
        collectors: [makeCollector('Earthquakes', 'healthy')],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.getByLabelText('New source available')).toBeDefined();

    fireEvent.click(screen.getByText('[ SOURCES ]'));
    expect(setSourceDirectoryOpen).toHaveBeenCalledWith(true);
    expect(screen.queryByLabelText('New source available')).toBeNull();
  });

  it('does not show the new-source indicator once collectors have been seen', () => {
    localStorage.setItem('world-pulse:seen-sources', JSON.stringify(['Earthquakes']));
    mockUseAppStore.mockReturnValue({
      ...defaultStore,
      serverStatus: {
        ready: true,
        collectors: [makeCollector('Earthquakes', 'healthy')],
      },
    } as ReturnType<typeof useAppStore>);

    render(<HudCollectorPanel />);
    expect(screen.queryByLabelText('New source available')).toBeNull();
  });
});
