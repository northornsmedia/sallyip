// Regenerates public/sitemap.xml from HTML pages that actually exist under public/.
// Run: npm run seo:sitemap. Only lists indexable HTML pages (excludes 404.html, word-addin, llms.txt).
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pubDir = resolve(root, '..', 'public');
const EXCLUDE_DIRS = new Set(['word-addin']);
const EXCLUDE_FILES = new Set(['404.html']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, out);
    } else if (entry === 'index.html' || (entry.endsWith('.html') && !EXCLUDE_FILES.has(entry))) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(pubDir);
const today = new Date().toISOString().slice(0, 10);
const urls = [{ loc: 'https://sallyip.com/', lastmod: today, changefreq: 'weekly', priority: '1.0' }];
for (const f of files) {
  const rel = f.slice(pubDir.length).replace(/\\/g, '/');
  if (rel === '/index.html' || rel === 'index.html') continue;
  if (rel.endsWith('/index.html')) {
    const path = rel.replace(/^\//, '').slice(0, -'/index.html'.length);
    urls.push({ loc: `https://sallyip.com/${path}`, lastmod: today, changefreq: 'monthly', priority: path.startsWith('compare/') ? '0.8' : '0.6' });
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(pubDir, 'sitemap.xml'), xml);
console.log(`sitemap.xml regenerated: ${urls.length} URLs`);
for (const u of urls) console.log(' -', u.loc);
