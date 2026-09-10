// Generates all crawlable public pages under public/. Run: npm run seo:pages
// Single-sources benchmark figures via seo-data.mjs — never hand-copy percentages.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, breadcrumbJson, faqJson, NAV } from './seo-layout.mjs';
import { SITE_URL } from './seo-data.mjs';
import { PAGES } from './seo-pages-core.mjs';
import { WAVE3_PAGES } from './seo-pages-wave3.mjs';
import { GLOSSARY } from './seo-pages-glossary.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const pub = resolve(root, '..', 'public');

// Practitioner review: pipeline-owned JSON consumed verbatim (Phase 5 placeholder architecture)
let practitioner = { status: 'PENDING', graded: 0, total: 25, score: null };
try {
  const raw = readFileSync(join(pub, 'benchmarks', 'practitioner-review.json'), 'utf8');
  practitioner = { ...practitioner, ...JSON.parse(raw) };
} catch { console.log('WARN: practitioner-review.json unreadable, using PENDING defaults'); }
const practitionerBlock = `<div class="note"><strong>Practitioner review — status: ${practitioner.status}.</strong> ${practitioner.graded}/${practitioner.total} graded${practitioner.score == null ? '; no score displayed until human grading exists' : `: score ${practitioner.score}`}. Mechanical metrics above do not establish legal correctness.</div>`;

const withPractitioner = (body) => body.replace('{{PRACTITIONER}}', practitionerBlock);
const ogFor = (dir) => {
  const top = dir.split('/')[0];
  const map = { 'ip-ai': 'home.png', patents: 'patents.png', trademarks: 'trademarks.png', benchmarks: 'benchmarks.png', research: 'research.png', glossary: 'glossary.png' };
  return map[top] ? `${SITE_URL}/og/${map[top]}` : undefined;
};
const withOg = (dir, args) => ({ ...args, ...(ogFor(dir) ? { ogImage: ogFor(dir) } : {}) });
let count = 0;
const write = (dir, html) => {
  const d = join(pub, dir);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'index.html'), html);
  count++;
};

for (const p of PAGES) {
  const crumbs = p.dir.includes('/')
    ? breadcrumbJson([['Home', '/'], [p.dir.split('/')[0], `/${p.dir.split('/')[0]}/`], [p.h1, null]])
    : breadcrumbJson([['Home', '/'], [p.h1, null]]);
  const extra = [crumbs, ...(typeof p.extraSchema === 'function' ? p.extraSchema() : (p.extraSchema || []))];
  write(p.dir, page(withOg(p.dir, { slug: `/${p.dir}/`, ...p, body: withPractitioner(p.body), extraSchema: extra })));
}
for (const p of [...WAVE3_PAGES]) {
  const segs = p.dir.split('/');
  const crumbs = segs.length > 1
    ? breadcrumbJson([['Home', '/'], [segs[0][0].toUpperCase() + segs[0].slice(1), `/${segs[0]}/`], [p.h1, null]])
    : breadcrumbJson([['Home', '/'], [p.h1, null]]);
  write(p.dir, page(withOg(p.dir, { slug: `/${p.dir}/`, ...p, extraSchema: [crumbs] })));
}

// Glossary index
const cards = GLOSSARY.map(([s, t, d]) => `<div class="card"><a href="${SITE_URL}glossary/${s}/">${t}</a><p>${d}</p></div>`).join('');
write('glossary', page(withOg('glossary', {
  slug: '/glossary/', title: 'IP Glossary: 20 Definitions That Matter — SallyIP',
  description: 'Plain-English definitions for IP AI, patents, trademarks, verification and more — each linked to the workflow it belongs to.',
  h1: 'Definitions that do work', intro: 'Twenty terms, answered immediately and linked to the workflow each belongs to. No filler, no hype.',
  body: `<div class="grid">${cards}</div><p><a href="${SITE_URL}ip-ai/">IP AI hub</a> · <a href="${SITE_URL}resources/">All resources</a></p>`,
  extraSchema: [breadcrumbJson([['Home', '/'], ['Glossary', null]])],
})));

// Glossary terms (with related definitions from the same hub group for substance + navigation)
const hubOf = (slug) => slug.startsWith('trademark') || slug === 'likelihood-of-confusion' ? '/trademarks/' : slug === 'copyright' || slug === 'trade-secret' ? `/${slug === 'copyright' ? 'copyright' : 'trade-secrets'}/` : slug === 'citation-verification' || slug === 'legal-ai-hallucination' || slug === 'verification-first-ai' || slug === 'intellectual-property-ai' ? '/ip-ai/' : '/patents/';
for (const [slug, term, short, more] of GLOSSARY) {
  const hub = hubOf(slug);
  const siblings = GLOSSARY.filter(([s]) => s !== slug && hubOf(s) === hub).slice(0, 3);
  const relDefs = siblings.length ? `<h2>Related definitions</h2><ul>${siblings.map(([s, t, d]) => `<li><a href="${SITE_URL}glossary/${s}/">${t}</a> — ${d}</li>`).join('')}</ul>` : '';
  const qa = [[`What is ${term.toLowerCase()}?`, `${short} ${more}`]];
  write(`glossary/${slug}`, page(withOg(`glossary/${slug}`, {
    slug: `/glossary/${slug}/`, title: `${term} — IP Glossary — SallyIP`, description: short.replace(/<[^>]+>/g, '').slice(0, 155),
    h1: term, intro: short,
    body: `<p>${more}</p>${relDefs}<section aria-label="Frequently asked questions"><div class="qa"><h3>What is ${term.toLowerCase()}?</h3><p>${short} ${more}</p></div></section><p><a href="${SITE_URL}${hub}">Related hub</a> · <a href="${SITE_URL}glossary/">All definitions</a></p>`,
    extraSchema: [breadcrumbJson([['Home', '/'], ['Glossary', '/glossary/'], [term, null]]), { '@type': 'DefinedTerm', name: term, description: short.replace(/<[^>]+>/g, ''), inDefinedTermSet: `${SITE_URL}glossary/` }, faqJson(qa)],
  })));
}

console.log(`public pages generated: ${count} (core ${PAGES.length} + wave3 ${WAVE3_PAGES.length} + glossary ${GLOSSARY.length + 1})`);