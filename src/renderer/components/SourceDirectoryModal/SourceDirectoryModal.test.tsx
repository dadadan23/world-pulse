import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceDirectoryModal } from './SourceDirectoryModal';
import { useAppStore } from '../../store/useAppStore';
import type { CollectorHealth } from '@shared/types';

vi.mock('../../store/useAppStore');

const mockUseAppStore = vi.mocked(useAppStore);

function makeCollector(name: string, status: CollectorHealth['status']): CollectorHealth {
  return {
    name,
    status,
    errorCount: 0,
    lastFetchAt: Date.now(),
    isEnabled: status !== 'disabled',
    qualityTier: 'primary',
    intervalMs: 5 * 60 * 1000,
    isStale: false,
  };
}

const setSourceDirectoryOpen = vi.fn();

function mockStore(sourceDirectoryOpen: boolean, collectors: CollectorHealth[] = []) {
  mockUseAppStore.mockImplementation((selector: unknown) => {
    const state = {
      sourceDirectoryOpen,
      setSourceDirectoryOpen,
      serverStatus: { ready: true, collectors },
    };
    return typeof selector === 'function' ? selector(state as unknown) : state;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SourceDirectoryModal', () => {
  it('renders nothing when closed', () => {
    mockStore(false);
    const { container } = render(<SourceDirectoryModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a card for every catalog entry, joined with live status, when open', () => {
    mockStore(true, [makeCollector('USGS Earthquakes', 'healthy')]);
    render(<SourceDirectoryModal />);

    expect(screen.getByText('SOURCE DIRECTORY')).toBeDefined();
    expect(screen.getByText('USGS Earthquake Hazards')).toBeDefined();
    expect(screen.getByText('LIVE')).toBeDefined();
    // A catalog entry with no live match falls back to UNKNOWN
    expect(screen.getAllByText('UNKNOWN').length).toBeGreaterThan(0);
  });

  it('closes when the close button is clicked', () => {
    mockStore(true);
    render(<SourceDirectoryModal />);
    fireEvent.click(screen.getByText('[ ESC ] CLOSE'));
    expect(setSourceDirectoryOpen).toHaveBeenCalledWith(false);
  });

  it('closes when clicking the backdrop', () => {
    mockStore(true);
    render(<SourceDirectoryModal />);
    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(setSourceDirectoryOpen).toHaveBeenCalledWith(false);
  });

  it('closes on Escape key', () => {
    mockStore(true);
    render(<SourceDirectoryModal />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setSourceDirectoryOpen).toHaveBeenCalledWith(false);
  });
});
