# Implementation Log — SEO/GEO growth system (2026-09-10)

## Agents created (`.opencode/agents/`)
- `seo-director.md`, `technical-seo.md`, `content-seo.md`, `geo-ai-visibility.md`, `schema-entity.md`, `competitor-intel.md`, `benchmark-pr.md` — all `mode: subagent`. Director spawns specialists in parallel.

## Reports created (`seo/`)
- `SEO_MASTER_PLAN.md`, `SEO_TECHNICAL_AUDIT.md`, `SEO_CONTENT_MAP.md`, `GEO_AI_VISIBILITY_PLAN.md`, `SCHEMA_ENTITY_AUDIT.md`, `COMPETITOR_SEARCH_GAPS.md`, `BENCHMARK_CONTENT_STRATEGY.md`, `IMPLEMENTATION_LOG.md` (this file).

## Low-risk fixes IMPLEMENTED (verified `npm run build` PASS 6.94s)
1. `index.html` — removed duplicate `<title>`; broadened title/meta/OG/Twitter from patents-only to full-IP ("Patents, Trademarks & IP Research", "from creation to enforcement"); replaced lone SoftwareApplication JSON-LD with `@graph` Organization + WebSite + WebPage + SoftwareApplication (honest featureList only).
2. `public/robots.txt` — explicit Allow for GPTBot/ChatGPT-User/CCBot/anthropic-ai/ClaudeBot; kept sitemap pointer.
3. `public/sitemap.xml` — removed invalid `/llms.txt` member; added `<lastmod>`; generator `scripts/generate-sitemap.mjs` + `npm run seo:sitemap` (verified: 2 URLs).
4. `public/404.html` (new) — branded, `noindex, follow`, canonical home.
5. `vercel.json` — `cleanUrls`, `trailingSlash:false`, content-type + immutable asset caching. No rewrite changes.
6. Brand alts — `src/main.jsx`, `src/components/chat-page.jsx` (3 spots): `alt=""` → `alt="SallyIP"`.
7. Compare page — Article `datePublished/dateModified` + `BreadcrumbList`.
8. `scripts/submit-indexnow.mjs` + `npm run seo:indexnow` — manual changed-URL submission, ≤50 guard, requires `INDEXNOW_KEY`; key file NOT created until key generated (do not commit a fake key).
9. `package.json` — added `seo:sitemap`, `seo:indexnow` scripts only.

## Reported, NOT implemented (disruptive — needs approval)
- Hash-router → history routes + prerender/SSG for public content (C1/H1).
- Route code-splitting for 688 kB bundle (H2).
- 10 hub pages + 15 clusters (need content + design + review).
- OG cover image 1200×630, Dataset/Person/FAQ schema, public eval CSV, IndexNow key provisioning, www/apex + redirect confirmation in Vercel/DNS.
