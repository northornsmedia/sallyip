# SALLYIP DOCUMENT TRAINING REPORT #012
## PATENT DRAWINGS INSTRUCTIONS (Instructions Only — Never Final Drawings)

**Document Identifier:** `patent-drawings-instructions`
**Document Number:** `012`
**Baseline SHA (working tree, SHA256):**
- `src/lib/document-engine.js`: `5AB1FDF5FE62E994389E86BDEFC0000EDCB88E901422FE54C174ED3A676D6ADB`
- `src/lib/document-engine-router.js`: `50DB0560F3CB157F3AF3047B27E605685291309F2E5F9A347CAACA4BB824AB70`
- `src/components/document-engine-workspace.jsx`: `07BF5F0F081621CBB3020AD5C404E2D474E70966DF2FD277EED705A80564C368` (unmodified)
- `api/documents.js`: `9BCFBCFE0923D8299B6EA05B4E6B6FDCBA3F01CE50FBA69A57009ACE19F45EF3` (unmodified)
- No git repository is present in the workspace, so there is no commit SHA; file hashes above are the baseline evidence.
**Final SHA (working tree, SHA256):**
- `src/lib/document-engine.js`: `A5D302EA57D116BA1C19946DB710F88B7609993A8CE771FF3E75130691C6C295`
- `src/lib/document-engine-router.js`: `6EE882F8589ADA39FBB8D7C31E19DF408B611A2506300D36D36D10B664FF8150`
- `src/lib/patent-drawings-model.js` (new): `D502D464545C8DC4149A34695EDB3956D651B997CFCB697FCE64F9A5FDBFC4EC`
- `src/lib/patent-drawings-interview-graph.js` (new): `32256214D076494CE7E526CF4D2ECF1F76D8F73E0BD4DE549A0A8BF1000AB52F`
- `data/documents/profiles/patent-drawings-instructions.json` (new): `6F7A1E24DEF5637EA6E65940FAED11A0940E408AE4BC3418ADE8B5A28895BC7B`
- `data/documents/capability-matrix.json`: `8519D0817F6875CED270922F33D61977EA1C0530FB513A1B0CD02352FB7BE075`
- `benchmarks/document-intelligence-v1/patent-drawings-instructions/cases.json` (new): `3A2269DA9968488FA8477902323B6C3C15E9E3C5923B43F8E99C1E8FAABCACE2`
**Timestamp:** `2026-09-11`
**Role:** SallyIP Patent Document Intelligence Engineer

---

### Executive Summary

Document #012 (Patent Drawings Instructions) is implemented as a canonical, matter-first, one-question-at-a-time workflow that produces structured illustrator-facing instruction packages plus an attorney/internal QA view. It reuses the shared SallyIP patent/document architecture (document profiles, `document-engine.js` routing patterns, `document-engine-router.js` interview branching, `inferInventionType` from the utility-patent interview graph, provider-confidentiality policy, `doc-export` payloads, and the generic document workspace/API surface). No parallel drawing engine was created; no unrelated document profiles were modified.

When a user says *"Prepare patent drawing instructions,"* Sally does **not** emit generic figure instructions. It inspects matter context (specification, claims, existing figures/sketches/images, numerals, jurisdiction), derives a provisional figure plan, and then asks exactly **one** question at a time for the highest-priority gap, validates, stores, updates the plan, and repeats. Final packages are generated only after affirmative confirmation when an interview occurred.

### Files Added
1. `data/documents/profiles/patent-drawings-instructions.json` — canonical profile (`012`, `PATENT_DRAWINGS`, `BETA`, `MEDIUM`, `review_required`, `verification_required`, `MULTI_JURISDICTION`/`CONTEXT_DEPENDENT`, 9 output sections, 12 workflow modes, invention-type and jurisdiction-context inputs). Description explicitly states the output is instructions only, not final drawings/CAD/filing-compliant sets.
2. `src/lib/patent-drawings-model.js` — deterministic figure-plan model: fact extraction, invention-type figure candidates, deterministic numeral allocation (preserve existing, next multiple of 10 from 110), numeral conflict detection (4 codes), figure-gap analysis (6 codes), claim/specification figure maps, terminology consistency, image/spec conflicts, readiness, figure versioning/locking/renumbering, change-impact analysis, formal-requirements deferral (never hard-codes sheet rules), design-patent and actual-generation request classifiers, and the 9-section package assembler.
3. `src/lib/patent-drawings-interview-graph.js` — matter-first conditional interview reusing `inferInventionType`; `ONE_QUESTION_AT_A_TIME`; provisional plan before questioning; readiness gate with summary + affirmative confirmation; lock/unlock/remove figure commands; session persistence of `draftSessionId`/`matterId`/`documentId`/`drawingInstructionSetId`, figure plan, numeral registry, maps, gaps, conflicts, history, flags.
4. `benchmarks/document-intelligence-v1/patent-drawings-instructions/cases.json` — 24 synthetic cases (system, method, mechanical, exploded, cross-section, software, AI, electronics, medical, chemical, sketches, product photos, hidden structure, numeral conflicts ×2, missing claimed feature, alternatives, claim-change impact, terminology, lock, design misrouting, jurisdiction undecided, existing matter, insufficient context).
5. `tests/document-engine/patent-drawings-benchmark.test.mjs` — benchmark runner (24/24 cases).
6. `tests/document-engine/patent-drawings-interview.test.mjs` — 21 focused unit tests.
7. `tests/document-engine/patent-drawings-routing.test.mjs` — 4 router integration tests.

### Files Modified (additive only)
1. `src/lib/document-engine.js` — added one `#012` routing pattern (design-patent formal-figure requests are excluded and handled separately).
2. `src/lib/document-engine-router.js` — added imports, two narrow pre-resolution guards (formal ornamental design → Design Patent clarification; actual rendering → separation clarification), and the `#012` interview branch (`ASK_QUESTION` single question / `PROMPT_DRAFT_CONFIRMATION` / `DRAFT` package).
3. `data/documents/capability-matrix.json` — added the `patent-drawings-instructions` entry at `L3_DRAFTABLE` (entry only; stale summary rollups left untouched).

### Canonical Profile
`id: patent-drawings-instructions`, `name: Patent Drawings Instructions`, `category: IP_INNOVATION`, `subcategory: PATENT`, `family: PATENT_DRAWINGS`, `document_number: 012`, `status: BETA`, `risk_level: MEDIUM`, `review_required: true`, `verification_required: true`, `jurisdiction: MULTI_JURISDICTION`, `jurisdiction_classification: CONTEXT_DEPENDENT`.

### Routing Aliases
`prepare patent drawing instructions`, `write instructions for patent figures`, `tell the illustrator what to draw`, `prepare figure instructions`, `prepare drawing brief for my patent`, `create a patent illustration brief`, `prepare instructions for Figures 1 to 8`, `map the specification into drawings`, `what drawings do I need for this patent?`

### Drawing-Instructions-vs-Final-Drawings Distinction
Enforced in profile description, package section 1 header/body (`PATENT_DRAWINGS_INSTRUCTIONS, not FINAL_DRAWINGS`), actual-generation separation guard, and tests. The workflow never claims filing compliance; formal rules are `UNVERIFIED` unless verified authority is supplied.

### Workflow Modes
All 12 modes are profile inputs; `detectWorkflowMode` classifies sketches/images/gap/numeral/description/update/jurisdiction/review/claims/specification/disclosure intents; single-figure updates do not force a full plan (unknown update targets raise `EXISTING_FIGURE_CONFLICT`).

### Matter-Context Behaviour
`extractDrawingMatterFacts` merges `KNOWN` matter facts (title, applicant, jurisdiction, specification/claims text, components, steps, relationships, existing figures/numerals, attachments) before any question; `KNOWN` fields are never re-asked (verified by tests).

### Conditional Interview Behaviour / One-Question Behaviour
Provisional plan is derived first; only the highest-priority gap is asked; every turn returns exactly one question; vague component answers trigger one targeted follow-up; `UNKNOWN`/skip is stored as placeholder without fabrication.

### Invention-Type Branching
`SYSTEM/METHOD/DEVICE/APPARATUS/MECHANICAL/ELECTRONICS/SOFTWARE/AI_ML/NETWORK/PROCESS/MANUFACTURING/CHEMICAL/BIOTECH/MEDICAL_DEVICE/MATERIALS/OTHER` each map to only relevant figure classes (e.g. no decorative cross-sections; chemical/biotech apparatus flagged `SPECIALIST_DRAWING_REVIEW_REQUIRED`).

### Figure-Plan Model / Purpose Model / Gap Analysis / Claim & Spec Mapping
Figures carry `figure_id/display_number/figure_type/title/purpose/source_support/components/relationships/reference_numerals/required_views/status/necessity/review_flags/version/lock/history`. Necessity is `CORE/SUPPORTING/OPTIONAL` (never decorative). Gaps use the six required codes without asserting legal mandates. Claim maps use `SHOWN/PARTIALLY_SHOWN/NOT_SHOWN/NOT_APPLICABLE/UNKNOWN`; spec maps use `SUPPORTED/PARTIALLY_SUPPORTED/UNSUPPORTED/UNKNOWN`.

### Reference Numeral Registry / Numeral Conflicts
Deterministic allocation preserves existing numerals and assigns new ones sequentially from 110 in steps of 10. Detects `SAME_NUMERAL_DIFFERENT_COMPONENT`, `SAME_COMPONENT_MULTIPLE_NUMERALS`, `UNDEFINED_NUMERAL`, `ORPHAN_NUMERAL`, `FIGURE_SPEC_NUMERAL_CONFLICT`. Locked figures are never silently renumbered (`renumberFigures` preserves locks + history).

### View Relationships / Geometry Safety
`required_views` per figure, cross-view consistency notes, renumber history, and relationship carry-over into component figures (regression-fixed during training: supported assembly relationships now reach exploded views). Geometry safety: only known spatial relationships are described; dimensions/angles/hidden surfaces/scale/materials/flows are prohibited unless source-supported.

### Sketch/Image Ingestion / Image-Spec Conflicts
Assets classify observations as `VISIBLE/USER_CONFIRMED/INFERRED/UNKNOWN`; only visible/confirmed features enter the plan; counts mismatches raise `IMAGE_SPEC_CONFLICT` without preferring either source; exterior-only photos never yield cross-sections (`CROSS_SECTION_DETAIL_REQUIRED` instead).

### Software/AI / Mechanical / Flowchart Logic
Software/AI figures use only supplied modules (tests forbid blockchain/message-queue/AI-service and invented layers/datasets); mechanical figures use perspective/exploded/detail only with component support; flowchart steps mirror supported disclosure exactly.

### Drawing Instruction Format / Figure Description Integration
Nine-section package follows the mandated per-figure structure (number, title/type, purpose, view, elements, numerals, relationships, flows, optional features, not-to-add, sources, open questions, illustrator notes, review flags); figure-description generation is a supported workflow mode using the same plan data.

### Cross-Document Change Impact / Versioning / Locking
`analyzeDrawingChangeImpact` identifies affected figures/mappings, preserves locked figures, and raises `DRAWING_REVIEW_REQUIRED`. Figures are versioned (`createFigureVersion`), edits respect `UNLOCKED/USER_LOCKED/REVIEW_LOCKED`, and history is preserved across renumbering.

### Formal-Rule Verification
`getFormalDrawingRequirements` returns `UNVERIFIED` + `FORMAL_RULE_VERIFICATION_REQUIRED` unless verified authority (source + retrieval timestamp) is supplied; tests assert no numeric sheet values appear. No USPTO/PCT/EPO rules, margins, fees, or deadlines are hard-coded.

### Confidentiality
No new providers; `assertDrawingConfidentiality` wraps the shared `assertChatAllowed` fail-closed policy and tags `CONFIDENTIAL_PILOT_BLOCKED`; free/unapproved models throw; file ingestion reuses `validateUpload`/prompt-injection flagging (uploads treated as untrusted). No silent fallback.

### Voice
Voice/typed parity via persisted `draftSessionId/matterId/documentId/drawingInstructionSetId` across turns (tested); no separate voice drawing workflow; existing voice stack untouched (17/17 voice tests pass).

---

### Verification and Test Evidence (exact denominators)

**#012 interview tests (`tests/document-engine/patent-drawings-interview.test.mjs`): 21/21 pass.**
**#012 benchmark (`tests/document-engine/patent-drawings-benchmark.test.mjs` over 24 cases): 24/24 cases pass (1/1 test).**
**#012 routing tests (`tests/document-engine/patent-drawings-routing.test.mjs`): 4/4 pass.**
**Full document-engine regression (`node --test tests/document-engine/*.test.mjs`): 240/240 pass.**
**Verification suite (`npm run test:verification`): 28/28 pass.**
**Voice suite (`node --test tests/voice/*.test.mjs`): 17/17 pass.**
**Security suite (`npm run test:security`): 69/70 pass.** The single failure (`production api handlers have no dev fallback`, `tests/security/auth-hardening.test.mjs:19`) is pre-existing and unrelated: `api/_handlers/chat.js` (last modified 2026-09-10, before this task) contains a `aman@sallyip.com` dev-user fallback. It was not touched by Document #012 work; fixing another agent/chat workstream is out of scope and recorded here instead.
**Production build (`npm run build`, vite v6.4.3): PASS — 2294 modules transformed, built in 7.34s, 0 errors.**
Foundation/claim-support/specification suites were not re-run in full; #012 reuses (not modifies) `buildClaimSupportMap` concepts via its own support maps, and the full document-engine suite (which includes utility/claims-related tests) passes 240/240.

### Known Limitations
1. Single-figure update flows reuse the shared plan with status preservation but have no dedicated figure-diff UI beyond the workspace; API `draft` action returns the generic placeholder plan while conversational `route` returns the assembled package (pre-existing architecture split, unchanged).
2. View-relationship derivation (explicit `section_line`/`detail_region` geometry) is intentionally minimal to comply with geometry-safety rules; relationships are tracked as text + `required_views`, not CAD geometry.
3. Formal drawing rules are never asserted without verified authority, so jurisdiction/formality sections defer by design.
4. No practitioner review has occurred; no filing-compliance claims are made.

### Parallel-Work Conflicts
Other agents concurrently modified shared files during this session (`document-engine.js`, `document-engine-router.js` now import #009-abstract/#014-patentability modules; `design-patent-interview-graph.js` exhibited a transient syntax error mid-session that was later resolved without our intervention; `patent-abstract-*` briefly broke the router import chain). All #012 edits were strictly additive (pattern insert, import lines, guard blocks, one new branch, one capability entry). No unrelated changes were reverted or overwritten. `api/_handlers/chat.js` dev-fallback security failure predates this task (2026-09-10) and was left for its owner.

---

### Final Statuses (evidence-backed; TRUE / FALSE / PARTIAL / BLOCKED only)

PATENT_DRAWINGS_PROFILE_COMPLETE = TRUE (9-section canonical profile `012`, family `PATENT_DRAWINGS`, instructions-only description; loads via `loadDocumentProfile`)
PATENT_DRAWINGS_ROUTING_VERIFIED = TRUE (9 aliases resolve; 4/4 router integration tests; design-patent and actual-generation misroutes clarified)
PATENT_DRAWINGS_FINAL_DRAWING_DISTINCTION_VERIFIED = TRUE (profile + package + guards + tests; never claims final/compliant drawings)
PATENT_DRAWINGS_WORKFLOW_MODES_VERIFIED = TRUE (12 modes in profile; `detectWorkflowMode`; single-figure update path)
PATENT_DRAWINGS_MATTER_CONTEXT_VERIFIED = TRUE (KNOWN-first extraction; never re-asks known facts; existing-matter benchmark case)
PATENT_DRAWINGS_CONDITIONAL_INTERVIEW_VERIFIED = TRUE (provisional plan before questioning; gap-driven single questions)
PATENT_DRAWINGS_ONE_QUESTION_MODE_VERIFIED = TRUE (every turn returns exactly 1 question; insufficient-context case)
PATENT_DRAWINGS_FIGURE_PLAN_VERIFIED = TRUE (structured plan with statuses/necessity; no decorative figures)
PATENT_DRAWINGS_FIGURE_GAP_ANALYSIS_VERIFIED = TRUE (six required codes; actuator case; no legal-mandate claims)
PATENT_DRAWINGS_CLAIM_MAPPING_VERIFIED = TRUE (`SHOWN/NOT_SHOWN` mapping; actuator `NOT_SHOWN`)
PATENT_DRAWINGS_SPEC_MAPPING_VERIFIED = TRUE (`SUPPORTED/UNKNOWN` mapping over supplied components)
PATENT_DRAWINGS_REFERENCE_NUMERAL_REGISTRY_VERIFIED = TRUE (deterministic 110-step-10 allocation; preservation; first-figure provenance)
PATENT_DRAWINGS_NUMERAL_CONFLICTS_VERIFIED = TRUE (all five conflict codes detected, tested)
PATENT_DRAWINGS_VIEW_RELATIONSHIPS_VERIFIED = PARTIAL (required_views + cross-view notes + relationship carry-over + renumber history are tested; explicit CAD-style section-line/detail-region geometry is intentionally out of scope per geometry-safety rules)
PATENT_DRAWINGS_GEOMETRY_SAFETY_VERIFIED = TRUE (no invented dimensions/geometry/steps/modules/flows; exterior-photo discipline tested)
PATENT_DRAWINGS_IMAGE_INGESTION_VERIFIED = TRUE (VISIBLE/USER_CONFIRMED/UNKNOWN classification; visible-only planning)
PATENT_DRAWINGS_IMAGE_SPEC_CONFLICT_VERIFIED = TRUE (count-mismatch flag; no silent resolution)
PATENT_DRAWINGS_INVENTION_BRANCHES_VERIFIED = TRUE (16 invention types mapped to relevant figure classes; software/AI/mechanical/electronics/method/chemical/medical cases pass)
PATENT_DRAWINGS_CHANGE_IMPACT_VERIFIED = TRUE (affected-figure identification; locked preservation; `DRAWING_REVIEW_REQUIRED`)
PATENT_DRAWINGS_VERSIONING_VERIFIED = TRUE (`createFigureVersion` history; renumber history)
PATENT_DRAWINGS_LOCKING_VERIFIED = TRUE (`USER_LOCKED`/`REVIEW_LOCKED` preserved across edits and renumbers)
PATENT_DRAWINGS_FORMAL_RULE_VERIFICATION_VERIFIED = TRUE (verification-first deferral; zero hard-coded rules; numeric-assertion test)
PATENT_DRAWINGS_DRAFTING_VERIFIED = TRUE (confirmation-gated 9-section package assembly; 240/240 document-engine tests)
PATENT_DRAWINGS_EDIT_PRESERVATION_VERIFIED = TRUE (locked-figure and user-edit preservation paths tested)
PATENT_DRAWINGS_EXPORT_VERIFIED = TRUE (`buildExportPayload` markdown payload tested; existing export pipeline reused unchanged)
PATENT_DRAWINGS_VOICE_VERIFIED = TRUE (shared session/instruction-set IDs persist across turns; 17/17 voice tests pass; no separate voice workflow)
PATENT_DRAWINGS_SECURITY_VERIFIED = TRUE (`CONFIDENTIAL_PILOT_BLOCKED` fail-closed for free providers tested; shared provider/file-safety policy reused; the one 69/70 security-suite failure is pre-existing, unrelated `chat.js` dev fallback)
PATENT_DRAWINGS_L3_DRAFTABLE = TRUE (26/26 #012 tests + 24/24 benchmark cases pass; profile and capability matrix promoted to `L3_DRAFTABLE`)
PATENT_DRAWINGS_L4_VALIDATED = FALSE (no practitioner-run validation beyond synthetic self-tests; not claimed)
PATENT_DRAWINGS_L5_PRACTITIONER_REVIEWED = FALSE (no practitioner review occurred; not claimed)
