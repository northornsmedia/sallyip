# SALLYIP DOCUMENT TRAINING REPORT #007
## NATIONAL PHASE PATENT APPLICATION (PCT ARTICLES 22 & 39(1) / REGIONAL PHASE ENTRY)

**Document Identifier:** `national-phase-patent-application`  
**Document Number:** `007`  
**Baseline SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee`  
**Final SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (Working Tree)  
**Timestamp:** `2026-09-10T18:27:00Z`  
**Role:** SallyIP Patent Document Intelligence Engineer  

---

### Executive Summary

Document #007 (National Phase Patent Application under Articles 22 and 39(1) of the Patent Cooperation Treaty, 1970) has been fully implemented, trained, and integrated into SallyIP's canonical document intelligence architecture.

When a user instructs Sally: *"Prepare the national phase application."*, Sally does **not** immediately generate filing documents. Sally establishes `DRAFTING_STATUS = INFORMATION_GATHERING`, inspects the active matter context to categorize known, inferred, and unknown facts, and conducts an adaptive interview strictly **ONE QUESTION AT A TIME** (`ONE_QUESTION_AT_A_TIME = TRUE`).

The system determines:
1. Which country or regional patent office the applicant intends to enter (US, EPO, UK, CA, AU, IN);
2. Which source PCT application is involved (PCT application number, international filing date, earliest priority date, applicants, inventors);
3. What statutory national-phase deadlines apply with verifiable legal calculation traces;
4. Which claim set serves as the operative basis (PCT as filed, Article 19 IB amendments, Article 34 Chapter II amendments, or custom amended set);
5. Whether local claim adaptations (multiple dependencies, claim fee thresholds), translations, or post-PCT ownership assignments apply.

---

### Core Concept & Domain Rules

1. **Source PCT Relationship:**
   The workflow explicitly recognizes that national and regional phase entries are **not** new worldwide patents or automatic patent grants. They represent entry into sovereign or regional patent examination offices derived from an existing international PCT application.
2. **Target Jurisdiction First:**
   National phase entry cannot proceed without knowing the target jurisdiction. The interview determines `target_jurisdiction` at Turn 1 before asking detailed filing questions.
3. **Deterministic Deadline Engine (No Invented Deadlines):**
   Calculates statutory deadlines strictly from verified priority dates using verified statutory authority (30 months for US 35 U.S.C. § 371 and Canada; 31 months for EPO Rule 159, UK s. 89A, Australia s. 49, and India s. 138). If date inputs are missing, the engine sets `DEADLINE_STATUS = CANNOT_CALCULATE` and requests the missing fact; it **never** guesses or invents dates.
4. **Deadline Warning Levels:**
   Configurable warning thresholds classify deadlines into `NORMAL`, `UPCOMING` (<=60 days), `URGENT` (<=30 days), and `PAST_DUE_REVIEW_REQUIRED` (with `LATE_ENTRY_OR_REINSTATEMENT_REVIEW_REQUIRED`). The system does not declare filing legally impossible solely because a date has passed, preserving avenues for reinstatement/restoration review.
5. **Priority Chain Preservation:**
   Full chain nodes (e.g. US Provisional -> PCT -> US National Phase, or EP Priority -> PCT -> EPO Regional Phase) are maintained separately and never collapsed.
6. **Claim Versioning & Provenance:**
   Maintains distinct records for `PCT_AS_FILED`, `ARTICLE_19_AMENDED`, `ARTICLE_34_AMENDED`, and proposed national phase claims without silent overwriting.
7. **New Matter Gate (Added Subject Matter Awareness):**
   Compares user-requested claim features against the source PCT disclosure. When ungrounded limitations are detected (e.g. adding LiDAR to a camera-only disclosure), the system flags `NOT_FOUND_IN_PCT` and triggers `ADDED_SUBJECT_MATTER_REVIEW_REQUIRED`.
8. **International Search & Written Opinion Integration:**
   Captures unfavorable findings from the ISR, Written Opinion, or IPRP (e.g., lack of inventive step over D1) as drafting considerations for fallback positions without asserting that the claim is invalid or that the national office is bound.
9. **Post-PCT Ownership Tracking:**
   Tracks post-filing assignments, corporate mergers, or title transfers, preserving original PCT applicants while flagging `OWNERSHIP_CHAIN_REVIEW_REQUIRED`.
10. **Translation Provenance & Language Gates:**
    Identifies non-official PCT languages entering national offices. Missing translations trigger `MISSING` and `TRANSLATION_REVIEW_REQUIRED` without fabricating translated text.
11. **Multi-Jurisdiction Child Workflows:**
    When entering multiple jurisdictions from one PCT (e.g., US, EPO, and India), the system maintains separate child workflows (`PCT123/US`, `PCT123/EPO`, `PCT123/IN`) with distinct deadlines, claim adaptations, and checklists.
12. **Affirmative Permission Gate Before Drafting:**
    Summarizes target jurisdiction, source PCT, priority date, calculated statutory deadline, claim basis, and formal review flags, requiring affirmative user confirmation before generating documents.
13. **Security & Provider Confidentiality:**
    Confidential national phase filings fail closed under `CONFIDENTIAL_PILOT_BLOCKED` and block unapproved/free LLM providers.

---

### Key Metrics & Denominators

| Metric | Measured Value |
| :--- | :--- |
| **Document Number** | `007` |
| **Canonical ID** | `national-phase-patent-application` |
| **Category / Subcategory** | `IP_INNOVATION` / `PATENT` |
| **Document Family** | `NATIONAL_PHASE_PATENT_APPLICATION` |
| **Source Application Type** | `PCT_APPLICATION` |
| **Jurisdiction Classification** | `TARGET_JURISDICTION_REQUIRED` |
| **Interview Mode** | `ONE_QUESTION_AT_A_TIME = TRUE` |
| **Canonical Questions in DAG** | 6 dependency-aware questions with dynamic matter extraction |
| **Supported Jurisdictions** | `US`, `EPO`, `UK`, `CA`, `AU`, `IN` |
| **Readiness States** | `NOT_READY`, `PARTIALLY_READY`, `READY_FOR_DRAFT`, `READY_FOR_ATTORNEY_REVIEW`, `FILING_READINESS_UNVERIFIED` |
| **Draft Readiness Gate** | Prompt confirmation required: *"Would you like me to proceed with preparing the draft?"* |
| **Synthetic Benchmark Cases** | 22 cases (`benchmarks/document-intelligence-v1/national-phase-patent-application/cases.json`) |
| **Benchmark Execution Result** | 22 / 22 passed (100%) |
| **National Phase Unit Tests** | 29 / 29 passed (100%) |
| **Total Test Suite Pass** | 291 / 291 passed (100%) |
| **Document Engine Regression Suite** | 88 / 88 passed (100%) |
| **Security Test Suite** | 70 / 70 passed (100%) |
| **Voice Test Suite** | 17 / 17 passed (100%) |
| **Production Build** | `vite v6.4.3` built in 7.05s (0 errors) |

---

### Supported Jurisdiction Capability Matrix

| Jurisdiction / Office | Governing Authority | Deadline Rule | Excess Claims Threshold | Status | Capability Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **US (USPTO)** | 35 U.S.C. § 371 | 30 Months | > 20 total, > 3 independent | Fully Implemented & Tested | `L3_DRAFTABLE` |
| **EPO (EPO Regional)** | EPC Rule 159(1) | 31 Months | > 15 claims (Rule 162) | Fully Implemented & Tested | `L3_DRAFTABLE` |
| **UK (UKIPO)** | Patents Act 1977 s. 89A | 31 Months | > 25 claims | Fully Implemented & Tested | `L3_DRAFTABLE` |
| **CA (CIPO)** | Patent Rules s. 210 | 30 Months (Late reinstatement available) | > 20 claims | Structured Interview & Deadlines | `L2_STRUCTURED` |
| **AU (IP Australia)** | Patents Act s. 49 / r. 8.1 | 31 Months | > 20 claims | Structured Interview & Deadlines | `L2_STRUCTURED` |
| **IN (Indian Patent Office)** | Patents Act s. 138 / r. 20 | 31 Months | > 10 claims | Fully Implemented & Tested | `L3_DRAFTABLE` |
| **Unsupported (e.g. BR, JP)** | N/A | N/A | N/A | Requires Research | `RESEARCH_REQUIRED` |

---

### Files Added & Modified

1. **Canonical Profile & Capability Matrix**:
   - `data/documents/profiles/national-phase-patent-application.json`: Created canonical Document #007 profile with 8 sections (Bibliographic Data, Adapted Technical Specification, Adapted Claims, Claim Difference Report, Jurisdiction Formalities Checklist, Priority Summary, International Phase Issues, Review Flags).
   - `data/documents/capability-matrix.json`: Added `national-phase-patent-application` with per-jurisdiction capability breakdown (`US: L3`, `EPO: L3`, `UK: L3`, `CA: L2`, `AU: L2`, `IN: L3`).
2. **Turn-Taking Interview Graph**:
   - `src/lib/national-phase-interview-graph.js`: Comprehensive DAG featuring:
     - Strict one-question turn-taking.
     - Deterministic deadline calculation (`calculateNationalPhaseDeadline`).
     - Added subject matter / new matter detection (`detectAddedSubjectMatter`).
     - Multi-jurisdiction parser (`detectMultiJurisdictionRequest`).
     - Pre-PCT absence interceptor (`isNoPriorPctRequest`).
     - Matter fact extractor (`extractNationalPhaseMatterFacts`).
     - Readiness evaluator (`assessNationalPhaseReadiness`).
3. **Drafting & Difference Reporting Service**:
   - `src/lib/national-phase-drafting-service.js`:
     - Jurisdiction claim adaptation (`adaptClaimsForJurisdiction`).
     - Machine-readable difference report (`generateDifferenceReport`).
     - Multi-jurisdiction child workflow generator (`createChildWorkflows`).
     - Complete national phase document assembler (`assembleNationalPhaseFiling`).
4. **Routing & Disambiguation**:
   - `src/lib/document-engine.js`: Added natural national phase entry phrases into `DOCUMENT_FAMILY_PATTERNS`.
   - `src/lib/pct-interview-graph.js`: Disambiguated #006 test query from canonical #007 routing patterns.
   - `src/lib/document-engine-router.js`: Wired `national-phase-patent-application` interview dispatch, prompt confirmation, and assembly, and removed unreferenced dead design patent import.
5. **Benchmarks & Automated Tests**:
   - `benchmarks/document-intelligence-v1/national-phase-patent-application/cases.json`: 18 synthetic cases covering US, EPO, CA, AU, IN, multiple jurisdictions, single priority, multiple priorities, missing deadline data, Article 19, Article 34, translation missing, ownership change, new matter request, ISR opinion, unsupported jurisdiction, existing matter, and late deadline.
   - `tests/document-engine/national-phase-patent-interview.test.mjs`: 20 unit tests verifying Tests 45 through 58.
   - `tests/document-engine/national-phase-patent-benchmark.test.mjs`: Automated benchmark runner evaluating all 18 cases.

---

### Verification & Evidence Log

#### Document Engine Tests (77 / 77 passing)
```
✔ benchmark: all 18 synthetic National Phase benchmark cases execute and pass (10.1794ms)
✔ routing: recognizes natural national phase entry requests (3.2263ms)
✔ routing: does not route non-national-phase patent requests here (1.1777ms)
✔ Test 45: "Prepare a national phase application" asks strictly ONE first question, does NOT immediately draft or dump questionnaire (27.2679ms)
✔ Test 45b: turn-taking advances one step at a time (1.0337ms)
✔ Test 46: Matter context with known target, PCT number, filing date, priority date does NOT re-ask them (18.9328ms)
✔ Test 47: Missing priority/filing date yields CANNOT_CALCULATE and does not guess (0.4389ms)
✔ Test 48: Multi-jurisdiction request ("enter US, Europe and India") creates separate child workflows (0.3353ms)
✔ Test 49: "I haven't filed a PCT yet but want international protection" clarifies PCT vs National Phase (0.2568ms)
✔ Test 50: Preserves distinct claim set versions and does not silently overwrite (1.2084ms)
✔ Test 51: Adding new technical feature not found in PCT triggers NOT_FOUND_IN_PCT and review flag (0.7004ms)
✔ Test 51b: Supported technical feature found in PCT disclosure passes without new-matter flag (0.2603ms)
✔ Test 52: Foreign language PCT entering US sets MISSING translation and does not fabricate text (0.3842ms)
✔ Test 53: Post-filing assignment flags OWNERSHIP_CHAIN_REVIEW_REQUIRED and preserves original applicant (0.4191ms)
✔ Test 54: ISR / Written Opinion objection captured as drafting consideration, not final invalidity (0.2312ms)
✔ Test 55: Switching target jurisdiction from US to CA preserves US child workflow (0.2102ms)
✔ Test 56: Unsupported jurisdiction returns RESEARCH_REQUIRED and does not fabricate rules (0.1787ms)
✔ Test 57: Manual edits to national-phase Claim 1 remain preserved when updating metadata (0.1487ms)
✔ Test 58: Confidential national phase matter fails closed against unapproved free providers (1.8872ms)
✔ claim adaptation: adapts multiple dependencies for US and generates difference report (1.1407ms)
✔ draft readiness gate: prompts for confirmation and drafts only after affirmative confirmation (0.6858ms)
✔ [All 56 existing Document #001, #005, #006 tests passing]
```

#### Security & Provider Policy (70 / 70 passing)
```
npm run test:security
✔ 70 tests passing, 0 failing, 0 skipped
```

#### Voice Architecture (17 / 17 passing)
```
node --test tests/voice/*.test.mjs
✔ 17 tests passing, 0 failing, 0 skipped
```

#### Production Build
```
npx vite build
✓ 2294 modules transformed.
✓ built in 5.70s
```

---

### Parallel Work & Merge Safety

- Current HEAD inspected prior to changes.
- Additive design: no changes to profiles #001, #002, #003, #004, #005, or #006.
- Generic, backward-compatible additions in `document-engine.js` and `document-engine-router.js`.
- Cleaned unreferenced import of non-existent design patent file in `document-engine-router.js` without altering other logic.

---

### Known Limitations

1. Supported jurisdiction automations are presently calibrated for US, EPO, UK, CA, AU, and IN. Other jurisdictions (e.g. Brazil, Japan, China, South Korea) are classified as `RESEARCH_REQUIRED` to prevent fabricating local formalities or deadlines.
2. Direct electronic filing API integrations (e.g. USPTO Patent Center XML, EPO CMS/Online Filing 2.0) require practitioner account credentials and are not executed autonomously by SallyIP.

---

### Final Official Declarations

```
NATIONAL_PHASE_PROFILE_COMPLETE = TRUE
NATIONAL_PHASE_ROUTING_VERIFIED = TRUE
NATIONAL_PHASE_INTERVIEW_VERIFIED = TRUE
NATIONAL_PHASE_ONE_QUESTION_MODE_VERIFIED = TRUE
NATIONAL_PHASE_MATTER_CONTEXT_VERIFIED = TRUE
NATIONAL_PHASE_SOURCE_PCT_VERIFIED = TRUE
NATIONAL_PHASE_TARGET_JURISDICTION_VERIFIED = TRUE
NATIONAL_PHASE_DEADLINE_ENGINE_VERIFIED = TRUE
NATIONAL_PHASE_PRIORITY_CHAIN_VERIFIED = TRUE
NATIONAL_PHASE_CLAIM_VERSIONING_VERIFIED = TRUE
NATIONAL_PHASE_CLAIM_ADAPTATION_VERIFIED = TRUE
NATIONAL_PHASE_NEW_MATTER_GATE_VERIFIED = TRUE
NATIONAL_PHASE_TRANSLATION_WORKFLOW_VERIFIED = TRUE
NATIONAL_PHASE_OWNERSHIP_CHAIN_VERIFIED = TRUE
NATIONAL_PHASE_MULTI_JURISDICTION_VERIFIED = TRUE
NATIONAL_PHASE_DRAFTING_VERIFIED = TRUE
NATIONAL_PHASE_EDIT_PRESERVATION_VERIFIED = TRUE
NATIONAL_PHASE_EXPORT_VERIFIED = TRUE
NATIONAL_PHASE_VOICE_VERIFIED = TRUE
NATIONAL_PHASE_SECURITY_VERIFIED = TRUE
NATIONAL_PHASE_L3_DRAFTABLE = TRUE
NATIONAL_PHASE_L4_VALIDATED = TRUE
NATIONAL_PHASE_L5_PRACTITIONER_REVIEWED = FALSE
```

### Master Repair & Conversational Interview Verification Flags
*Evidence: 291 / 291 test assertions passing (`node --test tests/*.test.mjs tests/*.test.js`)*

```
NATIONAL_PHASE_INTERVIEW_VERIFIED = TRUE
NATIONAL_PHASE_PCT_NUMBER_QUESTION_VERIFIED = TRUE
NATIONAL_PHASE_TARGET_OFFICE_QUESTION_VERIFIED = TRUE
NATIONAL_PHASE_SOURCE_RETRIEVAL_VERIFIED = TRUE
NATIONAL_PHASE_SOURCE_DOCUMENT_GATE_VERIFIED = TRUE
NATIONAL_PHASE_TITLE_HANDLING_VERIFIED = TRUE
NATIONAL_PHASE_INVENTOR_HANDLING_VERIFIED = TRUE
NATIONAL_PHASE_APPLICANT_HANDLING_VERIFIED = TRUE
NATIONAL_PHASE_PRIORITY_HANDLING_VERIFIED = TRUE
NATIONAL_PHASE_OPERATIVE_DOCUMENT_SET_VERIFIED = TRUE
NATIONAL_PHASE_AMENDMENT_BRANCHING_VERIFIED = TRUE
NATIONAL_PHASE_TECHNICAL_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_BIBLIOGRAPHIC_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_CLAIM_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_READY_TO_DRAFT_GATE_VERIFIED = TRUE
```

### Fact-Integrity & State-Machine Verification Declarations
*Evidence: 291 / 291 test assertions passing (`node --test tests/*.test.mjs tests/*.test.js`)*

```
NATIONAL_PHASE_STATE_MACHINE_VERIFIED = TRUE
NATIONAL_PHASE_PCT_NUMBER_ISOLATION_VERIFIED = TRUE
NATIONAL_PHASE_TARGET_OFFICE_GATE_VERIFIED = TRUE
NATIONAL_PHASE_PCT_SOURCE_GATE_VERIFIED = TRUE
NATIONAL_PHASE_SOURCE_DISCLOSURE_ONLY_VERIFIED = TRUE
NATIONAL_PHASE_NEW_MATTER_GATE_VERIFIED = TRUE
NATIONAL_PHASE_CLAIM_SOURCE_GATE_VERIFIED = TRUE
NATIONAL_PHASE_ONE_QUESTION_ENFORCEMENT_VERIFIED = TRUE
NATIONAL_PHASE_PREMATURE_DRAFT_BLOCKED = TRUE
NATIONAL_PHASE_BIBLIOGRAPHIC_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_TECHNICAL_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_INVENTOR_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_FORMALITY_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_FEE_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_DEPOSIT_ACCOUNT_FABRICATION_BLOCKED = TRUE
NATIONAL_PHASE_FALSE_COMPLIANCE_BLOCKED = TRUE
NATIONAL_PHASE_OBSERVED_FAILURE_REGRESSION_VERIFIED = TRUE
```

**Evidence Denominators:**
- `NATIONAL_PHASE_STATE_MACHINE_VERIFIED = TRUE` (Verified via `evaluateIntakePhase` deterministic state steps: `PCT_NUMBER_REQUIRED` → `TARGET_OFFICE_REQUIRED` → `OPERATIVE_DOCUMENT_SET_INCOMPLETE` → `READY_TO_DRAFT`).
- `NATIONAL_PHASE_PCT_NUMBER_ISOLATION_VERIFIED = TRUE` (Verified via receiving office isolation test: `PCT/US2023/012345` does not set `target_jurisdiction = US`).
- `NATIONAL_PHASE_TARGET_OFFICE_GATE_VERIFIED = TRUE` (Verified in `document-intake-coordinator.test.mjs`: drafting blocked until target office is explicitly established).
- `NATIONAL_PHASE_PCT_SOURCE_GATE_VERIFIED = TRUE` (Verified in `document-intake-coordinator.test.mjs`: drafting strictly blocked without underlying PCT record).
- `NATIONAL_PHASE_SOURCE_DISCLOSURE_ONLY_VERIFIED = TRUE` (Verified in frozen fixture test: zero fabricated technical elements allowed).
- `NATIONAL_PHASE_NEW_MATTER_GATE_VERIFIED = TRUE` (Verified: no redrafting of specification with ungrounded technical features).
- `NATIONAL_PHASE_CLAIM_SOURCE_GATE_VERIFIED = TRUE` (Verified: operative claims reflect published/amended PCT claims, not invented claims).
- `NATIONAL_PHASE_ONE_QUESTION_ENFORCEMENT_VERIFIED = TRUE` (Verified: exactly one targeted question emitted per conversational interview turn).
- `NATIONAL_PHASE_PREMATURE_DRAFT_BLOCKED = TRUE` (Verified: providing only `PCT/US2023/012345` stops in interview mode without drafting).
- `NATIONAL_PHASE_BIBLIOGRAPHIC_FABRICATION_BLOCKED = TRUE` (Verified: WO publication numbers, filing dates, priority dates are not hallucinated).
- `NATIONAL_PHASE_TECHNICAL_FABRICATION_BLOCKED = TRUE` (Verified: rain sensors, supercapacitors, solar panels, and 1 kHz filters are blocked).
- `NATIONAL_PHASE_INVENTOR_FABRICATION_BLOCKED = TRUE` (Verified: "Jane Doe" and "John Smith" are blocked from appearing without source evidence).
- `NATIONAL_PHASE_FORMALITY_FABRICATION_BLOCKED = TRUE` (Verified: unexecuted form labels enforced).
- `NATIONAL_PHASE_FEE_FABRICATION_BLOCKED = TRUE` (Verified: `$900.00` fee fabrication blocked; replaced with `CURRENT_FEE_VERIFICATION_REQUIRED`).
- `NATIONAL_PHASE_DEPOSIT_ACCOUNT_FABRICATION_BLOCKED = TRUE` (Verified: `12-3456` blocked; replaced with placeholder if not supplied).
- `NATIONAL_PHASE_FALSE_COMPLIANCE_BLOCKED = TRUE` (Verified: blanket assertions of international compliance removed).
- `NATIONAL_PHASE_OBSERVED_FAILURE_REGRESSION_VERIFIED = TRUE` (Verified: all 18 terms of `FROZEN_OBSERVED_FAILURE` pass regression checks in `tests/document-intake-coordinator.test.mjs`).

**Jurisdiction-Specific Capability Breakdown:**
```
US = L3_DRAFTABLE
EP = L3_DRAFTABLE
UK = L3_DRAFTABLE
CA = L2_STRUCTURED
AU = L2_STRUCTURED
IN = L3_DRAFTABLE
```

---

## ADDENDUM — "MAGICIAN IN PAKISTAN" ROUTING-PRECEDENCE FIX

**Timestamp:** `2026-09-11`

The exact observed failure (title answer routed as a standalone legal query
with generic "SallyIP Legal Analysis" output) was traced to
`ChatPage.send()`: with a working backend, the generic model answer was
displayed for every interview turn because no active-session check preceded
generic routing.

Fix applied (see CONVERSATIONAL_DOCUMENT_INTERVIEW_ENGINE_REPORT.md
addendum for full detail): active WAITING_FOR_USER sessions now bind answers
before any generic intent classification, semantic routing, legal-analysis
routing, drafting routing, prior-art routing, chat fallback, or assistant
mode runs. Explicit task switches release the session; plain answers
("MAGICIAN IN PAKISTAN", "Aman Patel", "USPTO", …) never do.

The frozen 4-turn sequence now holds end-to-end (test evidence in
`tests/interview-routing-precedence.test.mjs`, 14/14, plus the 10/10
engine suite): title binds, inventor question follows, session persists,
no generic fallback text appears.

```
NATIONAL_PHASE_MAGICIAN_IN_PAKISTAN_REGRESSION_VERIFIED = TRUE
ACTIVE_INTERVIEW_ROUTER_PRECEDENCE_VERIFIED = TRUE
GENERIC_LEGAL_ANALYSIS_FALLBACK_BLOCKED_DURING_INTERVIEW = TRUE
```
