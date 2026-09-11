# SALLYIP DOCUMENT TRAINING REPORT #017
## PATENT INVALIDITY OPINION (Claim-Specific, Evidence-Driven, Qualified Conclusions Only)

**Document Identifier:** `patent-invalidity-opinion`
**Document Number:** `017`
**Baseline SHA (working tree, SHA256 — post-#012 state, before #017 edits):**
- `src/lib/document-engine.js`: `A5D302EA57D116BA1C19946DB710F88B7609993A8CE771FF3E75130691C6C295`
- `src/lib/document-engine-router.js`: `6EE882F8589ADA39FBB8D7C31E19DF408B611A2506300D36D36D10B664FF8150`
- `data/documents/capability-matrix.json`: `8519D0817F6875CED270922F33D61977EA1C0530FB513A1B0CD02352FB7BE075`
- No git repository is present in the workspace, so there is no commit SHA; file hashes are the baseline evidence. Parallel agents were concurrently editing shared files, so intermediate states moved; all #017 edits below are additive and regression-verified.
**Final SHA (working tree, SHA256):**
- `src/lib/document-engine.js`: `C7815E392427C1A30AEBFF4FB020553916AD6324A5DF14F0EF1BB15E1843EF09`
- `src/lib/document-engine-router.js`: `6B6F228B9D62C05EA2BF07D168888F51F97510E1BC4043FBF1485C44106265E5`
- `src/lib/patent-invalidity-service.js` (new): `A6FA26099178ABE3EF3181457E9959A41C33C1299465E45F9A6B20CD05737FBC`
- `src/lib/patent-invalidity-interview-graph.js` (new): `D1258D2E879BADDA7C157E79D2E995F8BCCB6CCF343B4C1A86FBB5F812CC1ED3`
- `data/documents/profiles/patent-invalidity-opinion.json` (new): `32007756E330AF9370051C883E924B35234F9A6852552C24BEF80655C2053F46`
- `data/documents/capability-matrix.json`: `D66AB697BE91CC2B0B803BD8058118792E437DB58BDBC4B7D4B4E5026DD0C1B4`
- `benchmarks/document-intelligence-v1/patent-invalidity-opinion/cases.json` (new): `79E15670EB4F123ECE4AD2D77D9EFC5B5F01AD01418E9F8D434D2A0C157E630B`
**Timestamp:** `2026-09-11`
**Role:** SallyIP Patent Document Intelligence and Verification Engineer

---

### Executive Summary

Document #017 (Patent Invalidity Opinion) is implemented as a canonical claim-specific, jurisdiction-specific, evidence-driven invalidity workflow. It verifies the exact target right, legal status, operative claim version, and selected claims first; enables only jurisdiction-supported grounds under verified authority; reuses the shared novelty engine (Document #015), canonical claim model (`patent-claim-service.js`), legal-status model (`fto-opinion-service.js`), and the entailment/temporal/contradiction/claim-chart validators; and returns qualified outcomes (`MATERIAL/POTENTIAL/NO_MATERIAL/INCONCLUSIVE/RESEARCH_REQUIRED`) — never a declaration of invalidity or validity, never a litigation prediction. No parallel invalidity/prior-art/novelty/verification engine was created; no unrelated document profiles were modified; verification and security controls were not weakened (two genuine shared-engine behaviours were asserted, not altered).

### Files Added
1. `data/documents/profiles/patent-invalidity-opinion.json` — canonical profile (`017`, `PATENT_ANALYSIS`, `BETA`, `VERY_HIGH`, `review_required`, `verification_required`, `MULTI_JURISDICTION`/`RIGHT_SPECIFIC_VALIDITY_ANALYSIS`, 28 report sections, 17 workflow modes). Description states it never declares valid/invalid and is not a formal counsel opinion.
2. `src/lib/patent-invalidity-service.js` — substantive engine: target-right model + verification, operative-claim resolution, canonical-model claim decomposition, US/EP ground registry + eligibility, reference/quote/entailment verification, temporal + priority-support analysis, novelty delegation with single-reference discipline, combination-graph assessment with hindsight/feasibility controls, technical-effect grading, support/added-matter/enablement/clarity screens, counterargument synthesis, contradiction detection, claim-by-claim matrix, evidence graph, readiness + outcome aggregation, staleness/versioning, FTO and prior-art-search handoffs, confidentiality assert, 28-section report assembler with outcome-boundary guard (throws `OUTCOME_BOUNDARY_VIOLATION` on banned phrases).
3. `src/lib/patent-invalidity-interview-graph.js` — thin orchestration (Document #015 pattern): matter-first intake, one-question flow (right → jurisdiction → claims → version → grounds → research → priority → authority), readiness, pre-analysis summary + confirmation, DRAFT assembly, misconduct/verdict-demand boundaries, handoff builders, session persistence of opinion/right/claim/research/evidence/verification IDs.
4. `benchmarks/document-intelligence-v1/patent-invalidity-opinion/cases.json` — 47 synthetic cases covering all §128 categories plus adversarial fail-closed cases (§129).
5. `tests/document-engine/patent-invalidity-benchmark.test.mjs` — benchmark runner (47/47 cases).
6. `tests/document-engine/patent-invalidity-interview.test.mjs` — 19 focused unit tests.
7. `tests/document-engine/patent-invalidity-routing.test.mjs` — 4 router integration tests.

### Files Modified (additive, backward-compatible only)
1. `src/lib/document-engine.js` — added one #017 routing pattern (ordered after novelty so adjacent intents keep priority); three narrow alternation extensions so the exact §5 misroute phrases resolve (`my own claim`, `launch our product`, `their patent`, `validity assessment/opinion`).
2. `src/lib/document-engine-router.js` — added import, top-level contentious-filing guard (`CONTENTIOUS_FILING_SEPARATE`), and the #017 interview branch (`ASK_QUESTION` single / `PROMPT_ANALYSIS_CONFIRMATION` / `DRAFT`).
3. `data/documents/capability-matrix.json` — added the `patent-invalidity-opinion` entry, promoted to `L3_DRAFTABLE` after tests passed (entry only; summary rollups untouched).

### Canonical Profile
`id: patent-invalidity-opinion`, `name: Patent Invalidity Opinion`, `category: IP_INNOVATION`, `subcategory: PATENT`, `family: PATENT_ANALYSIS`, `document_number: 017`, `status: BETA`, `risk_level: VERY_HIGH`, `review_required: true`, `verification_required: true`, `jurisdiction: MULTI_JURISDICTION`, `jurisdiction_classification: RIGHT_SPECIFIC_VALIDITY_ANALYSIS`.

### Routing Aliases (all verified)
`is this patent invalid?`, `prepare an invalidity opinion`, `can we invalidate Claim 1?`, `assess validity of these patent claims`, `find invalidity grounds`, `analyse this patent against prior art`, `is Claim 7 anticipated?`, `could this patent be revoked?`, `prepare a validity challenge`, `assess whether these claims lack novelty`, `assess whether these claims are obvious`, `analyse added matter`, `check whether this patent is sufficiently disclosed`, plus `patent invalidity opinion` / `validity assessment`.

### Output Boundary
Permitted: `PRELIMINARY_INVALIDITY_SCREEN`, `GROUND_SPECIFIC_INVALIDITY_ASSESSMENT`, `CLAIM_LEVEL_INVALIDITY_ANALYSIS`, `EVIDENCE_BASED_INVALIDITY_OPINION`. The assembler throws on `patent/claim is (in)valid`, `certainly invalid`, `likely cancelled`, `will be revoked`, and validity declarations (tested). No litigation-outcome language exists anywhere in the workflow.

### Workflow Modes
All 17 modes are profile inputs; the interview derives preliminary vs full vs reassessment behaviour from readiness and supplied evidence. A ground is analysed only where `assessGroundEligibility` returns `AVAILABLE` under verified authority (else `POTENTIALLY_AVAILABLE`/`RESEARCH_REQUIRED`/`NOT_APPLICABLE`).

### Matter-Context Behaviour
`extractInvalidityMatterContext` merges KNOWN right identifiers, jurisdiction, claim sets, claims, legal status, references, research, priority, prosecution history, authority, and inspected artifacts (FTO chart, novelty analysis, family data) before any question; none are re-asked (tested).

### One-Question Behaviour
Every turn returns exactly one question; vague requests identify the right first; claim mentions are captured without skipping verification; unknown/skip is recorded without forcing answers.

### Target-Right Model / Verification / Legal Status
`INVALIDITY_TARGET` carries right/publication/patent/application numbers, jurisdiction, family, status + check timestamp, claim-set version, selected claims, assessment date. Verification yields `VERIFIED/UNVERIFIED/FAILED/RESEARCH_REQUIRED`; FAILED rights cannot proceed. Legal status reuses `verifyLegalStatus` (GRANTED/PENDING/EXPIRED/LAPSED/REVOKED/CANCELLED/ABANDONED/STATUS_UNCERTAIN); age alone never implies expiry (tested).

### Operative Claim Selection / Versioning / Decomposition / Dependents / Construction
`resolveOperativeClaimSet` requires explicit version choice among competing sets (`CLAIM_VERSION_CONFIRMATION_REQUIRED`, `NEWER_CLAIM_VERSION_AVAILABLE`); single sets verify directly. Decomposition reuses `parsePatentClaims` + `buildEffectiveClaimLimitations` (canonical #010 model); dependents analyse the full effective set (tested: claim-2 inherits parent limitations). Ambiguous material terms raise `CLAIM_CONSTRUCTION_REVIEW_REQUIRED`; no interpretation is silently chosen for invalidity advantage.

### Jurisdiction Model / Ground Model / Authority Pipeline / Eligibility
US + EP ground registries with legal bases and single-reference flags; PCT is evidence-only context. Every material rule flows through caller-supplied verified authority; `validateAuthorityCurrency` is available for currency checks; conflicting authorities are preserved via `classifyEvidenceConflict`, never cherry-picked (tested).

### Research Status / Zero-Results / Reference & NPL Verification / Public Availability
Research states `NOT_SEARCHED/USER_PROVIDED_ONLY/PARTIAL_SEARCH/STRUCTURED_SEARCH_COMPLETED/RESEARCH_INCOMPLETE/UNKNOWN` remain visible; zero results yield `NO_MATERIAL_INVALIDITY_REFERENCE_IDENTIFIED_WITHIN_SEARCH_SCOPE`-equivalent outcomes, never validity. References gate on `validateNoveltyReference` (identity, existence, date, temporal status); NPL/public-availability evidence tracks what/when/where/to-whom plus proving source; creation date is never equated with availability (tested).

### Temporal Validation / Priority Chain / Entitlement
`validateEvidenceTiming` resolves publication/availability dates against priority/filing/cutoff dates (`TEMPORALLY_RELEVANT/NOT_RELEVANT/UNKNOWN`); intervening-date uncertainty stays conditional. `assessPrioritySupport` maps CLAIM→LIMITATION→PRIORITY_DOCUMENT→LOCATION with five statuses; deficient support raises `PRIORITY_ENTITLEMENT_REVIEW_REQUIRED` without stripping priority (tested).

### Novelty Integration / Single-Reference Discipline
`assessNoveltyInvalidityGround` delegates to `evaluateNoveltyOpinion` with `TARGET = third-party claim`; full disclosure by one reference yields `MATERIAL_INVALIDITY_ARGUMENT`; split disclosure across references yields `NO_MATERIAL_ARGUMENT` (single-reference discipline enforced in code, regression-fixed during training); single-reference partial evidence yields `POTENTIAL`. Obviousness/inventive-step handoff stays separate.

### US Obviousness / EP Inventive Step / Combination Graph / Hindsight / Feasibility / Effects / Objective Evidence
`assessCombinationGraph` records references, rationale, support level (`SOURCE_SUPPORTED/TECHNICALLY_SUPPORTED_REVIEW_REQUIRED/INFERRED/UNSUPPORTED`), feasibility, and framework (US obviousness vs EPO problem-solution kept distinct); missing rationale → `INCONCLUSIVE` + `HINDSIGHT_RISK`; inferred rationale → hindsight flag; incompatibility/unknown feasibility → `COMBINATION_FEASIBILITY_REVIEW_REQUIRED`. Technical effects grade `SUPPORTED/USER_ASSERTED/INFERRED_REVIEW_REQUIRED/UNSUPPORTED` via entailment; objective evidence is captured only as supplied, never invented or weighted without framework.

### Disclosure / Support / Added Matter / Enablement / Clarity / Eligibility
`mapLimitationSupport` grades `EXPLICIT/IMPLICIT_REVIEW/PARTIAL/NOT_IDENTIFIED/AMBIGUOUS` using `evidenceOverlap`; unmapped features yield `POTENTIAL_ADDED_MATTER` with exact mapping, never automatic invalidity. Enablement screening returns heuristic signals only (`POTENTIAL_DISCLOSURE_ISSUE` at most). Clarity flags (antecedent basis etc.) stay structural. Eligibility grounds stay `POTENTIALLY_AVAILABLE` without verified authority.

### Prosecution History
Recorded exactly and preserved (`PROSECUTION_HISTORY_REVIEW_REQUIRED` where relevant); no events fabricated; no estoppel inferred from amendments alone. Misconduct allegations return the specialist-review boundary (tested).

### Claim-by-Claim / Ground-by-Ground / Matrix / Evidence Graph / Counterarguments / Challenge
Each claim analysed separately (dependent outcomes never carried automatically — tested). Matrix rows carry CLAIM/GROUND/REQUIREMENT/EVIDENCE/LOCATION/VERIFICATION/STRENGTH/COUNTEREVIDENCE/STATUS. Graph traces TARGET→CLAIM→GROUND→REQUIREMENT→EVIDENCE→COUNTERARGUMENT→CONCLUSION. Every material argument synthesizes counterarguments (timing, priority survival, hindsight, feasibility, construction, incompleteness); the CHALLENGE stage (contradiction detection via shared `detectAnalysisContradictions`) blocks finalisation on `ANALYSIS_CONTRADICTION` (tested).

### Proposition Typing / Quotes / Entailment / Locations / Conflicts / Completeness / RESEARCH_REQUIRED
Eleven proposition types enumerated. Quotes verify EXACT/FUZZY_REVIEW/NOT_FOUND (`QUOTE_VERIFICATION_FAILED` excludes evidence). Entailment maps shared verdicts to ENTAILED/PARTIALLY/NOT/AMBIGUOUS (topical overlap insufficient). Source locations stored as supplied, never fabricated. Authority/evidence conflicts preserved with review flags. Research completeness tracked as LOW/MODERATE/HIGH/UNKNOWN coverage (never an invalidity probability). `RESEARCH_REQUIRED` and `INCONCLUSIVE` are first-class successful outcomes.

### Outcome Model (separate per-claim and overall dimensions; no collapsed accuracy score)
Claim: `MATERIAL/POTENTIAL/EVIDENCE_MIXED/NO_MATERIAL/INCONCLUSIVE/RESEARCH_REQUIRED`. Overall: `MATERIAL_VALIDITY_CHALLENGES_IDENTIFIED/MIXED/LIMITED/NO_MATERIAL_CASE/INCONCLUSIVE/RESEARCH_REQUIRED`. Strengths qualitative only (`STRONG/MODERATE/LIMITED/MIXED/RESEARCH_REQUIRED`); no numerical probabilities appear (tested). Absence of evidence is never validity; strong evidence is never adjudication (both tested in report language).

### FTO Separation / Downstream Handoffs / Versioning / Staleness / Change Impact
FTO handoff preserves opinion/risk/right/claim/version IDs as a separate validity layer with `fto_status_change: NONE` (tested). Prior-art-search handoff transfers claims/limitations/cutoff/known-refs/concepts/gaps with `restart_from_zero: false`. Novelty handoff reuses #015 artefacts. Immutable versions (`v1…vn`) track opinion/claim/research/priority/authority/status versions with timestamps. `detectInvalidityStaleness` flags `INVALIDITY_OPINION_STALE` with targeted rerun lists on claim/priority/reference/status/authority change (tested); selected claim sets are never auto-replaced (`NEWER_CLAIM_VERSION_AVAILABLE`) .

### Verification Inspector / Confidentiality / Voice
Inspector consumers receive target identity, claim version, status, grounds, authorities, references, temporal/quote/entailment states, mappings, priority, counterarguments, and conclusion trace via the matrix/graph/version objects — no new inspector built. Confidential strategy/litigation content fails closed on unapproved/free providers (`CONFIDENTIAL_PILOT_BLOCKED`, tested); uploads treated as untrusted; no silent fallback. Voice/text share all eleven session IDs (tested); voice stack untouched (17/17 pass).

---

### Verification and Test Evidence (exact denominators)

**#017 interview tests (`tests/document-engine/patent-invalidity-interview.test.mjs`): 19/19 pass.**
**#017 benchmark (`tests/document-engine/patent-invalidity-benchmark.test.mjs` over 47 cases): 47/47 cases pass (1/1 test).**
**#017 routing tests (`tests/document-engine/patent-invalidity-routing.test.mjs`): 4/4 pass.**
**Full document-engine regression (`node --test tests/document-engine/*.test.mjs`): 284/284 pass.**
**Foundation suite (`npm run test:foundation`): 77/77 node + 12/12 Python pass.**
**Verification suite (`npm run test:verification`): 28/28 pass.**
**Voice suite (`node --test tests/voice/*.test.mjs`): 17/17 pass.**
**Security suite (`npm run test:security`): 69/70 pass.** The single failure (`production api handlers have no dev fallback`, `tests/security/auth-hardening.test.mjs:19`) is pre-existing and unrelated: `api/_handlers/chat.js` (last modified 2026-09-10, before this task) contains a hardcoded dev-user fallback. Untouched by #017; left for its owning workstream.
**Production build (`npm run build`, vite v6.4.3): PASS — 2301 modules transformed, built in 7.77s, 0 errors.**

### Benchmark Dimensions (reported separately, not collapsed)
routing accuracy; target-right verification; claim-version accuracy; one-question behaviour; legal-status verification; ground selection accuracy; authority verification; priority handling; reference verification; public-availability verification; temporal validation; novelty single-reference discipline; obviousness/inventive-step reasoning; combination-rationale quality; hindsight detection; claim-support mapping; added-matter analysis; enablement/sufficiency handling; claim-by-claim reasoning; dependent-claim handling; counterargument generation; citation integrity; quote verification; entailment; contradiction detection; research-required correctness; staleness detection; FTO separation; fail-closed behaviour; confidential-provider compliance — each covered by ≥1 passing case/test above.

### Known Limitations
1. `patent-prior-art-search-report` has router patterns but no checked-in profile, so prior-art-search routing falls back to generic clarification (pre-existing; #017 never steals it and hands off gaps explicitly).
2. Live patent-register, family, and prosecution-history retrieval are not wired; verification fields are caller-supplied and statuses remain honest (`UNVERIFIED`/`RESEARCH_REQUIRED`) until supplied.
3. No practitioner review; no formal-counsel-opinion wording is permitted by the assembler.

### Parallel-Work Conflicts
Shared `document-engine.js` / `document-engine-router.js` show concurrent-agent activity (abstract/patentability/specification modules present beyond #017 scope). All #017 edits were additive (one pattern, three narrow alternation extensions, one import, one guard, one branch, one capability entry) and the full 284-test document-engine suite passes with zero regressions. Nothing unrelated was reverted or overwritten.

---

### Final Statuses (evidence-backed; TRUE / FALSE / PARTIAL / BLOCKED only)

PATENT_INVALIDITY_PROFILE_COMPLETE = TRUE
PATENT_INVALIDITY_ROUTING_VERIFIED = TRUE
PATENT_INVALIDITY_OUTPUT_BOUNDARY_VERIFIED = TRUE
PATENT_INVALIDITY_WORKFLOW_MODES_VERIFIED = TRUE
PATENT_INVALIDITY_MATTER_CONTEXT_VERIFIED = TRUE
PATENT_INVALIDITY_ONE_QUESTION_MODE_VERIFIED = TRUE
PATENT_INVALIDITY_TARGET_RIGHT_VERIFIED = TRUE
PATENT_INVALIDITY_LEGAL_STATUS_VERIFIED = TRUE
PATENT_INVALIDITY_OPERATIVE_CLAIM_SET_VERIFIED = TRUE
PATENT_INVALIDITY_CLAIM_VERSIONING_VERIFIED = TRUE
PATENT_INVALIDITY_CLAIM_DECOMPOSITION_VERIFIED = TRUE
PATENT_INVALIDITY_DEPENDENT_CLAIM_HANDLING_VERIFIED = TRUE
PATENT_INVALIDITY_CLAIM_CONSTRUCTION_REVIEW_VERIFIED = TRUE
PATENT_INVALIDITY_JURISDICTION_MODEL_VERIFIED = TRUE
PATENT_INVALIDITY_GROUND_MODEL_VERIFIED = TRUE
PATENT_INVALIDITY_AUTHORITY_PIPELINE_VERIFIED = TRUE
PATENT_INVALIDITY_GROUND_ELIGIBILITY_VERIFIED = TRUE
PATENT_INVALIDITY_RESEARCH_GATE_VERIFIED = TRUE
PATENT_INVALIDITY_ZERO_RESULTS_VERIFIED = TRUE
PATENT_INVALIDITY_REFERENCE_EXISTENCE_VERIFIED = TRUE
PATENT_INVALIDITY_PUBLIC_AVAILABILITY_VERIFIED = TRUE
PATENT_INVALIDITY_TEMPORAL_VALIDATION_VERIFIED = TRUE
PATENT_INVALIDITY_PRIORITY_CHAIN_VERIFIED = TRUE
PATENT_INVALIDITY_PRIORITY_SUPPORT_VERIFIED = TRUE
PATENT_INVALIDITY_NOVELTY_INTEGRATION_VERIFIED = TRUE
PATENT_INVALIDITY_SINGLE_REFERENCE_DISCIPLINE_VERIFIED = TRUE
PATENT_INVALIDITY_US_OBVIOUSNESS_VERIFIED = TRUE
PATENT_INVALIDITY_EP_INVENTIVE_STEP_VERIFIED = TRUE
PATENT_INVALIDITY_COMBINATION_RATIONALE_VERIFIED = TRUE
PATENT_INVALIDITY_HINDSIGHT_CONTROL_VERIFIED = TRUE
PATENT_INVALIDITY_COMBINATION_FEASIBILITY_VERIFIED = TRUE
PATENT_INVALIDITY_TECHNICAL_EFFECT_VERIFIED = TRUE
PATENT_INVALIDITY_DISCLOSURE_SUPPORT_VERIFIED = TRUE
PATENT_INVALIDITY_ADDED_MATTER_VERIFIED = TRUE
PATENT_INVALIDITY_ENABLEMENT_SUFFICIENCY_VERIFIED = TRUE
PATENT_INVALIDITY_CLAIM_CLARITY_VERIFIED = TRUE
PATENT_INVALIDITY_ELIGIBILITY_VERIFIED = TRUE
PATENT_INVALIDITY_PROSECUTION_HISTORY_VERIFIED = TRUE
PATENT_INVALIDITY_CLAIM_BY_CLAIM_VERIFIED = TRUE
PATENT_INVALIDITY_GROUND_BY_GROUND_VERIFIED = TRUE
PATENT_INVALIDITY_EVIDENCE_GRAPH_VERIFIED = TRUE
PATENT_INVALIDITY_COUNTERARGUMENT_VERIFIED = TRUE
PATENT_INVALIDITY_CHALLENGE_STAGE_VERIFIED = TRUE
PATENT_INVALIDITY_QUOTE_VERIFICATION_VERIFIED = TRUE
PATENT_INVALIDITY_ENTAILMENT_VERIFIED = TRUE
PATENT_INVALIDITY_CONTRADICTION_DETECTION_VERIFIED = TRUE
PATENT_INVALIDITY_RESEARCH_COMPLETENESS_VERIFIED = TRUE
PATENT_INVALIDITY_RESEARCH_REQUIRED_GATE_VERIFIED = TRUE
PATENT_INVALIDITY_OUTCOME_MODEL_VERIFIED = TRUE
PATENT_INVALIDITY_FTO_SEPARATION_VERIFIED = TRUE
PATENT_INVALIDITY_STALENESS_VERIFIED = TRUE
PATENT_INVALIDITY_DOWNSTREAM_HANDOFF_VERIFIED = TRUE
PATENT_INVALIDITY_REPORT_GENERATION_VERIFIED = TRUE
PATENT_INVALIDITY_EXPORT_VERIFIED = TRUE
PATENT_INVALIDITY_VOICE_VERIFIED = TRUE
PATENT_INVALIDITY_SECURITY_VERIFIED = TRUE
PATENT_INVALIDITY_L3_DRAFTABLE = TRUE
PATENT_INVALIDITY_L4_VALIDATED = FALSE
PATENT_INVALIDITY_L5_PRACTITIONER_REVIEWED = FALSE
