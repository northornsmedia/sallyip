# SallyIP Entity Graph (2026-09-10)

Canonical entity: **SallyIP** — "a verification-first AI workspace for intellectual property work."
- Domain: https://sallyip.com/ (apex canonical; www behavior unverified — see PRODUCTION_CRAWL_REPORT).
- Logos: `/sallyip-logo.png`, `/sallyip-brand-mark.png`. OG covers: `/og/*.png`.
- "SallyIP Labs" = the product surface name (training + chat app), not a separate company. No separate Labs entity markup.
- Company/operator, founder, social identities: NOT published in repo — no `sameAs`, no founder claims, no social profiles created (creating them is a business action, not an SEO edit).
- Patent AI / trademark AI / verification are CATEGORIES beneath SallyIP, never its definition. Fixed wave-1 head + wave-3 landing H1 ("IP intelligence, from creation to enforcement.").

## Consistency audit
| Surface | Status |
|---|---|
| Homepage title/H1/meta/OG | Full-IP, consistent (wave 2–3) |
| Organization + SoftwareApplication schema | Consistent description, linked @ids |
| Static hubs/guides footer | Identical entity sentence |
| llms.txt agent blurb | Matches (scope matrix added wave 3) |
| Compare pages publisher | Organization SallyIP |
| Benchmark pages publisher | Organization SallyIP; Dataset creator SallyIP |
| About page (concurrent track) | Publisher pattern consistent; no author invented |
| Social metadata | OG/Twitter present; no fake profiles |
| External profiles/directories | Per DIRECTORIES.md — G2/Capterra need real reviews; nothing fabricated |

## Authorship architecture (Phase 10)
- Original research (`/research/*`, `/benchmarks/*`) carries Organization attribution + visible methodology + dates. No `Person` markup: no public named author with bio/expertise exists in repo, and credentials will not be invented.
- Upgrade path: when a genuine author page ships (name, role, bio, expertise), link Person→Article→Dataset→Organization. Until then the chain is Article→Dataset→SallyIP→Organization — complete and honest.
