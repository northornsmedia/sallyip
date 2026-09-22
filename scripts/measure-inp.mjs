// INP (Interaction to Next Paint) measurement for CI
// Run with: node scripts/measure-inp.mjs  (after `npm run preview &`)
import { chromium } from 'playwright-core';

const ROUTES = ['/', '/product', '/novelty-search', '/claim-charts', '/office-action-defense', '/benchmarks'];

async function measureINP(page, route, interactions) {
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Warm up
  for (const interaction of interactions) {
    if (interaction.type === 'click') {
      await page.click(interaction.selector);
      await page.waitForTimeout(200);
    }
  }

  // Measure INP using PerformanceObserver
  const inp = await page.evaluate(async (interactions) => {
    return new Promise((resolve) => {
      const entries = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'event' && entry.duration > 0) {
            entries.push(entry.duration);
          }
        }
      });
      observer.observe({ type: 'event', buffered: true });

      // Run interactions and measure
      for (const interaction of interactions) {
        if (interaction.type === 'click') {
          const el = document.querySelector(interaction.selector);
          if (el) el.click();
          await new Promise(r => setTimeout(r, 150));
        }
      }

      await new Promise(r => setTimeout(r, 500));
      observer.disconnect();
      resolve(entries.length ? Math.max(...entries) : 0);
    });
  }, interactions);

  return inp;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  const results = [];

  // Home: journey tab + mega menu
  results.push({
    route: '/',
    inp: await measureINP(page, '/', [
      { type: 'click', selector: '.ent-journey button:has-text("Research")' },
      { type: 'click', selector: 'nav >> text=Product' },
    ]),
  });

  // Product: workspaces modal trigger (if any)
  results.push({
    route: '/product',
    inp: await measureINP(page, '/product', [
      { type: 'click', selector: '.ent-textlink:has-text("Explore")' },
    ]),
  });

  // Novelty: select result
  results.push({
    route: '/novelty-search',
    inp: await measureINP(page, '/novelty-search', [
      { type: 'click', selector: '.ent-claim' },
    ]),
  });

  // Claim charts: select limitation
  results.push({
    route: '/claim-charts',
    inp: await measureINP(page, '/claim-charts', [
      { type: 'click', selector: '.ent-claim' },
    ]),
  });

  // Office action: step through
  results.push({
    route: '/office-action-defense',
    inp: await measureINP(page, '/office-action-defense', [
      { type: 'click', selector: 'button:has-text("Next")' },
      { type: 'click', selector: 'button:has-text("Next")' },
    ]),
  });

  // Benchmarks: tab switch
  results.push({
    route: '/benchmarks',
    inp: await measureINP(page, '/benchmarks', [
      { type: 'click', selector: 'button:has-text("Hallucination defence")' },
    ]),
  });

  console.table(results.map(r => ({
    route: r.route,
    'INP (ms)': Math.round(r.inp),
    status: r.inp <= 200 ? '✅ GOOD' : r.inp <= 500 ? '⚠️ NEEDS IMPROVEMENT' : '❌ POOR',
  })));

  const worst = Math.max(...results.map(r => r.inp));
  console.log(`\nWorst INP: ${Math.round(worst)}ms`);

  await browser.close();

  if (worst > 500) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });