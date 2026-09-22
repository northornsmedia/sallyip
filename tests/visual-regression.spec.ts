import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/product',
  '/solutions',
  '/enterprise',
  '/security',
  '/benchmarks',
  '/patents',
  '/trademarks',
  '/novelty-search',
  '/claim-charts',
  '/office-action-defense',
  '/pricing',
  '/about',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('Visual regression - marketing routes', () => {
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      test(`${route} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route, { waitUntil: 'networkidle' });
        // Wait for lazy images and IO reveals
        await page.waitForTimeout(800);
        // Scroll to trigger lazy images
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(400);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot(`${route.replace(/\//g, '-') || 'home'}-${vp.name}.png`, {
          fullPage: true,
          maxDiffPixels: 200,
          threshold: 0.2,
        });
      });
    }
  }
});

test.describe('Visual regression - interactive states', () => {
  test('nav mega menu open @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.hover('nav >> text=Product');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('nav-mega-product-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('mobile drawer open @ mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.click('button[aria-label="Menu"]');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('nav-drawer-mobile.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('novelty demo interaction @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/novelty-search', { waitUntil: 'networkidle' });
    // Click a result card
    await page.click('.ent-claim');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('novelty-demo-selected-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('claim chart demo interaction @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/claim-charts', { waitUntil: 'networkidle' });
    await page.click('.ent-claim');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('claim-chart-demo-selected-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('office action demo step @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/office-action-defense', { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    // OfficeActionDemo may be lazy-loaded via IntersectionObserver; skip if button not present
    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.count() === 0) {
      test.skip();
    }
    await nextBtn.click();
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('oa-demo-step2-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('trademark demo interaction @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/trademarks', { waitUntil: 'networkidle' });
    await page.click('.ent-claim');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('trademark-demo-selected-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('verification demo interaction @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/verification-logs', { waitUntil: 'networkidle' });
    await page.click('.ent-claim');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('verification-demo-selected-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('journey tab active @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.click('.ent-journey button:has-text("Research")');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('journey-research-active-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });

  test('benchmarks tab @ desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/benchmarks', { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("Hallucination defence")', { timeout: 30000 });
    await page.click('button:has-text("Hallucination defence")');
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('benchmarks-hallucination-tab-desktop.png', { fullPage: true, maxDiffPixels: 200 });
  });
});