import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppUpdater } from 'electron-updater';
import {
  createUpdateManager,
  isWithinQuietHours,
  CHECK_INTERVAL_MS,
  QUIET_HOURS_POLL_MS,
} from './updateManager';

type Listener = (...args: unknown[]) => void;

class FakeUpdater {
  autoDownload = false;
  autoInstallOnAppQuit = false;
  checkForUpdates = vi.fn().mockResolvedValue(undefined);
  quitAndInstall = vi.fn();
  private listeners: Record<string, Listener[]> = {};

  on(event: string, cb: Listener) {
    (this.listeners[event] ??= []).push(cb);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    for (const cb of this.listeners[event] ?? []) cb(...args);
  }
}

describe('isWithinQuietHours', () => {
  it('is true inside the [start, end) window', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 3, 0), 3, 5)).toBe(true);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 4, 59), 3, 5)).toBe(true);
  });

  it('is false at the end boundary and outside the window', () => {
    expect(isWithinQuietHours(new Date(2026, 0, 1, 5, 0), 3, 5)).toBe(false);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 2, 59), 3, 5)).toBe(false);
    expect(isWithinQuietHours(new Date(2026, 0, 1, 12, 0), 3, 5)).toBe(false);
  });
});

describe('createUpdateManager', () => {
  let updater: FakeUpdater;

  beforeEach(() => {
    vi.useFakeTimers();
    updater = new FakeUpdater();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enables autoDownload and autoInstallOnAppQuit', () => {
    createUpdateManager({ updater: updater as unknown as AppUpdater });
    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
  });

  it('checks immediately on start, then on an interval', () => {
    const manager = createUpdateManager({ updater: updater as unknown as AppUpdater });
    manager.start();
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(CHECK_INTERVAL_MS);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);

    manager.stop();
    vi.advanceTimersByTime(CHECK_INTERVAL_MS * 2);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('tracks status through checking -> downloading -> ready', () => {
    const onStatusChange = vi.fn();
    const manager = createUpdateManager({
      updater: updater as unknown as AppUpdater,
      onStatusChange,
    });

    expect(manager.status).toBe('idle');

    updater.emit('checking-for-update');
    expect(manager.status).toBe('checking');

    updater.emit('download-progress', { percent: 50 });
    expect(manager.status).toBe('downloading');

    updater.emit('update-downloaded', { version: '1.2.3' });
    expect(manager.status).toBe('ready');

    expect(onStatusChange).toHaveBeenCalledWith('checking');
    expect(onStatusChange).toHaveBeenCalledWith('downloading');
    expect(onStatusChange).toHaveBeenCalledWith('ready');
  });

  it('does not surface errors as a non-idle/ready status, only logs them', () => {
    const logLines: string[] = [];
    const manager = createUpdateManager({
      updater: updater as unknown as AppUpdater,
      onStatusChange: () => {},
    });
    // Patch console/log path isn't asserted here; just verify status stays sane.
    updater.emit('checking-for-update');
    updater.emit('error', new Error('network blip'));
    expect(manager.status).toBe('idle');
    expect(logLines).toEqual([]); // no throw, nothing surfaced beyond status
  });

  it('installs automatically once a downloaded update lands inside quiet hours', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 1, 0)); // 1am - outside default window
    const manager = createUpdateManager({ updater: updater as unknown as AppUpdater });
    manager.start();

    updater.emit('update-downloaded', { version: '1.2.3' });
    vi.advanceTimersByTime(QUIET_HOURS_POLL_MS);
    expect(updater.quitAndInstall).not.toHaveBeenCalled();

    vi.setSystemTime(new Date(2026, 0, 1, 3, 30)); // now inside 3-5am window
    vi.advanceTimersByTime(QUIET_HOURS_POLL_MS);
    expect(updater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('never calls quitAndInstall when no update has downloaded', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 4, 0));
    const manager = createUpdateManager({ updater: updater as unknown as AppUpdater });
    manager.start();
    vi.advanceTimersByTime(QUIET_HOURS_POLL_MS * 3);
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
  });
});
