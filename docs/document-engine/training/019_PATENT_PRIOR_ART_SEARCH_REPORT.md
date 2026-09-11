# SALLYIP DOCUMENT TRAINING REPORT #019
## PATENT PRIOR-ART SEARCH REPORT (Search Evidence Only — Never a Legal Conclusion)

**Document Identifier:** `patent-prior-art-search-report`
**Document Number:** `019`
**Baseline SHA (working tree, SHA256 — post-#018 state, before #019 edits):**
- `src/lib/document-engine.js`: `9A93F54CE5D9D792FE3F9CC659FA83A831FDE2D6836206E4A01B89B84AE7EB99`
- `src/lib/document-engine-router.js`: `D6C7739807870F55698D9EAF87B545CBF517F6EB65D9D3FE461D4B7F77EDB5DE`
- `data/documents/capability-matrix.json`: `0E35E2E4BA5146A7C23EBE4D0949AE66E11C0944753944B1D8A7D8B7AD3355A0`
- No git repository is present in the workspace, so there is no commit SHA; file hashes are the baseline evidence. Parallel agents were concurrently editing shared files; all #019 edits below are additive and regression-verified.
**Final SHA (working tree, SHA256):**
- `src/lib/document-engine.js`: `6A4DB21BFF716F3684C6FB6257344CB377FB7E2954FF382204C15938C168B977`
- `src/lib/document-engine-router.js`: `A554DA05BFD0C1EA06C0190B86E3685D8B538FC36F145889B1E61D779ED731DD`
- `src/lib/prior-art-search-service.js` (new): `E2FB7B2CA991483DC488022E1292EE5D94DF57A0EA1D570C70D276829175CED9`
- `src/lib/prior-art-search-interview-graph.js` (new): `C307C78EA3E50EF131087F31E78A71DD28F8F37AF23A1F63CDFDD72FDE979CA9`
- `data/documents/profiles/patent-prior-art-search-report.json` (new): `82499A560AF90142AC70984A2BF367BDE364819BE46ADCB661AAE2F3DBB80E00`
- `data/documents/capability-matrix.json`: `F2CF5F5C3536ED0650576BEDBFCB8AC8153E993492943AD4BF5379FF67360D77`
- `benchmarks/document-intelligence-v1/patent-prior-art-search-report/cases.json` (new): `081AFF798365E52A1C40457E8DA2EA47F86B47F3917AF379D781630C31878877`
**Timestamp:** `2026-09-11`
**Role:** SallyIP Patent Document Intelligence and Verification Engineer

---

### Executive Summary

Document #019 (Patent Prior-Art Search Report) is implemented as a canonical evidence-driven research workflow. It identifies the exact search target and version first, builds reproducible feature-prioritised strategies (reusing prior-art strategy seeds and the canonical claim model), persists every query with provenance, verifies reference existence and dates separately, normalises families, screens relevance explicitly with persisted reasons, maps evidence at limitation level with quote/entailment checks, preserves relational/functional/method-order/numerical distinctions, accounts completeness honestly, and reports zero-results safely. Search evidence is never a legal conclusion: patentability/novelty confusions hand off outward, and all five downstream handoffs transfer evidence with `legal_conclusion_transfer: NONE`. No parallel search engine was created; no unrelated profiles were modified; verification controls were untouched.

### Files Added
1. `data/documents/profiles/patent-prior-art-search-report.json` — canonical profile (`019`, `PATENT_RESEARCH`, `BETA`, `HIGH`, `review_required`, `verification_required`, `MULTI_JURISDICTION`/`SEARCH_CONTEXT_DEPENDENT`, 23 report sections, 15 search modes).
2. `src/lib/prior-art-search-service.js` — target model + version control; canonical claim/concept decomposition; feature prioritisation; synonym provenance; strategy builder (prior-art seeds + semantic records); query provenance log (empty queries rejected); source coverage; NPL + availability discipline; reference verification; date model + temporal screening + priority context + cutoff; family normalisation/expansion + related filings; classification verification (`AI_PROPOSED_CLASSIFICATION`); semantic records; screening + exclusion reasons; limitation mapping; relational/functional/method-order/numerical handlers (numerical via shared `compareNumericalLimitation`); specialist branches; citation/assignee/inventor expansion + query learning; completeness; zero-results language; quality control; diversity; qualitative ranking; session model; readiness; staleness/change-impact/versions; evidence graph; metadata/date conflicts; confidentiality; five handoffs; 23-section report assembler with boundary guard (`SEARCH_BOUNDARY_VIOLATION`).
3. `src/lib/prior-art-search-interview-graph.js` — thin orchestration: matter-first intake, one-question flow (target → version → modes → sources → cutoff → known references), readiness, pre-search summary + confirmation, DRAFT assembly, patentability/novelty-confusion handoffs, session persistence of search/target/query/reference/family/review/verification IDs.
4. `benchmarks/document-intelligence-v1/patent-prior-art-search-report/cases.json` — 46 synthetic cases covering all §121 categories plus adversarial fail-closed cases (§122).
5. `tests/document-engine/prior-art-search-benchmark.test.mjs` — benchmark runner (46/46 cases).
6. `tests/document-engine/prior-art-search-interview.test.mjs` — 19 focused unit tests.
7. `tests/document-engine/prior-art-search-routing.test.mjs` — 3 router integration tests.

### Files Modified (additive, backward-compatible only)
1. `src/lib/document-engine.js` — extended the pre-existing prior-art pattern with the §4 #019 phrases; two narrow alternation extensions so the exact §5 misroutes resolve (`is it patentable?` → patentability; `map the whole technology space` → landscape).
2. `src/lib/document-engine-router.js` — added import and the #019 interview branch (`ASK_QUESTION` single / `PROMPT_ANALYSIS_CONFIRMATION` / `DRAFT`).
3. `data/documents/capability-matrix.json` — added the `patent-prior-art-search-report` entry, promoted to `L3_DRAFTABLE` after tests passed (entry only; summary rollups untouched).

### Canonical Profile
`id: patent-prior-art-search-report`, `name: Patent Prior-Art Search Report`, `category: IP_INNOVATION`, `subcategory: PATENT`, `family: PATENT_RESEARCH`, `document_number: 019`, `status: BETA`, `risk_level: HIGH`, `review_required: true`, `verification_required: true`, `jurisdiction: MULTI_JURISDICTION`, `jurisdiction_classification: SEARCH_CONTEXT_DEPENDENT`.

### Routing Aliases (all verified; adjacent intents verified un-stolen)
`find prior art`, `search for prior art`, `prepare a prior-art search report`, `find patents similar to this invention`, `search patents against Claim 1`, `find earlier patents`, `find documents before my filing date`, `look for prior art against these claims`, `do a novelty search`, `search for invalidating references`, `find technical papers before this date`, `find patent and non-patent literature`.

### Output Boundary
Permitted: preliminary/structured/claim-focused/concept-level/patent-only/patent+NPL/invalidity/patentability/FTO-discovery/landscape-seed searches. The assembler throws on novelty/patentability conclusions, `no prior art exists`, and exhaustive-search claims (tested). Handoffs — never the report — reach legal conclusions.

### Search Modes
All 15 modes are profile inputs; claim/concept/invalidity/patentability/novelty/FTO-discovery intents classify from answers; patent+NPL scope is explicit.

### Matter-Context Behaviour
Held disclosures, claim sets, target versions, priority filings, known references, search history, and jurisdiction merge as KNOWN and are never re-asked (tested).

### One-Question Behaviour
Vague requests define the target first with exactly one question; every turn returns one question; unknown/skip recorded without forcing answers.

### Target Model / Versioning / Decomposition / Features / Synonyms
`PRIOR_ART_SEARCH_TARGET` carries target/version/claims/concepts/features/jurisdiction/priority/cutoff/modes/sources/depth. Competing versions require explicit confirmation (`TARGET_VERSION_CONFIRMATION_REQUIRED`; stale versions never searched silently). Claim decomposition reuses `parsePatentClaims`/`buildEffectiveClaimLimitations`; concepts split into required/optional features without fabrication; distinguishing features lead strategies (generic-only search refused by construction); synonyms carry provenance and review status, never silently becoming search facts.

### Strategy / Provenance / Sources / NPL / Verification / Dates
Strategies combine prior-art seeds (keyword/exact-phrase/classification/applicant/inventor) with Boolean/classification/citation/family/semantic branches; semantic records carry model/index/filters with a never-relevance note. Every query persists id/text/type/source/filters/date/counts/notes/iteration/match-field; empty queries are rejected, never invented. Source coverage names only queried sources. NPL records keep file-creation metadata strictly separate from public-availability evidence (publisher/archival source required). References gate on `validateNoveltyReference` with immutable IDs. Priority/filing/publication/grant/availability/cutoff dates tracked separately; temporal screening stays unresolved without a cutoff; asserted priority dates stay `USER_ASSERTED_PRIORITY_DATE` until verified; every report states its cutoff.

### Families / Classifications / Semantic / Fields / Screening / Mapping
Family grouping reuses `groupPatentFamilies`; uncertain links stay `FAMILY_RELATIONSHIP_UNCERTAIN`; expansion screens candidates without auto-inclusion; per-document dates preserved; continuations/divisionals captured from evidence, never title similarity. Official codes verify; AI suggestions stay `AI_PROPOSED_CLASSIFICATION`. Title/abstract/claims/description/full-text/classification match fields stay distinct (title matches are weak). Screening uses five levels with persisted reasons; title-alone never selects. Mappings follow CLAIM→LIMITATION→REFERENCE→PASSAGE→RELEVANCE on the shared graph shape; relevance is search relevance only.

### Quotes / Entailment / Relational / Functional / Method / Numerical / Branches / Expansion / Learning
Quotes verify EXACT/FUZZY_REVIEW/NOT_FOUND (`QUOTE_VERIFICATION_FAILED` excludes). Entailment maps shared verdicts (topical overlap insufficient). Relationships require passage entailment; functions require functional evidence (structure alone never maps); method order preserved step-by-step; numerical overlap reuses `compareNumericalLimitation` with zero fabrication. Chemical/biotech/software/AI structures preserved where supported, else generic-search insufficiency recorded. Citation/assignee/inventor expansions screen every candidate; learned terms stay unreviewed with provenance.

### Completeness / Zero-Results / Quality / Diversity / Ranking / Session / Readiness
Completeness tracks nine dimensions (LOW/MODERATE/HIGH/UNKNOWN) as defined coverage, never exhaustiveness. Zero results yield `NO_RELEVANT_REFERENCE_IDENTIFIED_WITHIN_SEARCH_SCOPE`, never absence/novelty/patentability claims. Quality flags (broad/narrow/noise/duplicates/single-source) raise `SEARCH_STRATEGY_REVIEW_REQUIRED`. Diversity prefers family representatives preserving links. Rankings use explicit qualitative criteria only — no numeric confidence scores. `PRIOR_ART_SEARCH_SESSION` persists queries/sources/results/selections/exclusions/family map/status/completeness/versions. Readiness gates seed/structured/claim-focused/report stages; pre-search summaries precede confirmation.

### Report / Handoffs / Versions / Staleness / Graph / Conflicts / Translation / Confidentiality / Voice
23-section report with evidence-only executive language and key-reference format (id/title/identifier/jurisdiction/dates/family/source/verification/features/passages/status/notes). Handoffs to novelty/patentability/invalidity/FTO/landscape transfer targets, references, passages, scope, and gaps with zero legal conclusions. Versions (`searchVersion/targetVersion/queryVersion/referenceSetVersion/familyMapVersion/reportVersion`) never overwrite history; staleness flags `PRIOR_ART_SEARCH_STALE` with targeted (not blind) reruns via change-impact analysis. Evidence graph traces TARGET→FEATURE→QUERY→SOURCE→REFERENCE→PASSAGE→RELEVANCE. Matrix/narrative contradictions, metadata conflicts, and date conflicts are preserved and flagged. Translation status and language limitations recorded; machine translation never quoted as original. Confidential targets fail closed (`CONFIDENTIAL_PILOT_BLOCKED`, tested); uploads untrusted. Voice/text share all ten session IDs (tested); voice stack untouched (30/30 pass).

---

### Verification and Test Evidence (exact denominators)

**#019 interview tests (`tests/document-engine/prior-art-search-interview.test.mjs`): 19/19 pass.**
**#019 benchmark (`tests/document-engine/prior-art-search-benchmark.test.mjs` over 46 cases): 46/46 cases pass (1/1 test).**
**#019 routing tests (`tests/document-engine/prior-art-search-routing.test.mjs`): 3/3 pass.**
**Full document-engine regression (`node --test tests/document-engine/*.test.mjs`): 332/332 pass.**
**Foundation suite (`npm run test:foundation`): 77/77 node + 12/12 Python pass.**
**Verification suite (`npm run test:verification`): 28/28 pass.**
**Voice suite (`node --test tests/voice/*.test.mjs`): 30/30 pass.**
**Security suite (`npm run test:security`): 70/70 pass.**
**Production build (`npm run build`, vite v6.4.3): PASS — 2303 modules transformed, built in 7.05s, 0 errors.**

### Benchmark Dimensions (reported separately, not collapsed)
routing accuracy; one-question behaviour; target-version handling; claim/concept decomposition; search strategy quality; query provenance; source coverage accuracy; reference existence verification; metadata integrity; date verification; NPL public-availability handling; family normalisation; classification integrity; result screening; feature/limitation mapping; quote verification; entailment; zero-results safety; search-completeness reporting; handoff correctness; staleness detection; contradiction detection; confidential-provider compliance — each covered by ≥1 passing case/test above.

### Known Limitations
1. No live search execution: queries are constructed, recorded, and reported, but no database is queried at runtime; result sets are caller-supplied (matter, uploads, prior runs) and screened/verified by the workflow.
2. Legal prior-art qualification is intentionally out of scope; temporal screening is potential-relevance only until a downstream legal workflow verifies it.
3. No practitioner review; exhaustiveness is never claimed.

### Parallel-Work Conflicts
Shared `document-engine.js` / `document-engine-router.js` show ongoing concurrent-agent activity. All #019 edits were additive (one pattern extension, two narrow alternations, one import, one branch, one capability entry) and the full 332-test document-engine suite passes with zero regressions. Nothing unrelated was reverted or overwritten.

---

### Final Statuses (evidence-backed; TRUE / FALSE / PARTIAL / BLOCKED only)

PRIOR_ART_PROFILE_COMPLETE = TRUE
PRIOR_ART_ROUTING_VERIFIED = TRUE
PRIOR_ART_OUTPUT_BOUNDARY_VERIFIED = TRUE
PRIOR_ART_SEARCH_MODES_VERIFIED = TRUE
PRIOR_ART_MATTER_CONTEXT_VERIFIED = TRUE
PRIOR_ART_ONE_QUESTION_MODE_VERIFIED = TRUE
PRIOR_ART_TARGET_MODEL_VERIFIED = TRUE
PRIOR_ART_TARGET_VERSIONING_VERIFIED = TRUE
PRIOR_ART_CLAIM_DECOMPOSITION_VERIFIED = TRUE
PRIOR_ART_CONCEPT_DECOMPOSITION_VERIFIED = TRUE
PRIOR_ART_FEATURE_PRIORITISATION_VERIFIED = TRUE
PRIOR_ART_SYNONYM_MODEL_VERIFIED = TRUE
PRIOR_ART_SEARCH_STRATEGY_VERIFIED = TRUE
PRIOR_ART_QUERY_PROVENANCE_VERIFIED = TRUE
PRIOR_ART_SOURCE_COVERAGE_VERIFIED = TRUE
PRIOR_ART_PATENT_SOURCE_HANDLING_VERIFIED = TRUE
PRIOR_ART_NPL_HANDLING_VERIFIED = TRUE
PRIOR_ART_PUBLIC_AVAILABILITY_VERIFIED = TRUE
PRIOR_ART_REFERENCE_EXISTENCE_VERIFIED = TRUE
PRIOR_ART_METADATA_INTEGRITY_VERIFIED = TRUE
PRIOR_ART_DATE_MODEL_VERIFIED = TRUE
PRIOR_ART_TEMPORAL_SCREENING_VERIFIED = TRUE
PRIOR_ART_PRIORITY_CONTEXT_VERIFIED = TRUE
PRIOR_ART_FAMILY_NORMALISATION_VERIFIED = TRUE
PRIOR_ART_FAMILY_EXPANSION_VERIFIED = TRUE
PRIOR_ART_RELATED_FILING_HANDLING_VERIFIED = TRUE
PRIOR_ART_CLASSIFICATION_SEARCH_VERIFIED = TRUE
PRIOR_ART_SEMANTIC_SEARCH_VERIFIED = TRUE
PRIOR_ART_KEYWORD_SEARCH_VERIFIED = TRUE
PRIOR_ART_FIELD_DISTINCTION_VERIFIED = TRUE
PRIOR_ART_RESULT_SCREENING_VERIFIED = TRUE
PRIOR_ART_EXCLUSION_LOG_VERIFIED = TRUE
PRIOR_ART_CLAIM_FEATURE_MAPPING_VERIFIED = TRUE
PRIOR_ART_QUOTE_VERIFICATION_VERIFIED = TRUE
PRIOR_ART_ENTAILMENT_VERIFIED = TRUE
PRIOR_ART_RELATIONAL_FEATURE_VERIFIED = TRUE
PRIOR_ART_FUNCTIONAL_FEATURE_VERIFIED = TRUE
PRIOR_ART_METHOD_ORDER_VERIFIED = TRUE
PRIOR_ART_NUMERICAL_FEATURE_VERIFIED = TRUE
PRIOR_ART_CITATION_EXPANSION_VERIFIED = TRUE
PRIOR_ART_ASSIGNEE_EXPANSION_VERIFIED = TRUE
PRIOR_ART_INVENTOR_EXPANSION_VERIFIED = TRUE
PRIOR_ART_QUERY_LEARNING_VERIFIED = TRUE
PRIOR_ART_SEARCH_COMPLETENESS_VERIFIED = TRUE
PRIOR_ART_ZERO_RESULTS_VERIFIED = TRUE
PRIOR_ART_SEARCH_QUALITY_CONTROL_VERIFIED = TRUE
PRIOR_ART_REFERENCE_RANKING_VERIFIED = TRUE
PRIOR_ART_SEARCH_SESSION_VERIFIED = TRUE
PRIOR_ART_SEARCH_READINESS_VERIFIED = TRUE
PRIOR_ART_EVIDENCE_GRAPH_VERIFIED = TRUE
PRIOR_ART_CONTRADICTION_DETECTION_VERIFIED = TRUE
PRIOR_ART_TRANSLATION_HANDLING_VERIFIED = TRUE
PRIOR_ART_STALENESS_VERIFIED = TRUE
PRIOR_ART_DOWNSTREAM_HANDOFF_VERIFIED = TRUE
PRIOR_ART_REPORT_GENERATION_VERIFIED = TRUE
PRIOR_ART_EXPORT_VERIFIED = TRUE
PRIOR_ART_VOICE_VERIFIED = TRUE
PRIOR_ART_SECURITY_VERIFIED = TRUE
PRIOR_ART_L3_DRAFTABLE = TRUE
PRIOR_ART_L4_VALIDATED = FALSE
PRIOR_ART_L5_PRACTITIONER_REVIEWED = FALSE
