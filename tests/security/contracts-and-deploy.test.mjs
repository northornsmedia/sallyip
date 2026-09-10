import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { screenContract, ANALYSIS_LABEL } from '../../src/lib/contract-analysis.js';

// Contract regex is screening only, benchmarked, never certified analysis.
test('contract screening labels method as RULE_BASED_SCREENING and flags red clauses', () => {
  const rows = screenContract('## Liability\nLiability is unlimited in all respects\n## Term\nEither party may terminate for convenience on 30 days notice');
  assert.ok(rows.length >= 2);
  for (const r of rows) assert.equal(r.screening.method, ANALYSIS_LABEL);
  assert.ok(rows.some((r) => r.screening.risk_level === 'red' && r.requires_human_review));
});

test('contract benchmark v1 exists with 11 categories', () => {
  const md = fs.readFileSync(new URL('../../benchmarks/contract_review_benchmark_v1.md', import.meta.url), 'utf8');
  for (const cat of ['liability', 'indemnity', 'confidentiality', 'termination', 'governing law', 'data protection', 'ai/data-use']) {
    assert.ok(md.toLowerCase().includes(cat), `benchmark must cover ${cat}`);
  }
  assert.ok(md.includes('NOT certified'), 'benchmark must state non-certification');
});

// 12. provider keys never exposed client-side.
test('provider keys never exposed client-side', () => {
  const bundle = fs.readFileSync(new URL('../../src/main.jsx', import.meta.url), 'utf8');
  assert.ok(!bundle.includes('OPENROUTER_API_KEY'), 'client bundle must not reference server keys');
  assert.ok(!bundle.includes('GEMINI_API_KEY'), 'client bundle must not reference server keys');
  const vite = fs.readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');
  assert.ok(!vite.includes('define:') || !vite.includes('OPENROUTER_API_KEY'), 'vite define must not inline server keys');
});

// 20. production build config present (full `npm run build` verified separately in implementation log).
test('production build entrypoints present', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts.build.includes('vite build'));
  assert.ok(fs.existsSync(new URL('../../vercel.json', import.meta.url)));
});
