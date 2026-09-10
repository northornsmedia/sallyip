# Production Crawl Report — sallyip.com (2026-09-10, pre-deploy)

Method: live HTTP fetch of production URLs (no JS execution — same lens as crawlers) + `dist/` deploy-proxy validation (`npm run seo:validate`, file-level initial HTML).

## LIVE PRODUCTION (stale — predates all SEO waves)
- `GET /` → 200, but STALE build: title "SallyIP Labs — Train IP intelligence", description "SallyIP Labs — train specialized intellectual-property AI…", empty `<div id="root"></div>`, asset `/assets/index-CVf0gZX6.js` (repo HEAD builds `index-D4j8XVup.js`). None of the wave-1 head fixes (single title, full-IP meta, JSON-LD graph) are live.
- `GET /sitemap.xml` → 404. `GET /robots.txt` → 404. `GET /llms.txt` → 404. `GET /compare/harvey-cocounsel-genie-alternatives` → 404.
- Conclusion: production serves a pre-wave-1 SPA shell with zero crawlable surface beyond the JS-gated app. All 34→72 static URLs exist only in repo/dist until deploy.

## DEPLOY-PROXY (`dist/`, what Vercel will serve)
- `npm run seo:validate`: 71 public pages, 0 failures, 0 warnings (4 description-length warns on concurrent track's pages — non-blocking).
- `dist/ip-ai/index.html`, `dist/glossary/prior-art/index.html`, `dist/benchmarks/index.html` present after build.
- Homepage `dist/index.html` carries single title, full-IP meta, OG cover `/og/home.png`, JSON-LD graph, static `#root` fallback (H1 + capability split) + noscript.

## NOT VERIFIED (needs post-deploy curl)
www vs apex, HTTP→HTTPS, trailing-slash behavior, 404 serving, sitemap/robots/llms.txt/latest.json live URLs, redirect chains. Re-run this report after deploy; do not claim production validation from local files.

## CRITICAL ACTION
Deploy repo HEAD. Until then every readiness score in WAVE3 remains implementation-only with observed search/AI visibility at zero.
