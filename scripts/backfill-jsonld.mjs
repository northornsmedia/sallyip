// One-shot/idempotent: adds Organization + WebSite + WebPage + BreadcrumbList JSON-LD
// to public pages that lack any ld+json block. Never touches pages that have one.
// Run: node scripts/backfill-jsonld.mjs  (safe to re-run; reports skipped vs patched)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = resolve(root, '..', 'public');
let patched = 0, skipped = 0;
const collect = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) { if (e !== 'word-addin') collect(f, out); }
    else if (e === 'index.html') out.push(f);
  }
  return out;
};
for (const f of collect(pub)) {
  let h = readFileSync(f, 'utf8');
  if (h.includes('application/ld+json')) { skipped++; continue; }
  const canon = (h.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/) || [])[1];
  const title = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim().replace(/\s+/g, ' ');
  const h1 = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!canon || !title) { console.log('SKIP (no canonical/title):', f); skipped++; continue; }
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': 'https://sallyip.com/#org', name: 'SallyIP', url: 'https://sallyip.com/', logo: { '@type': 'ImageObject', url: 'https://sallyip.com/sallyip-logo.png' }, description: 'SallyIP is a verification-first AI workspace for intellectual property work.' },
    { '@type': 'WebSite', '@id': 'https://sallyip.com/#website', url: 'https://sallyip.com/', name: 'SallyIP', publisher: { '@id': 'https://sallyip.com/#org' } },
    { '@type': 'WebPage', '@id': `${canon}#webpage`, url: canon, name: title, ...(desc ? { description: desc } : {}), isPartOf: { '@id': 'https://sallyip.com/#website' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sallyip.com/' }, { '@type': 'ListItem', position: 2, name: h1 || title }] },
  ] };
  const tag = `<script type="application/ld+json">\n${JSON.stringify(graph)}\n</script>\n`;
  if (h.includes('</head>')) h = h.replace('</head>', `${tag}</head>`);
  else { console.log('SKIP (no </head>):', f); skipped++; continue; }
  writeFileSync(f, h);
  patched++;
  console.log('patched:', canon);
}
console.log(`\ndone: ${patched} patched, ${skipped} skipped`);
