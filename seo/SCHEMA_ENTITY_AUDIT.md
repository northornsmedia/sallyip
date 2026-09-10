# Schema + Entity Audit — SallyIP (2026-09-10)

## Entity identity (stable, applied to `index.html`)
- name: SallyIP · url: https://sallyip.com/ · logo: https://sallyip.com/sallyip-logo.png (real file) + brand mark `/sallyip-brand-mark.png`
- `@graph`: Organization `#org` → WebSite `#website` → WebPage `#webpage` → SoftwareApplication `#app` (with `@id` links, no dangling refs)
- SoftwareApplication: `applicationCategory: BusinessApplication`, `operatingSystem: Web`, `offers price 0 USD` (freemium is stated in DIRECTORIES/llms.txt — accurate), `featureList` restricted to IMPLEMENTED workspaces only: prior-art search, novelty, FTO, US drafting with 101/112 screens, OA response, claim QA, patent family, prosecution history, trademark clearance, litigation chronologies, contract review.
- Deliberately OMITTED: `Person` (no public author), `Dataset` (no public downloadable bench dataset file yet), `AggregateRating`/`Review` (no real reviews — fabricating is banned), `sameAs` (no verified social/GitHub URLs in repo — add only when legitimate).

## Compare page (`public/compare/harvey-cocounsel-genie-alternatives/index.html`)
- Kept `Article` (visible long-form content backs it). Added `datePublished 2026-09-01` / `dateModified 2026-09-10` (matches visible "Last updated September 2026") + `BreadcrumbList` Home → Comparisons.
- No rating markup (no scored review content). No author (no byline).

## Validation performed
- JSON parsed via node; required fields present (`@context`, `@type`, name/url for Org; headline+publisher for Article).
- Visibility check: every marked string is either in head meta (standard for SoftwareApplication) or visible body copy (compare page). No hidden-content markup.

## Backlog (do only with visible content)
- Add `Dataset` schema when a frozen benchmark CSV/JSONL is published under `public/benchmarks/` with title/license/distribution.
- Add `Person` only with a real named author bio page.
- Add `FAQPage` only if an on-page visible FAQ section ships (do not mark hidden chat answers).
- Add per-hub `WebPage + BreadcrumbList` as `/patents` etc. go live as static HTML.
