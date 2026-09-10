# Google Search Console Setup — SallyIP (Wave 4)

## Prerequisites
- Production deployed, crawl-verified, canonical domain confirmed
- Access to Google account with ownership permissions for sallyip.com

## Setup Steps

### 1. Property Creation
- Add property: `https://sallyip.com` (URL-prefix) OR domain property `sallyip.com`
- If domain property: verify via DNS TXT record
- If URL-prefix: verify via HTML file / meta tag / GA / GTM

### 2. Sitemap Submission
- Sitemaps → Add new sitemap: `https://sallyip.com/sitemap.xml`
- Monitor: Submitted URLs vs Indexed URLs
- Target: 72 submitted, 0 errors

### 3. Critical Configurations
| Setting | Value |
|---------|-------|
| Preferred domain | Canonical hostname (www or apex) |
| Crawl rate | Let Google decide (default) |
| International targeting | Not applicable (English only) |
| URL parameters | None (no faceted nav) |

### 4. Monitoring Checklist (Weekly)
| Metric | Target | Alert if |
|--------|--------|----------|
| Indexed pages | → 72 | < 70 after 2 weeks |
| Crawl errors | 0 | > 5 |
| Sitemap errors | 0 | any |
| Mobile usability | 0 errors | any |
| Core Web Vitals | Good/Needs improvement | Poor on >3 pages |
| Manual actions | None | any |
| Security issues | None | any |

### 5. URL Inspection Priority Pages
Check indexing status for:
- `https://sallyip.com/`
- `https://sallyip.com/patents/`
- `https://sallyip.com/trademarks/`
- `https://sallyip.com/ip-ai/`
- `https://sallyip.com/benchmarks/`
- `https://sallyip.com/benchmarks/hallucination/`
- `https://sallyip.com/benchmarks/external-validation/`
- `https://sallyip.com/research/ablation-study/`
- `https://sallyip.com/research/citation-integrity/`
- `https://sallyip.com/prior-art-search/`
- `https://sallyip.com/freedom-to-operate/`
- `https://sallyip.com/office-action-response/`
- `https://sallyip.com/legal-ai-verification/`
- `https://sallyip.com/legal-ai-hallucinations/`

### 6. Search Analytics (Once Data Exists)
Track weekly:
- Branded impressions (query contains "sallyip")
- Non-branded impressions
- Clicks
- CTR
- Average position
- Top 20 queries
- Top 20 landing pages
- **Milestone**: FIRST_NON_BRANDED_IMPRESSION (record date, query, page)

### 7. If No GSC Access
Document: "GSC access not available — manual verification only"
Proceed with Bing Webmaster Tools and manual `site:` checks.

---

## Operator Instructions (If Manual Setup Required)
```
1. Go to https://search.google.com/search-console
2. Add property: https://sallyip.com
3. Verify ownership (DNS TXT preferred for domain property)
4. Submit sitemap: https://sallyip.com/sitemap.xml
5. Set preferred domain to canonical hostname
6. Share access with team (Owner/Full)
7. Record verification date in INDEXATION_LEDGER.json
```