# SEO Master Plan — SallyIP: IP intelligence, from creation to enforcement (2026-09-10)

Specialist inputs: SEO_TECHNICAL_AUDIT, SEO_CONTENT_MAP, GEO_AI_VISIBILITY_PLAN, SCHEMA_ENTITY_AUDIT, COMPETITOR_SEARCH_GAPS, BENCHMARK_CONTENT_STRATEGY. Log: IMPLEMENTATION_LOG.

## 1. Scores
- **SEO health: 46/100.** Crawlable surface is 2 URLs (hash-router SPA); head/meta fixed today but body still patent-training flavored; 688 kB JS; sitemap/robots/404/alts/schema now correct. Indexation + rendering + content depth are the missing 54.
- **GEO/AI visibility: 52/100.** llms.txt + honest compare + open bench methods are real assets; entity graph + crawler allows added today. But answers live in JS chat, no glossary/datasets/dates at scale — answer engines have little to cite yet.

## 2. Critical blockers (CRITICAL)
- C1 Hash-router: app content uncrawlable. Migrate public pages to static history routes + prerender.
- C2 No SSR: `#root` shell; prerender `/` + hubs.
- C3 Patent-only body copy vs full-IP strategy; rewrite landing + add hubs with honest scope labels.
- C4 Missing hub surface: 0/10 hubs live. No indexable definitions, methods, benchmarks pages.

## 3. Top 20 search opportunities (HIGH unless noted)
1. patent AI / AI patent drafting (commercial, hub /patents) — HIGH
2. prior art search AI — HIGH 3. freedom-to-operate AI — HIGH 4. office action response AI — HIGH
5. trademark clearance AI — HIGH 6. AI for IP lawyers (hub /ip-ai) — HIGH 7. legal AI hallucination benchmark — HIGH (unique data)
8. patent retrieval benchmark / verification methodology — HIGH 9. claim chart automation — MEDIUM 10. patentability/novelty search — MEDIUM
11. trademark monitoring/brand protection (guide-first, honest scope) — MEDIUM 12. copyright AI research (assistance-labeled) — MEDIUM
13. trade secret protection guide — MEDIUM 14. design rights guide — MEDIUM 15. IP litigation evidence/chronologies — MEDIUM
16. IP enforcement workflows — MEDIUM 17. IP portfolio intelligence (guide-first) — MEDIUM 18. verified legal AI / citation verification — HIGH
19. Harvey/CoCounsel/Solve/DeepIP/Patsnap alternatives (2 more compare pages) — HIGH 20. glossary/definitions (likelihood of confusion, §101/§112, FTO vs novelty) — HIGH (GEO fuel)

## 4. Top 10 pages to create/improve
1. `/` body rewrite (full-IP, scope matrix) 2. `/ip-ai` 3. `/patents` 4. `/trademarks` 5. `/benchmarks` 6. `/benchmarks/verification-methodology`
7. `/compare/solve-deepip-patlytics-drafting` 8. `/compare/patsnap-questel-ip-intelligence` 9. `/glossary/*` (10 terms) 10. `/copyright` (assistance-labeled).

## 5–8. Fixes done today
- Technical: duplicate title removed, llms.txt out of sitemap, lastmod + generator, 404, robots AI allows, alts, vercel headers/cleanUrls. Schema: Org/WebSite/WebPage/App graph + compare BreadcrumbList/dates. Indexing: `seo:sitemap` live; IndexNow manual script ready (key pending); sitemap auto-regen documented.

## 9. 30-day roadmap
- Wk1: approve router/prerender plan; publish `/benchmarks` + `/benchmarks/verification-methodology` (numbers with n/date/method per BENCHMARK strategy); provision IndexNow key + submit 2 URLs post-deploy.
- Wk2: ship `/ip-ai`, `/patents`, `/trademarks` static hubs + glossary v1 (10 terms) + OG cover.
- Wk3: second + third compare pages; code-split bundle; body copy full-IP pass.
- Wk4: public eval CSV + Dataset schema; G2/Capterra review motion (per DIRECTORIES.md); re-score (target SEO 65+, GEO 70+).

## 10. Files changed (exact)
`.opencode/agents/{seo-director,technical-seo,content-seo,geo-ai-visibility,schema-entity,competitor-intel,benchmark-pr}.md` (new); `index.html`; `public/robots.txt`; `public/sitemap.xml`; `public/404.html` (new); `public/compare/harvey-cocounsel-genie-alternatives/index.html`; `vercel.json`; `package.json`; `src/main.jsx`; `src/components/chat-page.jsx`; `scripts/generate-sitemap.mjs` (new); `scripts/submit-indexnow.mjs` (new); `seo/*.md` (8 new).
