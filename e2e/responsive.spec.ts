/**
 * Cross-viewport validation pass - Issue #238
 *
 * Validates the responsive layout (DESIGN.md "Responsive Layout" addendum,
 * implemented for #236/#237) across the three deployment surfaces named in
 * project scope: TV/large monitor (landscape), iPad portrait, iPad landscape.
 *
 * For each viewport, asserts: no clipped/overlapping HUD elements, the globe
 * canvas is present and correctly sized, the ticker is visible, no document
 * scrollbar is introduced, and the Oblivion styling (corner-tick panels,
 * JetBrains Mono) is intact.
 *
 * Run: npm run test:e2e
 */

import { test, expect, type Page } from '@playwright/test';

const CONNECT_TIMEOUT_MS = 20_000;

const VIEWPORTS = [
  { name: 'TV / large monitor landscape (16:9)', width: 1920, height: 1080 },
  { name: 'iPad portrait', width: 768, height: 1024 },
  { name: 'iPad landscape', width: 1024, height: 768 },
];

async function waitForConnected(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveText('LIVE', {
    timeout: CONNECT_TIMEOUT_MS,
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`Responsive layout - ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await waitForConnected(page);
    });

    test('renders the globe canvas at the viewport size, with no clipping', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      // Globe fills the viewport (Design Principle #1: "the globe is the hero")
      expect(box!.width).toBeCloseTo(viewport.width, -1);
      expect(box!.height).toBeCloseTo(viewport.height, -1);
    });

    test('HUD columns and ticker are visible and do not overlap each other', async ({ page }) => {
      await expect(page.getByText('WORLD PULSE')).toBeVisible();
      await expect(page.getByText('◆ GEOLOGIC PULSE', { exact: false })).toBeVisible();
      await expect(page.getByText('◆ NIGHT SKY', { exact: false })).toBeVisible();

      const ticker = page.getByText('LIVE FEED');
      await expect(ticker).toBeVisible();

      const geologicBox = await page
        .getByText('◆ GEOLOGIC PULSE', { exact: false })
        .first()
        .boundingBox();
      const tickerBox = await ticker.boundingBox();
      expect(geologicBox).not.toBeNull();
      expect(tickerBox).not.toBeNull();

      // The bottom ticker sits below the left-column widgets, never overlapping them.
      expect(tickerBox!.y).toBeGreaterThanOrEqual(geologicBox!.y + geologicBox!.height);
    });

    test('introduces no document-level scrollbar', async ({ page }) => {
      const hasNoOverflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth <= root.clientWidth && root.scrollHeight <= root.clientHeight;
      });
      expect(hasNoOverflow).toBe(true);
    });

    test('keeps corner-tick panels and JetBrains Mono typography intact', async ({ page }) => {
      const panel = page.locator('.ob-hud-panel').first();
      await expect(panel).toBeVisible();

      const fontFamily = await page
        .getByText('◆ GEOLOGIC PULSE', { exact: false })
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(fontFamily).toContain('JetBrains Mono');
    });
  });
}
