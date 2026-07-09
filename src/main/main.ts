import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fork, type ChildProcess } from 'child_process';
import { is } from '@electron-toolkit/utils';
import { createRestartController } from './restartController';
import { waitForServer } from './serverHealthPoller';
import { createUpdateManager, type UpdateManager } from './updateManager';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let isAppQuitting = false;
let updateManager: UpdateManager | null = null;

const SERVER_PORT = process.env.PORT || 3000;

/** Maximum restart attempts before the circuit opens. */
const RESTART_MAX = 3;
/** Sliding window (ms) for counting restarts. */
const RESTART_WINDOW_MS = 60_000;
/** Delay (ms) before each restart attempt. */
const RESTART_DELAY_MS = 3_000;
/** How long to poll /health before giving up at startup. */
const SERVER_START_TIMEOUT_MS = 10_000;

const restartController = createRestartController({
  maxRestarts: RESTART_MAX,
  windowMs: RESTART_WINDOW_MS,
});

// ---------------------------------------------------------------------------
// Crash logging
// ---------------------------------------------------------------------------

function writeCrashLog(message: string): void {
  try {
    const logDir = app.isReady() ? app.getPath('logs') : os.tmpdir();
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'world-pulse-crash.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch {
    // Silently ignore log-write failures so they do not cause a second crash.
  }
}

// ---------------------------------------------------------------------------
// Global error handlers
// ---------------------------------------------------------------------------

process.on('uncaughtException', (err: Error) => {
  const msg = `Uncaught exception: ${err.message}\n${err.stack ?? ''}`;
  process.stderr.write(`[Electron] ${msg}\n`);
  writeCrashLog(msg);
});

process.on('unhandledRejection', (reason: unknown) => {
  const msg = `Unhandled rejection: ${String(reason)}`;
  process.stderr.write(`[Electron] ${msg}\n`);
  writeCrashLog(msg);
});

// ---------------------------------------------------------------------------
// Window management
// ---------------------------------------------------------------------------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: 'World Pulse',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0a0e1a',
    autoHideMenuBar: true,
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Backend server lifecycle
// ---------------------------------------------------------------------------

function startBackendServer(): void {
  const serverEntry = is.dev
    ? path.join(__dirname, '../../src/server/index.ts')
    : path.join(__dirname, '../server/index.js');

  const execArgv = is.dev ? ['--import', 'tsx'] : [];

  serverProcess = fork(serverEntry, [], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    execArgv,
    stdio: 'pipe',
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(`[Server] ${data.toString()}`);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[Server:err] ${data.toString()}`);
  });

  serverProcess.on('error', (err: Error) => {
    const msg = `Backend server process error: ${err.message}`;
    process.stderr.write(`[Electron] ${msg}\n`);
    writeCrashLog(msg);
  });

  serverProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
    const msg = `Backend server exited (code=${code ?? 'null'} signal=${signal ?? 'null'})`;
    process.stderr.write(`[Electron] ${msg}\n`);
    serverProcess = null;

    // Do not restart during an intentional shutdown.
    if (isAppQuitting) return;

    writeCrashLog(msg);

    if (restartController.shouldRestart()) {
      restartController.recordRestart();
      const attempt = restartController.getRecentRestartCount();
      process.stderr.write(
        `[Electron] Restarting backend server in ${RESTART_DELAY_MS}ms (attempt ${attempt}/${RESTART_MAX})...\n`
      );
      setTimeout(startBackendServer, RESTART_DELAY_MS);
    } else {
      const crashCount = restartController.getRecentRestartCount();
      const errMsg =
        `The backend server crashed ${crashCount} times within ` +
        `${RESTART_WINDOW_MS / 1000} seconds and will not restart automatically. ` +
        `Please restart the application.`;
      writeCrashLog(`Circuit breaker opened: ${errMsg}`);
      process.stderr.write(`[Electron] ${errMsg}\n`);
      dialog.showErrorBox('Backend Server Failed', errMsg);
    }
  });
}

function stopBackendServer(): void {
  isAppQuitting = true;
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  startBackendServer();

  const healthUrl = `http://localhost:${SERVER_PORT}/health`;
  const { ready, elapsedMs } = await waitForServer(healthUrl, SERVER_START_TIMEOUT_MS);
  if (ready) {
    process.stdout.write(`[Electron] Backend ready in ${elapsedMs}ms\n`);
  } else {
    process.stderr.write(
      `[Electron] Backend server did not respond within ${SERVER_START_TIMEOUT_MS}ms (${elapsedMs}ms elapsed); loading UI anyway.\n`
    );
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // electron-updater expects a real packaged app + published feed; skip it in dev.
  if (app.isPackaged) {
    updateManager = createUpdateManager({
      logPath: path.join(app.getPath('logs'), 'world-pulse-update.log'),
      onStatusChange: (status) => {
        mainWindow?.webContents.send('update:status', status);
      },
    });
    updateManager.start();

    // A newly created window (e.g. re-opened from the macOS dock) only learns
    // of the current status here -- onStatusChange only fires on transitions.
    app.on('browser-window-created', (_event, window) => {
      window.webContents.on('dom-ready', () => {
        if (updateManager) {
          window.webContents.send('update:status', updateManager.status);
        }
      });
    });
  }
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendServer();
  updateManager?.stop();
});
