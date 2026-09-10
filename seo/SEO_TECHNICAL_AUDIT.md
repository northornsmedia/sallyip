# SEO Technical Audit — SallyIP.com (2026-09-10)

Scope: `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, `public/compare/`, `public/404.html` (new), `vercel.json`, `vite.config.js`, `src/main.jsx` hash router, `dist/` build output.

## CRITICAL
- **C1 — SPA hash-router kills indexability.** `src/main.jsx:134 route() = location.hash.slice(1)`; all app pages (`chat/train/jobs/models/transparency/benchmarks/...`) are `#` fragments. Crawlers index exactly 2 URLs: `/` and `/compare/harvey-cocounsel-genie-alternatives`. Everything else is invisible. NOT auto-fixed (routing migration is disruptive). Recommendation: migrate public content to history routes + prerendered static HTML (Vite SSG / per-route `public/` pages like compare), keep app behind auth/noindex.
- **C2 — Duplicate `<title>` (FIXED).** `index.html` had two `<title>` tags (lines 7 and 29). Removed second. Verify in `dist/index.html` after build.
- **C3 — Single-page sitemap, llms.txt listed as URL (FIXED).** `sitemap.xml` listed `/llms.txt` (not HTML — invalid sitemap member). Removed; added `<lastmod>`; added `scripts/generate-sitemap.mjs` (`npm run seo:sitemap`) that scans `public/**/index.html`. Do NOT add hub URLs until the pages exist.
- **C4 — Patent-only head positioning (FIXED in head).** Title/description/OG were patents-only. Broadened to "Intellectual Property: Patents, Trademarks & IP Research" + "from creation to enforcement". App body copy in `src/main.jsx` is still training-platform flavored — needs content pass (see CONTENT_MAP).

## HIGH
- **H1 — No SSR/prerender.** `dist/index.html` is an empty `#root` shell. crawlers without JS see only head tags. Recommend prerender `/` + hubs (vite-plugin-prerender / static export). Reported, not implemented.
- **H2 — 688 kB JS bundle** (`dist/assets/index-*.js`, chunk-size warning). Risks LCP/INP. Recommend route-level `import()` code-splitting for the 12 workspaces. Reported, not implemented.
- **H3 — No 404 handling (FIXED).** Added `public/404.html` (`noindex, follow`, canonical home, CTA). Vercel serves it for unknown paths.
- **H4 — Missing image alts (FIXED).** 4× `alt=""` on brand images (`main.jsx:142`, `chat-page.jsx:579,1605,1883`) → `alt="SallyIP"`. Decorative icons left empty intentionally.
- **H5 — Compare page schema thin (FIXED).** Added `BreadcrumbList` + `datePublished/dateModified` to existing `Article`. No `Person` author added (no real author identity — must not fabricate).

## MEDIUM
- **M1 — robots.txt minimal (FIXED).** Added explicit `Allow` for GPTBot/ChatGPT-User/CCBot/anthropic-ai/ClaudeBot (documents crawl permission; makes no ranking claim). Kept `Allow: /` + sitemap pointer.
- **M2 — No sitemap index.** Not needed at 2 URLs. Revisit at >50 URLs or multi-section hubs.
- **M3 — Canonical/trailing-slash/www.** Canonical present on `/` + compare. `vercel.json` now sets `cleanUrls:true, trailingSlash:false`. www vs apex + http→https must be confirmed in Vercel project + DNS (not in repo).
- **M4 — H1 hierarchy.** Landing has one H1; app shell `PageHead` renders per-page H1 (good). `brain-admin-page.jsx:85,107` renders duplicate H1 — admin-only, low crawl impact; recommend single H1 when touched.
- **M5 — OG/Twitter images.** Point at `/sallyip-logo.png` (small logo, not 1200×630). Recommend dedicated `og-cover.png` later; not fabricated now.
- **M6 — Static caching/CDN headers (FIXED).** `vercel.json` sets XML/text content-types + immutable cache on `/assets/*`.

## LOW
- **L1 — hreflang:** not relevant (English-only). **L2 — pagination:** none. **L3 — query params:** hash state only; no canonical leak. **L4 — soft-404s:** none detected (only real 404 now has `noindex`).

## Verification
- `npm run build` PASS (6.94s, pre-existing chunk warning only).
- `npm run seo:sitemap` regenerates 2-URL sitemap correctly.
- `dist/compare/.../index.html` present; `dist/404.html` should be confirmed after next deploy (Vercel copies `public/`).

## WAVE 2 ADDENDUM (2026-09-10)
- C1/C3/H1 status changed: public layer no longer depends on hash routing or JS. 33 static pages under `public/` (hybrid: app remains SPA). `npm run seo:validate` proves H1/copy/canonical/description/JSON-LD/links present with JS disabled (file-level = initial-HTML equivalent for static hosting; re-verify `curl` post-deploy).
- Sitemap now 34 URLs via existing generator (auto-scans `public/**/index.html`; `latest.json`/word-addin/404 excluded by design).
- C4 partly closed: homepage initial HTML carries full-IP H1 + capability split (Available vs Guidance/developing). React body copy still training-flavored — full rewrite deferred, no longer a blocker for crawlers.
- H2 re-audited: all 17 chat workspaces already `React.lazy` (`chat-page.jsx:6-26`) with per-workspace chunks (12–26 kB); main 672.2 kB vs 689 kB at wave 1 (rebuild variance, no regression). Public pages ship 0 JS (7–14 kB HTML). No further splitting — would risk product UX for single-digit gains.
- New validator enforces: hubs ≥500 words, glossary ≥120 words, benchmark run refs, no banned superlatives, no orphans, sitemap coverage. CI gate ready.
