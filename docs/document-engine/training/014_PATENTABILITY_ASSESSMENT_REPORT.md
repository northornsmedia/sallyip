# Document #014 — Patentability Assessment — Training Report

## Baseline / Final SHAs

- **Baseline SHA (session start):** `cf2b19de31b77df13dec9c39d25a97dabef49eb2`
- **Final HEAD SHA:** `adff2f28b3a1372a543a7e5edfbb8ab5a296def6` (HEAD moved during session: parallel agents committed Documents #009/#011/#012 work)
- **#014 working-tree changes:** uncommitted (see files added/modified below)

## Files Added

- `data/documents/profiles/patentability-assessment.json` — canonical profile #014 (21 sections, 11 workflow modes, 20 review flags, 9 disclaimers)
- `src/lib/patentability-assessment-service.js` — deterministic aggregation reusing novelty-service, patent-claim-service, inventive-step frameworks, entailment-service, contradiction-service, citation-service
- `src/lib/patentability-assessment-interview-graph.js` — matter-first, one-question interview with FTO/novelty/infringement/drafting disambiguation
- `benchmarks/document-intelligence-v1/patentability-assessment/cases.json` — 31 model-neutral cases + 10 adversarial prompts
- `tests/document-engine/patentability-assessment.test.mjs` — 23 deterministic regression tests
- `docs/document-engine/training/014_PATENTABILITY_ASSESSMENT_REPORT.md` — this report

## Files Modified

- `src/lib/document-engine-router.js` — added `patentability-assessment` branch (import + slug handler); no existing branches altered
- `src/lib/document-engine.js` — expanded `patentability-assessment` pattern with 9 spec aliases + bare `patentability` / `assess patentability`; no other patterns reordered
- `data/documents/capability-matrix.json` — added #014 entry (L3_DRAFTABLE); summary/levels incremented by one
- `data/documents/complete-document-catalogue.json` — added #014 entry; counts updated
- `src/lib/design-patent-interview-graph.js` — **parallel-agent bugfix (pre-existing):** 7 stray `)` characters breaking 6 regex literals, which crashed the shared router import chain for every document test. Minimal single-character deletions only
- `src/lib/patent-abstract-service.js` — **parallel-agent bugfix (pre-existing):** re-exported `PROVENANCE_STATES` (already imported from patent-drafting-service) to satisfy `patent-abstract-interview-graph.js` import; one additive line

## Canonical Profile

- id `patentability-assessment`, document_number `014`, family `PATENT_ANALYSIS`, status `BETA`, capability `L3_DRAFTABLE`, risk `HIGH`, review + verification required, jurisdiction `MULTI_JURISDICTION` / `CONTEXT_DEPENDENT`
- Disclaimers include NOT_GUARANTEED_PATENTABLE, NOT_GUARANTEE_OF_GRANT, NOT_GUARANTEE_OF_VALIDITY, NOT_FTO_OPINION, NOT_INFRINGEMENT_OPINION, PCT_CONTEXT_NOT_GRANT_JURISDICTION, REQUIRES_QUALIFIED_HUMAN_REVIEW

## Routing Aliases

`is my invention patentable`, `assess patentability`, `prepare a patentability assessment`, `evaluate whether this can be patented`, `review the patentability of this invention`, `assess novelty and inventive step`, `assess novelty and obviousness`, `does this invention appear patentable`, `analyse/analyze patentability against this prior art`, `prepare a preliminary patentability report`, bare `patentability`. Verified: novelty-only → `patent-novelty-opinion`; prior-art search → `patent-prior-art-search-report`; FTO/launch/sell → `freedom-to-operate-opinion`; infringement → `patent-infringement-analysis`; drafting → application workflows.

## Workflow Modes

All 11 spec modes accepted as `workflow_mode` passthrough; `CONCEPT_LEVEL_PATENTABILITY` auto-selected when no claims exist; `PATENTABILITY_AGAINST_PROVIDED_PRIOR_ART` relaxes the structured-search gate to reference-specific analysis (mirrors novelty-service semantics).

## Matter-Context Behaviour

`extractPatentabilityMatterContext` inspects claim_sets (multi-version → UNKNOWN + version list), direct claims, inventive concept, jurisdiction, priority context, references, research, authority before any question. Only material gaps are asked, one at a time.

## One-Question Behaviour

Question order: jurisdiction → analysis target → claim-set version (claims only) → priority cutoff → research status → authority. `routeConversationalIntent('Is my invention patentable?', {})` returns exactly 1 question (verified in test 23/23).

## Scope Model

`assessment_scope` passthrough stored on evaluation output and rendered as report §1. Scope includes target label, jurisdiction, workflow mode, claim/spec/research/authority versions where provided. No silent scope changes: staleness detector flags claim/spec/priority/research/authority/reference changes.

## Jurisdiction Model

US / EP / PCT_CONTEXT / OTHER / UNDECIDED. OTHER → JURISDICTION_RESEARCH_REQUIRED gap; UNDECIDED blocks. PCT_CONTEXT renders non-grant disclaimer and uses no national inventive-step framework. US→`us_graham_ksr`, EP→`epo_problem_solution` via existing `frameworkDefinition`; frameworks listed from `listInventiveStepFrameworks`.

## Concept-vs-Claim Analysis

`DEFINED_CLAIMS`/`DRAFT_CLAIMS` → claim-by-claim matrix; `INVENTIVE_CONCEPT` (or no claims) → concept-level preliminary labelling (`CONCEPT_LEVEL_ASSESSMENT`, never equated with claim-level). Dependent claims inherit full parent limitations via `buildEffectiveClaimLimitations` and receive their own added-limitation rows.

## Claim Decomposition

Reused verbatim from `patent-claim-service.buildEffectiveClaimLimitations`: limitation_id format `{version}:claim-{n}:limitation-{i}`, inherited vs added split, circular-dependency guard. No duplicate invention-fact model created.

## Legal Framework Verification

Authority must be `{verified:true, authority_id, version_or_date}` or readiness gap `VERIFIED_PATENTABILITY_FRAMEWORK_REQUIRED` blocks. US/EP structural analyses additionally gate on `inventive_step_framework_verified ?? authority.verified` plus resolvable `frameworkDefinition`. No hard-coded legal tests: framework step definitions come from `inventive-step-service`.

## Authority Hierarchy

Inherited from the shared pipeline: `legal_sources.authority_tier` ordering, `classifyContradiction` tier resolution, `gateRetrievedEvidence` tier filtering. No new hierarchy introduced.

## Authority Versioning

`authority_id` + `version_or_date` required; `detectPatentabilityStaleness` flags `LEGAL_FRAMEWORK_CHANGED` on authority_version drift; `createPatentabilityVersion` snapshots immutably with timestamps.

## Prior-Art Research Gate

Statuses NOT_SEARCHED / USER_PROVIDED_ONLY / PARTIAL_SEARCH / STRUCTURED_SEARCH_COMPLETED / RESEARCH_INCOMPLETE / UNKNOWN (re-exported from novelty-service). NOT_SEARCHED / RESEARCH_INCOMPLETE / UNKNOWN always block; USER_PROVIDED_ONLY / PARTIAL_SEARCH block unless provided-art mode or explicit PRELIMINARY scope. Zero results permitted but never equated with absence of prior art.

## Zero-Results Handling

Report §6/§7 emit `No relevant reference identified within the recorded search scope.` Deterministic test asserts the strings `no prior art exists` never appear in output.

## Reference Verification

`validatePatentabilityReference` delegates to `validateNoveltyReference`: immutable id, title, identifier, VERIFIED existence, publication date, date verification, temporal relevance, translation status. Any failure → `REFERENCE_VERIFICATION_FAILED` / `TEMPORAL_VERIFICATION_REQUIRED` gaps; unusable references cannot support conclusions.

## Quote Verification

`verifyQuote` (exact/fuzzy/missing) applied to every mapping with a quote; `missing` → QUOTE_VERIFICATION_FAILED + RESEARCH_REQUIRED; fuzzy → review-required. Tested with fabricated quotation.

## Temporal Analysis

`scorePriorArtCandidate`-compatible timing via novelty reference checks; `assessPriorityContext` multi-priority + limitation-level support preserved; uncertain priority → PRIORITY_DATE_REVIEW_REQUIRED; missing cutoff → PRIOR_ART_CUTOFF_REVIEW_REQUIRED. No effective-date fabrication.

## Novelty Engine Integration

`evaluateNoveltyOpinion` reused for limitation-level single-reference analysis (matrix, claim_results, contradictions, families, research completeness). Partial disclosure never rounded up; multi-reference splits never mosaiced (both regression-tested).

## US Obviousness Integration

Structural only: recorded combinations require ≥2 references + rationale + evidence passages + verified framework; otherwise RESEARCH_REQUIRED + HINDSIGHT_RISK. No KSR conclusion invented.

## EP Inventive-Step Integration

Structural only: closest prior art + distinguishing features + supported technical effects required; otherwise RESEARCH_REQUIRED. Could-would reasoning is not auto-generated.

## Reference-Combination Controls

`assessCombinationRationale` records REFERENCE_A/B, feature mapping passthrough, rationale, evidence, framework, status. Combinations without evidence/rationale are flagged, never silently treated as obvious.

## Hindsight Detection

Heuristic fail-closed: any combination lacking rationale or evidence carries `HINDSIGHT_RISK`. Claim-as-roadmap reconstruction is never accepted as reasoning.

## Technical-Effect Validation

`assessTechnicalEffect` types SUPPORTED / USER_ASSERTED / INFERRED_REVIEW_REQUIRED / UNSUPPORTED. Only SUPPORTED effects are usable as inventive-step facts; all others raise TECHNICAL_EFFECT_UNVERIFIED.

## Eligibility Analysis

Signal-gated + authority-gated: no signals → NO_ISSUE_IDENTIFIED_WITHIN_SCOPE; signals without verified framework → RESEARCH_REQUIRED; material signals → MATERIAL_ISSUE_REQUIRING_REVIEW. No generic software-patentable promises.

## Support/Disclosure Analysis

`assessSupportGaps` walks effective limitations for UNKNOWN/UNSUPPORTED specification_support; gaps emit SUPPORT_GAP. New-matter-sensitive handoff to specification sets NEW_MATTER_REVIEW_REQUIRED. Support is never manufactured.

## Claim Clarity Integration

Deterministic structural checks (antecedent-basis heuristic, indefinite-term list) emit CLARITY_REVIEW_REQUIRED. Kept separate from legal conclusions.

## Claim-by-Claim Analysis

Independent claims analysed separately; dependent claims assessed over inherited-plus-added limitations with their own matrix rows. Claim 1 outcome never copied to other claims (tested via claim_results structure).

## Evidence Graph

`buildPatentabilityEvidenceGraph`: CLAIM → LIMITATION → REFERENCE → PASSAGE nodes; HAS_LIMITATION / ASSESSED_AGAINST / SUPPORTED_BY / INFORMS_CONCLUSION edges. Every material conclusion traceable.

## Proposition Typing

9 types defined (TECHNICAL_FACT … UNCERTAINTY); matrix rows typed REFERENCE_FACT; unevidenced user statements (e.g. inventor novelty assertions) remain USER_ASSERTION-equivalent and cannot support favourable conclusions (tested: assertion-only input → RESEARCH_REQUIRED).

## Entailment Validation

`checkEntailment` applied to proposition/passage pairs: ENTAILS → VERIFIED, else RESEARCH_REQUIRED + CITATION_NOT_ENTAILING. Topically-related but non-entailing citations rejected (tested).

## Contradiction Detection

`classifyContradiction` reused; MATERIAL_CONFLICT → INCONCLUSIVE + ANALYSIS_CONTRADICTION; POTENTIAL → CONFLICT_REQUIRES_REVIEW. Narrative-vs-matrix contradictions detected via novelty-service helper.

## Research Completeness

`assessResearchCompleteness` reused: LOW/MODERATE/HIGH/UNKNOWN coverage measure with recorded dimensions, provenance, and `exhaustive:false` invariant (never claims exhaustive search).

## RESEARCH_REQUIRED Gate

Returned whenever: no/partial research outside allowed modes, unverified reference/date/quote/entailment, uncertain cutoff, unverified framework, missing target. Treated as a successful outcome, never a failure to paper over.

## Outcome Model

Issue-level FAVOURABLE_WITHIN_SCOPE / MIXED / MATERIAL_CONCERN / INCONCLUSIVE / RESEARCH_REQUIRED; overall PRELIMINARY_FAVOURABLE / PRELIMINARY_MIXED / MATERIAL_PATENTABILITY_CONCERNS / INCONCLUSIVE / RESEARCH_REQUIRED. No GUARANTEED_PATENTABLE / 100% / CERTAIN_TO_GRANT strings anywhere in code or tests. Confidence expressed as EVIDENCE_STRONG / MIXED / LIMITED / RESEARCH_REQUIRED with reasoning.

## Staleness / Change Impact

`detectPatentabilityStaleness` flags CLAIM_CHANGED / SPECIFICATION_CHANGED / PRIORITY_CONTEXT_CHANGED / NEW_OR_CHANGED_PRIOR_ART / LEGAL_FRAMEWORK_CHANGED / REFERENCE_METADATA_CHANGED → PATENTABILITY_ASSESSMENT_STALE. Claim-C-removal scenario from spec is covered by CLAIM_CHANGED + matrix recomputation on rerun (old conclusions never reused blindly: evaluation is a pure function of current input).

## Downstream Handoffs

`buildPatentabilityHandoff` to patent-claims-set / patent-specification / patent-prior-art-search-report / patent-novelty-opinion / inventive-step-analysis. Transfers claims, matrix, reference ids, jurisdiction, gaps, outcome; `automatic_claim_amendment:false` always; specification handoff sets `new_matter_review_required:true`.

## Citation Integrity

Quotes verified via `verifyQuote`; entailment via `checkEntailment`; immutable `reference_id`/`passage_id` identity preserved through matrix and graph; no fabricated citations (tested).

## Verification Inspector

No new inspector: matrix rows carry disclosure/quote/entailment/verification statuses; readiness carries reference checks, priority assessment, research completeness; contradictions carry passage-level detail — all consumable by the existing inspector.

## Confidentiality

No provider calls in #014 code paths (pure deterministic functions). Confidentiality enforced by the existing `assertChatAllowed` gate; regression test asserts unapproved free models throw CONFIDENTIAL_PROVIDER_UNAVAILABLE. CONFIDENTIAL_PILOT_BLOCKED preserved (review flag + report disclaimer path).

## Voice

No separate voice engine: interview state is plain `{facts, flags, answers, currentQuestionId}` session passable through the same `draftSession/session` + `matterContext` channel as text. Voice-specific wiring lives in the shared orchestrator, untouched.

## Tests Added

`tests/document-engine/patentability-assessment.test.mjs` — 23 tests, 23 pass. Covers: profile, routing/disambiguation, one-question behaviour, matter context, no-search gate, zero-results language, unverified/false/non-entailing evidence, partial disclosure, mosaic trap, combination/hindsight, technical effects, US/EP separation + PCT disclaimer, FTO clarification, inventor assertions, staleness/versioning, authority conflict, priority uncertainty, handoffs, 21-section report, evidence graph, provider gate, benchmark integrity, router one-question.

## Benchmark Cases

`benchmarks/document-intelligence-v1/patentability-assessment/cases.json` — 31 cases (PA-001…PA-031) + 10 adversarial prompts. Model-neutral (scenario/dimension only, no baked-in LLM text). Covers every spec scenario including concept/claim levels, US/EP/PCT, research states, zero results, single/partial/multi-reference, combinations, hindsight, effects, eligibility, support, clarity, unverified refs/quotes/entailment, priority, staleness, FTO distinction, assertions, conflicts, handoffs.

## Exact Denominators

- #014 regression: 23/23 pass
- Novelty + FTO + #014 combined: 79/79 pass
- Foundation: 77/77 pass (+12 Python OK)
- Security: 69/70 pass (1 pre-existing failure, see below)
- Build: PASS (2294 modules, ~5.9s)

## Build Result

`npm run build` — PASS, 2294 modules transformed.

## Known Limitations

1. L3 only: substantive analysis quality not externally validated (no L4 benchmark run with grading thresholds).
2. No practitioner review (L5 not claimed).
3. US/EP structural checks only — no auto-generated Graham/KSR or problem-solution reasoning text.
4. Eligibility/support/clarity are issue-spotting gates, not opinions.
5. `OTHER` jurisdictions always require further research; no OTHER-jurisdiction framework bundled.
6. Security suite has 1 pre-existing failure unrelated to #014: `tests/security/auth-hardening.test.mjs` → `api/_handlers/chat.js` contains a dev fallback (`aman@sallyip.com` + first-user fallback) committed at HEAD; file is unmodified in this working tree. Left untouched per parallel-work safety; flagged for the owning agent.

## Parallel-Work Conflicts

- HEAD moved cf2b19de → adff2f28 during this session (parallel agents committed #009/#011/#012 + design-patent files).
- Fixed (minimal, additive) two pre-existing breaks in parallel agents' untracked files that crashed the shared router import chain: `design-patent-interview-graph.js` (7 stray parens across 6 regexes), `patent-abstract-service.js` (missing PROVENANCE_STATES re-export). No behaviour changes beyond making the files parse/import.
- No shared verification logic weakened: all novelty/entailment/contradiction/citation code paths reused read-only.
- Merge risk: LOW for #014 files (all new except additive router/pattern/matrix/catalogue edits). Parallel agents editing `document-engine.js` patterns or `capability-matrix.json` concurrently could conflict textually; #014's edits are small, isolated hunks.

## Final Statuses

- PATENTABILITY_PROFILE_COMPLETE = TRUE (profile #014 on disk, loaded by `loadDocumentProfile`, asserted in test)
- PATENTABILITY_ROUTING_VERIFIED = TRUE (9/9 spec aliases + disambiguation vs novelty/FTO/infringement/drafting, 23-test suite)
- PATENTABILITY_SCOPE_MODEL_VERIFIED = TRUE (scope passthrough + §1 rendering + staleness-tracked versions)
- PATENTABILITY_ONE_QUESTION_MODE_VERIFIED = TRUE (router returns exactly 1 question for vague request)
- PATENTABILITY_MATTER_CONTEXT_VERIFIED = TRUE (multi-version claim sets → UNKNOWN + version list; single-version/jurisdiction/priority prefilled)
- PATENTABILITY_JURISDICTION_MODEL_VERIFIED = TRUE (US/EP/PCT_CONTEXT/OTHER/UNDECIDED + OTHER/UNDECIDED gates + PCT non-grant disclaimer)
- PATENTABILITY_CONCEPT_CLAIM_DISTINCTION_VERIFIED = TRUE (CONCEPT_LEVEL_ASSESSMENT labelling; claim-level matrix only with claims)
- PATENTABILITY_CLAIM_DECOMPOSITION_VERIFIED = TRUE (reused `buildEffectiveClaimLimitations`, inherited+added, tested)
- PATENTABILITY_AUTHORITY_PIPELINE_VERIFIED = TRUE (verified-authority gate; tiered hierarchy reused read-only)
- PATENTABILITY_AUTHORITY_VERSIONING_VERIFIED = TRUE (authority_id + version_or_date required; staleness on drift)
- PATENTABILITY_PRIOR_ART_GATE_VERIFIED = TRUE (NOT_SEARCHED/UNKNOWN block; provided-only mode scoped)
- PATENTABILITY_ZERO_RESULTS_VERIFIED = TRUE (scope-limited language; universal-absence strings asserted absent)
- PATENTABILITY_REFERENCE_EXISTENCE_VERIFIED = TRUE (VERIFIED-existence + date + temporal gates)
- PATENTABILITY_QUOTE_VERIFICATION_VERIFIED = TRUE (exact/fuzzy/missing via `verifyQuote`; fabricated quote test)
- PATENTABILITY_TEMPORAL_VALIDATION_VERIFIED = TRUE (priority assessment + cutoff gates reused)
- PATENTABILITY_NOVELTY_ANALYSIS_VERIFIED = TRUE (`evaluateNoveltyOpinion` reused; partial/multi-ref traps tested)
- PATENTABILITY_US_OBVIOUSNESS_VERIFIED = PARTIAL (structural combination/rationale/evidence gates + framework binding implemented and tested; no auto-generated Graham/KSR reasoning text by design)
- PATENTABILITY_EP_INVENTIVE_STEP_VERIFIED = PARTIAL (structural closest-art/distinguishing/effect gates + framework binding implemented and tested; no auto-generated problem-solution reasoning text by design)
- PATENTABILITY_REFERENCE_COMBINATION_CONTROL_VERIFIED = TRUE (recorded rationale+evidence+framework required; tested)
- PATENTABILITY_HINDSIGHT_CONTROL_VERIFIED = TRUE (HINDSIGHT_RISK on rationale/evidence absence; tested)
- PATENTABILITY_TECHNICAL_EFFECT_VERIFIED = TRUE (SUPPORTED-only usability; tested)
- PATENTABILITY_ELIGIBILITY_ANALYSIS_VERIFIED = PARTIAL (signal + authority gates + review statuses implemented and tested; jurisdiction-specific opinion text not generated)
- PATENTABILITY_SUPPORT_ANALYSIS_VERIFIED = PARTIAL (gap detection + handoff + new-matter flag implemented and tested; no auto-insertion of support by design)
- PATENTABILITY_CLAIM_CLARITY_VERIFIED = PARTIAL (deterministic structural checks implemented and tested; kept separate from legal conclusions by design)
- PATENTABILITY_CLAIM_BY_CLAIM_VERIFIED = TRUE (per-claim results; dependent claims assessed on full effective sets)
- PATENTABILITY_EVIDENCE_GRAPH_VERIFIED = TRUE (nodes/edges asserted in test)
- PATENTABILITY_ENTAILMENT_VERIFIED = TRUE (`checkEntailment` wired; non-entailing citations rejected in test)
- PATENTABILITY_CONTRADICTION_DETECTION_VERIFIED = TRUE (`classifyContradiction` wired; conflict test)
- PATENTABILITY_RESEARCH_COMPLETENESS_VERIFIED = TRUE (`assessResearchCompleteness` reused; exhaustive:false invariant)
- PATENTABILITY_RESEARCH_REQUIRED_GATE_VERIFIED = TRUE (all missing-evidence paths return RESEARCH_REQUIRED; tested)
- PATENTABILITY_OUTCOME_MODEL_VERIFIED = TRUE (5 overall outcomes + issue statuses; no guarantee strings; tested)
- PATENTABILITY_STALENESS_VERIFIED = TRUE (6 change classes; immutable versions; tested)
- PATENTABILITY_DOWNSTREAM_HANDOFF_VERIFIED = TRUE (5 targets; no silent amendment; new-matter flag; tested)
- PATENTABILITY_CITATION_INTEGRITY_VERIFIED = TRUE (immutable ids; quote+entailment gates; tested)
- PATENTABILITY_REPORT_GENERATION_VERIFIED = TRUE (21 sections rendered; qualification language asserted)
- PATENTABILITY_EXPORT_VERIFIED = PARTIAL (report is markdown via shared `assemble*` + existing export pipeline; no #014-specific export test added — shared pipeline already covered)
- PATENTABILITY_VOICE_VERIFIED = PARTIAL (state is plain serialisable session shared with text path; no voice-run test added — shared orchestrator untouched)
- PATENTABILITY_SECURITY_VERIFIED = TRUE (no provider calls in #014 paths; provider-gate test; CONFIDENTIAL_PILOT_BLOCKED flag preserved)
- PATENTABILITY_L3_DRAFTABLE = TRUE (profile + router + interview + structured evidence-linked assessment + 23/23 tests)
- PATENTABILITY_L4_VALIDATED = FALSE (no graded benchmark run with thresholds; cases.json is structure-only by design)
- PATENTABILITY_L5_PRACTITIONER_REVIEWED = FALSE (no practitioner review evidence)
