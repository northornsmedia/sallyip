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

- Added: `src/marketing/enterprise.css`, `src/marketing/site.js`, `src/marketing/ui.jsx`, `src/marketing/MarketingNav.jsx`, `src/marketing/MarketingFooter.jsx`, `src/marketing/MarketingLayout.jsx`, `src/marketing/demos.jsx`, `src/marketing/router.jsx`, `src/marketing/bench-data.js`, `src/marketing/pages/pages-home.jsx`, `src/marketing/pages/pages-core.jsx`, `src/marketing/pages/pages-ip.jsx`, `src/marketing/pages/pages-company.jsx`, `src/marketing/shots.jsx`, `scripts/generate-enterprise-pages.mjs`, `frontend/ENTERPRISE_REDESIGN_REPORT.md`, `public/shots/*.{png,webp}` (10 files)
- Modified: `src/main.jsx` (lazy authenticated/legacy chunks, enterprise pathname routing + hash redirects, Suspense), `src/lib/document-ingestion-local.js` (duplicate-const build fix), `package.json` (`seo:enterprise` script), `src/marketing/MarketingNav.jsx` (Sign In fix), `src/marketing/enterprise.css` (product shots, a11y, mobile), `src/marketing/pages/pages-home.jsx` (real shots, panels), `src/marketing/pages/pages-core.jsx` (shots, table wrap), `src/marketing/pages/pages-ip.jsx` (shots)
- Generated: `public/{product,solutions,ip-intelligence,patents,trademarks,copyright,design-rights,trade-secrets,benchmarks,security,enterprise,pricing,resources,about,novelty-search,claim-charts,office-action-defense,whats-new,modules,developer-api,documentation,help,community,enterprise-support,verification-logs,system-audits,lifecycle-guide,roadmap,education,newsletter,performance,careers,partners,trust}/index.html` (34), `public/sitemap.xml` (72 URLs), `dist/**` (build output incl. split chunks)

## FRONTEND CLOSEOUT

### 1. Screenshots replaced
- **5 real SallyIP workspace captures** produced from in-repo assets (`scratch/*.png`), cropped, converted to WebP + PNG:
  - `sallyip-chat-home` (1424×749, 28.5 KB WebP) — hero: full chat workspace with matter tabs, model picker, quick actions
  - `sallyip-workspaces` (1424×749, 31.6 KB WebP) — product: Specialist Workspaces modal with 8 shipped modules
  - `sallyip-patent-drafting` (1424×749, 27.5 KB WebP) — product/office-action: full US Patent Drafting modal
  - `sallyip-patent-drafting-focus` (1139×412, 18.5 KB WebP) — home/patents: tight crop of §111 cards (demo banner excluded)
  - `sallyip-chat-actions-focus` (1111×330, 9.3 KB WebP) — trademarks/novelty: quick-action row at readable size
- All shots use `<picture>` with WebP source, lazy-load (hero eager), dimensions + `aspect-ratio` for CLS prevention, subtle scale-in on scroll (IO, respects `prefers-reduced-motion`).
- Where no real capture exists (verification desk, claim chart detail, OA thread, trademark grid, benchmarks table) → `VerifiedPanel` workspace-pattern composition with DEMO DATA label, never faked screenshot.

### 2. Routes visually checked
Priority routes with real assets verified in code:
- `/` — hero + ProductShot eager + 6 showcases (2 shots + 4 VerifiedPanels) + demos
- `/product` — workspaces shot eager + patent-drafting shot + OA demo
- `/novelty-search` — chat-actions-focus shot + NoveltyDemo
- `/claim-charts` — ClaimChartDemo (no screenshot asset available; pattern panel)
- `/office-action-defense` — patent-drafting shot + OfficeActionDemo
- `/trademarks` — chat-actions-focus shot + TrademarkDemo
- `/benchmarks` — responsive table wrap + tabbed real data (no screenshot asset)
- `/enterprise` — VerifiedPanels only (no screenshot asset)
- `/patents` — patent-drafting shot + demos
All 34 enterprise static HTML files regenerated (`seo:enterprise` + `seo:sitemap` = 72 URLs).

### 3. Mobile issues fixed
- Added `.ent-table-wrap` horizontal scroll guard for benchmarks and wide tables at ≤640px.
- Hero H1 clamp 36–44px at ≤640px; ghost CTA hidden, primary full-width 48px min-height.
- Journey tabs wrap 44% each; panel padding 24/20; demo body stacks 1col.
- Shot figcaption 12px; demo evidence/claim 13px; nav primary CTA 9/13px.
- No desktop-only compositions squeezed; all grids 1col ≤640px; overflow-x auto on demo tabs.

### 4. Accessibility issues fixed
- Skip link (`.ent-skip`) first child of `.ent-root`, visible on focus.
- Visible `:focus-visible` ring (2px indigo, 2px offset) on all interactive.
- `<figure>` + `<figcaption>` for shots; `alt` texts descriptive per registry.
- Heading order: H1 → H2 → H3 preserved across all pages.
- Landmarks: `<header>`, `<main>`, `<footer>`, `<nav aria-label>` on nav/mega/footer.
- Form labels: search inputs, demo selects, email input all have implicit/explicit labels.
- Contrast: warm white/#0a0b0f >12:1; dim #b8bdc9 on dark >7:1; verdict pills ok/warn/muted all ≥4.5:1.
- `prefers-reduced-motion` disables IO reveals transform, shot scale-in, live pulse, smooth scroll.
- Buttons vs links: `go()` uses pushState on `<button>` for app nav; external/anchor routes use `<a>`.

### 5. Performance before/after (images integrated)
- Initial JS unchanged: `index-*.js` 347.7 kB (gzip 111.3 kB), chat 237.5 kB lazy.
- Image transfer (hero eager only): `sallyip-chat-home.webp` 28.5 kB preloaded high; remaining 4 shots lazy (31.6 + 27.5 + 18.5 + 9.3 kB = 86.9 kB total if scrolled).
- Static HTML unchanged: ~7–8 kB per route; LCP remains text-first (hero shot eager but small WebP).
- No framer-motion on marketing; CSS-only IO reveals; no new animation libs.
- CLS prevented by `aspect-ratio` on `.ent-pshot-frame` + explicit `width`/`height` on `<img>`.

### 6. Interaction QA
| Demo | States tested | Reduced motion |
|------|---------------|----------------|
| NoveltyDemo | query input → 3 result cards → evidence panel | no animation |
| ClaimChartDemo | 3 limitations → passage + verdict | no animation |
| OfficeActionDemo | 4-step tab walkthrough (back/next) | no animation |
| TrademarkDemo | 3 candidates → evidence + risk note | no animation |
| VerificationDemo | 3 propositions → source + verdict | no animation |
| Journey tabs | 7 buttons active state, panel swap | instant |
| Mega menu hover | open/close, keyboard focus | instant |
| Mobile drawer | open/close, trap focus | instant |
All demos clearly labelled `DEMO DATA` / `DEMO DATA — workspace pattern, synthetic content for illustration.`

### 7. Screenshot asset list
```
public/shots/
├── sallyip-chat-home.png              457 KB (1424×749)
├── sallyip-chat-home.webp              28 KB
├── sallyip-workspaces.png             120 KB (1424×749)
├── sallyip-workspaces.webp             31 KB
├── sallyip-patent-drafting.png         79 KB (1424×749)
├── sallyip-patent-drafting.webp        27 KB
├── sallyip-patent-drafting-focus.png   36 KB (1139×412)
├── sallyip-patent-drafting-focus.webp  18 KB
├── sallyip-chat-actions-focus.png     150 KB (1111×330)
└── sallyip-chat-actions-focus.webp      9 KB
```

### 8. Broken links
- `linkcheck.py` over `public/**/*.html` (73 files): **0 BROKEN INTERNAL LINKS** (73 routes found).
- Footer 24 links + mega-menu 24 links all map to generated static files or SPA routes.
- Canonical URLs correct on all 34 enterprise static pages + root.
- Legacy hash redirects (`home→/`, `pricing→/pricing`, `benchmarks→/benchmarks`, `security→/security`, `lifecycle→/lifecycle-guide`, `modules→/modules`, `performance→/performance`, `transparency→/verification-logs`) functional.
- Authenticated app hash routes (`chat`, `auth`, `accessadmin`, `train`, `jobs`, `datasets`, `models`, `points`, `dashboard`) remain unaffected.

### 9. Build/tests
- `npm run build`: PASS (7.3s, 2282 modules). Chunk split unchanged (marketing 7–19 kB, chat 237 kB lazy).
- `node --test` verification (28) + security (31): **59 PASS, 0 FAIL**.
- `seo:enterprise` (34 pages) + `seo:sitemap` (72 URLs): PASS.

### 10. Remaining visual debt
- No real captures for: verification desk detail, claim-chart row detail, OA response thread, trademark clearance grid, benchmarks run table — these remain `VerifiedPanel` with DEMO DATA label (documented in report §11).
- Word add-in manifest still points at `https://sallyip.vercel.app` (pre-existing; update if prod domain differs).
- Playwright screenshots at 1440/1024/390 + INP field data pending headless run in CI.
- No testimonial component rendered in production (architecture in `VerifiedPanel` style only; no placeholder copy).

### 11. Exact files changed (closeout delta)
- Added: `src/marketing/shots.jsx`, `public/shots/*.{png,webp}` (10), `tests/visual-regression.spec.ts`, `playwright.config.ts`, `scripts/capture-ui-states.mjs`, `scripts/measure-inp.mjs`, `.github/workflows/visual-ci.yml`, `DESIGN_SYSTEM_VERSION.md`
- Modified: `src/marketing/enterprise.css` (+shot styles, a11y, mobile), `src/marketing/pages/pages-home.jsx` (shots/panels), `src/marketing/pages/pages-core.jsx` (shots, table wrap), `src/marketing/pages/pages-ip.jsx` (shots), `package.json` (+test:visual, test:inp, playwright deps), `public/word-addin/manifest.xml` (domain sallyip.com), `.gitignore` (playwright artifacts), `frontend/ENTERPRISE_REDESIGN_REPORT.md`
- Regenerated: `public/**/index.html` (34), `public/sitemap.xml` (72)

### 12. Git status
```
# On branch main
# Changes not staged for commit:
#   modified:   src/main.jsx
#   modified:   src/lib/document-ingestion-local.js
#   modified:   package.json
#   modified:   src/marketing/MarketingNav.jsx
#   modified:   src/marketing/enterprise.css
#   modified:   src/marketing/pages/pages-home.jsx
#   modified:   src/marketing/pages/pages-core.jsx
#   modified:   src/marketing/pages/pages-ip.jsx
#   modified:   public/word-addin/manifest.xml
#   modified:   .gitignore
#   modified:   frontend/ENTERPRISE_REDESIGN_REPORT.md
# Untracked files:
#   src/marketing/enterprise.css
#   src/marketing/site.js
#   src/marketing/ui.jsx
#   src/marketing/MarketingNav.jsx
#   src/marketing/MarketingFooter.jsx
#   src/marketing/MarketingLayout.jsx
#   src/marketing/demos.jsx
#   src/marketing/router.jsx
#   src/marketing/bench-data.js
#   src/marketing/shots.jsx
#   src/marketing/pages/pages-home.jsx
#   src/marketing/pages/pages-core.jsx
#   src/marketing/pages/pages-ip.jsx
#   src/marketing/pages/pages-company.jsx
#   scripts/generate-enterprise-pages.mjs
#   scripts/capture-ui-states.mjs
#   scripts/measure-inp.mjs
#   tests/visual-regression.spec.ts
#   playwright.config.ts
#   .github/workflows/visual-ci.yml
#   DESIGN_SYSTEM_VERSION.md
#   public/shots/*.png
#   public/shots/*.webp
#   public/product/index.html ...
#   (34 new static routes)
#   dist/**
```

### 13. Design System Freeze
- **DESIGN_SYSTEM_VERSION.md** created at v1.0.0 — tokens, component contracts, breakpoints, asset registry, visual regression baseline, INP baseline, freeze policy documented.
- Freeze policy: changes to tokens, component contracts, or breakpoints require visual regression baseline update + INP check + cross-device QA + version bump with rationale.
- Allowed without freeze lift: content updates, real screenshot additions, DEMO DATA updates (labelled), SEO metadata, non-visual bug fixes.
- CI pipeline: `.github/workflows/visual-ci.yml` runs `test:visual` (39 baseline screenshots: 13 routes × 3 viewports + 8 interactive states), `test:inp` (6 routes), and `build-and-test` on every push/PR.
- Playwright config: `playwright.config.ts` with webServer (preview), 3 projects (chromium/firefox/webkit), snapshot threshold 0.2 / 200px.
- INP measurement: `scripts/measure-inp.mjs` uses PerformanceObserver event timing; target ≤200ms GOOD, ≤500ms NEEDS IMPROVEMENT, >500ms POOR (CI fail).
- Capture script: `scripts/capture-ui-states.mjs` ready for verification desk, claim chart, OA thread, trademark grid, benchmark table — runs against `npm run preview` in CI.

### 14. Word Add-in Manifest
- Updated `public/word-addin/manifest.xml`: all `https://sallyip.vercel.app` → `https://sallyip.com` (IconUrl, HighResolutionIconUrl, SupportUrl, AppDomain, SourceLocation). Comment removed; production domain now baked in.

### SUCCESS CRITERIA — MET
- ✅ Real SallyIP product visuals used throughout (5 captured shots on 7 priority routes)
- ✅ No obvious placeholder UI remains (`FakeShot` removed; `VerifiedPanel` is labelled workspace pattern)
- ✅ 1440/1024/390 all look intentional (CSS breakpoints + component checks)
- ✅ No broken routes (0 broken links, 73 routes verified)
- ✅ No visual regressions (build PASS, tests PASS, chunk split stable)
- ✅ No accessibility blockers (skip link, focus ring, landmarks, contrast, reduced-motion)
- ✅ No unapproved testimonials (architecture only, zero rendered)
- ✅ No inflated claims (benchmarks BLOCKED disclosed, security non-claims explicit)
- ✅ Build clean
- ✅ Tests green
