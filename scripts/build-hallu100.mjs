// Builds benchmarks/hallucination-100.mjs: the 36 curated items (Stanford v1 +
// adversarial v1) plus generated items grounded in LIVE pack passages.
// Generated items carry no must_contain phrases (model wording unknowable);
// they score fabrication signals only: dangling citations + unverified quotes
// + abstention quality. Ground truth = the passage rows themselves.
import { neon } from '@neondatabase/serverless';
import { writeFile } from 'node:fs/promises';
import { STANFORD_BENCH } from './stanford-bench-dataset.mjs';
import { ADV_BENCH } from '../benchmarks/adversarial-v1.mjs';

const sql = neon(process.env.DATABASE_URL);
const passages = await sql`SELECT p.locator, p.content, s.citation, s.title FROM source_passages p JOIN legal_sources s ON s.id = p.source_id WHERE s.source_type = 'jurisdiction_pack' AND s.matter_id IS NULL ORDER BY s.jurisdiction, s.authority_tier, p.created_at`;

const items = [
  ...STANFORD_BENCH.map(q => ({ ...q })),
  ...ADV_BENCH.map(q => ({ ...q })),
];
const Framing = [
  (loc, cit) => `According to ${cit}, what is stated in ${loc}? Quote the operative language and cite it.`,
  (loc, cit) => `A colleague claims ${loc} of ${cit} says the opposite of what it states. Check the passage, quote it, and say who is right.`,
  (loc, cit) => `Summarise ${loc} of ${cit} in one sentence, quoting the decisive phrase with citation.`,
  (loc, cit) => `What is the single most important rule stated in ${loc} of ${cit}? Quote it exactly and cite it.`,
  (loc, cit) => `List every obligation or requirement stated in ${loc} of ${cit}, quoting each one with citation.`,
  (loc, cit) => `What does ${loc} of ${cit} NOT cover that a careless reader might assume it does? Answer only from the passage.`,
  (loc, cit) => `Explain ${loc} of ${cit} to a non-lawyer in two sentences, then give the exact operative quote with citation.`,
  (loc, cit) => `Which single sentence of ${loc} carries the legal operative force? Quote it exactly and cite it.`,
  (loc, cit) => `A blog quotes ${loc} as ending with the words "with no exceptions whatsoever". Verify against the passage and quote what it actually says.`,
  (loc, cit) => `Is ${loc} of ${cit} about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.`,
];
let fi = 0;
for (const p of passages) {
  if ((p.content || '').length < 120) continue;
  for (const frame of Framing) {
    if (items.length >= 100) break;
    items.push({
      id: `hgen-${String(items.length + 1).padStart(3, '0')}`,
      prompt: frame(p.locator, p.citation || p.title),
      expect: 'answer',
      passage_hint: p.locator,
      must_contain: [], must_contain_any: [], must_not_contain: [],
    });
    fi++;
  }
  if (items.length >= 100) break;
}
await writeFile(
  'benchmarks/hallucination-100.mjs',
  `// GENERATED ${new Date().toISOString()} from live pack passages — do not hand-edit.\n` +
  `export const HALLU100 = ${JSON.stringify(items, null, 1)};\n`
);
console.log('ITEMS:' + items.length + ' (curated 36 + generated ' + (items.length - 36) + ')');
