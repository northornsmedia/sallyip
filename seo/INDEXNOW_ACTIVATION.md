# IndexNow Activation — SallyIP (Wave 4)

## Prerequisites
- Production deployed and crawl-verified (Phase 1 complete)
- `INDEXNOW_KEY` generated and hosted at `https://sallyip.com/<KEY>.txt`
- Key file served with `text/plain` and proper CORS if needed

## Key Generation
```
# Generate a 128-256 char hex key
openssl rand -hex 128 > indexnow-key.txt
# Host at https://sallyip.com/<KEY>.txt
# Verify: curl https://sallyip.com/<KEY>.txt returns the key exactly
```

## Submission Policy
- Submit ONLY: newly created URLs, materially changed URLs, deleted URLs
- Do NOT repeatedly ping unchanged URLs
- Batch ≤50 URLs per submission
- Record every submission in `seo/INDEXATION_LEDGER.json`

## First Submission (Post-Deploy)
All 72 sitemap URLs are "new" for IndexNow purposes:
```bash
INDEXNOW_KEY=<key> npm run seo:indexnow -- $(cat public/sitemap.xml | grep -oP '(?<=<loc>)[^<]+' | tr '\n' ' ')
```

## Ongoing Submissions
Triggered by:
- New page publication (add to sitemap → submit new URL)
- Material content change (submit changed URL)
- Page removal (submit with `type: "delete"` if supported)

## Ledger Fields
```json
{
  "url": "https://sallyip.com/benchmarks/hallucination/",
  "event": "CREATED|CHANGED|DELETED",
  "submitted": "2026-09-10T14:30:00Z",
  "response": {"status": 200, "body": "..."},
  "discovered": "2026-09-11T02:15:00Z",
  "indexed": "2026-09-12T08:45:00Z",
  "last_checked": "2026-09-15T00:00:00Z",
  "source": "INDEXNOW|SITEMAP|GSC|BING"
}
```

## Rate Limits & Guards
- Max 50 URLs per batch
- Min 1 hour between submissions for same URL
- No submissions for URLs with no content change
- Log every attempt (success/failure)

## Verification
- Check Bing Webmaster Tools IndexNow report
- Cross-reference with GSC URL Inspection
- Record "discovered" when first seen in search index
- Record "indexed" when confirmed in Search Console