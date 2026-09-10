# Document #015 — Patent Novelty Opinion Training Report

## Build identity and scope

- Baseline SHA: `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
- Final SHA: `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (implementation remains in the working tree; no commit was created)
- Document: `patent-novelty-opinion`
- Capability: `L3_DRAFTABLE`
- Status: `BETA`
- Risk: `HIGH`
- Review required: `true`
- Verification required: `true`
- Scope boundary: novelty only. The workflow does not represent a complete patentability, inventive-step/obviousness, FTO, infringement, validity, grant, or universal novelty opinion.

The implementation extends the existing `novelty-service.js` and dependency-aware claim service. It uses the existing prior-art candidate status, citation/quote checker, entailment checker, provider policy, evidence-passage model, and SQL novelty invariants. It does not create a second novelty, search, citation, or evidence engine.

## Files added

- `data/documents/profiles/patent-novelty-opinion.json`
- `src/lib/patent-novelty-opinion-interview-graph.js`
- `benchmarks/document-intelligence-v1/patent-novelty-opinion/cases.json`
- `tests/document-engine/patent-novelty-opinion.test.mjs`
- `docs/document-engine/training/015_PATENT_NOVELTY_OPINION_REPORT.md`

## Files modified

- `src/lib/novelty-service.js`
- `src/lib/patent-claim-service.js`
- `src/lib/document-engine.js`
- `src/lib/document-engine-router.js`
- `data/documents/capability-matrix.json`

`src/lib/document-engine.js`, `src/lib/document-engine-router.js`, and the document data tree were already untracked at the baseline. They contain parallel document-programme work. Only the #015 imports, branch, patterns, profile, capability entry, and new assets were added; no unrelated work was reverted.

## Canonical profile and routing

The profile records the required ID, name, category, patent subcategory, `PATENT_ANALYSIS` family, document number 015, multi-jurisdiction/context-dependent classification, high risk, review/verification requirements, L3 capability, workflow modes, analysis targets, readiness states, qualified outcome model, 19 report sections, handoffs, flags, and express exclusions.

Positive routing covers claim and concept novelty, novelty opinions/assessments, anticipation over a provided reference, claim/prior-art comparison, and pre-filing novelty checks. Higher-priority negative routing keeps patentability, prior-art search, obviousness/inventive step, FTO, and infringement requests out of #015.

## Workflow, matter context, and interview

The orchestration layer inspects claim sets, versions, claims, inventive concepts, jurisdiction, priority/cutoff data, research state, references, verified authority, and existing artifacts before asking a question. Facts are classified as `KNOWN`, `INFERRED`, or `UNKNOWN`. Multiple claim versions are not silently resolved.

Missing material information is collected in strict one-question mode. The order is exact analysis target, claim version, jurisdiction/context, priority/cutoff, research scope, then verified authority. An explicit claim number in the user's request is retained. Once ready, the workflow emits a pre-analysis summary and asks for confirmation. A material verification/research gap produces `RESEARCH_REQUIRED` instead of forcing a novelty answer.

## Claim/concept distinction and decomposition

- Formal output is labelled `CLAIM_LEVEL_NOVELTY_OPINION` and requires a claim-set ID, version, exact claim text, and (where multiple claims are present) an exact claim selection.
- No-claim work is labelled `CONCEPT_LEVEL_NOVELTY_ASSESSMENT` and uses the preliminary outcome vocabulary.
- Exact claim text is preserved. Decomposition creates stable limitation IDs, normalized concepts, support states, dependency source, and analysis status.
- A dependent claim receives every inherited parent limitation plus its own added limitations. Circular or missing dependencies fail rather than being invented.
- Each independent claim is aggregated separately; outcomes are not copied between claims.

## Jurisdiction, authority, priority, and cutoff

US, EP, PCT context, other, and undecided states remain distinct. PCT is stored as `PCT_CONTEXT`, not as a granting jurisdiction. The pre-existing framework helper remains jurisdiction-specific; final readiness additionally requires a verified authority ID and version/date from the authority pipeline.

Priority context preserves all priority records and feature/limitation-level support states: `SUPPORTED_BY_PRIORITY`, `PARTIALLY_SUPPORTED`, `NOT_FOUND`, and `UNCERTAIN`. Multiple priorities remain separate. An uncertain feature, missing cutoff, or unresolved entitlement emits priority/cutoff review flags and blocks a full opinion.

## Research gate, provenance, and zero results

Research states are `NOT_SEARCHED`, `USER_PROVIDED_ONLY`, `PARTIAL_SEARCH`, `STRUCTURED_SEARCH_COMPLETED`, `RESEARCH_INCOMPLETE`, and `UNKNOWN`. A full-scope opinion does not proceed from no search, unknown/incomplete research, or user-provided-only evidence unless the requested mode is explicitly reference-specific.

Research completeness is qualitative (`LOW`, `MODERATE`, `HIGH`, `UNKNOWN`), records sources, queries, date/language scope, screening, family review, provenance counts, and limitations, and always states `exhaustive: false`. A completed zero-result search produces only a scope-bound no-single-reference outcome; it never states that no prior art exists or that the claim is universally novel.

## Reference, date, temporal, quote, and translation verification

A relied-upon reference requires an immutable reference ID, title, publication identifier or URL, verified existence, independently recorded publication date, verified date status, and a resolved temporal status. Priority, filing, webpage, and publication dates are not silently substituted for one another. Only `TEMPORALLY_RELEVANT` references may carry a conclusion.

Every affirmative mapping requires a verified passage belonging to that reference. Direct quotes pass through the shared quote verifier. Missing quotes become `QUOTE_VERIFICATION_FAILED`; fuzzy matches become `QUOTE_FUZZY_REVIEW_REQUIRED`; neither may support a full-disclosure aggregation. Non-English references must carry translation status. Machine translation is not represented as exact original wording.

Patent families are grouped without collapsing per-publication identifiers or dates. The implementation reports family members as related technical disclosures while preserving document-specific timing.

## Entailment and limitation-level matrix

The matrix is `CLAIM → LIMITATION → REFERENCE → PASSAGE → DISCLOSURE STATUS → VERIFICATION`. It invokes the shared deterministic entailment checker for each supplied proposition/passage. Topical overlap or a non-entailing passage cannot remain `EXPLICITLY_DISCLOSED`.

Supported disclosure states are `EXPLICITLY_DISCLOSED`, `IMPLICITLY_DISCLOSED_REVIEW_REQUIRED`, `PARTIALLY_DISCLOSED`, `NOT_IDENTIFIED`, `AMBIGUOUS`, and `RESEARCH_REQUIRED`. Implicit disclosure requires both a verified technical basis and verified legal framework and remains review-required. Partial disclosure is never rounded up.

Mappings retain exact passage locations, quote and entailment status, terminology review, reviewer annotations, verification failures, and source-conflict flags. The evidence graph connects claim, limitation, reference, passage, and conclusion nodes rather than creating a report-only table.

## Single-reference discipline and technical limitation controls

A reference becomes `FULL_DISCLOSURE_CANDIDATE_REVIEW` only where that one verified, temporally relevant reference maps every effective limitation with a qualifying disclosure. Coverage split across references is never mosaiced into a novelty failure; it may be handed to inventive-step/obviousness or broader patentability analysis.

The mapping gate expressly preserves:

- terminology status (`EXACT_EQUIVALENT`, technical-equivalence review, related/not equivalent, unknown);
- functional limitations (the claimed function must be established, not inferred from a generic component);
- relational limitations (component presence is insufficient without the claimed relationship);
- material method-step order;
- numerical ranges (`EXACT_MATCH`, `WITHIN_RANGE`, `PARTIAL_OVERLAP`, `OUTSIDE_RANGE`, `AMBIGUOUS`);
- figure location and visible disclosure without hidden structure/function inference;
- source interpretation conflicts.

## Contradictions, outcomes, versions, and handoffs

Structured narrative assertions are checked against matrix rows. A narrative disclosure assertion conflicting with `NOT_IDENTIFIED`, partial, ambiguous, or research-required matrix evidence produces `ANALYSIS_CONTRADICTION` and an `INCONCLUSIVE` result.

Permitted qualified outcomes are `MATERIAL_NOVELTY_CONCERN`, `NO_SINGLE_REFERENCE_FULL_DISCLOSURE_IDENTIFIED_WITHIN_SCOPE`, `MIXED`, `INCONCLUSIVE`, `RESEARCH_REQUIRED`, and `PRELIMINARY_NO_CLOSE_FULL_DISCLOSURE_IDENTIFIED`. The engine does not emit bare `NOVEL` or `NOT_NOVEL` labels.

Opinion snapshots are immutable versions. Claim text/version/dependency, priority context, research/reference set, reference metadata, and authority changes produce `NOVELTY_OPINION_STALE` with change reasons. Handoffs transfer claims, mappings, references, jurisdiction, and gaps to Patent Claims Set, Patentability Assessment, Prior-Art Search, or inventive-step analysis. Claim amendment is never automatic.

## Report, inspector, export, persistence, voice, and confidentiality

`assemblePatentNoveltyOpinion` exports a 19-section Markdown opinion with the scope, evidence matrix, per-claim conclusions, research limits, sources, and verification statement. The same mapping objects expose limitation, reference, passage, quote, entailment, date/reference verification, legal-authority trace, reviewer annotations, and conclusion trace to the existing verification UI model; no second inspector was created.

The existing SQL novelty tables retain the core matter/claim/candidate analysis, passage evidence, review events, accepted-analysis immutability, and verified Tier-1 authority invariants. The extended document-session fields currently rely on the generic document/session persistence integration; no parallel #015 database was added. Voice enters through the same document router/session and no separate voice novelty workflow exists, but novelty-specific voice persistence IDs were not independently end-to-end tested.

Confidential unpublished claims and search strategy remain subject to the shared provider policy. The #015 test confirms that an unapproved/free provider fails closed with `CONFIDENTIAL_PROVIDER_UNAVAILABLE`; the user-visible workflow preserves `CONFIDENTIAL_PILOT_BLOCKED`. Existing file-ingestion security treats patent and research files as untrusted input and rejects embedded prompt instructions.

## Benchmark and exact metrics

The document-specific benchmark manifest contains 29/29 requested synthetic scenario definitions and 8/8 adversarial prompts. It is deliberately marked non-frozen. The #015 behavioral suite passes 24/24 named tests. These results support L3 workflow draftability only; they are not substantive external grading and do not support L4.

| Dimension | Passed / denominator | Evidence |
|---|---:|---|
| Routing accuracy | 8/8 prompts | Four positive novelty routes and four adjacent-workflow exclusions |
| Claim-version handling | 2/2 checks | Multiple-version ambiguity retained; version question selected |
| One-question behaviour | 2/2 flows | Direct interview and routed vague request each return one question |
| Reference existence verification | 2/2 states | Verified reference accepted; unverified reference fails closed |
| Date verification | 3/3 failure modes | Missing publication date, unverified date, and uncertain temporal status flagged |
| Quote verification | 1/1 adversarial mapping | Fabricated quote cannot support disclosure |
| Citation integrity | 3/3 gates | Verified passage required; false quote and non-entailing passage fail |
| Entailment | 2/2 mappings | Entailing full mapping accepted; topical/non-entailing mapping downgraded |
| Claim decomposition | 3/3 limitations | Two parent limitations and one dependent added limitation retained |
| Limitation mapping | 2/2 aggregation states | Complete mapping and incomplete mapping classified separately |
| Single-reference discipline | 3/3 benchmark scenarios | Full single reference, split-reference trap, novelty/obviousness distinction |
| Partial-disclosure classification | 4/4 controls | Partial, relational, functional, and ordered-step failures stay incomplete |
| Priority/cutoff handling | 3/3 checks | Uncertain entitlement, multiple priority preservation, missing cutoff gate |
| Zero-results handling | 2/2 assertions | Scope-bound outcome; no absolute novelty wording |
| Research-required correctness | 4/4 gates | No search, missing authority, uncertain priority, unverified reference |
| Contradiction detection | 1/1 conflict | Matrix/narrative contradiction produces the required flag |
| Staleness detection | 2/2 changes | Claim amendment and new/changed prior art invalidate old result |
| Fail-closed behaviour | 8/8 controls | Reference, date, temporal, quote, entailment, authority, claim ambiguity, and provider failures |

## Regression and build evidence

- #015 targeted suite: 24/24 passed.
- Related targeted suite: 155/155 passed (novelty, prior art, claim QA/chart, citation, entailment, provider security, and related patent workflows).
- Entire document-engine suite: 145/145 passed.
- Foundation gate: 89/89 passed (77/77 Node tests and 12/12 Python tests).
- Verification gate: 28/28 passed.
- Security gate: 70/70 passed.
- Voice suite: 17/17 passed.
- Additional authority/quote/intake regression selection: 44/44 passed.
- Production build: passed; Vite transformed 2,294 modules and emitted the production bundle.

No live external patent search or practitioner validation was performed. Database-backed integration tests requiring live matter/provider state were not used as evidence for L4.

## Known limitations and parallel-work conflicts

- The benchmark is a local non-frozen scenario manifest plus deterministic behavioral tests, not an externally graded evidence artifact.
- The existing SQL novelty engine persists its established core fields. New document-session details such as full research-provenance and priority-feature arrays are not backed by a new migration in this change.
- Figure interpretation is represented by verified passage/location evidence and fail-closed mapping controls; no computer-vision patent-figure analyser was added.
- PCT remains a context and requires supplied verified authority; no claim is made that PCT is a granting jurisdiction.
- Voice shares the common session path, but novelty-specific voice ID continuity was not exercised end to end.
- The baseline worktree contained extensive modified/untracked work, including the shared document engine. Merge risk is concentrated in `src/lib/document-engine.js`, `src/lib/document-engine-router.js`, and `data/documents/capability-matrix.json`. No unrelated changes were reverted or overwritten.

## Final statuses

PATENT_NOVELTY_PROFILE_COMPLETE = TRUE

PATENT_NOVELTY_ROUTING_VERIFIED = TRUE

PATENT_NOVELTY_WORKFLOW_MODES_VERIFIED = TRUE

PATENT_NOVELTY_MATTER_CONTEXT_VERIFIED = TRUE

PATENT_NOVELTY_ONE_QUESTION_MODE_VERIFIED = TRUE

PATENT_NOVELTY_CLAIM_CONCEPT_DISTINCTION_VERIFIED = TRUE

PATENT_NOVELTY_CLAIM_VERSIONING_VERIFIED = TRUE

PATENT_NOVELTY_CLAIM_DECOMPOSITION_VERIFIED = TRUE

PATENT_NOVELTY_DEPENDENT_CLAIM_INHERITANCE_VERIFIED = TRUE

PATENT_NOVELTY_JURISDICTION_MODEL_VERIFIED = TRUE

PATENT_NOVELTY_AUTHORITY_PIPELINE_VERIFIED = TRUE

PATENT_NOVELTY_PRIORITY_CONTEXT_VERIFIED = TRUE

PATENT_NOVELTY_PRIORITY_SUPPORT_VERIFIED = TRUE

PATENT_NOVELTY_RESEARCH_GATE_VERIFIED = TRUE

PATENT_NOVELTY_ZERO_RESULTS_VERIFIED = TRUE

PATENT_NOVELTY_REFERENCE_EXISTENCE_VERIFIED = TRUE

PATENT_NOVELTY_DATE_VERIFICATION_VERIFIED = TRUE

PATENT_NOVELTY_TEMPORAL_RELEVANCE_VERIFIED = TRUE

PATENT_NOVELTY_QUOTE_VERIFICATION_VERIFIED = TRUE

PATENT_NOVELTY_ENTAILMENT_VERIFIED = TRUE

PATENT_NOVELTY_LIMITATION_MATRIX_VERIFIED = TRUE

PATENT_NOVELTY_EXPLICIT_DISCLOSURE_VERIFIED = TRUE

PATENT_NOVELTY_IMPLICIT_DISCLOSURE_REVIEW_VERIFIED = TRUE

PATENT_NOVELTY_PARTIAL_DISCLOSURE_VERIFIED = TRUE

PATENT_NOVELTY_SINGLE_REFERENCE_DISCIPLINE_VERIFIED = TRUE

PATENT_NOVELTY_CLAIM_CONSTRUCTION_REVIEW_VERIFIED = TRUE

PATENT_NOVELTY_FUNCTIONAL_LIMITATION_VERIFIED = TRUE

PATENT_NOVELTY_RELATIONAL_LIMITATION_VERIFIED = TRUE

PATENT_NOVELTY_METHOD_ORDER_VERIFIED = TRUE

PATENT_NOVELTY_NUMERICAL_RANGE_VERIFIED = TRUE

PATENT_NOVELTY_TRANSLATION_HANDLING_VERIFIED = TRUE

PATENT_NOVELTY_FAMILY_DEDUPLICATION_VERIFIED = TRUE

PATENT_NOVELTY_EVIDENCE_GRAPH_VERIFIED = TRUE

PATENT_NOVELTY_CONTRADICTION_DETECTION_VERIFIED = TRUE

PATENT_NOVELTY_RESEARCH_COMPLETENESS_VERIFIED = TRUE

PATENT_NOVELTY_RESEARCH_REQUIRED_GATE_VERIFIED = TRUE

PATENT_NOVELTY_OUTCOME_MODEL_VERIFIED = TRUE

PATENT_NOVELTY_STALENESS_VERIFIED = TRUE

PATENT_NOVELTY_DOWNSTREAM_HANDOFF_VERIFIED = TRUE

PATENT_NOVELTY_REPORT_GENERATION_VERIFIED = TRUE

PATENT_NOVELTY_EXPORT_VERIFIED = TRUE

PATENT_NOVELTY_VOICE_VERIFIED = PARTIAL

PATENT_NOVELTY_SECURITY_VERIFIED = TRUE

PATENT_NOVELTY_L3_DRAFTABLE = TRUE

PATENT_NOVELTY_L4_VALIDATED = FALSE

PATENT_NOVELTY_L5_PRACTITIONER_REVIEWED = FALSE
