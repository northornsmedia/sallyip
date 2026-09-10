# GEO / AI Visibility Plan — be citable, not clever (2026-09-10)

No GEO hacks. Answer engines cite: crawlable HTML, stable entities, direct answers, sources, dates, open methods, structured data.

## Status
HAVE: `public/llms.txt` (factual, method-open — keep as optional docs; claim NO ranking benefit), 1 honest compare page, repo benchmarks with run IDs, verification architecture (`src/lib/verification-service.js`, `citation-service.js`, `proposition-verification-service.js`). ADDED today: explicit AI-crawler Allows in robots, entity `@graph`, compare dates + breadcrumbs, 404 with noindex.
MISSING (blocks citations): only 2 crawlable URLs; all definitions/answers live inside JS-gated chat; no glossary; no author/dates on most content; no public dataset files.

## Factual passage kit (ship verbatim on `/ip-ai` + glossary; each self-contained, visible HTML)
- What is SallyIP? "SallyIP is a verification-first AI platform for intellectual property work — patent research, drafting and prosecution, trademark clearance, and IP contract review. Every material conclusion links to retrieved evidence with exact-quote verification; where evidence is insufficient it says so."
- What does it do? List SHIPPED items only (see CONTENT_MAP ledger).
- Who is it for / not for? "Patent attorneys/agents, IP boutiques, in-house IP teams, inventors preparing disclosures. Not filing-ready output without practitioner review; not a Westlaw-scale corpus or SOC 2-covered platform today."
- What IP types? "Deep: patents, trademarks, IP contracts. Research assistance: copyright questions via evidence-grounded chat. Educational guides: designs, trade secrets. Availability labeled per page."
- How verification works? "Hybrid lexical+vector retrieval with thresholds (zero results valid) → exact/fuzzy/missing quote check → [S#] integrity guard strips dangling labels → entailment grades ENTAILS/PARTIAL/CONTEXT/CONTRADICTS/DOES NOT SUPPORT → answer mode VERIFIED / QUALIFIED / RESEARCH REQUIRED, all audit-logged."
- Difference vs general legal AI? "General tools produce fluent answers; SallyIP refuses or qualifies when evidence is missing, and publishes its miss rates (e.g. exact-quote 72.5% 87/120, grounding-100, 2026-09-09; P0 missing-quote 4.2% FAIL disclosed)."
- Definitions: verification-first legal AI, AI-assisted patent drafting (§111a/b + §101/§112 screens + practitioner review), AI trademark clearance (candidate screen + confusion-factor evidence, not a clearance opinion), hallucination verification (mechanical quote/entailment checks + practitioner grading for legal correctness).

## Crawler access
`robots.txt` allows GPTBot/ChatGPT-User/CCBot/anthropic-ai/ClaudeBot + all. No AI-crawler blocks. llms.txt kept current; sitemap has lastmod. No cloaking: agent-visible text == user-visible HTML.

## 30-day GEO backlog
1. Prerender hubs as static HTML (else passages stay invisible). 2. Glossary `/glossary/*` with 10 definitions + Dataset/DefinedTerm markup. 3. Dates+changelog on every research page. 4. Publish one frozen eval CSV under `public/benchmarks/` + Dataset schema. 5. Keep one-line description byte-identical across llms.txt, head meta, compare intro, hubs.
