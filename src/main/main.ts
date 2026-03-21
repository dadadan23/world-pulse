import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fork, type ChildProcess } from 'child_process';
import { is } from '@electron-toolkit/utils';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const SERVER_PORT = process.env.PORT || 3000;

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

  serverProcess.on('error', (err) => {
    console.error('[Electron] Failed to start backend server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.error(`[Electron] Backend server exited with code ${code}`);
    serverProcess = null;
  });
}

function stopBackendServer(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

app.whenReady().then(() => {
  startBackendServer();

  // Give the server a moment to start before loading the window
  setTimeout(() => {
    createWindow();
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendServer();
});
