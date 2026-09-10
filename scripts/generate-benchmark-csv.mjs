// Writes public/benchmarks/headline-metrics.csv from latest.json headline-eligible metrics only.
// Aggregates (n/d) only — no prompts, expected answers, holdout cases or practitioner material.
// Run: npm run seo:benchmark-csv
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dir = join(resolve(root, '..', 'public'), 'benchmarks');
const feed = JSON.parse(readFileSync(join(dir, 'latest.json'), 'utf8'));
const rows = (feed.metrics || []).filter(m => m.headline_eligible === true && m.numerator != null);
const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = ['metric_id,benchmark,metric,numerator,denominator,sample_size,model,run_date,status,source',
  ...rows.map(m => [m.id, m.benchmark, m.metric, m.numerator, m.denominator, m.sample_size, m.model, m.run_date, m.status, m.source].map(q).join(','))].join('\n') + '\n';
writeFileSync(join(dir, 'headline-metrics.csv'), csv);
console.log(`headline-metrics.csv: ${rows.length} headline-eligible rows (aggregates only)`);
