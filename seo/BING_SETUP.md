# Bing Webmaster Tools Setup — SallyIP (Wave 4)

## Prerequisites
- Production deployed, canonical domain confirmed
- Microsoft account with access to Bing Webmaster Tools

## Setup Steps

### 1. Site Addition
- Add site: `https://sallyip.com`
- Verify ownership (XML file, meta tag, CNAME, or Domain Connect)

### 2. Sitemap Submission
- Sitemaps → Submit: `https://sallyip.com/sitemap.xml`
- Enable IndexNow integration (uses same key)

### 3. Configuration
| Setting | Value |
|---------|-------|
| Preferred domain | Canonical hostname |
| Crawl control | Default (let Bing decide) |
| Geo-targeting | Not applicable |
| Ignore URL parameters | None |

### 4. IndexNow Integration
- Configure IndexNow key in Bing Webmaster Tools
- Verify automatic submissions work
- Cross-check with manual `npm run seo:indexnow` submissions

### 5. Monitoring (Weekly)
| Metric | Target |
|---------|--------|
| Indexed pages | → 72 |
| Crawl errors | 0 |
| Sitemap status | Success |
| SEO reports | No critical issues |
| IndexNow status | Active |

### 5. Search Performance (Once Data Exists)
- Impressions
- Clicks
- CTR
- Average position
- Keywords
- Pages

### 6. If No Access
Document: "Bing Webmaster Tools access not available"
Proceed with GSC and manual checks.

---

## Operator Instructions
```
1. Go to https://www.bing.com/webmasters
2. Add site: https://sallyip.com
3. Verify ownership
4. Submit sitemap: https://sallyip.com/sitemap.xml
5. Configure IndexNow key
6. Record verification date in INDEXATION_LEDGER.json
```