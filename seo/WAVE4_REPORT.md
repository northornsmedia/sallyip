# WAVE 4 REPORT — Production Indexation + Earned Authority (2026-09-10)

## Baseline (Frozen from Wave 3)
- SEO readiness: 82/100
- GEO readiness: 84/100
- Observed AI citations: 0
- Crawlable URLs: 72
- Main JS: 348 kB
- Validator: EXIT 0
- Verification: 28/28 PASS
- Practitioner grading: 25/25 frozen (pipeline-owned, not yet displayed)

**Wave 3 rubric NOT redefined.** Four scores kept separate:
1. SEO READINESS (implementation)
2. GEO READINESS (implementation)
3. SEARCH PERFORMANCE (observed)
4. AI CITATION VISIBILITY (observed)

---

## 1. Production Deployment
**Status: NOT DEPLOYED** — requires Vercel deployment of current HEAD.
- Repo HEAD: 808fdf8 (practitioner grading complete, 25/25 frozen)
- Dist: 72 public URLs, 6 OG covers, all Wave 1-3 assets
- **Blocker**: No deployment credentials available in this session.

---

## 2. Production Crawl
**Framework ready:** `seo/PRODUCTION_CRAWL_FRAMEWORK.md`
- 72 URL checklist + infrastructure URLs + canonicalisation + 404 behavior
- Output template: `seo/production-crawl.json`
- **Cannot execute** until deployment.

---

## 3. Canonical Domain
**Framework ready:** `seo/PRODUCTION_CRAWL_FRAMEWORK.md` §3
- Target: single canonical hostname (www ↔ apex)
- All canonical tags, sitemap, OG, JSON-LD must resolve to canonical
- **Cannot verify** until deployment.

---

## 4. Google Search Console
**Setup guide:** `seo/GSC_SETUP.md`
- Property creation, sitemap submission, priority page inspection list (14 URLs)
- Milestone tracking: M1-M5 (first non-branded impression)
- **Cannot execute** without GSC access.

---

## 5. Bing Webmaster Tools
**Setup guide:** `seo/BING_SETUP.md`
- Equivalent Bing setup with IndexNow integration
- Separate observation recording
- **Cannot execute** without Bing access.

---

## 6. IndexNow Activation
**Procedure:** `seo/INDEXNOW_ACTIVATION.md`
- Key generation, hosting, verification
- First submission: all 72 sitemap URLs
- Ongoing: only new/changed/deleted URLs
- Ledger: `seo/INDEXATION_LEDGER.json` (initialized with 72 CREATED URLs)
- **Cannot execute** without key + deployment.

---

## 7. Public Research Assets
**Status: READY, NOT DEPLOYED**

| Asset | URL | Format |
|-------|-----|--------|
| Ablation study | `/research/ablation-study/` | HTML + `latest.json` metrics |
| Citation integrity note | `/research/citation-integrity/` | HTML |
| Patent retrieval benchmark | `/benchmarks/patent-retrieval/` | HTML + `latest.json` |
| External validation | `/benchmarks/external-validation/` | HTML + `latest.json` |
| Verification methodology | `/benchmarks/verification-methodology/` | HTML |
| Hallucination benchmark | `/benchmarks/hallucination/` | HTML |
| Machine-readable aggregates | `/benchmarks/latest.json` | JSON (34 metrics) |
| Headline CSV | `/benchmarks/headline-metrics.csv` | CSV (14 rows) |
| Practitioner placeholder | `/benchmarks/practitioner-review.json` | JSON (PENDING 0/25) |

**Distribution plan:** `seo/outreach/` (4 packs created)
- ablation-study.md
- citation-integrity.md
- patent-benchmark.md
- legal-ai-verification.md

Each: subject lines, 110-word note, research summary, links, "why you may care" — no superlatives.

---

## 8. Outreach / Distribution
**Created:** `seo/outreach/*.md` (4 packs)
- Target audiences: legal AI researchers, IP professionals, patent attorneys, legal-tech publications, universities, benchmark maintainers
- No mass spam; research itself is the reason for contact
- Tier A opportunities identified in `seo/AUTHORITY_OPPORTUNITIES.md`

---

## 9. External Backlinks
**Tracking:** `seo/EARNED_AUTHORITY_SCORECARD.md`
- Current: 0 referring domains, 0 research backlinks
- Milestones M6, M7
- Weekly Ahrefs/SimilarWeb/GSC check once deployed

---

## 10. Search Console Observations
**Framework:** `seo/INDEXATION_OBSERVATION_FRAMEWORK.md`
- 14 priority pages, 7-state observation model
- Evidence hierarchy (GSC indexed > Bing indexed > discovered > site:)
- Milestones M1-M10 tracked
- Weekly `seo/INDEXATION_OBSERVATION_REPORT.md` template

**Current: 0/10 milestones achieved**

---

## 11. AI Visibility Observations
**Ledger:** `seo/AI_VISIBILITY_LEDGER.json` (initialized)
- 25 frozen prompts across 4 engines
- States: NOT_TESTED → NOT_MENTIONED → MENTIONED → CITED → DIRECTLY_LINKED
- Competitor citation tracking (DeepIP, Solve, Harvey, CoCounsel, Patsnap, Questel)
- **Current: 0 observations run, 0 citations**

---

## 12. Competitor Citation Observations
**Integrated in AI_VISIBILITY_LEDGER.json**
- Record when engines cite: DeepIP, Solve Intelligence, Patlytics, Patsnap, Questel, Clarivate, Harvey, CoCounsel
- Use to understand which SOURCE TYPES engines trust
- Do NOT invent "visibility score" from competitor mentions

---

## 13. Earned Authority Scorecard
**`seo/EARNED_AUTHORITY_SCORECARD.md`**
- 10 metrics, 0/100 current
- Separate from SEO/GEO readiness
- Milestone-based: first non-branded impression = +15, first research backlink = +15, first AI citation = +15
- Max 100 = real adoption, not readiness

---

## 14. Practitioner Review Status
- Pipeline-owned: 25/25 frozen (commit 808fdf8)
- Public placeholder: `/benchmarks/practitioner-review.json` (PENDING 0/25)
- **No score displayed** until human grading consumed by pipeline
- Will auto-update when grading pipeline writes results

---

## 15. Milestones Achieved
| Milestone | Target | Status |
|-----------|--------|--------|
| M1: Production crawl clean | Week 1 | NOT DEPLOYED |
| M2: Sitemap accepted | Week 1 | NOT DEPLOYED |
| M3: First pages indexed | Week 2-3 | NOT DEPLOYED |
| M4: First branded impression | Week 2-4 | NOT DEPLOYED |
| M5: First non-branded impression | Week 3-6 | NOT DEPLOYED |
| M6: First external referring domain | Month 2-3 | NOT DEPLOYED |
| M7: First research backlink | Month 2-4 | NOT DEPLOYED |
| M8: First independent mention | Month 2-4 | NOT DEPLOYED |
| M9: First AI mention | Month 2-6 | NOT DEPLOYED |
| M10: First AI citation/link | Month 3-6 | NOT DEPLOYED |

---

## 16. Remaining Blockers
1. **Production deployment** (Vercel credentials required)
2. **Post-deploy crawl verification** (Phase 1)
3. **IndexNow key generation + hosting**
4. **GSC + Bing Webmaster Tools access**
5. **Practitioner grading pipeline → public display**
6. **Research outreach execution** (manual, not automatable)
7. **Review collection** (G2/Capterra, needs design partners)

---

## 17. Exact Files Changed (Wave 4 — Frameworks Only)
```
seo/
  PRODUCTION_CRAWL_FRAMEWORK.md
  INDEXNOW_ACTIVATION.md
  GSC_SETUP.md
  BING_SETUP.md
  INDEXATION_OBSERVATION_FRAMEWORK.md
  AI_VISIBILITY_LEDGER.json
  EARNED_AUTHORITY_SCORECARD.md
  INDEXATION_LEDGER.json (initialized)
  INDEXATION_OBSERVATION_REPORT.md (template)
  outreach/
    ablation-study.md
    citation-integrity.md
    patent-benchmark.md
    legal-ai-verification.md
  WAVE4_REPORT.md (this file)
```
**No production files changed** — all frameworks. Deployment required for live changes.

---

## 18. Build / Tests / Git Status
- `npm run build`: PASS (6.21s, 348 kB main)
- `test:verification`: 28/28 PASS
- `seo:validate`: EXIT 0 (71 pages, 0 failures)
- `git status`: clean (Wave 4 frameworks untracked; Wave 1-3 assets committed in prior commits)

---

## Four Scores — Separate, Not Merged

| Score | Type | Current | Note |
|-------|------|---------|------|
| SEO READINESS | Implementation | 82/100 | Frozen from Wave 3 |
| GEO READINESS | Implementation | 84/100 | Frozen from Wave 3 |
| SEARCH PERFORMANCE | Observed | 0/100 | Earned Authority Scorecard |
| AI CITATION VISIBILITY | Observed | 0/100 | AI_VISIBILITY_LEDGER |

**Wave 4 Principle: DO NOT BUILD VISIBILITY. MEASURE AND EARN IT.**