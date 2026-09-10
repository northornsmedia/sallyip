// Capture missing real UI states for: verification desk, claim chart, office action thread, trademark grid, benchmark table
// Run with: node scripts/capture-ui-states.mjs  (after `npm run build && npm run preview &`)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('public/shots');
mkdirSync(OUT, { recursive: true });

async function capture(page, name, selector, clip) {
  await page.waitForSelector(selector, { timeout: 10000 });
  const element = await page.$(selector);
  if (!element) throw new Error(`Selector not found: ${selector}`);
  await element.screenshot({ path: `${OUT}/${name}.png` });
  await element.screenshot({ path: `${OUT}/${name}.webp`, type: 'webp', quality: 85 });
  console.log(`✓ ${name}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to verification-logs and capture the verification desk
  await page.goto('http://localhost:4173/verification-logs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await capture(page, 'sallyip-verification-desk', '.ent-shot:has-text("VERIFICATION DESK")', null);

  // Claim chart detail
  await page.goto('http://localhost:4173/claim-charts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('.ent-claim');
  await page.waitForTimeout(300);
  await capture(page, 'sallyip-claim-chart-detail', '.ent-demo-body', null);

  // Office action thread (step 2 - authority)
  await page.goto('http://localhost:4173/office-action-defense', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(300);
  await capture(page, 'sallyip-oa-thread-authority', '.ent-demo-body', null);

  // Office action thread (step 3 - argument)
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(300);
  await capture(page, 'sallyip-oa-thread-argument', '.ent-demo-body', null);

  // Trademark clearance grid
  await page.goto('http://localhost:4173/trademarks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await capture(page, 'sallyip-trademark-grid', '.ent-demo:has-text("Candidates")', null);

  // Benchmark table (full)
  await page.goto('http://localhost:4173/benchmarks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await capture(page, 'sallyip-benchmarks-table', '.ent-table-wrap', null);

  // Verification desk detail (proposition expanded)
  await page.goto('http://localhost:4173/verification-logs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.click('.ent-claim');
  await page.waitForTimeout(300);
  await capture(page, 'sallyip-verification-detail', '.ent-demo-body', null);

  await browser.close();
  console.log('All captures complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });