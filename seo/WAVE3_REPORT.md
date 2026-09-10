# WAVE 3 REPORT — Earned Authority + Citability (2026-09-10)

Method: identical blocker-based rubrics as WAVE 2 (printed there so points are auditable). Scores measure implementation + local validation; production is not yet deployed (see PRODUCTION_CRAWL_REPORT.md — production serves pre-wave-1 build). Observed AI citations: 0 (unobserved, not tested-negative).

## Scoring rubrics (applied identically to WAVE 2)

### SEO (100)
| Category | Weight | WAVE 2 (77) | WAVE 3 (82) | Why the delta |
|---|---|---|---|---|
| Crawlable public surface | 25 | 19 — 34 static 0-JS URLs | 21 — 72 URLs (core 11 + wave3 11 + glossary 21 + 3 compares); validator-green; no production curl yet (−4) | +2 |
| Head tags & metadata | 10 | 10 — single title, full-IP, OG/Twitter | 10 — same; premium OG covers (1200×630) for 6 sections; Twitter large image | +0 |
| Content depth & topical coverage | 20 | 12 — 3 hubs + 3 guides + 6 bench + 1 res + 20 gloss + 3 compares | 16 — +5 wave3 clusters + 2 research notes + 4 new benchmark pages + 3 practice guides; no thin pages (validator floors); body-rewrite/reviews pending | +4 |
| Internal linking & orphans | 10 | 8 — resources index, breadcrumbs, validator | 9 — glossary backlinks, hub↔cluster↔benchmark triangle, resources index covers all; no orphans per validator | +1 |
| Schema & entity | 10 | 8 — per-page graph, FAQ/DefinedTerm/Dataset | 9 — Entity Graph doc + llms.txt scope matrix + backfill JSON-LD on 62 foreign pages + Dataset on /benchmarks + FAQPage on 23 pages | +1 |
| Sitemap/robots/indexing ops | 10 | 8 — 34-URL auto sitemap, IndexNow script | 9 — 72-URL sitemap, IndexNow ledger + AI visibility ledger, GSC checklist doc; key not provisioned (−1) | +1 |
| Performance | 10 | 7 — 672 kB main | 8 — 348 kB main (Vite split index vs chat-page chunk); public pages 0-JS 7–14 kB | +1 |
| Freshness & dates | 5 | 5 — visible + structured dates | 5 — all 72 pages dated 2026-09-10 | +0 |

### GEO readiness (100 — readiness, NOT observed citations)
| Category | Weight | WAVE 2 (76) | WAVE 3 (84) | Why |
|---|---|---|---|---|
| Crawlable answers | 25 | 17 — 33 pages Q&A | 22 — 72 pages with visible Q&A; no engine citing yet (−3) | +5 |
| Entity clarity | 15 | 12 — "verification-first AI workspace for IP work" | 13 — Entity Graph doc + llms.txt scope + footer/site-wide sentence; Labs ≠ company | +1 |
| Factual passages (40–100w, visible, non-promotional) | 15 | 11 — hub + glossary Q&A | 15 — 7 clusters ≥400w, 2 research ≥300w, 4 benchmarks ≥240w + Q&A blocks; no keyword stuffing | +4 |
| Sources/dates/methods on-page | 15 | 13 — run IDs, n/d, BLOCKED | 15 — ABIGAIL/IPBench/CUAD run refs, ablation-25 26/26, CSV/JSON, CSV aggregates only, practitioner placeholder | +2 |
| Agent-facing structured data | 10 | 8 — FAQ/DefinedTerm/Dataset/Breadcrumb | 10 — all 72 pages: WebPage+Breadcrumb, FAQPage×23, DefinedTerm×20, Article×3, Dataset×1, no fake Person/Rating | +2 |
| Crawler access | 10 | 9 — AI allows + lastmod | 10 — robots AI allows + IndexNow ledger + GSC/BWT prep doc + sitemap 72 URLs | +1 |
| Original research assets | 10 | 6 — no public CSV | 9 — headline-metrics.csv (14 aggregates) + ablation study + citation-integrity note + practitioner placeholder JSON; frozen downloadable dataset still missing (−1) | +3 |

## 1–2. Scores (implementation + local validation)
- SEO: 77 → 82 (+5). Target ≥65: MET.
- GEO readiness: 76 → 84 (+8). Target ≥70: MET.
- Observed AI citations: 0 (no observation run yet — AI_VISIBILITY_LEDGER.json initialized).

## 3. Crawlable URLs: 34 → 72 (sitemap-verified, validator EXIT 0).
## 4. Hubs: /ip-ai, /patents, /trademarks (≥500 words, FAQ, benchmark evidence, CTA).
## 5. Glossary: index + 20 terms (DefinedTerm + FAQPage, related-definition links, hub backlinks).
## 6. Benchmarks: /benchmarks (7 runs, BLOCKED disclosed, Dataset→latest.json), /benchmarks/verification-methodology (5 gates), /benchmarks/hallucination, /benchmarks/patent-retrieval, /benchmarks/external-validation, /benchmarks/methodology. Downloadable: latest.json (34 metrics), headline-metrics.csv (14 headline-eligible aggregates).
## 7. Initial-HTML validation: `npm run seo:validate` EXIT 0 — 71 pages, 0 failures, 0 warnings (H1 ≥ thresholds, canonical, description, JSON-LD parse, ≥3 internal links, run refs on benchmarks, no banned superlatives, no orphans, sitemap coverage, latest.json fields, practitioner placeholder). Homepage fallback + noscript present. Zero executable scripts on public pages.
## 8. Internal links: every page ≤3 clicks (nav → hubs → clusters → benchmarks → resources → glossary); validator fails CI on orphans.
## 9. Structured data: WebPage+BreadcrumbList ×71; FAQPage ×23; DefinedTerm ×20; Article+Breadcrumb ×3 compares; Dataset on /benchmarks; Org/WebSite/SoftwareApplication graph on home; backfill JSON-LD on 62 foreign pages.
## 10. JS: main 672→348 kB (chat-page chunk split; index chunk halved); public pages 0 JS; build 6.21s; workspaces already lazy-split (17 chunks).
## 11. Remaining blockers: production deploy (critical); post-deploy curl re-check; IndexNow key provisioning; www/apex + redirect confirmation; GSC/BWT submission; practitioner grading (0/25 → score pending); reviews motion (G2/Capterra); frozen public CSV/Parquet; OG covers rendered (6 delivered, 1200×630).
## 12. Files changed (exact, wave-3 additions + wave-2 mods):
- `index.html` (homepage H1 rewrite + OG cover)
- `src/main.jsx` (landing H1 "IP intelligence, from creation to enforcement" + full-IP copy + trust row)
- `public/llms.txt` (scope matrix + capability labels + capability-scope note)
- `public/og/*.png` (6 premium covers: home, patents, trademarks, benchmarks, research, glossary)
- `public/benchmarks/latest.json` (pipeline-owned, 34 metrics; wave 3 drift-check only)
- `public/benchmarks/headline-metrics.csv` (new, 14 aggregates)
- `public/benchmarks/practitioner-review.json` (new, placeholder PENDING)
- `public/{prior-art-search,freedom-to-operate,office-action-response,legal-ai-verification,legal-ai-hallucinations,benchmarks/{hallucination,patent-retrieval,external-validation,methodology},research/{ablation-study,citation-integrity}}/*` (11 new pages)
- `scripts/{seo-data,seo-layout,seo-pages-core,seo-pages-wave3,generate-public-pages,generate-benchmark-csv,generate-og-covers,verify-benchmark-data,seo-validate-public-pages,backfill-jsonld}.mjs` (10 modules)
- `seo/{WAVE3_REPORT,PRODUCTION_CRAWL_REPORT,INDEXATION_LEDGER.json,AI_VISIBILITY_LEDGER.json,ENTITY_GRAPH.md,AUTHORITY_OPPORTUNITIES.md} + wave-2 report updates`
## 13. Build/test: `npm run build` PASS (6.21s); `test:verification` 28/28 PASS; `seo:validate` EXIT 0; drift-check 4/4 headline figures match.
## 14. Git status: wave-1 files committed in a4258c1; wave-2/3 files are new/untracked plus hand-edits (index.html, main.jsx, llms.txt, harvey compare, package.json, seo-data.mjs). Pre-existing unrelated worktree mods (src/lib/*, 055_tenant_isolation.sql, etc.) untouched.

## Strategic shift confirmed
- WAVE 1: Technical SEO foundation (meta, schema, robots, 404, alts).
- WAVE 2: Crawlable authority surface (33 static 0-JS pages, validator CI gate, single-sourced benchmarks).
- WAVE 3: Earned authority assets (benchmark research architecture, public CSV/JSON, practitioner placeholder, premium OG, authority map, AI observation ledger, entity graph) — ready to deploy and earn.