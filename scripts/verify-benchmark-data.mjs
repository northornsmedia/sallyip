// Drift check: seo-data.mjs page figures vs public/benchmarks/latest.json (owned by the
// benchmark/validation pipeline — see benchmarks/external-scoreboard.md). Run: npm run seo:verify-benchmarks
// Fails on any numerator/denominator mismatch for shared headline metrics. latest.json is NEVER overwritten here.
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const feed = JSON.parse(readFileSync(join(resolve(root, '..', 'public'), 'benchmarks', 'latest.json'), 'utf8'));
const byId = new Map((feed.metrics || []).map(m => [m.id, m]));
let fails = 0;
const check = (id, num, den, label) => {
  const m = byId.get(id);
  if (!m) { console.log(`WARN: ${label} — id ${id} absent from latest.json (feed owned by validation wave; confirm scope)`); return; }
  if (m.numerator !== num || m.denominator !== den) { fails++; console.log(`FAIL: ${label} — pages say ${num}/${den}, feed says ${m.numerator}/${m.denominator} (${id})`); }
  else console.log(`ok: ${label} ${num}/${den} matches ${id}`);
};

// Shared headline metrics (seo-data.mjs ↔ latest.json metric ids)
check('grounding-v1.0-authority-recall', 95, 95, 'authority recall');
check('grounding-v1.0-zero-dangling', 95, 95, 'zero dangling');
check('grounding-v1.0-exact-quote', 87, 120, 'exact quote');
check('grounding-v1.0-unsupported-quote', 27, 120, 'unsupported quotes');
if (!feed.rules || !feed.rules.some(r => /smoke test/i.test(r))) { fails++; console.log('FAIL: latest.json lost its no-smoke-test rule'); }
if (!feed.status_vocabulary || feed.status_vocabulary.length < 5) { fails++; console.log('FAIL: latest.json status vocabulary incomplete'); }
console.log(fails ? `\n${fails} DRIFT FAILURES` : '\nno drift');
process.exit(fails ? 1 : 0);
