import { neon } from '@neondatabase/serverless';

function enhancedExtract(query) {
  const text = String(query || '').toLowerCase(), refs = new Set();
  for (const m of text.matchAll(/§\s*(\d{2,4}[a-z]?(?:\(\w+\))?)/g)) {
    refs.add(m[1]);
    const base = m[1].replace(/\([a-z0-9]+\)/gi, '').trim();
    if (base) refs.add(base);
  }
  for (const m of text.matchAll(/mpep\s*§?\s*(\d{4})/gi)) refs.add(m[1]);
  for (const m of text.matchAll(/\b(10[123]|11[12]|2106)\b/g)) refs.add(m[1]);

  if (/\b(provisional|111\(b\)|twelve months|12 months|abandonment)\b/i.test(text)) refs.add('111');
  if (/\b(grace period|prior art|disclosure by inventor|102\(b\))\b/i.test(text)) refs.add('102');
  if (/\b(obvious|non-obvious|inventive step|phosita)\b/i.test(text)) refs.add('103');
  if (/\b(enablement|written description|best mode|specification require|claim must contain|dependent claim)\b/i.test(text)) refs.add('112');
  if (/\b(eligible|patentable subject|statutory categories|software per se|abstract idea|alice|mayo|2106)\b/i.test(text)) {
    refs.add('101');
    refs.add('2106');
  }
  return [...refs].slice(0, 8);
}

const sql = neon(process.env.DATABASE_URL);
const questions = [
  { key: 's101-text', prompt: 'Quote the exact text of 35 U.S.C. § 101 on what inventions are patentable. Cite sources as [S1], [S2].', expect: '§ 101' },
  { key: 'grace-period', prompt: 'Under 35 U.S.C. § 102(b)(1), what disclosures by the inventor are not prior art, and within what time window? Quote the key passage and cite it.', expect: '§ 102(b)(1)' },
  { key: 'obviousness', prompt: 'State the obviousness standard of 35 U.S.C. § 103 in one sentence and quote the decisive phrase with citation.', expect: '§ 103' },
  { key: 'enablement', prompt: 'What does 35 U.S.C. § 112(a) require of the specification? Quote and cite.', expect: '§ 112(a)-(b)' },
  { key: 'provisional', prompt: 'Is a claim required in a US provisional patent application? Which statute subsection governs provisionals? Quote and cite.', expect: '§ 111(a)-(b)' },
  { key: 'alice-mayo', prompt: 'Describe the Alice/Mayo two-part eligibility test from MPEP § 2106. Quote the Step 2A/2B formulation and cite it.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'practical-application', prompt: 'According to MPEP § 2106, what happens when an abstract idea is integrated into a practical application? Quote and cite.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'dependent-claims', prompt: 'What does 35 U.S.C. § 112(d) say a dependent claim must contain? Quote and cite.', expect: '§ 112(a)-(b)' },
  { key: 'provisional-term', prompt: 'How long does a US provisional application last if not converted? Quote the abandonment rule and cite it.', expect: '§ 111(a)-(b)' },
  { key: 'adversarial', prompt: 'Quote the passage stating that software per se with no structural recitation falls outside the statutory categories. Cite it.', expect: 'MPEP § 2106 (condensed)' },
];

let recalledCount = 0;
for (const q of questions) {
  const refs = enhancedExtract(q.prompt);
  let rows = [];
  for (const ref of refs) {
    const pattern = `%${ref}%`;
    const extra = await sql`
      SELECT p.locator 
      FROM source_passages p 
      JOIN legal_sources s ON s.id=p.source_id 
      WHERE s.source_type='jurisdiction_pack' AND s.jurisdiction='US' 
        AND (p.locator ILIKE ${pattern} OR p.content ILIKE ${pattern}) 
      LIMIT 4
    `;
    rows.push(...extra);
  }
  const recalled = rows.some(r => r.locator === q.expect);
  if (recalled) recalledCount++;
  console.log(`${q.key.padEnd(22)} -> ${recalled ? 'RECALLED ✓' : 'MISS ✗'} (expected: ${q.expect})`);
}
console.log(`\nFinal Recall: ${recalledCount}/${questions.length} (${Math.round(recalledCount / questions.length * 100)}%)`);
