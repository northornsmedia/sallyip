// Shared template for SallyIP crawlable public pages. Pure HTML+CSS, zero JS.
import { SITE_URL, ENTITY_DESCRIPTION, PAGES_DATE_PUBLISHED, PAGES_DATE_MODIFIED } from './seo-data.mjs';

export const NAV = [
  ['/', 'Home'],
  ['/ip-ai/', 'IP AI'],
  ['/patents/', 'Patents'],
  ['/trademarks/', 'Trademarks'],
  ['/benchmarks/', 'Benchmarks'],
  ['/resources/', 'Resources'],
  ['/glossary/', 'Glossary'],
];

const CSS = `body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:860px;margin:0 auto;padding:28px 20px 64px;color:#0f172a;line-height:1.7;font-size:16px}
header.topnav{display:flex;align-items:center;gap:18px;flex-wrap:wrap;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:8px}
header.topnav a.brand{font-weight:800;font-size:19px;color:#0f172a;text-decoration:none}
header.topnav nav{display:flex;gap:14px;flex-wrap:wrap;font-size:14px}
header.topnav nav a{color:#334155;text-decoration:none}header.topnav nav a:hover{color:#4f46e5}
.crumbs{font-size:13px;color:#64748b;margin:14px 0}.crumbs a{color:#4f46e5;text-decoration:none}
h1{font-size:32px;line-height:1.25;margin:18px 0 12px}h2{font-size:23px;margin-top:38px}h3{font-size:17px;margin-top:26px}
table{width:100%;border-collapse:collapse;margin:18px 0;font-size:14px}th,td{border:1px solid #e2e8f0;padding:9px 10px;text-align:left;vertical-align:top}th{background:#f8fafc}
.note{background:#f1f5f9;border-radius:10px;padding:14px 16px;font-size:14px;margin:18px 0}
.warn{background:#fef9e7;border:1px solid #f5d547;border-radius:10px;padding:14px 16px;font-size:14px;margin:18px 0}
.ok{background:#eefbee;border:1px solid #9ad69a;border-radius:10px;padding:14px 16px;font-size:14px;margin:18px 0}
.cta{display:inline-block;margin:22px 8px 0 0;background:#4f46e5;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600}
.cta.ghost{background:#fff;color:#4f46e5;border:1px solid #c7d2fe}
.qa{border-left:3px solid #c7d2fe;padding:2px 0 2px 14px;margin:20px 0}.qa p{margin:6px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px}.card a{font-weight:600;color:#4f46e5;text-decoration:none}
footer{margin-top:56px;border-top:1px solid #e2e8f0;padding-top:18px;font-size:13px;color:#64748b}
footer nav{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px}footer nav a{color:#475569;text-decoration:none}
.status{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:20px;background:#eef2ff;color:#4338ca}
.status.blocked{background:#fee2e2;color:#b91c1c}.status.pending{background:#fef9c3;color:#854d0e}`;

export function orgGraph() {
  return { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'SallyIP', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/sallyip-logo.png` }, description: ENTITY_DESCRIPTION };
}

export function breadcrumbJson(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], ...(it[1] ? { item: `${SITE_URL}${it[1]}` } : {}) })),
  };
}

export function faqJson(qas) {
  return {
    '@type': 'FAQPage',
    mainEntity: qas.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })),
  };
}

// qas: [[question, answerHTML]] — rendered visibly AND (optionally) as FAQPage schema.
export function qaBlock(qas) {
  return `<section aria-label="Frequently asked questions">\n${qas.map(([q, a]) => `<div class="qa"><h3>${q}</h3><p>${a}</p></div>`).join('\n')}\n</section>`;
}

export function benchSummaryTable(BENCHMARKS) {
  const rows = BENCHMARKS.map(b => {
    const m = b.metrics.map(x => `${x.label}: ${x.display}`).join('; ');
    return `<tr><td><strong>${b.name}</strong><br><small>${b.dataset_version} · n=${b.sample_size} · ${b.model} · ${b.run_date}</small></td><td>${m}</td><td><span class="status${b.status === 'BLOCKED' ? ' blocked' : b.status === 'PENDING' ? ' pending' : ''}">${b.status.replace('_', ' ')}</span></td></tr>`;
  }).join('\n');
  return `<table><tr><th>Benchmark (sample, model, date)</th><th>Recorded result</th><th>Status</th></tr>\n${rows}\n</table>`;
}

export function page({ slug, title, description, h1, intro, body, extraSchema = [], dateModified = PAGES_DATE_MODIFIED, ogImage = `${SITE_URL}/sallyip-logo.png` }) {
  const url = `${SITE_URL}${slug}`;
  const crumbs = slug === '/' ? [] : `<p class="crumbs"><a href="${SITE_URL}/">Home</a> / ${h1}</p>`;
  const graph = [
    orgGraph(),
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'SallyIP', publisher: { '@id': `${SITE_URL}/#org` } },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': `${ SITE_URL}/#website` }, datePublished: PAGES_DATE_PUBLISHED, dateModified },
    ...extraSchema,
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="SallyIP" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${ogImage}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${ogImage}" />
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}
</script>
<style>${CSS}</style>
</head>
<body>
<header class="topnav"><a class="brand" href="${SITE_URL}/">SallyIP</a><nav>${NAV.map(([h, t]) => `<a href="${SITE_URL}${h}">${t}</a>`).join('')}</nav></header>
${crumbs}
<h1>${h1}</h1>
<p>${intro}</p>
${body}
<footer><nav>${NAV.map(([h, t]) => `<a href="${SITE_URL}${h}">${t}</a>`).join('')}<a href="${SITE_URL}/compare/harvey-cocounsel-genie-alternatives">Compare legal AI</a></nav><p>${ENTITY_DESCRIPTION} Verification-first means: no evidence, no assertion. Research tools, not legal advice. © 2026 SallyIP.</p><p><small>Last updated ${dateModified}.</small></p></footer>
</body>
</html>`;
}
