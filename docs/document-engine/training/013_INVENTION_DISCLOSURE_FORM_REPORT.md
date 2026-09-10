# SALLYIP DOCUMENT TRAINING REPORT #013
# INVENTION DISCLOSURE FORM (PRE-FILING INTAKE)

- **Document ID**: `invention-disclosure-form`
- **Document Number**: `013`
- **Category**: `IP_INNOVATION`
- **Subcategory**: `PATENT`
- **Family**: `INVENTION_DISCLOSURE`
- **Baseline SHA**: `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
- **Final SHA**: `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (working tree uncommitted)
- **Status**: `BETA`
- **Capability Level**: `L3_DRAFTABLE` (Promoted to `L3_DRAFTABLE`; `L4_VALIDATED` verified via 34/34 passing synthetic benchmark cases; `L5_PRACTITIONER_REVIEWED` = `FALSE` without practitioner review)

---

## 1. Executive Summary

Document #013 implements SallyIP's canonical pre-filing intake and invention capture workflow: the **Invention Disclosure Form**. 

The workflow is architected strictly around `ONE_QUESTION_AT_A_TIME = TRUE`, ensuring SallyIP never dumps a 30-question questionnaire on the user. Instead, SallyIP prioritizes existing matter facts (`KNOWN`, `INFERRED`, `UNKNOWN`), probes commercial business objectives versus patent-eligible technical problems, adaptively branches across seven technical domains (Software, AI/ML, Mechanical, Electronics, Chemical, Biotech, Medical Device), classifies feature essentiality (`ESSENTIAL`, `PREFERRED`, `OPTIONAL`, `ALTERNATIVE`), safeguards experimental data without fabricating test metrics, captures potential inventors and contributions without making unsupported legal inventorship determinations, logs public and confidential NDA disclosure events, flags source discrepancies (`SOURCE_CONFLICT`), supports graceful skip/unknown inputs, assembles a structured 30-section internal disclosure document, and exports reusable facts directly to downstream patent workflows (Provisional #002, Utility #001, Claims Set #010) with change impact analysis (`DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED`).

---

## 2. Files Added & Modified

### Files Added:
1. `data/documents/profiles/invention-disclosure-form.json` — Canonical 30-section document profile with aliases, input fields, authority citations, review flags, and downstream mappings.
2. `src/lib/invention-disclosure-interview-graph.js` — Turn-taking DAG engine with matter-context extraction, domain inference, completeness evaluation, skip/unknown handling, source conflict detection, and turn-taking state machine.
3. `src/lib/invention-disclosure-service.js` — 30-section internal disclosure document assembly, machine-readable Invention Fact Graph builder, downstream workflow exporter, change impact analysis, and immutable versioning.
4. `benchmarks/document-intelligence-v1/invention-disclosure-form/cases.json` — 34 synthetic evaluation cases (CASE-01 to CASE-34) covering all test permutations.
5. `tests/document-engine/invention-disclosure-benchmark.test.mjs` — Automated benchmark suite verifying all 34 synthetic cases.
6. `tests/document-engine/invention-disclosure-interview.test.mjs` — Comprehensive unit test suite covering routing, profile, Tests 74 to 94, locking, versioning, and fail-closed security.
7. `docs/document-engine/training/013_INVENTION_DISCLOSURE_FORM_REPORT.md` — This official training report.

### Files Modified:
1. `data/documents/capability-matrix.json` — Added `invention-disclosure-form` entry at `L3_DRAFTABLE` with canonical aliases and routing metadata.
2. `src/lib/document-engine.js` — Registered `invention-disclosure-form` in `DOCUMENT_FAMILY_PATTERNS`, prior to generic patent drafting patterns to prevent misrouting.
3. `src/lib/document-engine-router.js` — Wired `invention-disclosure-form` dispatching to `evaluateInventionDisclosureInterviewStep` and `assembleInventionDisclosure`.

---

## 3. Architecture & Capabilities

### 3.1. Canonical Profile & Scope Distinction
The Invention Disclosure Form (`invention-disclosure-form`) is strictly classified as `PRE_FILING_INTAKE` under `MULTI_JURISDICTION`. It captures and structures facts for internal IP evaluation. It expressly does NOT represent itself as:
- A filed patent application
- A patentability opinion
- A novelty or prior-art clearance opinion
- An inventorship or ownership adjudication
- A filing instruction or guarantee of patent protection

### 3.2. One-Question-at-a-Time Turn-Taking Flow
- Mandatory setting: `ONE_QUESTION_AT_A_TIME = TRUE`.
- Turn-taking progression:
  1. Inspect existing matter facts.
  2. Classify facts as `KNOWN`, `INFERRED`, or `UNKNOWN`.
  3. Identify highest-value unresolved missing fact.
  4. Formulate single conversational question.
  5. Wait for user input.
  6. Validate, categorize, and store answer with provenance (`USER_PROVIDED`).
  7. Re-evaluate completeness across 14 dimensions.
  8. Ask next sequential question or prompt draft confirmation gate.

### 3.3. Matter-First Inspection & Fact Classification
SallyIP inspects the matter context first (`matterContext.matter` and `matterContext.facts`). Known fields—including working title, internal project ID, technical field, technical disclosure, known inventors, and prototype notes—are marked `KNOWN` and skipped. SallyIP never asks the inventor to re-enter information already present in the matter context.

### 3.4. Workflow Modes
Supports 10 operational modes:
- `NEW_INVENTION_DISCLOSURE`
- `DISCLOSURE_FROM_NOTES`
- `DISCLOSURE_FROM_DOCUMENTS`
- `DISCLOSURE_FROM_TRANSCRIPT`
- `DISCLOSURE_FROM_EMAILS`
- `DISCLOSURE_FROM_EXISTING_MATTER`
- `DISCLOSURE_UPDATE`
- `DISCLOSURE_REVIEW`
- `DISCLOSURE_GAP_ANALYSIS`
- `INVENTOR_INTERVIEW_MODE`

### 3.5. Business Goal vs. Technical Problem Separation
When an inventor responds with commercial aims (*"The goal is to increase sales"*), SallyIP records this as `business_goal` without fabricating a technical problem. SallyIP then asks specifically for the technical mechanism, algorithm, or physical feature created to achieve that business objective.

### 3.6. Vague Concept Probing
When an inventor presents a broad concept (*"It's an AI tool for legal work"*), SallyIP does not fabricate a detailed invention. It flags `CII_ELIGIBILITY_REVIEW_REQUIRED` and asks a targeted architectural question focusing on the specific technical task and difference from conventional models.

### 3.7. Invention-Type Adaptive Branching
Dynamically classifies inventions across 7 domains (`inferInventionDomain`):
- `SOFTWARE`: Data flows, backend/client modules, API interfaces, cloud/edge execution.
- `AI_ML`: Training data, loss functions, model inference, hardware acceleration.
- `MECHANICAL`: Physical linkages, actuators, bearings, movement sequences.
- `ELECTRONICS`: Circuit topologies, sensor configurations, RF frequencies, signal processing.
- `CHEMICAL`: Compositions, reaction pathways, molar ranges, synthesis conditions (`SPECIALIST_REVIEW_REQUIRED`).
- `BIOTECH`: Genetic sequences, host cell vectors, biological assays (`SPECIALIST_REVIEW_REQUIRED`).
- `MEDICAL_DEVICE`: Biocompatibility, surgical interfaces, physiological monitoring.

### 3.8. Feature Classification: Essential, Preferred, Optional, Alternative
Features are mapped to precise strategic tiers:
- `ESSENTIAL`: Core limitations required for independent claim strategy.
- `PREFERRED`: High-value embodiments for dependent fallback positions.
- `OPTIONAL`: Non-limiting enhancements (e.g., optional cameras or displays).
- `ALTERNATIVE`: Mutually exclusive or parallel implementations (e.g., local edge vs. cloud server).

### 3.9. Technical Effect & Experimental Data Safety
- Technical effects distinguish inventor assertions from measured data (`USER_ASSERTED` vs. `MEASURED_RESULT`).
- Inventors reporting unverified or untested concepts (*"We have not tested it yet"*) are recorded as `CONCEPT_ONLY` and `experimental_data_status: 'NOT_TESTED'`. SallyIP never fabricates bench tests, latency reductions, or accuracy percentages.

### 3.10. Potential Inventors, Contributions & Non-Inventive Management
- Captures multiple contributors with explicit technical contributions.
- Non-inventive roles (e.g. CEO approvals, project management, financing) are categorized as `MANAGEMENT_NON_INVENTOR`.
- Flags `INVENTORSHIP_REVIEW_REQUIRED` without making legal inventorship determinations.

### 3.11. Ownership & Collaboration Context
- Employment relationships (*"The engineer works for Company A"*) capture employer affiliation without presuming legal assignment.
- Flags `OWNERSHIP_REVIEW_REQUIRED` for university collaborations, contractors, or joint development partners.

### 3.12. Public Disclosures vs. Confidential NDAs
- Public disclosure events (conferences, sales, online repositories) generate discrete `event_id` records and flag `DISCLOSURE_REVIEW_REQUIRED`. SallyIP avoids premature conclusions regarding loss of patent rights or statutory grace periods.
- Disclosures under confidentiality agreements are logged as `EXTERNAL_CONFIDENTIAL_DISCLOSURE`.

### 3.13. Source Conflict Detection
When numerical discrepancies occur between inventor statements and uploaded documents (e.g., 3 sensors vs. 2 sensors), SallyIP flags `SOURCE_CONFLICT` and preserves both values with provenance without silent overwriting.

### 3.14. Image & Sketch Analysis Safety
Uploads of physical prototypes capture visible external contours only. SallyIP strictly refuses to infer internal circuitry, hidden sensors, or firmware operation from exterior photographs.

### 3.15. Unknown & Graceful Skip Handling
User inputs such as *"I don't know"*, *"skip"*, or *"not sure"* record the value as `UNKNOWN` or `SKIPPED`, advancing the interview to the next meaningful question without blocking or forcing fictional answers.

### 3.16. Downstream Handoff Mappings
Confirmed invention facts map directly into downstream workflows without repeating interviews:
- `provisional-patent-application` (Document #002): Maps title, problem, solution, drawings, and prior filing flags.
- `utility-patent-application` (Document #001): Maps full component list, operations, and inventor rosters.
- `patent-claims-set` (Document #010): Maps essential features to independent claims and optional/alternatives to dependent fallbacks.

### 3.17. Change Impact Analysis
Modifications to technical descriptions or components after downstream documents exist trigger `DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED`, identifying affected child documents without silent rewrites.

### 3.18. Immutable Versioning & Field Locking
- Revisions increment version numbers (`v1_initial`, `v2_embodiment_added`) preserving historical state.
- Fields marked `USER_LOCKED` (e.g. inventor rosters) remain immutable against automated AI modifications.

### 3.19. Confidentiality & Security Enforcement
Unpublished invention disclosures are classified as `CONFIDENTIAL_IP`. Inquiries directed at unapproved free models fail closed with `CONFIDENTIAL_PILOT_BLOCKED` (`assertChatAllowed`).

---

## 4. Benchmark & Test Verification

### 4.1. Benchmark Evaluation
- **Benchmark Suite**: `benchmarks/document-intelligence-v1/invention-disclosure-form/cases.json`
- **Runner**: `tests/document-engine/invention-disclosure-benchmark.test.mjs`
- **Result**: **34 / 34 passed (100%)**
- **Synthetic Coverage**:
  - CASE-01: New Invention Disclosure (`new_invention_disclosure`)
  - CASE-02: Existing Matter Disclosure (`existing_matter_disclosure`)
  - CASE-03: Vague Concept (`vague_concept`)
  - CASE-04: Software Invention (`software_branch`)
  - CASE-05: AI / ML Invention (`ai_ml_branch`)
  - CASE-06: Mechanical Invention (`mechanical_branch`)
  - CASE-07: Electronics Invention (`electronics_branch`)
  - CASE-08: Chemical Invention (`chemical_branch`)
  - CASE-09: Biotech Invention (`biotech_branch`)
  - CASE-10: Medical Device Invention (`medical_device_branch`)
  - CASE-11: Optional Feature (`optional_feature`)
  - CASE-12: Multiple Embodiments (`multiple_embodiments`)
  - CASE-13: No Prototype (`no_prototype`)
  - CASE-14: Tested Prototype (`tested_prototype`)
  - CASE-15: Experimental Test Data (`experimental_test_data`)
  - CASE-16: Untested Concept (`untested_concept`)
  - CASE-17: Single Inventor (`single_inventor`)
  - CASE-18: Multiple Contributors (`multiple_contributors`)
  - CASE-19: Management Non-Inventor (`management_non_inventor`)
  - CASE-20: Contractor Collaborator (`contractor_collaborator`)
  - CASE-21: Public Disclosure Event (`public_disclosure_event`)
  - CASE-22: NDA Disclosure (`nda_disclosure`)
  - CASE-23: Prior Patent Filing (`prior_patent_filing`)
  - CASE-24: Multiple Disclosures (`multiple_disclosures`)
  - CASE-25: Known Prior Art (`known_prior_art`)
  - CASE-26: Source Conflict (`source_conflict`)
  - CASE-27: Visible Image Feature (`visible_image_feature`)
  - CASE-28: Unknown Answer (`unknown_answer`)
  - CASE-29: Skip Question (`skip_question`)
  - CASE-30: Downstream Provisional Handoff (`downstream_provisional_handoff`)
  - CASE-31: Downstream Claims Handoff (`downstream_claims_handoff`)
  - CASE-32: Change Impact Analysis (`change_impact_analysis`)
  - CASE-33: Immutable Versioning (`immutable_versioning`)
  - CASE-34: Locked Field Protection (`locked_field_protection`)

### 4.2. Document Engine Unit & Interview Tests
- **Test File**: `tests/document-engine/invention-disclosure-interview.test.mjs`
- **Result**: **24 / 24 passed (100%)**
- **Full Document Engine Regression**:
  - `tests/document-engine/*.test.mjs`: **121 / 121 passed (100%)** across Documents #001–#013.

### 4.3. Security & Voice Suites
- **Security Suite**: `npm run test:security` — **70 / 70 passed (100%)**
- **Voice Suite**: `node --test tests/voice/*.test.mjs` — **17 / 17 passed (100%)**

### 4.4. Production Build
- **Command**: `npx vite build`
- **Result**: Built successfully in 7.06s with zero errors or bundle warnings.

---

## 5. Denominators & Verification Scorecard

| Test / Suite Category | Passed | Total | Rate | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Invention Disclosure Benchmark** | 34 | 34 | 100% | **PASS** |
| **Invention Disclosure Interview (Tests 74–94)** | 24 | 24 | 100% | **PASS** |
| **Full Document Engine Regression (#001–#013)** | 121 | 121 | 100% | **PASS** |
| **Security & Confidential Provider Policy** | 70 | 70 | 100% | **PASS** |
| **Voice & Turn-Taking Interaction Suite** | 17 | 17 | 100% | **PASS** |
| **Production Build (`vite build`)** | 1 | 1 | 100% | **PASS** |

---

## 6. Final Statuses

- `INVENTION_DISCLOSURE_PROFILE_COMPLETE` = **TRUE**
- `INVENTION_DISCLOSURE_ROUTING_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_INTERVIEW_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_ONE_QUESTION_MODE_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_MATTER_CONTEXT_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_WORKFLOW_MODES_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_TECHNICAL_FACT_MODEL_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_INVENTION_BRANCHING_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_FEATURE_CLASSIFICATION_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_ALTERNATIVES_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_TECHNICAL_EFFECT_CAPTURE_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_EXPERIMENTAL_DATA_SAFETY_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_INVENTOR_MODEL_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_CONTRIBUTION_MAP_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_INVENTORSHIP_REVIEW_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_OWNERSHIP_CONTEXT_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_DISCLOSURE_TIMELINE_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_PRIOR_FILING_CAPTURE_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_SOURCE_CONFLICTS_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_UNKNOWN_SKIP_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_COMPLETENESS_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_DOWNSTREAM_HANDOFF_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_CHANGE_IMPACT_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_VERSIONING_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_LOCKING_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_EXPORT_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_VOICE_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_SECURITY_VERIFIED` = **TRUE**
- `INVENTION_DISCLOSURE_L3_DRAFTABLE` = **TRUE**
- `INVENTION_DISCLOSURE_L4_VALIDATED` = **TRUE**
- `INVENTION_DISCLOSURE_L5_PRACTITIONER_REVIEWED` = **FALSE**

---

## 7. Known Limitations & Parallel Work Safety

1. **Practitioner Review**: Not claimed (`L5_PRACTITIONER_REVIEWED = FALSE`) until verified live with licensed patent counsel.
2. **Parallel Work Safety**: Changes to shared files (`document-engine.js`, `document-engine-router.js`, `capability-matrix.json`) were strictly additive and regression-tested against all pre-existing patent document profiles (#001–#008), confirming zero regressions across 121 document engine tests.
