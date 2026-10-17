import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createApp } from './app';

describe('Production static frontend fallback', () => {
  let app: ReturnType<typeof createApp> | undefined;
  let distDir: string;

  beforeEach(() => {
    distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-renderer-'));
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>World Pulse</title>');
    fs.mkdirSync(path.join(distDir, 'assets'));
    fs.writeFileSync(path.join(distDir, 'assets', 'app.js'), 'console.warn("asset");');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    app?.stopSweep();
    app?.httpServer.close();
    app?.io.close();
    app = undefined;
    vi.unstubAllEnvs();
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  function setup() {
    // Registering the catch-all route must not throw under Express 5 (path-to-regexp 8).
    app = createApp({ corsOrigin: '*', rendererDist: distDir });
    return app.app;
  }

  it('creates the app without throwing when a renderer build exists', () => {
    expect(() => setup()).not.toThrow();
  });

  it('serves index.html at the root', async () => {
    const res = await request(setup()).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('World Pulse');
  });

  it('falls back to index.html for unknown client-side routes', async () => {
    const res = await request(setup()).get('/some/deep/client/route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('World Pulse');
  });

  it('serves real static assets rather than the fallback', async () => {
    const res = await request(setup()).get('/assets/app.js');
    expect(res.status).toBe(200);
    expect(res.text).toContain('asset');
    expect(res.text).not.toContain('World Pulse');
  });

  it('does not swallow unknown /api routes with index.html', async () => {
    const res = await request(setup()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('World Pulse');
  });

  it('keeps API routes working alongside the fallback', async () => {
    const res = await request(setup()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('does not register the fallback outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const res = await request(setup()).get('/some/deep/client/route');
    expect(res.status).toBe(404);
  });
});
