# Production Crawl Framework — SallyIP (Wave 4)

Prerequisite: Vercel deployment of repo HEAD (current commit includes practitioner grading 25/25, all 72 public URLs).

## Post-Deploy Verification Checklist

Run after deployment completes. Record results in `seo/production-crawl.json`.

### 1. All 72 Sitemap URLs
For each URL in `public/sitemap.xml`:

| Field | Check |
|-------|-------|
| HTTP status | 200 (or 301→canonical) |
| Final URL | matches canonical hostname |
| Redirect chain | max 1 hop, to canonical |
| Canonical tag | present, matches canonical hostname |
| robots | not blocked, no noindex |
| Indexability | no noindex, no crawl-blocking JS |
| Title | unique, ≤60 chars |
| Description | unique, 120-160 chars |
| H1 | present, matches page intent |
| Initial HTML word count | hubs ≥500, clusters ≥400, research ≥300, glossary ≥120 |
| Schema types | WebPage+Breadcrumb minimum; FAQ/DefinedTerm/Dataset/Article where appropriate |
| Internal links | ≥3 distinct internal links |
| OG image | 1200×630, correct for section |
| Sitemap presence | URL listed in live sitemap.xml |

### 2. Critical Infrastructure URLs
| URL | Expected |
|-----|----------|
| `https://sallyip.com/sitemap.xml` | 200, application/xml |
| `https://sallyip.com/robots.txt` | 200, text/plain, AI allows present |
| `https://sallyip.com/llms.txt` | 200, scope matrix present |
| `https://sallyip.com/benchmarks/latest.json` | 200, application/json, 34 metrics |
| `https://sallyip.com/benchmarks/headline-metrics.csv` | 200, text/csv, 14 rows |
| `https://sallyip.com/benchmarks/practitioner-review.json` | 200, application/json, PENDING |
| `https://sallyip.com/og/home.png` | 200, image/png, 1200×630 |

### 3. Domain Canonicalisation
| Check | Expected |
|-------|----------|
| www → apex OR apex → www | exactly one canonical hostname |
| HTTP → HTTPS | 301 redirect |
| All canonical tags | canonical hostname |
| Sitemap loc | canonical hostname |
| OG URLs | canonical hostname |
| JSON-LD URLs | canonical hostname |

### 4. 404 Behavior
| Check | Expected |
|-------|----------|
| Unknown path | 404, serves `/404.html` |
| 404 page | noindex, follow, CTA to home |

### 5. Edge Cases
- Trailing slash consistency (one canonical form)
- Query parameter handling (no infinite URL space)
- Hash fragments not indexed

---

## Recording Template

```json
{
  "crawl_date": "YYYY-MM-DD",
  "commit": "git rev-parse --short HEAD",
  "canonical_hostname": "sallyip.com",
  "urls_checked": 72,
  "results": [
    {"url": "https://sallyip.com/", "status": 200, "final_url": "...", "canonical": "...", "h1": "...", "word_count": 847, "schema": ["WebPage","BreadcrumbList"], "og_image": "https://sallyip.com/og/home.png", "pass": true}
  ],
  "infrastructure": {...},
  "canonicalisation": {...},
  "issues": []
}
```