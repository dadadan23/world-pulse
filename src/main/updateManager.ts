/**
 * Wraps electron-updater's autoUpdater with:
 * - periodic background checks + silent downloads
 * - durable logging of check/download/install outcomes
 * - a quiet-hours window during which a downloaded update installs itself
 *   without an interactive "restart now" prompt (see docs/RELEASE.md)
 */

import fs from 'fs';
import path from 'path';
import { autoUpdater as defaultAutoUpdater, type AppUpdater } from 'electron-updater';

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready';

/** How often to check for updates while the app is running. */
export const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
/** How often to re-evaluate whether we've entered the quiet-hours window. */
export const QUIET_HOURS_POLL_MS = 5 * 60 * 1000; // 5 minutes
/** Default quiet-hours window (local time, [start, end)) for idle auto-install. */
export const DEFAULT_QUIET_HOURS_START = 3;
export const DEFAULT_QUIET_HOURS_END = 5;

/**
 * True when `date`'s local hour falls within [startHour, endHour) — the
 * daily window during which a downloaded update may install itself without
 * an interactive restart prompt.
 */
export function isWithinQuietHours(
  date: Date,
  startHour: number = DEFAULT_QUIET_HOURS_START,
  endHour: number = DEFAULT_QUIET_HOURS_END
): boolean {
  const hour = date.getHours();
  return hour >= startHour && hour < endHour;
}

export interface UpdateManagerOptions {
  /** Injectable for testing; defaults to electron-updater's singleton. */
  updater?: AppUpdater;
  /** Absolute path to append install/check log lines to. */
  logPath?: string;
  /** Called whenever the update status changes, e.g. to notify the renderer. */
  onStatusChange?: (status: UpdateStatus) => void;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}

export interface UpdateManager {
  readonly status: UpdateStatus;
  start(): void;
  stop(): void;
}

export function createUpdateManager(options: UpdateManagerOptions = {}): UpdateManager {
  const updater = options.updater ?? defaultAutoUpdater;
  const quietHoursStart = options.quietHoursStart ?? DEFAULT_QUIET_HOURS_START;
  const quietHoursEnd = options.quietHoursEnd ?? DEFAULT_QUIET_HOURS_END;

  let status: UpdateStatus = 'idle';
  let updateReady = false;
  let checkTimer: ReturnType<typeof setInterval> | null = null;
  let quietHoursTimer: ReturnType<typeof setInterval> | null = null;
  let logDirReady = false;

  function log(message: string): void {
    process.stdout.write(`[Updater] ${message}\n`);
    if (!options.logPath) return;
    try {
      if (!logDirReady) {
        fs.mkdirSync(path.dirname(options.logPath), { recursive: true });
        logDirReady = true;
      }
      fs.appendFileSync(options.logPath, `[${new Date().toISOString()}] ${message}\n`);
    } catch {
      // Never let logging failures affect the update flow.
    }
  }

  function setStatus(next: UpdateStatus): void {
    if (status === next) return;
    status = next;
    options.onStatusChange?.(next);
  }

  updater.autoDownload = true;
  // Installs automatically when the user quits the app (covers "manual relaunch"
  // from #245's AC); the quiet-hours timer below covers the idle case.
  updater.autoInstallOnAppQuit = true;

  updater.on('checking-for-update', () => {
    setStatus('checking');
    log('Checking for update');
  });

  updater.on('update-available', (info) => {
    log(`Update available: ${info.version}`);
  });

  updater.on('update-not-available', () => {
    setStatus('idle');
    log('No update available');
  });

  updater.on('download-progress', () => {
    setStatus('downloading');
  });

  updater.on('update-downloaded', (info) => {
    updateReady = true;
    setStatus('ready');
    log(`Update downloaded: ${info.version}`);
  });

  updater.on('error', (err) => {
    // Failures are logged only — never surfaced as an error banner/dialog.
    setStatus(updateReady ? 'ready' : 'idle');
    log(`Update error: ${err.message}`);
  });

  function checkNow(): void {
    updater.checkForUpdates().catch((err: unknown) => {
      log(`Update check failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  function maybeInstallDuringQuietHours(): void {
    if (!updateReady) return;
    if (!isWithinQuietHours(new Date(), quietHoursStart, quietHoursEnd)) return;
    log('Quiet-hours window reached with a downloaded update ready — installing now');
    updater.quitAndInstall();
  }

  return {
    get status() {
      return status;
    },
    start() {
      checkNow();
      checkTimer = setInterval(checkNow, CHECK_INTERVAL_MS);
      quietHoursTimer = setInterval(maybeInstallDuringQuietHours, QUIET_HOURS_POLL_MS);
    },
    stop() {
      if (checkTimer) clearInterval(checkTimer);
      if (quietHoursTimer) clearInterval(quietHoursTimer);
      checkTimer = null;
      quietHoursTimer = null;
    },
  };
}
