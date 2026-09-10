# SALLYIP DOCUMENT TRAINING REPORT #008
## EUROPEAN PATENT APPLICATION (EPO / EPC — Articles 75, 78, 87, 88, 123(2) & Rules 42, 43, 47 EPC)

**Document Identifier:** `european-patent-application`  
**Document Number:** `008`  
**Baseline SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee`  
**Final SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (Working Tree)  
**Timestamp:** `2026-09-10T18:40:00Z`  
**Role:** SallyIP Patent Document Intelligence Engineer  

---

### Executive Summary

Document #008 (European Patent Application for direct filings before the European Patent Office under the European Patent Convention) has been implemented and trained into a canonical, dependency-aware drafting interview and EPC-compliant specification drafting engine.

When a user instructs Sally: *"Draft a European patent application"*, Sally does **not** immediately generate an application. Sally sets `drafting_status = INFORMATION_GATHERING`, inspects the active matter context to classify known/inferred/unknown facts, and conducts an adaptive interview strictly **ONE QUESTION AT A TIME**.

Key domain-specific capabilities established:
1. **Direct EP Filing vs. EP Regional Phase Disambiguation:** Under EPC Article 75 and Rule 159 EPC, direct European patent filings are legally and procedurally distinct from entering the European regional phase from a PCT application. If a user states *"We already have a PCT and now want to enter Europe"*, Sally intercepts the request with clear statutory guidance and routes to the **National Phase Patent Application** workflow (target: `EPO`).
2. **Deterministic 12-Month Priority Deadline Safety:** Implements strict Paris Convention Article 4 and EPC Article 87(1) deadline calculations (+12 calendar months from the earliest verified priority date). If the priority date is missing, Sally never guesses or fabricates a date, returning `CANNOT_CALCULATE` and explicitly requesting the filing date.
3. **Multiple Priority Handling:** Fully supports multiple priority claims under EPC Article 88(2), preserving independent records (`priority_id`, `country_or_office`, `application_number`, `filing_date`, `applicant`, `verification_status`) and anchoring calculations to the earliest priority date.
4. **EPO Problem-Solution Technical Orientation:** Gathers technical understanding around four foundational pillars: `TECHNICAL_FIELD`, `TECHNICAL_PROBLEM`, `TECHNICAL_SOLUTION`, and `TECHNICAL_EFFECT`. Never fabricates technical effects or quantitative metrics (e.g., qualifying *"The invention is faster"* without inventing speculative percentages).
5. **Computer-Implemented Inventions (CII) & AI/ML Branching:** For software, data processing, and AI/ML subject matter, avoids superficial patentability promises and examines technical context, interaction with hardware, and technical character. Flags `CII_ELIGIBILITY_REVIEW_REQUIRED` for specialized practitioner review.
6. **Two-Part Claim Discipline (Rule 43(1) EPC):** Supports preamble and characterising portion formulation when verified closest prior art is known. If closest prior art is unknown, strictly avoids inventing or fabricating prior art merely to force a two-part claim.
7. **Multiple Independent Claims Check (Rule 43(2) EPC):** Detects multiple independent claims within the same category (e.g., multiple apparatus claims) and flags `MULTIPLE_INDEPENDENT_CLAIM_REVIEW_REQUIRED` to prevent formal examination objections and excess claims fees.
8. **Unity of Invention Awareness (Article 82 EPC):** Detects multiple distinct inventive concepts lacking a common technical relationship and flags `UNITY_REVIEW_REQUIRED` without splitting applications prematurely.
9. **Added Subject Matter Gate (Article 123(2) EPC):** Checks proposed amendments or late-added technical features against the application disclosure, flagging `ADDED_SUBJECT_MATTER_REVIEW_REQUIRED` whenever ungrounded subject matter is detected.
10. **Absolute Novelty Public Disclosure Check (Article 54(2) EPC):** Detects prior public disclosures, demonstrations, or sales, and flags `DISCLOSURE_REVIEW_REQUIRED` under Europe's strict absolute novelty standard, preventing reliance on US-style 1-year grace period assumptions.
11. **Collaborative Drafting & Edit Preservation:** Users can edit individual sections (such as claims) while regenerating other sections (e.g., Background Art) with 100% preservation of manual edits and provenance tracking (`USER_EDITED`).
12. **Confidentiality & Provider Security:** Unpublished invention disclosures remain strictly fail-closed under `CONFIDENTIAL_PILOT_BLOCKED` and provider policy, preventing transmission to unapproved or free-tier models.

---

### Key Metrics & Implementation Details

| Metric | Measured Value |
| :--- | :--- |
| **Document Number** | `008` |
| **Canonical ID** | `european-patent-application` |
| **Category / Subcategory** | `IP_INNOVATION` / `PATENT` |
| **Document Family** | `EUROPEAN_PATENT_APPLICATION` |
| **Capability Level** | `L3_DRAFTABLE` (Promoted in capability matrix; `L4_VALIDATED` passed) |
| **Governing Law / Rules** | EPC Articles 75, 78, 87, 88, 123(2); Rules 42, 43, 47 EPC; EPO Examination Guidelines |
| **Jurisdiction / Authority** | Europe (`EP`) / European Patent Office (`EPO`) |
| **Interview Mode** | `ONE_QUESTION_AT_A_TIME = TRUE` |
| **Canonical Questions in DAG** | 12 dependency-aware questions with adaptive branching |
| **Invention Branches Supported** | `METHOD_SYSTEM`, `SOFTWARE`, `AI_ML`, `MECHANICAL`, `ELECTRONICS`, `CHEMICAL`, `BIOTECH` |
| **Matter Context Prioritization** | `KNOWN`, `INFERRED`, `UNKNOWN` (Skips known title, inventors, applicants, priority, drawings) |
| **Claim Structure** | EPC Rule 43(1) two-part awareness, Rule 43(2) single independent claim per category rule |
| **Readiness States** | `NOT_READY`, `PARTIALLY_READY`, `READY_FOR_FIRST_DRAFT` |
| **Draft Readiness Gate** | Summarizes filing route, technical problem/solution, priority, and flags; asks affirmative confirmation |
| **Benchmark Suite** | 19 synthetic cases (`benchmarks/document-intelligence-v1/european-patent-application/cases.json`) |
| **Benchmark Result** | 19 / 19 passed (100%) |
| **Document Engine Unit Tests** | 18 / 18 passed (100%) |
| **Total EP Tests Added** | 19 / 19 passed (100%) |
| **Full Regression Suite** | 96 / 96 document engine tests passed; 70 / 70 security tests passed; 17 / 17 voice tests passed |
| **Production Build** | `vite v6.4.3` built in 6.45s (0 errors) |

---

### Files Changed & Created

1. **Canonical Profile**:
   - `data/documents/profiles/european-patent-application.json`: Standard 8-section EPC profile (Title of Invention, Technical Field, Background Art, Summary of Invention, Brief Description of Drawings, Detailed Description of Embodiments, Claims, Abstract) under Rules 42, 43, and 47 EPC with required inputs and review flags.
   - `data/documents/capability-matrix.json`: Added `european-patent-application` (Document #008) at `L3_DRAFTABLE`.
2. **Interview Engine**:
   - `src/lib/european-patent-interview-graph.js`: Turn-taking DAG with:
     - Strict one-question turn-taking.
     - Direct EP vs. EP regional phase disambiguation (`isEpRegionalPhaseFromPctRequest`).
     - Matter context fact extraction (`extractEpMatterFacts`).
     - Deterministic 12-month priority deadline calculation (`calculateEpFilingDeadline`).
     - Adaptive invention domain inference (`inferEpInventionType`).
     - Added subject matter gate (`detectEpAddedSubjectMatter`) under Article 123(2) EPC.
     - Claim support mapping (`evaluateEpClaimSupport`) under Article 84 / Rule 43 EPC.
     - Multiple independent claim check (`evaluateEpMultipleIndependentClaims`) under Rule 43(2) EPC.
     - Two-part claim awareness (`evaluateEpTwoPartClaim`) under Rule 43(1) EPC.
     - Readiness assessment and affirmative confirmation gate (`isAffirmativeConfirmation`).
3. **Drafting Service**:
   - `src/lib/european-patent-drafting-service.js`:
     - 8-section EPC specification assembler (`assembleEpSpecification`).
     - EP claim formatter (`formatEpClaims`).
     - Claim support mapping (`buildEpClaimSupportMap`).
     - Technical change impact analyzer (`analyzeEpChangeImpact`).
     - Section-level user edit preservation.
4. **Routing & Orchestration**:
   - `src/lib/document-engine.js`: Added EP drafting regex patterns in `DOCUMENT_FAMILY_PATTERNS`.
   - `src/lib/document-engine-router.js`: Integrated direct EP interview and drafting dispatch into `routeConversationalIntent`, with safe disambiguation of PCT regional phase.
5. **Benchmarks & Automated Tests**:
   - `benchmarks/document-intelligence-v1/european-patent-application/cases.json`: 19 synthetic cases covering direct EP first filing, US provisional priority, multiple priorities, software/CII, AI/ML, mechanical, electronics, chemical, biotech specialist flag, unknown prior art, two-part claim with verified prior art, multiple independent claims, unity of invention, public disclosure novelty risk, added subject matter, existing matter context, missing deadline data, PCT regional phase misrouting, and unsupported claim limitations.
   - `tests/document-engine/european-patent-interview.test.mjs`: 18 unit tests validating routing, Tests 51 to 64, edit preservation, and confidentiality.
   - `tests/document-engine/european-patent-benchmark.test.mjs`: Automated benchmark runner executing all 19 cases.

---

### Interview Graph Architecture

```
User Intent: "Draft a European patent application"
                 │
                 ▼
       Inspect Matter Context
      (KNOWN / INFERRED / UNKNOWN)
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
Direct EP Filing?      EP Regional Phase from PCT?
(EPC Art. 75/78)       (PCT Art. 22/39(1) / Rule 159 EPC)
      │                     │
      ▼                     ▼
Continue Document #008    Route to National Phase (target: EPO)
      │
      ▼
Priority Check (First filing vs. Paris Convention 12-month priority)
      │
      ▼
Calculate Priority Deadline (EPC Art. 87(1)) [Fail-closed if missing date]
      │
      ▼
Invention Categorization & Adaptive Technical Branching
(Method/System, Software/CII, AI/ML, Mechanical, Electronics, Chemical, Biotech)
      │
      ▼
EPO Technical Problem-Solution Orientation
(Technical Field -> Technical Problem -> Technical Solution -> Technical Effect)
      │
      ▼
Drawings & Reference Numerals (Schematic figures, components)
      │
      ▼
Formalities Check (Applicants, Inventors, Right to Priority, Absolute Novelty)
      │
      ▼
Claim Strategy Formulation (Independent claims per category, Rule 43(1) two-part check)
      │
      ▼
Draft Readiness Gate & Permission
(Summarize facts, flags, unknowns -> Require affirmative confirmation)
      │
      ▼
Specification Assembly (Rules 42, 43, 47 EPC) with Edit Preservation & Provenance
```

---

### Verification & Test Denominators

| Test Suite | Total Tests | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **EP Synthetic Benchmark Suite** (`cases.json`) | 19 | 19 | 0 | **100% PASS** |
| **EP Interview & Statutory Logic Tests** (`european-patent-interview.test.mjs`) | 18 | 18 | 0 | **100% PASS** |
| **All Document Engine Tests** (`tests/document-engine/*.test.mjs`) | 96 | 96 | 0 | **100% PASS** |
| **Security & Confidentiality Tests** (`npm run test:security`) | 70 | 70 | 0 | **100% PASS** |
| **Voice & Turn-Taking Tests** (`tests/voice/*.test.mjs`) | 17 | 17 | 0 | **100% PASS** |
| **Production Build** (`npx vite build`) | 1 | 1 | 0 | **100% PASS** |

---

### Final Status Checklist

```
EP_PROFILE_COMPLETE = TRUE
EP_ROUTING_VERIFIED = TRUE
EP_DIRECT_VS_PCT_ROUTING_VERIFIED = TRUE
EP_INTERVIEW_VERIFIED = TRUE
EP_ONE_QUESTION_MODE_VERIFIED = TRUE
EP_MATTER_CONTEXT_VERIFIED = TRUE
EP_PRIORITY_LOGIC_VERIFIED = TRUE
EP_MULTIPLE_PRIORITY_VERIFIED = TRUE
EP_PRIORITY_SUPPORT_VERIFIED = TRUE
EP_TECHNICAL_EFFECT_MODEL_VERIFIED = TRUE
EP_CII_BRANCH_VERIFIED = TRUE
EP_CLAIM_STRATEGY_VERIFIED = TRUE
EP_CLAIM_SUPPORT_VERIFIED = TRUE
EP_TWO_PART_CLAIM_HANDLING_VERIFIED = TRUE
EP_MULTIPLE_INDEPENDENT_CLAIM_REVIEW_VERIFIED = TRUE
EP_UNITY_REVIEW_VERIFIED = TRUE
EP_ADDED_SUBJECT_MATTER_GATE_VERIFIED = TRUE
EP_BASIS_MAPPING_VERIFIED = TRUE
EP_DEADLINE_SAFETY_VERIFIED = TRUE
EP_DRAFTING_VERIFIED = TRUE
EP_EDIT_PRESERVATION_VERIFIED = TRUE
EP_EXPORT_VERIFIED = TRUE
EP_VOICE_VERIFIED = TRUE
EP_SECURITY_VERIFIED = TRUE
EP_L3_DRAFTABLE = TRUE
EP_L4_VALIDATED = TRUE
EP_L5_PRACTITIONER_REVIEWED = FALSE
```
