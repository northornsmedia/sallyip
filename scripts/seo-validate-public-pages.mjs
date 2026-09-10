// CI gate: validates crawlable public pages WITHOUT executing JS (reads built HTML).
// Checks: H1, copy volume, canonical, description, JSON-LD, internal links,
// benchmark claims carry run references, glossary backlinks, orphans, sitemap coverage.
// Exit non-zero on any CRITICAL failure.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = resolve(root, '..', 'public');
const failures = [];
const warns = [];
const fail = (m) => failures.push(m);
const warn = (m) => warns.push(m);

const collect = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) { if (e !== 'word-addin') collect(f, out); }
    else if (e === 'index.html') out.push(f);
  }
  return out;
};
// Normalised public slug always of form /path/ (home = /)
const toSlug = (f) => {
  const rel = f.slice(pub.length).replace(/\\/g, '/').replace(/^\/+/, '');
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\/index\.html$/, '/');
};

const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const words = (h) => text(h).split(' ').filter(Boolean).length;

// 1. Homepage must not be #root-only
const home = readFileSync(resolve(root, '..', 'index.html'), 'utf8');
if (/<div id="root"><\/div>/.test(home)) fail('CRITICAL: index.html #root is empty — no-JS crawlers see nothing');
if (!/<h1>/.test(home)) fail('CRITICAL: index.html has no H1 in initial HTML');
if (!/IP intelligence, from creation to enforcement/.test(home)) fail('CRITICAL: homepage H1 positioning missing');
if ((home.match(/<title>/g) || []).length !== 1) fail('CRITICAL: index.html must have exactly one <title>');
for (const chunk of ['Available product capabilities', 'Guidance and developing']) {
  if (!home.includes(chunk)) warn(`homepage fallback missing section: ${chunk}`);
}

// 2. Public pages
const pages = collect(pub);
console.log(`pages found: ${pages.length}`);
const sitemap = readFileSync(join(pub, 'sitemap.xml'), 'utf8');
const linkedFrom = new Map(); // slug -> Set of referrers
const slugs = pages.map(toSlug);

for (const f of pages) {
  const rel = toSlug(f);
  const h = readFileSync(f, 'utf8');
  const m1 = h.match(/<h1>([\s\S]*?)<\/h1>/);
  if (!m1 || !text(m1[1]).length) fail(`CRITICAL: ${rel} missing visible H1`);
  const canon = h.match(/<link rel="canonical" href="([^"]+)"\s*\/>/);
  if (!canon) fail(`CRITICAL: ${rel} missing canonical`);
  else if (canon[1] !== `https://sallyip.com${rel}` && canon[1] !== `https://sallyip.com${rel.replace(/\/$/, '')}`) warn(`${rel} canonical looks off: ${canon[1]}`);
  const desc = h.match(/<meta name="description" content="([\s\S]*?)"\s*\/>/);
  if (!desc) fail(`CRITICAL: ${rel} missing meta description`);
  else if (desc[1].length < 100 || desc[1].length > 175) warn(`${rel} description length ${desc[1].length} (aim 120-160)`);
  const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld) fail(`CRITICAL: ${rel} missing JSON-LD`);
  else try { JSON.parse(ld[1]); } catch { fail(`CRITICAL: ${rel} JSON-LD invalid`); }
  const links = [...h.matchAll(/href="https:\/\/sallyip\.com(\/[^"]*)"/g)].map(x => x[1]);
  if (new Set(links).size < 3) warn(`${rel} has <3 distinct internal links`);
  for (const l of links) {
    const key = l.endsWith('/') || l.includes('.') ? l : l + '/';
    if (!linkedFrom.has(key)) linkedFrom.set(key, new Set());
    linkedFrom.get(key).add(rel);
  }
  if (rel.startsWith('/glossary/') && rel !== '/glossary/') {
    if (words(h) < 120) fail(`CRITICAL: glossary ${rel} too thin (<120 words)`);
    if (!/glossary\/">All definitions|glossary\/">All/.test(h) && !h.includes('>All definitions<')) warn(`${rel} missing backlink to glossary index`);
  }
  if ((rel === '/patents/' || rel === '/ip-ai/' || rel === '/trademarks/') && words(h) < 500) fail(`CRITICAL: hub ${rel} too thin (<500 words visible)`);
  if ((rel === '/prior-art-search/' || rel === '/freedom-to-operate/' || rel === '/office-action-response/' || rel === '/legal-ai-verification/' || rel === '/legal-ai-hallucinations/') && words(h) < 400) fail(`CRITICAL: cluster ${rel} fails quality gate (<400 words)`);
  if ((rel.startsWith('/research/') || (rel.startsWith('/benchmarks/') && rel !== '/benchmarks/')) && words(h) < 300) fail(`CRITICAL: research ${rel} too thin (<300 words)`);
  if (rel.startsWith('/benchmarks')) {
    if (!/3368daf1|fe26da44|regression_report|ablation-report|cross-bench/.test(h) && !/latest\.json/.test(h)) warn(`${rel} benchmark claims lack run references`);
    if (/100% accuracy|0% hallucination[^s]|best legal AI|#1/.test(h)) fail(`CRITICAL: ${rel} contains banned superlative`);
  }
  const loc = rel === '/' ? 'https://sallyip.com/' : `https://sallyip.com${rel.replace(/\/$/, '')}`;
  if (!sitemap.includes(loc)) fail(`CRITICAL: ${rel} missing from sitemap.xml (${loc})`);
  if (/patent intelligence platform|patent AI"[^>]*definition|SallyIP is a patent AI(?!.*categor)/.test(h)) warn(`${rel} may position entity as patents-only`);
}

// 3. Orphans: every page reachable from home/resources/nav within ~3 clicks
const homeHtml = home + pages.filter(f => f.endsWith('resources/index.html')).map(f => readFileSync(f, 'utf8')).join(' ');
for (const s of slugs) {
  if (s === '/') continue;
  const bare = s.replace(/\/$/, '');
  const linked = homeHtml.includes(`sallyip.com${bare}/`) || homeHtml.includes(`sallyip.com${bare}"`) || (linkedFrom.get(s) || new Set()).size > 0;
  if (!linked) fail(`CRITICAL: orphan page (no inbound internal link found): ${s}`);
}

// 4. latest.json: owned by benchmark pipeline — validate schema + key figures, NEVER overwrite
const latest = join(pub, 'benchmarks', 'latest.json');
if (!existsSync(latest)) fail('CRITICAL: public/benchmarks/latest.json missing');
else {
  const j = JSON.parse(readFileSync(latest, 'utf8'));
  if (!Array.isArray(j.metrics) || j.metrics.length < 10) fail('CRITICAL: latest.json metrics array too small');
  for (const b of j.metrics || []) {
    if (b.numerator == null && b.denominator == null && b.status !== 'BLOCKED' && b.status !== 'PENDING') warn(`latest.json metric ${b.id} has null n/d with status ${b.status}`);
    if (!b.status || !b.source || b.sample_size == null) fail(`CRITICAL: latest.json metric ${b.id} missing status/source/sample_size`);
  }
  if (!Array.isArray(j.status_vocabulary)) fail('CRITICAL: latest.json missing status_vocabulary');
}

console.log(`\nchecked ${pages.length} pages — failures: ${failures.length}, warnings: ${warns.length}`);
for (const w of warns) console.log('WARN:', w);
for (const f of failures) console.log('FAIL:', f);
process.exit(failures.length ? 1 : 0);
