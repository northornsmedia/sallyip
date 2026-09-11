# SALLYIP DOCUMENT TRAINING REPORT #018
## PATENT LANDSCAPE REPORT (Corpus-Evidence Intelligence — No Model-Memory Metrics)

**Document Identifier:** `patent-landscape-report`
**Document Number:** `018`
**Baseline SHA (working tree, SHA256 — post-#017 state, before #018 edits):**
- `src/lib/document-engine.js`: `C7815E392427C1A30AEBFF4FB020553916AD6324A5DF14F0EF1BB15E1843EF09`
- `src/lib/document-engine-router.js`: `6B6F228B9D62C05EA2BF07D168888F51F97510E1BC4043FBF1485C44106265E5`
- `data/documents/capability-matrix.json`: `D66AB697BE91CC2B0B803BD8058118792E437DB58BDBC4B7D4B4E5026DD0C1B4`
- No git repository is present in the workspace, so there is no commit SHA; file hashes are the baseline evidence. Parallel agents were concurrently editing shared files; all #018 edits below are additive and regression-verified.
**Final SHA (working tree, SHA256):**
- `src/lib/document-engine.js`: `9A93F54CE5D9D792FE3F9CC659FA83A831FDE2D6836206E4A01B89B84AE7EB99`
- `src/lib/document-engine-router.js`: `D6C7739807870F55698D9EAF87B545CBF517F6EB65D9D3FE461D4B7F77EDB5DE`
- `src/lib/patent-landscape-service.js` (new): `FC835AFFC83F1476E689BE2901C28BF56409CD24BE775AB22DF87306C8B7F708`
- `src/lib/patent-landscape-interview-graph.js` (new): `63B448CB3B1CCFEDF3E90DB1EEFC35A506738AA42252B8EC69681024E048C41C`
- `data/documents/profiles/patent-landscape-report.json` (new): `F639F53011E13EEBB2B8B65698A879662F7D6D8C27471B337245B16A08ED8878`
- `data/documents/capability-matrix.json`: `0E35E2E4BA5146A7C23EBE4D0949AE66E11C0944753944B1D8A7D8B7AD3355A0`
- `benchmarks/document-intelligence-v1/patent-landscape-report/cases.json` (new): `4D42503C34A82604FE85F18FDE8EB9FD7F67071B7B232B4EC43ABDF0B483DC13`
**Timestamp:** `2026-09-11`
**Role:** SallyIP Patent Document Intelligence and Verification Engineer

---

### Executive Summary

Document #018 (Patent Landscape Report) is implemented as a canonical evidence-driven patent-intelligence workflow. It defines technology scope before analysis, records every search iteration with provenance, verifies document identity, applies explicit inclusion/exclusion rules, builds versioned corpora, normalises families (document count vs family count always distinct), resolves assignees cautiously (never on string similarity alone), preserves date semantics with labelled trend bases, tracks classification provenance, analyses claim themes through the canonical claim model, and derives every chart and metric deterministically from the same stored corpus. No parallel search/family/classification engine was created; no unrelated profiles were modified; verification and security controls were untouched.

### Files Added
1. `data/documents/profiles/patent-landscape-report.json` — canonical profile (`018`, `PATENT_INTELLIGENCE`, `BETA`, `MEDIUM`, `review_required`, `verification_required`, `MULTI_JURISDICTION`/`CORPUS_BASED_INTELLIGENCE`, 25 report sections, 14 workflow modes).
2. `src/lib/patent-landscape-service.js` — scope/search-provenance/corpus layer; family normalisation (representative rules, uncertainty, continuations); jurisdiction/entity/date/classification/claim-theme/taxonomy layers; deterministic calculation engine (shares, growth, dense-rank rankings, concentration); trends with lag guards; white-space signals; portfolio comparison/overlap; citations; legal-status summaries; representative selection with explicit labels; chart data; narrative validation; evidence graph; staleness/delta/versioning; five downstream handoffs; confidentiality assert; 25-section report assembler with boundary guard (throws `LANDSCAPE_BOUNDARY_VIOLATION` on market-share/leadership/value/validity language).
3. `src/lib/patent-landscape-interview-graph.js` — thin orchestration: matter-first intake, one-question flow (scope → geography → period → objective → corpus source → depth), readiness, pre-analysis summary + confirmation, DRAFT assembly, in-landscape FTO/patentability handoffs, session persistence of landscape/scope/corpus/search/analysis IDs.
4. `benchmarks/document-intelligence-v1/patent-landscape-report/cases.json` — 50 synthetic cases covering all §146 categories plus adversarial fail-closed cases (§147).
5. `tests/document-engine/patent-landscape-benchmark.test.mjs` — benchmark runner (50/50 cases).
6. `tests/document-engine/patent-landscape-interview.test.mjs` — 20 focused unit tests.
7. `tests/document-engine/patent-landscape-routing.test.mjs` — 4 router integration tests.

### Files Modified (additive, backward-compatible only)
1. `src/lib/document-engine.js` — added one #018 routing pattern (ordered after invalidity so adjacent intents keep priority).
2. `src/lib/document-engine-router.js` — added imports, an in-landscape session guard (blocking/patentability questions inside an active landscape hand off without verdicts), and the #018 interview branch.
3. `data/documents/capability-matrix.json` — added the `patent-landscape-report` entry, promoted to `L3_DRAFTABLE` after tests passed (entry only; summary rollups untouched).

### Canonical Profile
`id: patent-landscape-report`, `name: Patent Landscape Report`, `category: IP_INNOVATION`, `subcategory: PATENT`, `family: PATENT_INTELLIGENCE`, `document_number: 018`, `status: BETA`, `risk_level: MEDIUM`, `review_required: true`, `verification_required: true`, `jurisdiction: MULTI_JURISDICTION`, `jurisdiction_classification: CORPUS_BASED_INTELLIGENCE`.

### Routing Aliases (all verified; adjacent intents verified un-stolen)
`prepare a patent landscape`, `map patents in this technology`, `show patent trends`, `analyse patent activity`, `who is filing in this space?`, `show key assignees`, `compare patent portfolios`, `identify white space`, `landscape this technology`, `show filing trends by year`, `map patent families`, `analyse competitors' patents`, `show emerging patent themes`, plus `patent landscape report` / `technology landscape`.

### Workflow Modes
All 14 modes are profile inputs; technology/competitor/claim-theme/white-space intents classify from the objective answer; corpus reuse vs seed search is explicit.

### Matter-Context Behaviour
Held technology scope, corpus, jurisdictions, time range, competitors, classifications, modes, and search sources merge as KNOWN and are never re-asked (tested).

### One-Question Behaviour
Vague requests ask exactly one scope question (technology first); every turn returns one question; unknown/skip is recorded without forcing answers.

### Scope / Taxonomy / Search Strategy / Provenance
Versioned `LANDSCAPE_SCOPE` (concepts, exclusions, jurisdictions, period, sources, modes, toggles). Taxonomy nodes carry DOMAIN→FEATURE provenance; AI-clustered themes stay `AI_PROPOSED_THEME` until reviewed. Strategies require keywords, classes, or assignees (never a single phrase); every iteration persists query/source/filters/date/counts/notes.

### Corpus / Inclusion-Exclusion / Versioning / Document Verification
`PATENT_CORPUS` carries version, scope, included/excluded documents with persisted reasons, verified/unverified splits, and exact quality denominators. Updates create `corpus_v(n+1)` preserving history with added/removed deltas. Documents verify `VERIFIED/UNVERIFIED/FAILED/RESEARCH_REQUIRED`; unverified records never enter headline metrics.

### Family Normalisation / Uncertainty / Deduplication / Related Filings
`groupPatentFamilies` reuse plus representative rules (earliest verified publication), `RESOLVED` vs `FAMILY_RELATIONSHIP_UNCERTAIN` relations (never force-merged; uncertain records queue for review), family-definition labelling, continuation/divisional preservation without silent collapsing, duplicate/translation exclusion with reasons. `DOCUMENT_COUNT` vs `FAMILY_COUNT` always distinct (tested: 3 docs → 1 invention).

### Date Model / Trend Basis / Recent-Year Bias
Priority/filing/publication/grant/status-check dates tracked separately; every series labels its basis; recent-year incompleteness flags `RECENT_YEAR_INCOMPLETE` and blocks decline/emergence claims over incomplete windows (tested).

### Jurisdiction / Assignee / Entity / Ownership / Inventors
Jurisdiction codes normalise deterministically (US/USA/United States → one bucket). Entities resolve only on verified mappings (`VERIFIED_MATCH`) else stay separate with `UNKNOWN` status — never merged on similarity; corporate families never auto-aggregated. Applicant/assignee/owner labels stay distinct (`RECORDED_ASSIGNEE_NOT_VERIFIED_AS_OWNER`). Inventor analysis stays affiliation-free.

### Classification / Text Fields / Claim Themes / Clustering
Codes normalise to SECTION→SUBGROUP; source codes verify, model predictions stay `AI_PROPOSED`; classification informs but never proves relevance. Title/abstract/claim fields stay distinct (abstract themes recorded separately from claim themes). Claim themes reuse `parsePatentClaims`/`buildEffectiveClaimLimitations` with versioned limitation IDs. Clusters allow partial coverage and `UNCLASSIFIED`-style review; multi-theme assignment permitted.

### Theme Model / Representative Logic / Key-Patent Terminology
Themes carry definition, counts, trend, assignees, classifications, representative patents, claim evidence. Representatives select on explicit criteria with mandated labels (`HIGHLY_CITED_WITHIN_CORPUS`, `LARGE_FAMILY`, `RELEVANT_CLAIM_THEME`, `REPRESENTATIVE_PATENT`); importance/foundational/blocking/valuable language is rejected at assembly (tested).

### Citations / Legal Status / Freshness / Conflicts / Value Safety
Citation metrics carry non-quality caveats; cross-age comparisons require caveats; graph method persisted. Status summarises pending/granted/expired/lapsed/abandoned/revoked/unknown from verified sources with check date and freshness; conflicts raise `STATUS_CONFLICT_REQUIRES_REVIEW`, never silent choice. Status/grant/family-size/claim-count are never treated as value or quality (tested).

### Trends / Growth / Shares / Portfolios / Competitors / Entrants / Emerging / White Space / Concentration / Overlap
Annual counts, growth (`(to-from)/from` with persisted parts; null on zero baseline), shares (value + numerator + denominator + labelled denominator), dense-rank rankings with tie handling — all deterministic; LLM never generates numbers. Trend prose uses verified-count language only. Portfolios compare counts/breadth/themes/trend/status without leadership inference. Competitors are `USER_DEFINED` or `CORPUS_ASSIGNEE` (never assumed). Entrants defined mathematically (first corpus family after YEAR_X; patent-data only). Emergence requires reproducible evidence plus lag caveats; decline requires complete windows. White space yields `NO_VERIFIED_FAMILY_IN_CORPUS` / `UNDERREPRESENTED_THEME_WITHIN_SEARCH_SCOPE` with explicit non-claims (never patentability/FTO/opportunity). Concentration is descriptive; overlap is never infringement; filing breadth never proves market importance.

### Data Quality / Research Completeness / Corpus Metrics / Exclusion Log / Review Queue
`DATA_QUALITY` (HIGH/MODERATE/LIMITED/UNKNOWN) from seven inputs; `RESEARCH_COMPLETENESS` (LOW/MODERATE/HIGH/UNKNOWN) as coverage only, never exhaustiveness. Exact denominators reported (raw/dedup/verified/unverified/families/unresolved/excluded/status). Exclusion log is auditable (id/reason/rule/reviewer/timestamp). Ambiguous records queue `LANDSCAPE_REVIEW_REQUIRED`.

### Evidence Graph / Calculation Engine / Chart Data / Narrative Validation
Trace `SCOPE→QUERY→RESULT→DOCUMENT→FAMILY→ASSIGNEE→CLASSIFICATION→THEME→METRIC→CONCLUSION`. One metric source feeds charts and prose; headline claims map to metric/version/calculation/records; mismatches raise `ANALYSIS_CONTRADICTION` and block finalisation (tested).

### Versioning / Staleness / Delta / Downstream Handoffs / Inspector / Confidentiality / Voice
Six version dimensions (`landscapeVersion/corpusVersion/taxonomyVersion/entityResolutionVersion/searchVersion/statusVersion/analysisVersion`); staleness from search date/status age/update window/new input; deltas report added/removed/themes/status/metric changes. Handoffs to prior-art/novelty/FTO/invalidity/patentability/monitoring transfer IDs and evidence with `legal_conclusion_transfer: NONE`. Inspector surfaces identity/family/entity/classification/status/theme/metric/calculation/trace objects; no new inspector built. Confidential strategy content fails closed (`CONFIDENTIAL_PILOT_BLOCKED`, tested); uploads untrusted. Voice/text share all ten session IDs (tested); voice stack untouched (30/30 pass).

---

### Verification and Test Evidence (exact denominators)

**#018 interview tests (`tests/document-engine/patent-landscape-interview.test.mjs`): 20/20 pass.**
**#018 benchmark (`tests/document-engine/patent-landscape-benchmark.test.mjs` over 50 cases): 50/50 cases pass (1/1 test).**
**#018 routing tests (`tests/document-engine/patent-landscape-routing.test.mjs`): 4/4 pass.**
**Full document-engine regression (`node --test tests/document-engine/*.test.mjs`): 309/309 pass.**
**Foundation suite (`npm run test:foundation`): 77/77 node + 12/12 Python pass.**
**Verification suite (`npm run test:verification`): 28/28 pass.**
**Voice suite (`node --test tests/voice/*.test.mjs`): 30/30 pass.**
**Security suite (`npm run test:security`): 70/70 pass.**
**Production build (`npm run build`, vite v6.4.3): PASS — 2303 modules transformed, built in 6.38s, 0 errors.**

### Benchmark Dimensions (reported separately, not collapsed)
routing accuracy; one-question behaviour; scope capture; search provenance; document existence verification; corpus inclusion/exclusion accuracy; family resolution; deduplication; entity resolution; classification integrity; claim-version handling; theme assignment; legal-status integrity; status freshness; date-basis correctness; recent-year bias handling; deterministic counts; share calculations; growth calculations; chart/text consistency; white-space safety; market-share safety; downstream routing; staleness; confidential-provider compliance — each covered by ≥1 passing case/test above.

### Known Limitations
1. No live patent-retrieval wiring: corpora are caller-supplied (matter, uploads, prior-art/FTO results); search provenance records the caller's queries honestly but the workflow performs no live database search itself.
2. Family/entity/classification resolution quality depends on supplied metadata and verified mappings; unresolved items queue for review rather than resolving silently.
3. No practitioner review; no market, value, validity, or completeness claims are permitted by the assembler.

### Parallel-Work Conflicts
Shared `document-engine.js` / `document-engine-router.js` show ongoing concurrent-agent activity. All #018 edits were additive (one pattern, two imports, one session guard, one branch, one capability entry) and the full 309-test document-engine suite passes with zero regressions. Nothing unrelated was reverted or overwritten.

---

### Final Statuses (evidence-backed; TRUE / FALSE / PARTIAL / BLOCKED only)

PATENT_LANDSCAPE_PROFILE_COMPLETE = TRUE
PATENT_LANDSCAPE_ROUTING_VERIFIED = TRUE
PATENT_LANDSCAPE_WORKFLOW_MODES_VERIFIED = TRUE
PATENT_LANDSCAPE_MATTER_CONTEXT_VERIFIED = TRUE
PATENT_LANDSCAPE_ONE_QUESTION_MODE_VERIFIED = TRUE
PATENT_LANDSCAPE_SCOPE_MODEL_VERIFIED = TRUE
PATENT_LANDSCAPE_TAXONOMY_VERIFIED = TRUE
PATENT_LANDSCAPE_SEARCH_STRATEGY_VERIFIED = TRUE
PATENT_LANDSCAPE_SEARCH_PROVENANCE_VERIFIED = TRUE
PATENT_LANDSCAPE_CORPUS_MODEL_VERIFIED = TRUE
PATENT_LANDSCAPE_INCLUSION_EXCLUSION_VERIFIED = TRUE
PATENT_LANDSCAPE_CORPUS_VERSIONING_VERIFIED = TRUE
PATENT_LANDSCAPE_DOCUMENT_EXISTENCE_VERIFIED = TRUE
PATENT_LANDSCAPE_FAMILY_NORMALISATION_VERIFIED = TRUE
PATENT_LANDSCAPE_FAMILY_UNCERTAINTY_VERIFIED = TRUE
PATENT_LANDSCAPE_DEDUPLICATION_VERIFIED = TRUE
PATENT_LANDSCAPE_RELATED_FILING_HANDLING_VERIFIED = TRUE
PATENT_LANDSCAPE_DATE_MODEL_VERIFIED = TRUE
PATENT_LANDSCAPE_RECENT_YEAR_BIAS_VERIFIED = TRUE
PATENT_LANDSCAPE_JURISDICTION_ANALYSIS_VERIFIED = TRUE
PATENT_LANDSCAPE_ASSIGNEE_NORMALISATION_VERIFIED = TRUE
PATENT_LANDSCAPE_ENTITY_RESOLUTION_VERIFIED = TRUE
PATENT_LANDSCAPE_OWNERSHIP_DISTINCTION_VERIFIED = TRUE
PATENT_LANDSCAPE_CLASSIFICATION_VERIFIED = TRUE
PATENT_LANDSCAPE_CLAIM_THEME_ANALYSIS_VERIFIED = TRUE
PATENT_LANDSCAPE_CLUSTERING_VERIFIED = TRUE
PATENT_LANDSCAPE_THEME_MODEL_VERIFIED = TRUE
PATENT_LANDSCAPE_REPRESENTATIVE_PATENT_LOGIC_VERIFIED = TRUE
PATENT_LANDSCAPE_CITATION_ANALYSIS_VERIFIED = TRUE
PATENT_LANDSCAPE_LEGAL_STATUS_VERIFIED = TRUE
PATENT_LANDSCAPE_STATUS_FRESHNESS_VERIFIED = TRUE
PATENT_LANDSCAPE_FILING_TRENDS_VERIFIED = TRUE
PATENT_LANDSCAPE_GROWTH_CALCULATION_VERIFIED = TRUE
PATENT_LANDSCAPE_SHARE_CALCULATION_VERIFIED = TRUE
PATENT_LANDSCAPE_MARKET_SHARE_SAFETY_VERIFIED = TRUE
PATENT_LANDSCAPE_PORTFOLIO_COMPARISON_VERIFIED = TRUE
PATENT_LANDSCAPE_COMPETITOR_ANALYSIS_VERIFIED = TRUE
PATENT_LANDSCAPE_EMERGING_THEME_VERIFIED = TRUE
PATENT_LANDSCAPE_WHITE_SPACE_SAFETY_VERIFIED = TRUE
PATENT_LANDSCAPE_CONCENTRATION_VERIFIED = TRUE
PATENT_LANDSCAPE_DATA_QUALITY_VERIFIED = TRUE
PATENT_LANDSCAPE_RESEARCH_COMPLETENESS_VERIFIED = TRUE
PATENT_LANDSCAPE_CORPUS_METRICS_VERIFIED = TRUE
PATENT_LANDSCAPE_EXCLUSION_LOG_VERIFIED = TRUE
PATENT_LANDSCAPE_REVIEW_QUEUE_VERIFIED = TRUE
PATENT_LANDSCAPE_EVIDENCE_GRAPH_VERIFIED = TRUE
PATENT_LANDSCAPE_CALCULATION_ENGINE_VERIFIED = TRUE
PATENT_LANDSCAPE_CHART_DATA_VERIFIED = TRUE
PATENT_LANDSCAPE_NARRATIVE_CONSISTENCY_VERIFIED = TRUE
PATENT_LANDSCAPE_VERSIONING_VERIFIED = TRUE
PATENT_LANDSCAPE_STALENESS_VERIFIED = TRUE
PATENT_LANDSCAPE_DELTA_ANALYSIS_VERIFIED = TRUE
PATENT_LANDSCAPE_DOWNSTREAM_HANDOFF_VERIFIED = TRUE
PATENT_LANDSCAPE_REPORT_GENERATION_VERIFIED = TRUE
PATENT_LANDSCAPE_EXPORT_VERIFIED = TRUE
PATENT_LANDSCAPE_VOICE_VERIFIED = TRUE
PATENT_LANDSCAPE_SECURITY_VERIFIED = TRUE
PATENT_LANDSCAPE_L3_DRAFTABLE = TRUE
PATENT_LANDSCAPE_L4_VALIDATED = FALSE
PATENT_LANDSCAPE_L5_PRACTITIONER_REVIEWED = FALSE
