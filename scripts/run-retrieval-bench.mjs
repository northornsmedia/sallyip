import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { canonicalizeResult, groupIntoFamilies, normalizeDate, parsePublicationNumber, normalizedNumber } from '../src/lib/patent-normalize-service.js';

// Retrieval benchmark runner: OFFLINE metrics run without provider keys.
// Live metrics (recall@k, precision@k, rank) report not-run until keys exist.
const dataset = JSON.parse(await readFile('benchmarks/patent_retrieval_v1/dataset.json', 'utf8'));
const items = dataset.items;
const results = { passed: [], failed: [], gated: ['recall@k', 'precision@k', 'ground-truth rank (no provider keys)'] };
const check = (id, metric, ok, detail = '') => {
  (ok ? results.passed : results.failed).push({ id, metric, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} [${metric}] ${detail}`);
};

for (const item of items) {
  // 5/6. Publication number + country/kind parsing round-trip.
  const parsed = parsePublicationNumber(item.target_publication);
  check(item.test_id, 'pub-number-accuracy', !!parsed && normalizedNumber(parsed) === item.target_publication, item.target_publication);
  check(item.test_id, 'country-kind-accuracy', !!parsed && parsed.country === item.expected_country, `${parsed?.country}/${parsed?.kind}`);
  // 4/11. Date + biblio preservation through canonicalize.
  const canon = canonicalizeResult('google-patents', { external_id: item.target_publication, title: item.title, publication_date: item.publication_date, filing_date: item.filing_date, priority_date: item.priority_date, inventors: item.inventors, assignees: [item.assignee].filter(Boolean) });
  check(item.test_id, 'date-accuracy', canon.publication_date === item.publication_date && canon.filing_date === item.filing_date && canon.priority_date === item.priority_date, `${canon.publication_date}/${canon.filing_date}/${canon.priority_date}`);
  check(item.test_id, 'biblio-preservation', canon.title === item.title && canon.inventors.length === item.inventors.length, `title=${canon.title === item.title} inv=${canon.inventors.length}/${item.inventors.length}`);
  // 3. Family resolution over expected members (priority data absent by design).
  const memberRows = item.expected_family_members.map(n => ({ ...canonicalizeResult('google-patents', { external_id: n }), priority_numbers: [] }));
  const fams = groupIntoFamilies(memberRows);
  const expectedSet = new Set(item.expected_family_members);
  const reproduced = fams.some(f => f.members.length === expectedSet.size && f.members.every(m => expectedSet.has(m.normalized_number)));
  check(item.test_id, 'family-resolution', reproduced, `${fams.length} families for ${expectedSet.size} members`);
  // 12. Provider agreement: casing/spacing variants normalize identically.
  const variant = item.target_publication.replace(/^([A-Z]{2})/, '$1 ').replace(/([A-Z]\d?)$/, ' $1');
  check(item.test_id, 'provider-agreement', normalizedNumber(parsePublicationNumber(variant)) === item.target_publication, variant);
}

// 7. Duplicate collapse: every target fed twice still yields N families for N cases.
const dupRows = items.flatMap(item => [0, 1].map(() => ({ ...canonicalizeResult('google-patents', { external_id: item.target_publication }), priority_numbers: [] })));
const dupFams = groupIntoFamilies(dupRows);
check('corpus', 'duplicate-collapse', dupFams.length === items.length, `${dupFams.length} families for ${items.length} cases x2`);

// 8. False-merge: no family spans two different cases.
const poolRows = items.map(item => ({ ...canonicalizeResult('google-patents', { external_id: item.target_publication }), priority_numbers: [] }));
const poolFams = groupIntoFamilies(poolRows);
const caseOf = new Map(items.map(item => [item.target_publication, item.test_id]));
let merges = 0;
for (const f of poolFams) {
  const cases = new Set(f.members.map(m => caseOf.get(m.normalized_number)).filter(Boolean));
  if (cases.size > 1) merges++;
}
check('corpus', 'false-merge-rate', merges === 0, `${merges} cross-case merges`);

// 9. Unresolved rate (reported, not a pass/fail).
const unresolved = poolFams.filter(f => f.family_method === 'unresolved').length;
console.log(`INFO unresolved-rate: ${unresolved}/${poolFams.length} families lack priority data (expected without INPADOC)`);

// Adversarial-retrieval spot checks (Tier C, engine-behavior contracts).
const advPairs = [
  { id: 'adv-same-number', rows: [{ external_id: 'US9999999A1', priority_numbers: [] }, { external_id: 'US9999999B2', priority_numbers: [] }], expect: 'merge', why: 'same application, pub then grant' },
  { id: 'adv-diff-tech', rows: [{ external_id: 'US1111111A1', priority_numbers: [] }, { external_id: 'EP2222222A1', priority_numbers: [] }], expect: 'separate', why: 'unrelated numbers must never merge' },
  { id: 'adv-shared-priority', rows: [{ external_id: 'US3333333A1', priority_numbers: ['PCT/US2020/011111'] }, { external_id: 'WO2020111111A1', priority_numbers: ['PCT/US2020/011111'] }], expect: 'merge', why: 'shared PCT priority' },
  { id: 'adv-garbage', rows: [{ external_id: 'not-a-patent!!', priority_numbers: [] }], expect: 'safe', why: 'must not crash, stays unresolved' },
];
for (const adv of advPairs) {
  const fams = groupIntoFamilies(adv.rows.map(r => ({ ...canonicalizeResult('test', r), priority_numbers: r.priority_numbers })));
  const ok = adv.expect === 'merge' ? fams.length === 1 && fams[0].members.length === 2
    : adv.expect === 'separate' ? fams.length === 2
    : fams.length === 1 && fams[0].family_method === 'unresolved';
  check(adv.id, 'adversarial-' + adv.expect, ok, adv.why);
}

const summary = {
  suite: 'retrieval-bench v1', dataset_version: dataset.version, cases: items.length,
  passed: results.passed.length, failed: results.failed.length,
  gated_pending_keys: results.gated, failures: results.failed,
  generated_at: new Date().toISOString(),
};
await mkdir('benchmarks/patent_retrieval_v1/failures', { recursive: true });
await writeFile('benchmarks/patent_retrieval_v1/run_report.md',
  `# Retrieval Benchmark v1 — run report\n\n- Date: ${summary.generated_at}\n- Dataset: ${dataset.version} (${items.length} cases)\n- Passed: ${summary.passed}, Failed: ${summary.failed}\n- Gated (need provider keys): ${results.gated.join(', ')}\n\n## Failures\n${results.failed.map(f => `- ${f.id} [${f.metric}] ${f.detail}`).join('\n') || '(none)'}\n`);
if (results.failed.length) await writeFile('benchmarks/patent_retrieval_v1/failures/latest.json', JSON.stringify({ at: summary.generated_at, failures: results.failed }, null, 1));
console.log(`\nSUMMARY passed=${summary.passed} failed=${summary.failed} gated=${results.gated.length}`);

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
await sql`INSERT INTO patentbench_runs(user_id, name, metrics) VALUES(${user.id}, 'retrieval-bench v1', ${JSON.stringify(summary)}::jsonb)`;
console.log('PERSISTED:retrieval-bench v1');
