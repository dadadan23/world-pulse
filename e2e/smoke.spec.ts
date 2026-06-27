/**
 * MVP Smoke Test Suite - Issue #37
 *
 * Validates the critical path for a running World Pulse instance:
 *   1. Health endpoint responds 200
 *   2. Renderer loads (loading screen or dashboard appears)
 *   3. Dashboard becomes visible once connected
 *   4. No error-level console messages during load
 *   5. Live ticker and globe canvas are present
 *
 * Run: npm run test:e2e:smoke
 * Requires: dev server running on localhost:5173 and backend on localhost:3000
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
const CONNECT_TIMEOUT_MS = 20_000;

test.describe('Health endpoint', () => {
  test('GET /health returns 200 with status ok', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptime).toBe('number');
  });

  test('GET /api/events returns an array', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/events`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.events ?? body)).toBe(true);
  });
});

test.describe('Renderer - initial load', () => {
  test('page loads without error-level console messages', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Either the loading screen or the dashboard must be visible
    const loadingVisible = page.getByText('WORLD PULSE', { exact: false });
    await expect(loadingVisible.first()).toBeVisible({ timeout: 10_000 });

    // No JS errors during initial load
    expect(consoleErrors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('loading screen is shown before connection is established', async ({ page }) => {
    await page.goto('/');
    // The LoadingScreen shows the branding text before socket connects
    await expect(page.getByText('WORLD PULSE', { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Renderer - connected state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('HUD status panel shows LIVE once connected', async ({ page }) => {
    // Wait for socket to connect and app to initialize.
    // Scoped to the connection-status testid: collector health badges
    // (HudCollectorPanel) also render "LIVE" text once sources report healthy.
    await expect(page.getByTestId('connection-status')).toHaveText('LIVE', {
      timeout: CONNECT_TIMEOUT_MS,
    });
  });

  test('globe canvas is rendered', async ({ page }) => {
    // Dashboard loads once connected; globe is a <canvas> element
    await expect(page.getByTestId('connection-status')).toHaveText('LIVE', {
      timeout: CONNECT_TIMEOUT_MS,
    });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 5_000 });
  });

  test('live feed ticker is visible', async ({ page }) => {
    await expect(page.getByTestId('connection-status')).toHaveText('LIVE', {
      timeout: CONNECT_TIMEOUT_MS,
    });
    await expect(page.getByText('LIVE FEED')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Electron main process config (unit assertions)', () => {
  test('BrowserWindow uses autoHideMenuBar and health-check polling', async () => {
    // This test asserts configuration via static file inspection rather than
    // launching Electron (which requires a full build and display server).
    // A dedicated Electron E2E run is done post-build via `npm run build:electron`.
    const { readFileSync } = await import('fs');
    const mainSrc = readFileSync('src/main/main.ts', 'utf8');

    expect(mainSrc).toContain('autoHideMenuBar: true');
    expect(mainSrc).toContain('waitForServer');
    expect(mainSrc).toContain('createRestartController');
  });
});
