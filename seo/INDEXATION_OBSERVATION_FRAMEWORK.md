# Indexation Observation Framework — SallyIP (Wave 4)

## Priority Pages (14)
Track these weekly once GSC/Bing data exists:

| Priority | URL | Category |
|----------|-----|----------|
| 1 | `https://sallyip.com/` | Home |
| 2 | `https://sallyip.com/patents/` | Hub |
| 3 | `https://sallyip.com/trademarks/` | Hub |
| 4 | `https://sallyip.com/ip-ai/` | Hub |
| 5 | `https://sallyip.com/benchmarks/` | Research |
| 6 | `https://sallyip.com/benchmarks/hallucination/` | Research |
| 6 | `https://sallyip.com/benchmarks/external-validation/` | Research |
| 6 | `https://sallyip.com/research/ablation-study/` | Research |
| 6 | `https://sallyip.com/research/citation-integrity/` | Research |
| 7 | `https://sallyip.com/prior-art-search/` | Cluster |
| 7 | `https://sallyip.com/freedom-to-operate/` | Cluster |
| 7 | `https://sallyip.com/office-action-response/` | Cluster |
| 7 | `https://sallyip.com/legal-ai-verification/` | Cluster |
| 7 | `https://sallyip.com/legal-ai-hallucinations/` | Cluster |

## Observation States
| State | Definition |
|-------|------------|
| CREATED | URL exists in sitemap, not yet submitted |
| SUBMITTED | Submitted via IndexNow/GSC/Bing |
| DISCOVERED | Seen in search index (site: or GSC "discovered") |
| INDEXED | Confirmed indexed (GSC "indexed" or Bing equivalent) |
| NOT_INDEXED | Crawled but not indexed (GSC "crawled - currently not indexed") |
| EXCLUDED | Excluded by Google (duplicate, noindex, etc.) |
| ERROR | Crawl error (5xx, redirect loop, etc.) |

## Evidence Hierarchy (Strongest → Weakest)
1. GSC "Indexed" status + impressions > 0
2. Bing "Indexed" + impressions > 0
3. GSC "Discovered" (crawled, not yet indexed)
4. `site:sallyip.com/page` returns result
5. `site:sallyip.com` shows page in results
6. Manual curl shows 200 + canonical (not indexed evidence)

## Recording Template
```json
{
  "url": "https://sallyip.com/benchmarks/hallucination/",
  "observations": [
    {"date": "2026-09-15", "state": "SUBMITTED", "source": "INDEXNOW", "evidence": "submission response 200"},
    {"date": "2026-09-18", "state": "DISCOVERED", "source": "GSC", "evidence": "GSC URL Inspection: discovered"},
    {"date": "2026-09-22", "state": "INDEXED", "source": "GSC", "evidence": "GSC URL Inspection: indexed, impressions: 3"}
  ],
  "first_indexed": "2026-09-22",
  "first_impression": "2026-09-25",
  "first_click": "2026-09-28"
}
```

## Milestone Tracking
| Milestone | Target | Observed |
|-----------|--------|----------|
| M1: Production crawl clean | Week 1 | |
| M2: Sitemap accepted (GSC/Bing) | Week 1 | |
| M3: First pages indexed | Week 2-3 | |
| M4: First branded impression | Week 2-4 | |
| M5: **First non-branded impression** | Week 3-6 | |
| M6: First external referring domain | Month 2-3 | |
| M7: First research backlink | Month 2-4 | |
| M8: First independent SallyIP mention | Month 2-4 | |
| M9: First AI answer-engine mention | Month 2-6 | |
| M10: First AI citation/direct link | Month 3-6 | |

## Reporting
- Weekly: `seo/INDEXATION_OBSERVATION_REPORT.md`
- Update `seo/INDEXATION_LEDGER.json` after each check
- Flag any page stuck in DISCOVERED > 14 days