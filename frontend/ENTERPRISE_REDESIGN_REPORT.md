# SallyIP Enterprise Redesign — Report

Date: 2026-09-10 · Branch: main · Commit baseline: 9e024a5 + enterprise frontend

## 1. Routes built (35 clean-URL marketing routes, no hash)

Top-level (14): `/`, `/product`, `/solutions`, `/ip-intelligence`, `/patents`, `/trademarks`, `/copyright`, `/design-rights`, `/trade-secrets`, `/benchmarks`, `/security`, `/enterprise`, `/pricing`, `/resources`, `/about`
Product detail (3): `/novelty-search`, `/claim-charts`, `/office-action-defense`
Footer PRODUCT (3 more): `/whats-new`, `/modules`, `/developer-api`
Footer SUPPORT (6): `/documentation`, `/help`, `/community`, `/enterprise-support`, `/verification-logs`, `/system-audits`
Footer RESOURCES (3 more): `/lifecycle-guide`, `/roadmap`, `/education`, `/newsletter`
Footer ABOUT (4 more): `/performance`, `/careers`, `/partners`, `/trust`
Total enterprise prerender: 34 static files (all except `/`, served by SPA `index.html` with SEO content in `#root`).
Preserved legacy crawlable: `/ip-ai`, `/glossary/*`, `/compare/*`, `/benchmarks/verification-methodology`. Sitemap: 61 URLs.

## 2. Routes redesigned vs built new

- Redesigned (content + visual language replaced, honest scope): `/patents`, `/trademarks`, `/copyright`, `/design-rights`, `/trade-secrets`, `/benchmarks`, `/resources` — old `seo-pages-core` static overwritten by enterprise template; old marketing claims (150M+ patents, 25k+ drafts, 70% reductions, SOC2/ISO/HIPAA/zero-retention) removed.
- Built new (no prior static): `/product`, `/solutions`, `/ip-intelligence`, `/enterprise`, `/pricing` (SPA; legacy hash `#pricing` redirects), `/about`, all 19 footer pages above, 3 product-detail pages.
- Legacy SPA hashes redirect to clean URLs: `home→/`, `pricing→/pricing`, `benchmarks→/benchmarks`, `security→/security`, `lifecycle→/lifecycle-guide`, `modules→/modules`, `performance→/performance`, `transparency→/verification-logs`. No marketing content remains hash-only.

## 3. Screenshots

No headless-browser screenshot run in this environment (no Playwright/Chromium). Visual QA done by code inspection + CSS contract:
- Home, product, enterprise, security, benchmarks, novelty-search, claim-charts, office-action, trademarks each reviewed in JSX for: H1 hierarchy, CTA alignment (`.ent-hero-ctas`), shot frames (`.ent-shot`), chain/journey overflow, footer grid.
- Breakpoints verified in `enterprise.css`: 1440 (max 1200 centered), 1024 (grids → 2col, split → 1col, journey wraps), 390 (1col, ghost CTA hidden, drawer nav).
- Recommendation: run Playwright screenshots at 1440/1024/390 before launch; CSS is structured for it (no fixed widths, overflow-x guarded on demo tabs).

## 4. Components created

- `src/marketing/enterprise.css` — tokens (near-black `#0a0b0f`, warm white, indigo `#5b5bf0` sparing), nav/mega-menu, hero, sections, split/showcase, shot frames, chain, areas grid, metrics, journey, demos, tables, footer, reveal (IO, reduced-motion), responsive.
- `src/marketing/site.js` — NAV (mega menus), ROUTES (title/desc/H1/kind), FOOTER, `isMarketingPath`.
- `src/marketing/ui.jsx` — `go` (pushState), `Reveal`, `Eyebrow`, `Hero`, `Section`, `Split`, `Shot`, `CTASection`, `Breadcrumbs`, `usePageMeta` (title/desc/canonical/OG), `useReveal` (IntersectionObserver).
- `src/marketing/MarketingNav.jsx` — sticky nav, hover mega menus, mobile drawer, Sign In → `#auth` (app hash takes precedence).
- `src/marketing/MarketingFooter.jsx` — 4-col enterprise footer from FOOTER; every link `go()`s to a real route.
- `src/marketing/MarketingLayout.jsx` — nav + main + footer + reveal + meta.
- `src/marketing/demos.jsx` — NoveltyDemo, ClaimChartDemo, OfficeActionDemo, TrademarkDemo, VerificationDemo (all DEMO DATA labelled, no client matters).
- `src/marketing/router.jsx` — pathname router, per-group lazy chunks.
- `src/marketing/pages/pages-home.jsx` — 9-section home (hero, trust, journey, 6 showcases + 2 live demos, verification chain + demo, areas, benchmarks, enterprise, final CTA).
- `src/marketing/pages/pages-core.jsx` — Product, Solutions (7 audiences), Enterprise, Security (11 implemented controls, explicit non-claims), Benchmarks (tabbed, real figures), Pricing (honest, no cert badges).
- `src/marketing/pages/pages-ip.jsx` — IP hub, Patents, Trademarks, Copyright, Design-rights, Trade-secrets, Novelty/Claims/OA detail (10-step pattern compressed: hero, demo, problem, handling, verification, outputs, related, trust, CTA).
- `src/marketing/pages/pages-company.jsx` — GenericPage + 19 footer bodies with unique copy + internal links.
- `src/marketing/bench-data.js` — mirrors `scripts/seo-data.mjs` figures (sync rule documented).
- `scripts/generate-enterprise-pages.mjs` — static prerender for 34 routes (dark minimal inline CSS, crawlable HTML).

## 5. Responsive QA

- 1440: `.ent-wrap` max 1200 centered; hero H1 clamp 44–76px; areas 3col; metrics 4col; footer 5col.
- 1024: links hidden → drawer; grid2/split/demo → 1col; grid3/areas → 2col; metrics → 2col; journey wraps 3-up; chain rows stack.
- 390: all grids 1col; hero padding 72/48; section 64px; ghost CTA hidden (primary retained); demo tabs scroll-x; tables scroll naturally (no fixed layout).
- Contrast: warm white on `#0a0b0f` (>12:1); dim `#b8bdc9` on dark (>7:1); light band `#14151a` on `#f5f4f0`.
- Overflow: no fixed-width elements; `.ent-demo-tabs` overflow-x auto; shot bodies grid → stack.

## 6. Performance before/after

- Before: `dist/assets/index-*.js` ~705 kB (everything incl. chat in initial chunk), CSS 256 kB single.
- After: `index-*.js` 347.7 kB (gzip 111.3 kB), `chat-page-*.js` 237.5 kB lazy, marketing chunks 7.7–19.5 kB each (`pages-home` 11.3, `pages-ip` 11.9, `pages-core` 19.5, `pages-company` 9.3, `demos` 7.9, `MarketingLayout` 7.7), CSS split (index 238 kB + per-page small).
- Marketing initial: index + 1 page chunk (~360 kB total, ~119 kB gzip) vs 705 kB before — ~49% reduction; authenticated bundle never loads until `#chat`/`#auth` requested.
- Static HTML: ~6.9–7.8 kB per route (product 7813 B, enterprise 6900 B, benchmarks 7393 B, security 7167 B) — LCP is text-first, no hero images, no animation libs on static.
- Motion: IO reveals only, no framer-motion on marketing; `prefers-reduced-motion` disables transform + pulse. No layout shift (fixed nav height 64px, min-height fallbacks on lazy).
- Remaining: single Vite entry still parses React for static visitors only when they enter SPA via `/`; direct `/product` hits get zero-JS static. Further win possible via separate marketing entry or `manualChunks` for vendor — noted, not required for gate.

## 7. Crawlability

- Every route has static HTML in `public/<route>/index.html` (except `/` via root `index.html` SEO block) with H1, lede, body copy, internal links, CTA in initial bytes — zero JS required.
- No hash routes for marketing; legacy hashes 301-equivalent client redirect (pushState) to clean paths.
- `public/sitemap.xml` regenerated: 61 URLs (34 enterprise + hubs + glossary 19 + compare 3 + ip-ai + methodology). `public/robots.txt` allows all + GPTBot/ChatGPT-User/CCBot/anthropic-ai/ClaudeBot, sitemap absolute.
- Vercel `cleanUrls:true, trailingSlash:false`; static files take precedence; SPA pushState handles in-app nav; direct hits serve prerender.
- Internal linking: every page links to ≥3 siblings (product↔detail↔benchmarks↔security↔enterprise); Resources lists all hubs; footer covers all 24 links.

## 8. Metadata/schema

- Per page: unique `<title>`, `meta[name=description]`, `link[rel=canonical]` absolute, `robots index,follow`, OG (`type/article`, site_name, title, description, url, image `/sallyip-logo.png`), Twitter summary.
- JSON-LD `@graph`: Organization (`/#org`), WebSite (`/#website`), WebPage (url/name/description), BreadcrumbList (Home → H1). Benchmarks page adds Dataset distribution pointer in source data (static table carries n/model/date inline).
- SPA mirrors same via `usePageMeta` on navigation (title/desc/canonical/OG updated per route).

## 9. Broken-link test

- Checker `linkcheck.py` over `public/**/*.html` (62 files): extracts `href` to `/…` or `https://sallyip.com/…`, resolves to `public/<path>/index.html` or asset; result: **0 BROKEN INTERNAL LINKS** (62 routes found).
- Footer audit: all 24 FOOTER links map to ROUTES entries with generated static files; nav mega-menu links likewise. No dead routes; no `#`-only marketing CTAs (all CTAs `go()` to real paths; Sign In → `#auth` app route by design).

## 10. Build/test result

- `npm run build`: PASS (6.6s, 2281 modules). Pre-existing failure fixed: duplicate `const bytes` in `src/lib/document-ingestion-local.js:19` removed (reuse line-11 buffer + size guard).
- `node --test` verification suite (28 tests): PASS — answer guard, citations, hybrid retrieval, adversarial hallucination, permanent-failures regression.
- `node --test` security suite (31 tests): PASS — provider confidentiality, auth hardening, audit logging, file safety, tenant isolation, verification P1, contracts/deploy.
- `seo:enterprise` (34 pages) + `seo:sitemap` (61 URLs): PASS.

## 11. Remaining placeholder content

- Product visuals are restrained typographic compositions (`FakeShot` + demos), not real product screenshots — task asks for actual SallyIP UI captures with parallax/sticky storytelling. Next: export matter/verification/chart PNGs, add `loading=lazy`, wire parallax.
- Testimonials removed (prior quotes unverified) — add only with named, permissioned customers.
- Counts are benchmark-anchored, not marketing percentages — keep it that way; sync `bench-data.js` from `seo-data.mjs` on each eval run.
- Word add-in manifest still points at `https://sallyip.vercel.app` (pre-existing) — update if prod domain differs.
- Screenshots at 1440/1024/390 + INP field data pending headless run.

## 12. Exact files changed

- Added: `src/marketing/enterprise.css`, `src/marketing/site.js`, `src/marketing/ui.jsx`, `src/marketing/MarketingNav.jsx`, `src/marketing/MarketingFooter.jsx`, `src/marketing/MarketingLayout.jsx`, `src/marketing/demos.jsx`, `src/marketing/router.jsx`, `src/marketing/bench-data.js`, `src/marketing/pages/pages-home.jsx`, `src/marketing/pages/pages-core.jsx`, `src/marketing/pages/pages-ip.jsx`, `src/marketing/pages/pages-company.jsx`, `scripts/generate-enterprise-pages.mjs`, `frontend/ENTERPRISE_REDESIGN_REPORT.md`
- Modified: `src/main.jsx` (lazy authenticated/legacy chunks, enterprise pathname routing + hash redirects, Suspense), `src/lib/document-ingestion-local.js` (duplicate-const build fix), `package.json` (`seo:enterprise` script), `src/marketing/MarketingNav.jsx` (Sign In fix)
- Generated: `public/{product,solutions,ip-intelligence,patents,trademarks,copyright,design-rights,trade-secrets,benchmarks,security,enterprise,pricing,resources,about,novelty-search,claim-charts,office-action-defense,whats-new,modules,developer-api,documentation,help,community,enterprise-support,verification-logs,system-audits,lifecycle-guide,roadmap,education,newsletter,performance,careers,partners,trust}/index.html` (34), `public/sitemap.xml` (61 URLs), `dist/**` (build output incl. split chunks)
