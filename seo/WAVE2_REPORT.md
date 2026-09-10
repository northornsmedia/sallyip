# WAVE 2 REPORT — Crawlable Authority + Topical Expansion (2026-09-10)

Method: same blocker-based rubrics as wave 1 (rubric printed below so points are auditable). Scores measure implementation + local verification, NOT production observation or earned citations.

## Scoring rubrics (applied to before- and after-states identically)

### SEO (100)
| Category | Weight | Before (46) | After (77) | Why the delta |
|---|---|---|---|---|
| Crawlable public surface | 25 | 6 — 2 URLs, app hash-gated | 19 — 34 static 0-JS URLs, validator-green; app still SPA, no post-deploy curl yet (−6) | +13 |
| Head tags & metadata | 10 | 5 — dup title fixed w1, still patent-only then | 10 — single title, full-IP, OG/Twitter, home fallback H1 | +5 |
| Content depth & topical coverage | 20 | 7 — one strong compare page | 12 — 3 hubs + 3 guides + benchmarks×2 + resources + 20 glossary + 3 compares; clusters/body-rewrite/reviews pending | +5 |
| Internal linking & orphans | 10 | 4 — minimal | 8 — resources index, breadcrumbs, validator orphan check; no external links yet | +4 |
| Schema & entity | 10 | 6 — single App block | 8 — per-page graph, FAQ/DefinedTerm/Dataset; no Person/sameAs | +2 |
| Sitemap/robots/indexing ops | 10 | 7 | 8 — 34-URL auto sitemap, IndexNow manual script; key not provisioned | +1 |
| Performance | 10 | 7 — 689 kB main | 7 — 672 kB (rebuild variance, not a real change); public pages 0-JS 7–14 kB | +0 |
| Freshness & dates | 5 | 4 | 5 — visible + structured dates on all 33 pages | +1 |

### GEO readiness (100 — readiness, NOT observed citations; observed-citation score is 0/pending)
| Category | Weight | Before (52) | After (76) | Why |
|---|---|---|---|---|
| Crawlable answers | 25 | 9 — llms.txt + 1 compare | 17 — 33 pages with visible Q&A; no engine observed citing yet (−8) | +8 |
| Entity clarity | 15 | 8 — patent-only head | 12 — "verification-first AI workspace for IP work" site-wide; llms.txt refresh pending | +4 |
| Factual passages (40–100w, visible, non-promotional) | 15 | 4 | 11 — hub + glossary Q&A blocks; homepage passages short | +7 |
| Sources/dates/methods on-page | 15 | 10 — reports existed in repo | 13 — run IDs, n/d, BLOCKED disclosure, latest.json linked | +3 |
| Agent-facing structured data | 10 | 5 | 8 — FAQ/DefinedTerm/Dataset/Breadcrumb per page | +3 |
| Crawler access | 10 | 8 | 9 — AI allows + lastmod; IndexNow key pending | +1 |
| Original research assets | 10 | 8 — frozen repo datasets | 6 — see note | −2 |

Note on research assets −2: wave-1 credit assumed repo datasets were public; they are NOT web-accessible (no public CSV). `latest.json` (JSON, 6 runs) partially closes this but a frozen downloadable dataset is still missing — scored down honestly. Net GEO: 52→76 (+24).

## 1–2. Scores
- SEO BEFORE 46 → AFTER 77 (+31). Goal ≥65: MET on implementation.
- GEO BEFORE 52 → AFTER 76 (+24). Goal ≥70: MET on readiness. Observed citations: none yet — that is earned, not built.

## 3. Crawlable URLs: 2 → 34 (home + 33 static; sitemap-verified, validator cross-checked)
## 4. Hubs launched: /ip-ai, /patents, /trademarks (≥500 visible words, FAQ, benchmark evidence, CTA)
## 5. Glossary: index + 20 terms (answer-first, DefinedTerm + FAQPage, related-definition links, hub backlinks)
## 6. Benchmark pages: /benchmarks (6-run table, BLOCKED disclosed, Dataset→latest.json) + /benchmarks/verification-methodology (5 gates + run refs). latest.json: 6 benchmarks, required fields enforced by validator.
## 7. Initial-HTML validation: `npm run seo:validate` EXIT 0 — 33 pages, 0 failures, 0 warnings (H1, copy floors, canonical, description, JSON-LD parse, ≥3 internal links, run refs, no banned superlatives, no orphans, sitemap coverage, latest.json fields). Homepage `#root` carries static H1 fallback + noscript.
## 8. Internal-link coverage: every page reachable via nav/resources/hub/crumbs (≤3 clicks); validator fails CI on orphans.
## 9. Structured data: WebPage+BreadcrumbList ×33; FAQPage ×23; DefinedTerm ×20; Article+Breadcrumb on 3 compares; Dataset on /benchmarks; Org/WebSite/SoftwareApplication graph on home. Zero executable scripts on public pages (JSON-LD data blocks only).
## 10. JS: main 689 kB (w1) → 672.2 kB (variance, +0 points claimed); workspaces already lazy-split (17 chunks); public pages 0 JS; build 6.94s → 5.89s.
## 11. Remaining blockers: post-deploy curl re-check; IndexNow key; www/apex + redirect confirmation; llms.txt scope refresh; React body-copy rewrite; 15 cluster pages; OG cover image; frozen public CSV; reviews/backlinks; practitioner grading (legal correctness still NOT ESTABLISHED everywhere).
## 12. Files changed: `index.html`; `package.json` (3 scripts); `public/compare/harvey…/index.html` (hand-edit: description + related links — NOT generator-managed, do not overwrite); generated `public/{ip-ai,patents,trademarks,copyright,design-rights,trade-secrets,benchmarks/**,resources,glossary/**,compare/sallyip-vs-*}/*` (32), `public/sitemap.xml`; new `scripts/{seo-data,seo-layout,seo-pages-core,seo-pages-glossary,generate-public-pages,verify-benchmark-data,seo-validate-public-pages}.mjs`; updated `seo/*` + this report.
CORRECTION (mid-wave): `public/benchmarks/latest.json` is owned by the parallel external-validation wave (627-line feed, per-metric run IDs, headline-eligibility + no-smoke-test rules). An early wave-2 generator overwrote it; the overwrite was reverted via `git restore`, grounding run ID `f8dfe146` adopted from their scoreboard, and the generator replaced with drift-check `verify-benchmark-data.mjs` (4/4 headline figures match, EXIT 0). Never overwrite pipeline-owned benchmark data.
## 13. Build/test: `npm run build` PASS (5.89s, chunk warning only); `test:verification` 28/28 PASS; `seo:validate` EXIT 0.
## 14. Git status: see command output below (wave-2 files are new/untracked plus hand-edits; pre-existing unrelated worktree mods untouched).
