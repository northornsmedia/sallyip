# Document #009 — Patent Specification Training Report

## Baseline and final state

- Baseline SHA: `0a2cbcc786dbf19430f8bd084906df6c675d3639`
- Final SHA: `0a2cbcc786dbf19430f8bd084906df6c675d3639`
  - No commit was created. The final state is the same HEAD plus the uncommitted Document #009 working-tree changes listed below.
- The working tree already contained extensive unrelated uncommitted work (other document workflows, voice changes, audio assets). Document #009 changes were kept additive and narrow. One genuine unrelated blocker was fixed minimally (see "Parallel-work conflicts").

## Files added

- `data/documents/profiles/patent-specification.json`
- `src/lib/patent-specification-interview-graph.js`
- `src/lib/patent-specification-drafting-service.js`
- `benchmarks/document-intelligence-v1/patent-specification/cases.json`
- `tests/document-engine/patent-specification-interview.test.mjs`
- `tests/document-engine/patent-specification-benchmark.test.mjs`
- `docs/document-engine/training/009_PATENT_SPECIFICATION_REPORT.md`

## Files modified

- `src/lib/document-engine.js`
  - Added Patent Specification routing patterns after the Patent Abstract patterns and before generic patent-application matching (8/8 required phrases).
  - Added one narrow pre-pattern (`invention disclosure into a patent specification`) before generic invention-disclosure intake so that exact phrase routes to the specification, not the disclosure form.
  - Extended the specification pattern with the `draft the specification` variant.
  - No utility/provisional/PCT/national-phase/EP patterns were renamed or reordered.
- `src/lib/document-engine-router.js`
  - Added the two missing imports (`evaluatePatentSpecificationInterviewStep`, `assemblePatentSpecification`). The pre-existing Document #009 handler block referenced these modules without importing or implementing them, which broke ESM loading for every router-dependent test.
  - The handler itself (ASK_QUESTION / PROMPT_DRAFT_CONFIRMATION / DRAFT / CLARIFICATION_REQUIRED) was already present and left unchanged.
- `data/documents/capability-matrix.json`
  - Added `patent-specification` as Document #009 at `L3_DRAFTABLE`.
  - Updated only the corresponding summary counts (routable 28→29, questionnaire_ready 18→19, structured_outline 13→14, jurisdiction_aware 8→9, draftable 5→6, verification_ready 5→6, catalogued_only 396→395) and capability-level counts (L3 5→6).
- `src/components/voice/VoiceOverlay.jsx`
  - One-character genuine-blocker fix: `};` → `});` closing `controller.onStateChange(...)`. This unrelated uncommitted voice change broke `npm run build` for the whole app.

## Canonical profile

- ID/slug: `patent-specification`
- Name: `Patent Specification`
- Category: `IP_INNOVATION`
- Subcategory: `PATENT`
- Family: `PATENT_SPECIFICATION` (both `family` and `document_family` set)
- Document number: `009`
- Status: `BETA`
- Risk level: `HIGH`
- Review required: `true`
- Verification required: `true`
- Jurisdiction: `MULTI_JURISDICTION`
- Jurisdiction classification: `CONTEXT_DEPENDENT`
- The profile explicitly states the workflow is the substantive technical specification component, NOT a filed application, granted patent, filing package, or substitute for jurisdiction-specific forms.

## Routing aliases

Verified `8/8`:

- `draft a patent specification`
- `prepare the specification`
- `write the detailed patent specification`
- `prepare a full patent description`
- `draft the description for my patent`
- `turn this invention disclosure into a patent specification`
- `prepare the patent description`
- `draft the specification around these claims`

Verified non-stealing `4/4`:

- `draft a PCT application` → `pct-international-patent-application`, not specification.
- `draft a European patent application` → `european-patent-application`, not specification.
- `draft patent claims` → not specification (routes to the pre-existing general patent handler; the standalone Patent Claims Set workflow does not exist yet as a routable profile and is out of scope for this document).
- `draft a patent abstract` → `patent-abstract`, not specification.

## Specification-vs-application routing

- `detectFilingRouteRequest` treats full filing artifacts ("Prepare the full PCT application", EP applications, standalone claims/abstracts, provisional/utility/national-phase applications) as distinct from the standalone specification.
- A mid-session filing-route request returns `CLARIFICATION_REQUIRED` routing the user to the appropriate filing workflow, offering the standalone description as the alternative. Verified by test.

## Drafting modes

Implemented `11/11` in `detectPatentSpecificationMode` and honoured in the question DAG (`modes` filter) and assembly (`modeSections`):

- `FULL_SPECIFICATION`
- `DESCRIPTION_ONLY`
- `DETAILED_DESCRIPTION_ONLY`
- `BACKGROUND_ONLY`
- `SUMMARY_ONLY`
- `DRAWING_DESCRIPTIONS_ONLY`
- `EMBODIMENT_EXPANSION`
- `SPECIFICATION_FROM_CLAIMS`
- `SPECIFICATION_FROM_INVENTION_DISCLOSURE`
- `SPECIFICATION_REVIEW`
- `SPECIFICATION_REVISION`

Directly exercised end-to-end `4/11` (FULL, DETAILED_DESCRIPTION_ONLY, FROM_CLAIMS, FROM_DISCLOSURE); the remaining 7 are implemented with mode-filtered intake and assembly but only lightly covered — therefore drafting-mode verification is `PARTIAL`.

## One-question behaviour

- Cold request "Draft a patent specification." returns `ASK_QUESTION` with exactly one question (`questions.length === 1`), field `jurisdiction_context`: "First, is this specification intended for a particular filing route or jurisdiction, such as a US, PCT or European application?"
- No generic specification is emitted and no questionnaire is dumped. Verified `1/1` cold-start test plus a 9-turn scripted conversation test that advances exactly one question per turn to `PROMPT_DRAFT_CONFIRMATION` and then `DRAFT` only after "Yes, proceed with the draft."

## Matter-context behaviour

- `extractPatentSpecificationMatterFacts` runs before any question, mapping title, technical field, problem, core concept, components, claims, disclosure, drawings, inventors, applicant, and jurisdiction to KNOWN / INFERRED (default jurisdiction `UNDECIDED`, default mode `FULL_SPECIFICATION`, both INFERRED).
- A rich matter (title, field, disclosure, claims, figures) proceeds to at most one non-known question; verified KNOWN status for title, technical field, and existing claims in tests.

## Jurisdiction adaptation

- Contexts: `US`, `PCT`, `EP`, `OTHER`, `UNDECIDED` (explicit or undecided; never fabricated).
- Assembly emits a neutral jurisdiction note per context and asserts no jurisdiction-specific formalities in UNDECIDED mode (verified: UNDECIDED draft contains no "37 C.F.R.", "PCT Rule", or "EPC Rule" strings).

## Invention-type branching

- Reuses the shared `inferInventionType` primitive; branch-specific mechanism/component questions for SOFTWARE, AI_ML, COMPUTER_IMPLEMENTED, MECHANICAL, ELECTRONICS, CHEMICAL, COMPOSITION, PHARMACEUTICAL, BIOTECH, MANUFACTURING, MATERIALS, SYSTEM/METHOD/DEVICE/APPARATUS/OTHER.
- Chemical/pharma/biotech branches ask only for supported values and raise `SPECIALIST_REVIEW_REQUIRED`. Verified SOFTWARE / AI_ML / MECHANICAL / CHEMICAL / BIOTECH in benchmarks.

## Disclosure completeness

- 11 dimensions (CORE_CONCEPT, IMPLEMENTATION, MAKING, USING, COMPONENT_RELATIONSHIPS, PROCESS_STEPS, EMBODIMENTS, ALTERNATIVES, EXAMPLES, DRAWINGS, SUPPORT_FOR_CLAIMS), each SUFFICIENT / PARTIAL / MISSING / UNKNOWN; overall INSUFFICIENT / PARTIAL / SUFFICIENT_FOR_FIRST_DRAFT (core enablement + ≥4 sufficient dimensions).
- This is a drafting-readiness measure, not a legal sufficiency opinion. Verified by readiness tests.

## Claim-aware specification logic

- `buildClaimSupportMapForSpecification` produces CLAIM → LIMITATION → SPECIFICATION_SUPPORT → SECTION → SOURCE → STATUS (SUPPORTED / PARTIALLY_SUPPORTED / UNSUPPORTED / UNKNOWN) with granular comma-level limitation splitting so one unsupported element is never masked by neighbours.
- Claims are never treated as permission to invent: unsupported gaps stay UNSUPPORTED and trigger targeted follow-up questions ("Your claims recite X which is not yet described… How is this limitation implemented — using only known technical detail?").
- `buildClaimTermCoverage` maps CLAIM_TERM → DEFINITION/CONTEXT → FIRST_DISCLOSURE → SUPPORT_STATUS without creating narrow definitions.

## Claim support mapping

- Verified: claim reciting a "LiDAR sensor" with no LiDAR disclosure maps UNSUPPORTED (`1/1` test + CASE-12 benchmark); assembly never inserts LiDAR-like matter to cure the gap (asserted by content exclusion).

## Term coverage

- Verified: "optical sensor" present in disclosure maps SUPPORTED; controller/processor co-occurrence without an identity statement raises TERM_CONFLICT and is never silently merged.

## Embodiment model

- Embodiments carry name, features, essential/optional status, source, related claims, figures, and support status; no arbitrary embodiments are generated for length (PLACEHOLDER when none supplied). Alternative-embodiment discovery asks ("Is the sensor specifically required to be optical…?") and captures only user-confirmed alternatives.

## Alternative-feature handling

- Essential / preferred / optional / example-only classification captured at intake ("The camera is optional." → `feature_classes.camera === 'OPTIONAL'`); absolute rewrites ("the system requires a camera") are flagged via over-narrowing detection.

## Background safety

- Background uses only user-supplied references, labelled as context, never admitted as legally prior art; admission-like wording ("Conventional systems suffer from…") without supplied references raises BACKGROUND_ADMISSION_REVIEW_REQUIRED. Neutral fallback when no references exist.

## Experimental-data safety

- Quantitative effects require test provenance (`classifyTechnicalEffect` → USER_ASSERTED / SOURCE_SUPPORTED / INFERRED_REVIEW_REQUIRED / UNSUPPORTED); "We have not tested the system yet." yields PROPHETIC_OR_HYPOTHETICAL_EXAMPLE labelling and no invented numbers (asserted: no "35%" in output; dedicated UNSUPPORTED test for "Tests showed a 35% improvement.").

## Figure handling

- Figure registry tracks figure number, type, components, reference numerals, description, and source; descriptions are generated only for supplied/planned figures (PLACEHOLDER otherwise, never invented figures).
- `CONFLICTING_REFERENCE_NUMERAL` (numeral 120 as sensor vs motor), `ORPHAN_REFERENCE_NUMERAL`, and undefined-component cases are flagged, never silently resolved. Verified by test + CASE-19.

## Terminology consistency

- Controlled terminology model (preferred_term, aliases, defined meaning, source, scope, ambiguity status); TITLE → FIELD → BACKGROUND → SUMMARY → DESCRIPTION → EMBODIMENTS → FIGURES → CLAIMS consistency checked; TERM_CONFLICT raised for ambiguous controller/processor duality.

## New-matter tracking

- Added content classified SUPPORTED_BY_EXISTING_DISCLOSURE / PARTIALLY_SUPPORTED / NEWLY_ADDED / UNCERTAIN; revisions against a priority/existing draft raise NEW_MATTER_REVIEW_REQUIRED. Verified: chemical-sensor embodiment added to optical-only disclosure → NEWLY_ADDED.

## Basis mapping

- Implemented as PROPOSITION → SOURCE_FACT → ORIGINAL_SECTION → FIGURE → CLAIM → STATUS rows built on every assembly (concept, components, and each claim limitation). Wired into the draft output; covered structurally rather than by a dedicated test — therefore `PARTIAL`.

## Section locking

- UNLOCKED / USER_LOCKED / REVIEW_LOCKED; `applySectionEdits` preserves locked sections on regeneration. Verified: USER_LOCKED summary survives regeneration (`preserved === ['summary']`).

## Change-impact analysis

- `analyzeChangeImpact` maps a changed technical fact to affected sections (e.g. components change → summary, detailed description, embodiments, drawings, abstract) with `preserveUnrelated: true`. Verified by test.

## Internal contradiction detection

- Sensor-count mismatches (summary vs detailed), local-vs-remote processing conflicts → INTERNAL_TECHNICAL_CONTRADICTION, never silently resolved. Verified via unit coverage.

## Verification

- Verification-first preserved: TECHNICAL_FACT / SOURCE_OBSERVATION / DRAFTING_LANGUAGE / LEGAL_ASSERTION / AUTHORITY kept separate; the service emits no USPTO/EPO/PCT rules, statutes, case law, deadlines, or formalities of its own. Suite: `test:verification` 28/28 pass.

## Confidentiality

- Fail-closed provider gate (`assertSpecificationChatAllowed`): confidential specification content to free-only engines throws `CONFIDENTIAL_PILOT_BLOCKED` with no silent fallback. Verified by test plus the provider-confidentiality suite (part of the 24/24 voice+provider run).

## Voice

- No separate voice specification workflow: voice and typed interactions share `draftSessionId` / `matterId` / `documentId`, question state, answers, terminology, embodiment, claim-support, and draft state through the same session object. Voice suites pass 24/24 (voice + provider-confidentiality). No specification-specific voice test exists — therefore `PARTIAL`.

## Tests added

- `tests/document-engine/patent-specification-interview.test.mjs` — 18/18 pass.
- `tests/document-engine/patent-specification-benchmark.test.mjs` — 2/2 pass, covering all 22 synthetic benchmark cases plus a technical-effect safety test.
- Exact denominators: routing 8/8 + non-stealing 4/4; cold-start one-question 1/1; turn-taking script 9 turns; readiness/confirmation/draft 3/3 gates.

## Exact denominators (regression)

- `tests/document-engine/*.test.mjs`: 260/260 pass (includes the 20 new #009 tests).
- `npm run test:foundation`: 77/77 node + 12/12 python pass.
- `npm run test:verification`: 28/28 pass.
- `npm run test:security`: 69/70 pass — the single failure (`auth-hardening`: "prod handler chat.js must not contain dev fallback") is pre-existing on committed HEAD; `api/` and `tests/security/` have no working-tree modifications from this task.
- Voice + provider-confidentiality: 24/24 pass.
- `npm run build`: passes (after the one-character VoiceOverlay blocker fix described above).

## Known limitations

1. Drafting modes 7/11 lightly covered end-to-end (REVIEW, REVISION, DESCRIPTION_ONLY, BACKGROUND_ONLY, SUMMARY_ONLY, DRAWING_DESCRIPTIONS_ONLY, EMBODIMENT_EXPANSION).
2. Basis mapping covered structurally, without a dedicated assertion test.
3. Abstract integration (no-new-matter abstract after specification context) is implemented as a placeholder discipline, not an exercised generator.
4. Export relies on the existing generic document-engine workspace / doc-export path; no specification-specific export test.
5. No practitioner review has occurred; no L4/L5 claims are made.
6. The pre-existing `test:security` auth-hardening failure on HEAD is untouched (out of scope; no `api/` changes made).

## Parallel-work conflicts

- Inspected HEAD (`0a2cbcc`) before modifying shared files; all shared-engine changes are additive and backward compatible (new patterns only, new imports only, no renamed patterns).
- Other agents are implementing Documents #001–#008 in parallel: no unrelated profiles were modified; frozen benchmark assets were not overwritten (new `patent-specification/` benchmark directory only).
- The pre-existing broken Document #009 handler references (added by earlier partial work without the implementation modules) are now satisfied by the two new modules; router-dependent suites pass 260/260.
- One genuine unrelated fix was required: `VoiceOverlay.jsx` `};` → `});` (uncommitted voice change that broke the production build). Flagged here for the owning agent.

## Final statuses

- PATENT_SPEC_PROFILE_COMPLETE = TRUE
- PATENT_SPEC_ROUTING_VERIFIED = TRUE
- PATENT_SPEC_APPLICATION_DISTINCTION_VERIFIED = TRUE
- PATENT_SPEC_INTERVIEW_VERIFIED = TRUE
- PATENT_SPEC_ONE_QUESTION_MODE_VERIFIED = TRUE
- PATENT_SPEC_MATTER_CONTEXT_VERIFIED = TRUE
- PATENT_SPEC_DRAFTING_MODES_VERIFIED = PARTIAL
- PATENT_SPEC_JURISDICTION_CONTEXT_VERIFIED = TRUE
- PATENT_SPEC_DISCLOSURE_READINESS_VERIFIED = TRUE
- PATENT_SPEC_CLAIM_AWARENESS_VERIFIED = TRUE
- PATENT_SPEC_CLAIM_SUPPORT_VERIFIED = TRUE
- PATENT_SPEC_TERMINOLOGY_MODEL_VERIFIED = TRUE
- PATENT_SPEC_EMBODIMENT_MODEL_VERIFIED = TRUE
- PATENT_SPEC_NEW_MATTER_GATE_VERIFIED = TRUE
- PATENT_SPEC_BASIS_MAPPING_VERIFIED = PARTIAL
- PATENT_SPEC_CONTRADICTION_CHECK_VERIFIED = TRUE
- PATENT_SPEC_SECTION_LOCKING_VERIFIED = TRUE
- PATENT_SPEC_CHANGE_IMPACT_VERIFIED = TRUE
- PATENT_SPEC_DRAFTING_VERIFIED = TRUE
- PATENT_SPEC_EDIT_PRESERVATION_VERIFIED = TRUE
- PATENT_SPEC_EXPORT_VERIFIED = PARTIAL
- PATENT_SPEC_VOICE_VERIFIED = PARTIAL
- PATENT_SPEC_SECURITY_VERIFIED = TRUE
- PATENT_SPEC_L3_DRAFTABLE = TRUE
- PATENT_SPEC_L4_VALIDATED = FALSE
- PATENT_SPEC_L5_PRACTITIONER_REVIEWED = FALSE
