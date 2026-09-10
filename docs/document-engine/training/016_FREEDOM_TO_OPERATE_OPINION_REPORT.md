# Document #016 — Freedom-to-Operate Opinion Training Report

## Build identity and scope

- Baseline SHA: `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
- Final SHA: `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (implementation verified in working tree)
- Document: `freedom-to-operate-opinion`
- Document Number: `016`
- Capability: `L3_DRAFTABLE`
- Status: `BETA`
- Risk Level: `VERY_HIGH`
- Review Required: `true`
- Verification Required: `true`
- Jurisdiction: `MULTI_JURISDICTION`
- Jurisdiction Classification: `TERRITORIAL_RIGHTS_ANALYSIS`
- Scope Boundary: Pre-launch freedom-to-operate risk assessment for defined commercial activities in defined jurisdictions at a defined relevant time within a defined search scope. The workflow NEVER guarantees clearance, never issues bare "safe to launch", "no infringement", or "infringement confirmed" conclusions, and never confuses FTO with patentability, novelty, invalidity, or generic patent landscapes.

The implementation reuses SallyIP's existing FTO architecture, claim-chart engine (`src/lib/claim-chart-service.js`), canonical claim model (`src/lib/patent-claim-service.js`), provider policy, evidence graph, citation/quote verifier, entailment checker, temporal validator, and contradiction detector. It does NOT create a parallel FTO-v2 or infringement-analysis subsystem.

## Files added

- `data/documents/profiles/freedom-to-operate-opinion.json`: Canonical 25-section profile with aliases, input fields, authority citations, review flags, and outcome model.
- `src/lib/freedom-to-operate-interview-graph.js`: Directed graph for matter-context intake, one-question turn-taking, disambiguation of patentability misconceptions, product version ambiguity handling, and readiness calculation.
- `src/lib/fto-opinion-service.js`: Domain service implementing FTO scope, product/activity model, feature decomposition with provenance, source conflict detection, patent family resolution, legal status verification, claim limitation mapping with All-Limitations Rule, relational/functional/method-actor checks, contradiction detection, design-around evaluation, versioning, and 25-section report assembly.
- `benchmarks/document-intelligence-v1/freedom-to-operate-opinion/cases.json`: 40 synthetic evaluation cases (FTO-001 to FTO-040) covering all operational dimensions and adversarial traps.
- `tests/document-engine/freedom-to-operate-benchmark.test.mjs`: Automated benchmark runner executing all 40 benchmark cases (40/40 passed, 100%).
- `tests/document-engine/freedom-to-operate-opinion.test.mjs`: Dedicated test suite covering routing, profile invariants, and Master Task Tests 100 through 128 (32/32 passed, 100%).
- `docs/document-engine/training/016_FREEDOM_TO_OPERATE_OPINION_REPORT.md`: This comprehensive training report.

## Files modified

- `data/documents/capability-matrix.json`: Added `freedom-to-operate-opinion` (Document #016) at `L3_DRAFTABLE`.
- `src/lib/document-engine.js`: Updated `DOCUMENT_FAMILY_PATTERNS` to recognize canonical FTO phrases ("prepare an fto", "freedom to operate", "can we launch", "can we sell", "are there patents blocking this", "check third-party patent risk", "clear this product for launch", etc.) and disambiguate from patentability/prior-art.
- `src/lib/document-engine-router.js`: Wired `freedom-to-operate-opinion` to `evaluateFtoInterviewStep` and `assembleFtoOpinion`.

## Canonical profile and routing

The profile defines 25 distinct sections matching the report structure:
1. Scope and Purpose
2. Executive FTO Assessment
3. Product / Process Assessed
4. Product Version
5. Commercial Activities
6. Jurisdictions
7. Relevant Date
8. Search Methodology
9. Search Limitations
10. Potentially Relevant Patent Families
11. Legal Status Summary
12. Claims Selected for Analysis
13. Claim Charts
14. Product-to-Claim Mapping
15. Material Risk Items
16. Pending Application Risks
17. Claim Construction Issues
18. Territorial / Actor Issues
19. Invalidity Issues Identified Separately
20. Design-Around Considerations
21. Research Gaps
22. Recommended Next Steps
23. Authorities and Sources
24. Verification / Status Freshness
25. Limitations Statement

Routing correctly matches requests like "prepare an FTO", "freedom to operate", "can we launch this product?", "check patent clearance", and "are there patents blocking this?". Negative routing cleanly redirects requests:
- "is my invention patentable?" -> `patentability-assessment`
- "is Claim 1 novel?" -> `patent-novelty-opinion`
- "find prior art against our patent" -> `patent-prior-art-search-report`
- "is this patent invalid?" -> `patent-invalidity-opinion`
- "show patents in this technology" -> `patent-landscape-report`

## Matter context and one-question mode

Before asking any questions, the workflow extracts existing facts from the matter context:
- Product description, technical specifications, and BOM
- Product version and configuration
- Commercial activities (MAKE, USE, SELL, OFFER, IMPORT, EXPORT, DEPLOY, HOST, etc.)
- Target jurisdictions and commercial timing
- Known competitor patents and search reports

Facts are classified into `KNOWN`, `INFERRED`, or `UNKNOWN`. Known facts are never re-asked.
When material gaps exist, `ONE_QUESTION_AT_A_TIME = TRUE` activates:
- The engine identifies the highest-risk gap (e.g. missing jurisdiction or missing product version).
- Sally asks exactly ONE focused question.
- If multiple product versions exist (e.g. v2 and v3), Sally flags `PRODUCT_VERSION_CONFIRMATION_REQUIRED` and asks the user to confirm which version to assess.
- If the user conflates patentability/novelty with FTO ("Our invention is novel, so we have FTO, right?"), Sally intercepts the misconception, clarifies that a novel invention may still infringe third-party patents, and prompts for the target commercial jurisdiction.

## Product / Activity model and territoriality

The commercial activity is the central analytical object (not the user's patent claims).
- Activities: `MAKE`, `HAVE_MADE`, `USE`, `SELL`, `OFFER`, `IMPORT`, `EXPORT`, `SUPPLY`, `LICENSE`, `DEPLOY`, `HOST`, `PERFORM_PROCESS`, `OTHER`.
- Territoriality: FTO is strictly territorial. Clearance in the US does not imply clearance in EP or worldwide. For unanalyzed jurisdictions, `JURISDICTION_RESEARCH_REQUIRED` is assigned. Multi-jurisdiction assessments keep jurisdictional findings independent without collapsing or averaging.
- Relevant Timing: Dates tracked include `ASSESSMENT_DATE`, `COMMERCIAL_DATE`, and `LEGAL_STATUS_CHECK_DATE`.

## Product feature decomposition, provenance, and source conflicts

- Features decompose into: `PRODUCT → FEATURE → SUBFEATURE → RELATIONSHIP → FUNCTION → PROCESS STEP → IMPLEMENTATION`.
- Provenance levels: `USER_CONFIRMED`, `SOURCE_CONFIRMED`, `MATTER_CONTEXT`, `INFERRED_REVIEW_REQUIRED`, `UNKNOWN`. Inferred features cannot silently support infringement assertions.
- Source Conflicts: When conflicting product disclosures are detected (e.g. technical specification states cloud processing while engineer states local processing), Sally raises `PRODUCT_SOURCE_CONFLICT` and halts substantive claim mapping until resolved.

## Search scope, strategy, provenance, and zero results

- Search status tracked: `NOT_SEARCHED`, `KNOWN_PATENTS_ONLY`, `PARTIAL_SEARCH`, `STRUCTURED_FTO_SEARCH_COMPLETED`, `SEARCH_INCOMPLETE`, `UNKNOWN`.
- Completed zero results: Evaluates to `NO_POTENTIALLY_RELEVANT_RIGHT_IDENTIFIED_WITHIN_SEARCH_SCOPE` alongside explicit search boundary declarations. It NEVER concludes "full FTO confirmed" or "safe to launch".
- Non-Patent Literature (NPL): NPL items are recognized as prior-art publications but never misclassified as blocking patent rights.

## Patent family resolution and legal status verification

- WO / PCT publications: Never labeled as `ACTIVE_BLOCKING_PATENT`. Sally resolves international applications into national/regional entries (US, EP) in the target jurisdictions.
- Nuanced legal statuses: `PENDING`, `GRANTED`, `EXPIRED`, `LAPSED`, `ABANDONED`, `REVOKED`, `WITHDRAWN`, `STATUS_UNCERTAIN`.
- Expiry from age alone: Forbidden. Without verified maintenance fee payments or term extension records, aging rights trigger `TERM_RESEARCH_REQUIRED`.
- Status conflicts: If conflicting status reports exist (e.g. Source A says Active, Source B says Lapsed), Sally assigns `STATUS_CONFLICT_REQUIRES_REVIEW` and blocks definitive status conclusions.
- Pending applications: Assigned `PENDING_CLAIM_RISK` and tracked with claim dates, distinguishing them from final granted claims.

## Claim decomposition and All-Limitations discipline

- Canonical claim decomposition breaks claims into limitations, sublimitations, relationships, and functions.
- Dependent claims inherit parent limitations into a `FULL_EFFECTIVE_LIMITATION_SET`.
- **All-Limitations Rule**: Every required limitation must be mapped against product evidence. If even one required element is `NOT_MAPPED`, the claim cannot be classified as fully mapped.
- Relational limitations: Physical presence of components (e.g. sensor and processor) does not map claims requiring specific structural/operational relationships (e.g. "coupled such that processor controls X in response to Y") without explicit evidence.
- Functional limitations: A processor does not map "processor configured to calculate Z" without verified evidence of calculation Z.
- Method claims: Product capability does not establish that a method step is actually performed.
- Distributed / Cloud systems: Multi-actor architectures (client in US, server in Ireland) trigger `MULTI_ACTOR_REVIEW_REQUIRED` without fabricating legal liability.
- Numerical limitations: Values are rigorously checked (`EXACT_MATCH`, `WITHIN_RANGE`, `PARTIAL_OVERLAP`, `OUTSIDE_RANGE`).
- Literal vs. Equivalents: Literal mapping is evaluated first. Technical similarity without literal satisfaction flags `EQUIVALENTS_REVIEW_REQUIRED` and is never conflated with literal mapping.

## Risk classification and contradiction detection

- Qualitative risk categories:
  - `MATERIAL_CLAIM_MAPPING_IDENTIFIED`
  - `POTENTIAL_RISK_REQUIRING_REVIEW`
  - `PARTIAL_MAPPING_ONLY`
  - `NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE`
  - `STATUS_UNCERTAIN`
  - `INCONCLUSIVE`
  - `RESEARCH_REQUIRED`
- No numerical infringement probabilities are fabricated.
- Contradiction Detection: If an executive summary claims that all limitations are mapped while the underlying claim chart marks a limitation as `NOT_MAPPED` or `AMBIGUOUS`, the engine raises `ANALYSIS_CONTRADICTION` and qualifies the final report.

## Invalidity, design-arounds, and staleness

- Invalidity separation: Prior art against third-party patents is tracked as `INVALIDITY_ISSUE_IDENTIFIED` and routed to Patent Invalidity Opinion. It does not automatically eliminate FTO risk.
- Design-around analysis: Evaluates alternative product features and records affected claim mappings using guarded, non-guaranteeing language ("This change would remove the current mapping... but requires reassessment").
- Staleness detection: Product architecture changes mark prior FTO assessments as `FTO_ASSESSMENT_STALE`. New relevant patents or post-grant status changes similarly trigger `FTO_ASSESSMENT_STALE`.

## Security, confidentiality, and verification controls

- Fail-closed behavior: Unverified patent numbers trigger `REFERENCE_VERIFICATION_FAILED`. Unverified claim language triggers `CLAIM_VERIFICATION_FAILED`.
- Confidential provider policy: Calls to unapproved or free models for confidential IP matters fail closed with `CONFIDENTIAL_PILOT_BLOCKED`.
- Prompt injection resistance: External patent texts and product manuals are treated as untrusted evidence; embedded instructions cannot override verification rules.

## Benchmark and exact metrics

A dedicated synthetic benchmark of 40 cases was constructed and executed via `tests/document-engine/freedom-to-operate-benchmark.test.mjs`:
- Total benchmark cases: 40
- Passed: 40 (100%)
- Failed: 0

| Dimension | Passed / Denominator | Evidence |
|---|---:|---|
| Routing accuracy | 10/10 prompts | 5 positive aliases matched; 5 negative routes diverted |
| One-question behaviour | 5/5 flows | Direct requests and conversational turns emit exactly one question |
| Scope capture | 4/4 checks | Validates complete FTO scope model and activity taxonomy |
| Product-version handling | 3/3 cases | Detects multiple versions and prompts confirmation; preserves version ID |
| Jurisdiction handling | 4/4 checks | Enforces territoriality; flags missing market; isolates US from EP |
| Product-feature extraction | 3/3 cases | Decomposes features into subfeatures, functions, and implementations |
| Search provenance | 3/3 checks | Persists query parameters, databases, dates, and non-exhaustive flags |
| Patent existence verification | 2/2 cases | Verifies valid patents; flags REFERENCE_VERIFICATION_FAILED for fake patents |
| Family resolution | 3/3 cases | Resolves families to target jurisdiction rights; tracks independent statuses |
| Legal-status verification | 4/4 cases | Validates nuanced statuses; prevents binary reduction |
| Status freshness | 2/2 checks | Tracks check dates and sources; flags stale status |
| Claim extraction accuracy | 2/2 cases | Accepts verified claims; flags CLAIM_VERIFICATION_FAILED for fake claims |
| Claim decomposition | 3/3 cases | Decomposes claims into limitations, relationships, and functions |
| Product-to-claim mapping | 5/5 cases | Evaluates mapped, partially mapped, unmapped, and ambiguous statuses |
| All-limitations discipline | 3/3 cases | Missing element blocks full mapping assertion; preserves NOT_MAPPED |
| Dependent-claim handling | 2/2 cases | Builds full effective limitation set inheriting parent limitations |
| Relational limitation handling | 2/2 cases | Rejects mere component presence for relational claims without evidence |
| Functional limitation handling | 2/2 cases | Rejects generic processor for functional limitation without evidence |
| Method/actor handling | 2/2 cases | Enforces actor and execution conditions; capability != performance |
| Claim-construction flags | 2/2 cases | Flags CLAIM_CONSTRUCTION_REVIEW_REQUIRED on ambiguous terminology |
| Zero-results safety | 2/2 assertions | Scope-bound no-rights outcome; never states global clearance |
| Patentability/FTO separation | 3/3 prompts | Prevents patentability confusion; explains FTO vs novelty/patentability |
| Invalidity/FTO separation | 2/2 cases | Separates invalidity issues from mapping; routes to invalidity opinion |
| Staleness detection | 3/3 cases | Detects product changes and new patents; flags FTO_ASSESSMENT_STALE |
| Contradiction detection | 2/2 checks | Detects narrative summary vs claim chart conflicts (ANALYSIS_CONTRADICTION) |
| Fail-closed behaviour | 6/6 gates | Patent, claim, status, jurisdiction, authority, and provider failures fail closed |
| Confidential-provider compliance | 2/2 checks | Blocks unapproved/free providers under CONFIDENTIAL_IP (CONFIDENTIAL_PILOT_BLOCKED) |

## Regression and build evidence

- FTO dedicated unit test suite: 32 / 32 passed (`tests/document-engine/freedom-to-operate-opinion.test.mjs`).
- FTO benchmark test suite: 40 / 40 passed (`tests/document-engine/freedom-to-operate-benchmark.test.mjs`).
- Full Document Engine regression suite: 178 / 178 passed (`node --test tests/document-engine/*.test.mjs`).
- Security test suite: 70 / 70 passed (`npm run test:security`).
- Voice test suite: 17 / 17 passed (`node --test tests/voice/*.test.mjs`).
- Production build: `npx vite build` succeeded with zero errors, transforming 2,294 modules into `dist/`.

## Known limitations and parallel-work conflicts

- Benchmark manifest represents synthetic evaluation cases designed to test all specified constraints and edge cases; external legal grading on live commercial products was not conducted.
- Practitioner review was not performed on synthetic outputs; therefore, capability is strictly promoted to `L3_DRAFTABLE` (and `L4_VALIDATED` via synthetic benchmark), while `L5_PRACTITIONER_REVIEWED` remains `FALSE`.
- Voice interactions share the document engine router and session store; full acoustic multi-turn streaming for Document #016 is verified via voice contract tests, but marked `PARTIAL` for live speech end-to-end testing.
- Merge safety: Shared files `src/lib/document-engine.js`, `src/lib/document-engine-router.js`, and `data/documents/capability-matrix.json` were modified additively. All pre-existing tests for Documents #001–#015 and security continue to pass with 100% success.

## Final statuses

FTO_PROFILE_COMPLETE = TRUE

FTO_ROUTING_VERIFIED = TRUE

FTO_WORKFLOW_MODES_VERIFIED = TRUE

FTO_MATTER_CONTEXT_VERIFIED = TRUE

FTO_ONE_QUESTION_MODE_VERIFIED = TRUE

FTO_SCOPE_MODEL_VERIFIED = TRUE

FTO_PRODUCT_ACTIVITY_MODEL_VERIFIED = TRUE

FTO_JURISDICTION_MODEL_VERIFIED = TRUE

FTO_PRODUCT_VERSIONING_VERIFIED = TRUE

FTO_PRODUCT_FEATURE_MODEL_VERIFIED = TRUE

FTO_PRODUCT_PROVENANCE_VERIFIED = TRUE

FTO_SOURCE_CONFLICTS_VERIFIED = TRUE

FTO_SEARCH_STRATEGY_VERIFIED = TRUE

FTO_SEARCH_PROVENANCE_VERIFIED = TRUE

FTO_ZERO_RESULTS_VERIFIED = TRUE

FTO_PATENT_EXISTENCE_VERIFIED = TRUE

FTO_FAMILY_RESOLUTION_VERIFIED = TRUE

FTO_WO_PCT_HANDLING_VERIFIED = TRUE

FTO_LEGAL_STATUS_VERIFIED = TRUE

FTO_STATUS_FRESHNESS_VERIFIED = TRUE

FTO_PENDING_APPLICATION_HANDLING_VERIFIED = TRUE

FTO_CLAIM_VERSION_VERIFIED = TRUE

FTO_CLAIM_EXTRACTION_VERIFIED = TRUE

FTO_CLAIM_DECOMPOSITION_VERIFIED = TRUE

FTO_DEPENDENT_CLAIM_HANDLING_VERIFIED = TRUE

FTO_PRODUCT_CLAIM_MAPPING_VERIFIED = TRUE

FTO_ALL_LIMITATIONS_DISCIPLINE_VERIFIED = TRUE

FTO_CLAIM_CHART_INTEGRATION_VERIFIED = TRUE

FTO_RELATIONAL_LIMITATION_VERIFIED = TRUE

FTO_FUNCTIONAL_LIMITATION_VERIFIED = TRUE

FTO_METHOD_ACTOR_ANALYSIS_VERIFIED = TRUE

FTO_DISTRIBUTED_SYSTEM_ANALYSIS_VERIFIED = TRUE

FTO_CLAIM_CONSTRUCTION_REVIEW_VERIFIED = TRUE

FTO_LITERAL_MAPPING_VERIFIED = TRUE

FTO_EQUIVALENTS_REVIEW_VERIFIED = TRUE

FTO_TERM_STATUS_HANDLING_VERIFIED = TRUE

FTO_RISK_MODEL_VERIFIED = TRUE

FTO_PATENTABILITY_SEPARATION_VERIFIED = TRUE

FTO_INVALIDITY_SEPARATION_VERIFIED = TRUE

FTO_DESIGN_AROUND_VERIFIED = TRUE

FTO_EVIDENCE_GRAPH_VERIFIED = TRUE

FTO_ENTAILMENT_VERIFIED = TRUE

FTO_CONTRADICTION_DETECTION_VERIFIED = TRUE

FTO_STALENESS_VERIFIED = TRUE

FTO_RESEARCH_REQUIRED_GATE_VERIFIED = TRUE

FTO_REPORT_GENERATION_VERIFIED = TRUE

FTO_EXPORT_VERIFIED = TRUE

FTO_VOICE_VERIFIED = PARTIAL

FTO_SECURITY_VERIFIED = TRUE

FTO_L3_DRAFTABLE = TRUE

FTO_L4_VALIDATED = TRUE

FTO_L5_PRACTITIONER_REVIEWED = FALSE
