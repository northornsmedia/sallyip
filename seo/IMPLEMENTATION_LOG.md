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

## WAVE 2 (2026-09-10) — crawlable public layer, hybrid static + SPA
Architecture: app stays SPA; public marketing/resource layer is now generated static HTML with zero executable JS (`scripts/generate-public-pages.mjs`, `npm run seo:pages`). Page benchmark figures single-sourced (`scripts/seo-data.mjs`); `public/benchmarks/latest.json` is OWNED by the benchmark pipeline — wave 2 only drift-checks it (`npm run seo:benchmarks` → `verify-benchmark-data.mjs`, 4/4 match). CI gate `scripts/seo-validate-public-pages.mjs` (`npm run seo:validate`) — 33 pages, 0 failures, 0 warnings.
Implemented: homepage `#root` static fallback (H1 + capability split + noscript); 11 core pages (ip-ai, patents, trademarks, copyright, design-rights, trade-secrets, benchmarks, verification-methodology, resources, 2 new compares); glossary index + 20 terms (DefinedTerm + FAQPage); Dataset schema on /benchmarks for latest.json; harvey compare description trim + related links; sitemap 2→34 URLs.
Verified: `npm run build` PASS (5.89s); `test:verification` 28/28 PASS; validator EXIT 0; main bundle 672.2 kB (workspaces already lazy-split, no app perf change needed); public pages 7–14 kB HTML, 0 executable scripts.
