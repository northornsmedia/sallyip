# SEO Content Map — full-IP authority, comprehensive pages only (2026-09-10)

Positioning: "IP intelligence, from creation to enforcement." Homepage head already updated; body + hubs must follow.

## Capability honesty ledger (from `src/lib/`, `database/`, planner)
SHIPPED (can be product-claimed): prior-art search + limitation mapping, novelty, inventive-step/obviousness, FTO matrices, US drafting (§111a/b) with §101 screening + §112 checks, OA response (§101/102/103/112) + amendment + claim-QA audit, claim charts, patent family graphs, prosecution-history timelines, trademark clearance + trademark intelligence + similarity, litigation evidence chronologies, jurisdiction packs (US/IN/UK), playbooks, contracts (NDA/MSA/SaaS/employment/assignment/licence) with risk flags, citation ledger + answer guard, vault reviews, eval harness.
PARTIAL (router/planner keyword only — educational angle, label "research assistance", not a workspace): `copyright_analysis` in `legal-task-planner.js`/`specialist-router.js`; trade-secret language only inside contract templates.
NOT SHIPPED: dedicated copyright research workspace, design-rights workspace, trademark monitoring/opposition automation, portfolio intelligence dashboard. Content for these = practitioner guides + methodology + "what good looks like" + honest availability notes. NEVER present as product features.

## Hub architecture (10 authoritative pages first — one per hub, no thin splinters)
| Hub | Primary keyword | Intent | Title (≤60ch) | H1 | CTA |
|---|---|---|---|---|---|
| `/patents` | patent AI | commercial | Patent AI for Research, Drafting & Prosecution — SallyIP | Patent AI, verified end to end | Run a prior-art check |
| `/trademarks` | trademark AI | commercial | Trademark Clearance & Search AI — SallyIP | Trademark clearance with receipts | Screen a mark |
| `/copyright` | copyright AI | informational | Copyright Research & Risk Guide for AI Teams — SallyIP | Copyright research, honestly scoped | Ask Sally a question |
| `/design-rights` | design rights protection | informational | Design Rights: Protection & Enforcement Guide — SallyIP | Design rights, plainly explained | Get notified at launch |
| `/trade-secrets` | trade secret protection | informational | Trade Secret Protection & Misappropriation Guide — SallyIP | Protecting confidential information | Review an NDA |
| `/ip-litigation` | IP litigation support | commercial | IP Litigation Evidence & Chronologies — SallyIP | Litigation evidence you can cite | Build a chronology |
| `/ip-enforcement` | IP enforcement | informational | IP Enforcement: Detection to Action — SallyIP | From detection to action | Assess a matter |
| `/ip-research` | IP legal research AI | commercial | Verified IP Legal Research — SallyIP | Research that shows its work | Try a verified answer |
| `/ip-ai` | AI for IP lawyers | commercial | AI for IP Lawyers: Verification-First — SallyIP | Built for IP practice | Open SallyIP |
| `/benchmarks` | legal AI hallucination benchmark | informational | SallyIP Benchmarks & Verification Methodology | Measured, with failures shown | Read the methodology |

Each hub: 1,500–3,000 words, comparison table where honest, methodology box, benchmark callouts with n/date (see BENCHMARK_CONTENT_STRATEGY), internal links to the 2–4 related workspaces + glossary definitions, single conversion CTA. Meta descriptions 150–160ch, no stuffing.

## Cluster schedule (phase 2 — only after hubs index)
Patents: drafting → prior-art/novelty → FTO → OA response → claim charts (5 pages). Trademarks: clearance → confusion factors → monitoring/brand protection → opposition/prosecution (4). Copyright/licensing, trade-secret/NDA, portfolio-intelligence/monitoring (3). Verification/hallucination explainer series (3). Total ≤15 in 90 days. Each needs a unique outline + original artifact (worked example, checklist, annotated output); otherwise do not ship.

## Internal linking
Hubs ↔ workspaces ↔ compare ↔ benchmarks form a closed triangle; every cluster links up to its hub + sideways once. Breadcrumbs on all static pages.

## Cannibalisation guard
One primary keyword per URL (table above). `llms.txt` + compare page must reuse identical one-line description ("verification-first IP legal AI…") so agents quote consistently.

## WAVE 2 STATUS (2026-09-10)
- SHIPPED as static HTML: `/ip-ai`, `/patents`, `/trademarks` (authority hubs, ≥500 words, FAQ + benchmark evidence), `/copyright`, `/design-rights`, `/trade-secrets` (guidance-labeled, no product claims), `/benchmarks` + `/benchmarks/verification-methodology`, `/resources`, 20-term `/glossary/*`, 2 new compare pages. Generator: `scripts/generate-public-pages.mjs`.
- Phase-2 clusters (15 pages) NOT started — hubs must index first. No thin pages created; validator enforces word floors.
