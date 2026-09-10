# SALLYIP DOCUMENT TRAINING REPORT #006
## PCT INTERNATIONAL PATENT APPLICATION (WIPO / PATENT COOPERATION TREATY)

**Document Identifier:** `pct-international-patent-application`  
**Document Number:** `006`  
**Baseline SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee`  
**Final SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (Working Tree)  
**Timestamp:** `2026-09-10T18:20:00Z`  
**Role:** SallyIP Patent Document Intelligence Engineer  

---

### Executive Summary

Document #006 (PCT International Patent Application under the Patent Cooperation Treaty administered by WIPO) has been implemented and trained into a canonical, dependency-aware drafting interview and international patent specification generation engine.

When a user instructs Sally: *"Draft a PCT application"*, Sally does **not** immediately generate an application. Sally establishes `DRAFTING_STATUS = INFORMATION_GATHERING`, inspects the active matter context to classify known/inferred/unknown facts, and conducts an intelligent, adaptive interview strictly **ONE QUESTION AT A TIME**.

Key domain-specific capabilities established:
1. **International Phase vs National Phase Distinction:** Differentiates the unified international phase filing (governed by PCT Articles 11, 19, and 34) from national or regional phase entry (governed by PCT Articles 22 and 39). Intercepts national phase entry requests (*"Enter the US national phase"*, *"Enter Europe from this PCT"*) with explicit procedural guidance rather than premature PCT drafting.
2. **Global Patent Misconception Clarification:** Catches user inquiries such as *"Will this give me a worldwide patent?"* and clarifies that no "worldwide patent" exists; the PCT establishes an international filing date across 157+ Contracting States, followed by international search and publication, after which applicants must enter individual national/regional phases to obtain granted patents.
3. **Priority Path & Multiple Priorities Tracking (PCT Rule 4.10):** Supports first-filing PCT applications, single priority claims (US provisional, non-provisional, foreign applications), and multiple priority claims. Each priority record is maintained with distinct metadata (`country_or_office`, `application_number`, `filing_date`, `applicant`, `source`, `verification_status`) and never collapsed into a single record.
4. **New Matter Detection & Priority Support Review:** Analyzes technical subject matter against earlier priority disclosures (e.g., adding LiDAR defect detection to an earlier camera-only provisional); classifies newly added features as `NEWLY_PROVIDED` / `PARTIALLY_SUPPORTED` and raises `PRIORITY_SUPPORT_REVIEW_REQUIRED`.
5. **Applicant vs Inventor Separation & Entitlement Verification (PCT Article 9):** Enforces strict separation between applicants (entities holding filing entitlement) and inventors (natural persons who conceived the invention). Does not infer employment-based ownership without written assignment. Flags `PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED` if applicant nationality and residence are unconfirmed.
6. **Receiving Office (RO) & Search Authority (ISA) Awareness (PCT Rule 19):** Captures designated Receiving Offices (RO/US, RO/IB, RO/EP) without hardcoding a single receiving office for every filing.
7. **Deadline Calculation Safety:** Evaluates PCT deadline inquiries (*"When is my PCT deadline?"*). If the priority date is unknown, refuses to guess and requests the verified date. If known, computes the 12-month international filing deadline (Paris Convention Art. 4 / PCT Art. 8) and 30/31-month national phase deadlines with complete, traceable calculation logs and legal citations.
8. **Multi-Category International Claim Set & Support Mapping (PCT Rule 6):** Generates flexible claim sets across statutory categories (method, system, computer-readable medium) and maps claim limitations to specification sections (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`).
9. **Draft Readiness Gate & Affirmative User Permission:** Summarizes application parameters, priority filings, applicants, inventors, and review flags, and explicitly requires affirmative user confirmation before initiating document assembly.
10. **Edit Preservation & Change Impact Analysis:** Differentiates priority updates from patent claim edits; preserves user-edited claims when bibliographic data changes, and preserves unaffected description sections when priority or technical features are updated.
11. **Security & Provider Confidentiality:** Unpublished technical disclosures and confidential priority data fail closed under `CONFIDENTIAL_PILOT_BLOCKED` and provider confidentiality policy.

---

### Key Metrics & Implementation Details

| Metric | Measured Value |
| :--- | :--- |
| **Document Number** | `006` |
| **Canonical ID** | `pct-international-patent-application` |
| **Category / Subcategory** | `IP_INNOVATION` / `PATENT` |
| **Document Family** | `INTERNATIONAL_PATENT_APPLICATION` |
| **Capability Level** | `L3_DRAFTABLE` (Promoted in capability matrix) |
| **Governing Law / Rules** | Patent Cooperation Treaty (PCT, 1970); Regulations under the PCT; PCT Administrative Instructions |
| **Jurisdiction / Authority** | International (`PCT`) / World Intellectual Property Organization (`WIPO`) |
| **Interview Mode** | `ONE_QUESTION_AT_A_TIME = TRUE` |
| **Canonical Questions in DAG** | 11 dependency-aware questions with dynamic priority and invention-type branching |
| **Invention Branches Supported** | `SOFTWARE`, `AI_ML`, `MECHANICAL`, `SYSTEM`, `DEVICE`, `BIOTECH`, `CHEMICAL` |
| **Matter Context Prioritization** | `KNOWN`, `INFERRED`, `UNKNOWN` (Skips known title, inventors, applicant, priority applications) |
| **Claim Structure** | Multi-category international flexibility (Method, System, CRM, Apparatus) under PCT Rule 6 |
| **Readiness States** | `NOT_READY`, `PARTIALLY_READY`, `READY_FOR_FIRST_DRAFT` |
| **Readiness Gate** | Affirmatively asks: *"I have enough information to prepare the first PCT application draft. Would you like me to proceed?"* |
| **Benchmark Suite** | 17 synthetic cases (`benchmarks/document-intelligence-v1/pct-international-patent-application/cases.json`) |
| **Benchmark Result** | 17 / 17 passed (100%) |
| **Document Engine Unit Tests** | 17 / 17 passed (100%) |
| **Total PCT Tests** | 18 / 18 passed (100%) |
| **Full Regression Suite** | 56 / 56 document engine tests passed; 70 / 70 security tests passed; 17 / 17 voice tests passed |
| **Production Build** | `vite v6.4.3` built in 5.82s (0 errors) |

---

### Files Changed & Created

1. **Canonical Profile**:
   - `data/documents/profiles/pct-international-patent-application.json`: Standard 10-section WIPO PCT profile (Title, Technical Field, Background Art, Disclosure/Summary of Invention, Brief Description of Drawings, Detailed Description/Modes for Carrying Out the Invention, Examples, Industrial Applicability, Claims, Abstract) under PCT Rules 4, 5, 6, and 8 with review flags.
   - `data/documents/capability-matrix.json`: Promoted `pct-international-patent-application` to `L3_DRAFTABLE`.
2. **Interview Engine**:
   - `src/lib/pct-interview-graph.js`: Complete turn-taking DAG with:
     - Strict one-question turn-taking.
     - Matter context fact extraction (`extractPctMatterFacts`).
     - Priority status inference and multiple priority capture.
     - New technical matter detection and review flagging (`PRIORITY_SUPPORT_REVIEW_REQUIRED`).
     - National phase request interception (`isNationalPhaseRequest`).
     - Worldwide patent misconception clarification (`isGlobalPatentMisconception`).
     - Deadline calculation with traceable rule logging (`calculatePctDeadline`).
     - Applicant vs inventor distinction and nationality entitlement review (`PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED`).
     - Affirmative confirmation permission gate (`isAffirmativeConfirmation`).
3. **Drafting & Claim Service**:
   - `src/lib/pct-drafting-service.js`:
     - WIPO 10-section PCT specification assembler (`assemblePctSpecification`).
     - Multi-category claim set generator (`formatPctClaims`).
     - Machine-readable claim support mapping (`buildPctClaimSupportMap`).
     - Change impact analyzer (`analyzePctChangeImpact`) distinguishing priority updates from claim revisions and preserving untouched sections.
4. **Routing & Orchestration**:
   - `src/lib/document-engine.js`: Added regex matching natural PCT drafting phrases in `DOCUMENT_FAMILY_PATTERNS`.
   - `src/lib/document-engine-router.js`: Integrated `evaluatePctInterviewStep` and intercepted national phase and global patent misconception queries.
5. **Benchmarks & Automated Tests**:
   - `benchmarks/document-intelligence-v1/pct-international-patent-application/cases.json`: 17 synthetic cases covering first filings, single priority, multiple priorities, foreign priority, software, AI, mechanical, biotech flag, multiple applicants, multiple inventors, missing bibliographic facts, public disclosures, new matter, national phase routing, deadlines, misconceptions, and unsupported claims.
   - `tests/document-engine/pct-patent-interview.test.mjs`: 17 comprehensive unit tests verifying turn-taking, priority handling, new matter flagging, national phase distinction, global patent misconception, claim support, deadline safety, edit preservation, and confidentiality fail-closed.
   - `tests/document-engine/pct-patent-benchmark.test.mjs`: Automated benchmark runner validating all 17 cases.

---

### Interview Graph Architecture

```
User Intent: "Draft a PCT application"
                 │
                 ▼
       Inspect Matter Context
      (KNOWN / INFERRED / UNKNOWN)
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
Priority KNOWN?       Priority UNKNOWN?
      │                     │
      │                     ▼
      │             Ask Priority Status
      │        (First Filing vs Provisional vs Multiple)
      │                     │
      └──────────┬──────────┘
                 ▼
          Ask Working Title
                 │
                 ▼
        Ask Technical Field
                 │
                 ▼
    Ask Problem & Limitations of Prior Art
                 │
                 ▼
       Infer Invention Type
 (Software / AI vs Mechanical vs Biotech)
                 │
                 ▼
      Ask Technical Features & Mechanism
                 │
        ┌────────┴────────┐
        ▼                 ▼
New Matter Detected?  Biotech / Sequence?
Flag Priority Support Flag Specialist Review
        └────────┬────────┘
                 ▼
   Ask Drawings / Figures Description
                 │
                 ▼
    Ask Applicants & Nationality/Residence (PCT Art. 9)
                 │
                 ▼
       Ask Individual Inventors
                 │
                 ▼
  Ask Intended Receiving Office (RO)
                 │
                 ▼
  Check Readiness (Title + Priority + Problem + Features)
                 │
                 ▼
  Is READY_FOR_FIRST_DRAFT Reached?
                 │
                 ▼
  Summarize Findings, Review Flags & Known Unknowns
                 │
                 ▼
   Ask Affirmative Permission: "Would you like me to proceed?"
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
User says "Yes"     User says "Wait/Skip"
       │                   │
       ▼                   ▼
 Assemble PCT Draft   Gather Further Inputs
```

---

### Verification and Test Evidence

#### PCT Patent Unit Tests (`tests/document-engine/pct-patent-interview.test.mjs`)
```bash
✔ routing: recognizes natural PCT drafting requests (2.47ms)
✔ routing: does NOT route national phase or unrelated requests to PCT initial draft (1.11ms)
✔ interview-first: "Draft a PCT application" asks strictly ONE question, does NOT draft immediately (17.51ms)
✔ interview turn-taking: answering question advances to next single question (1.18ms)
✔ priority: "We filed a US provisional last year" captures fact and asks relevant follow-up without inventing data (0.72ms)
✔ multiple priorities: creates separate records, collects facts one at a time without merging (0.95ms)
✔ matter context: skips asking for known title, inventors, applicant, and priority (13.88ms)
✔ new matter after priority: detects new technical feature (LiDAR) and flags priority support review (3.31ms)
✔ PCT vs national phase: "I need to enter the European phase from my PCT" triggers clarification (0.35ms)
✔ global patent misconception: "Will this give me a worldwide patent?" clarifies no worldwide patent exists (0.36ms)
✔ claim support: unsupported claim limitation is flagged as UNSUPPORTED (0.71ms)
✔ bibliographic facts: missing applicant nationality marks unknown/placeholder and flags eligibility review (0.19ms)
✔ deadline safety: if priority date unknown, requests date; if known, calculates 12-month deadline with traceable rule (0.96ms)
✔ edit preservation: user edits Claim 1, then updates applicant metadata -> Claim 1 remains unchanged (0.88ms)
✔ draft readiness: summarizes parameters and flags, asks affirmative confirmation before drafting (0.48ms)
✔ change impact: priority modification identifies affected sections and preserves others (0.17ms)
✔ security: confidential unpublished PCT invention disclosures fail closed and block unapproved models (1.12ms)
ℹ tests 17 | pass 17 | fail 0 (180.57ms)
```

#### PCT Benchmark Suite (`tests/document-engine/pct-patent-benchmark.test.mjs`)
```bash
✔ benchmark: all 17 synthetic PCT benchmark cases pass (7.63ms)
ℹ tests 1 | pass 1 | fail 0 (121.22ms)
```

#### Full Document Engine Regression (`tests/document-engine/*.test.mjs`)
```bash
# Document #001 (Utility), Document #005 (Plant), Document #006 (PCT)
ℹ tests 56 | pass 56 | fail 0 (300.53ms)
```

#### Security Test Suite (`npm run test:security`)
```bash
ℹ tests 70 | pass 70 | fail 0 (778.17ms)
```

#### Voice Mode Regression (`tests/voice/*.test.mjs`)
```bash
ℹ tests 17 | pass 17 | fail 0 (220.75ms)
```

#### Production Build (`npx vite build`)
```bash
vite v6.4.3 building for production...
✓ 2294 modules transformed.
✓ built in 5.82s
```

---

### Final Assessment Statuses

- **`PCT_PROFILE_COMPLETE` = TRUE**  
  *Evidence:* Canonical profile `pct-international-patent-application.json` created with 10 standard WIPO PCT sections (Rules 4, 5, 6, 8), multi-category claim rules, required/optional inputs, and review flags.
- **`PCT_ROUTING_VERIFIED` = TRUE**  
  *Evidence:* Natural phrasing variants recognized; non-PCT requests (national phase entries, European applications, prior-art searches) properly routed/disambiguated.
- **`PCT_INTERVIEW_VERIFIED` = TRUE**  
  *Evidence:* Adaptive question DAG with priority branching and technical categorization verified across 17 benchmark cases and 17 unit tests.
- **`PCT_ONE_QUESTION_MODE_VERIFIED` = TRUE**  
  *Evidence:* `evaluatePctInterviewStep` returns strictly `single_question` and `document-engine-router.js` packages `questions.slice(0, 1)`.
- **`PCT_MATTER_CONTEXT_VERIFIED` = TRUE**  
  *Evidence:* `extractPctMatterFacts` classifies matter facts as `KNOWN`, `INFERRED`, or `UNKNOWN`, skipping inquiries for pre-existing title, inventors, applicant, and priority applications.
- **`PCT_PRIORITY_LOGIC_VERIFIED` = TRUE**  
  *Evidence:* Captures filing path (`FIRST_FILING_PCT`, `CLAIMS_PRIORITY_TO_PROVISIONAL`, `CLAIMS_PRIORITY_TO_NONPROVISIONAL`, `CLAIMS_PRIORITY_TO_FOREIGN_APPLICATION`, `CLAIMS_MULTIPLE_PRIORITIES`) without fabricating application numbers or dates.
- **`PCT_MULTIPLE_PRIORITY_VERIFIED` = TRUE**  
  *Evidence:* Verified that dual priority applications create distinct priority records collected turn by turn, never collapsed into one record.
- **`PCT_PRIORITY_SUPPORT_VERIFIED` = TRUE**  
  *Evidence:* Addition of new technical matter (e.g., LiDAR) after camera-only provisional raises `PRIORITY_SUPPORT_REVIEW_REQUIRED` and sets `priority_support_status = PARTIALLY_SUPPORTED`.
- **`PCT_APPLICANT_INVENTOR_VERIFIED` = TRUE**  
  *Evidence:* Applicants and inventors are tracked independently; missing applicant nationality flags `PCT_FILING_ELIGIBILITY_REVIEW_REQUIRED` under PCT Article 9.
- **`PCT_RECEIVING_OFFICE_LOGIC_VERIFIED` = TRUE**  
  *Evidence:* Receiving Office context (RO/US, RO/IB, RO/EP) captured without assuming or hardcoding a single office.
- **`PCT_DISCLOSURE_READINESS_VERIFIED` = TRUE**  
  *Evidence:* Readiness engine evaluates `title`, `priority_status`, `problem_solution`, and `technical_features` before reaching `READY_FOR_FIRST_DRAFT`.
- **`PCT_CLAIM_STRATEGY_VERIFIED` = TRUE**  
  *Evidence:* Multi-category international claim sets (method, system, CRM) generated with proper antecedents and dependencies.
- **`PCT_CLAIM_SUPPORT_VERIFIED` = TRUE**  
  *Evidence:* `buildPctClaimSupportMap` detects unsupported limitations and marks them `UNSUPPORTED`.
- **`PCT_NATIONAL_PHASE_DISTINCTION_VERIFIED` = TRUE**  
  *Evidence:* Requests to enter national phase (US, Europe) intercepted with statutory distinction explaining Articles 22 and 39.
- **`PCT_DEADLINE_SAFETY_VERIFIED` = TRUE**  
  *Evidence:* `calculatePctDeadline` refuses to calculate without verified priority date; calculates 12-month and 30/31-month deadlines with full legal traces when date is provided.
- **`PCT_DRAFTING_VERIFIED` = TRUE**  
  *Evidence:* `assemblePctSpecification` produces standard WIPO 10-section draft with cross-reference to related applications.
- **`PCT_EDIT_PRESERVATION_VERIFIED` = TRUE**  
  *Evidence:* User edits to Claim 1 are preserved when applicant metadata is updated; unaffected sections remain untouched during priority changes.
- **`PCT_EXPORT_VERIFIED` = TRUE**  
  *Evidence:* Specification output integrates cleanly into existing export and artifact pipeline.
- **`PCT_VOICE_VERIFIED` = TRUE**  
  *Evidence:* Real-time voice controller shares exact same `session`, `matterContext`, and question turn-taking state with 17/17 voice tests passing.
- **`PCT_SECURITY_VERIFIED` = TRUE**  
  *Evidence:* 70/70 security tests pass; confidential unpublished invention disclosures fail closed (`CONFIDENTIAL_PROVIDER_UNAVAILABLE` / `CONFIDENTIAL_PILOT_BLOCKED`) if unapproved models are used.
- **`PCT_L3_DRAFTABLE` = TRUE**  
  *Evidence:* Capability promoted to `L3_DRAFTABLE` in `data/documents/capability-matrix.json`.
- **`PCT_L4_VALIDATED` = TRUE**  
  *Evidence:* Document-specific synthetic benchmark (`benchmarks/document-intelligence-v1/pct-international-patent-application/cases.json`) executed with 17/17 cases passing.
- **`PCT_L5_PRACTITIONER_REVIEWED` = FALSE**  
  *Evidence:* Practitioner panel review by registered international patent practitioners has not yet occurred.

---

### Known Limitations & Parallel-Work Safety

1. **Known Limitations:**
   - PCT request form (Form PCT/RO/101) generation is advisory and requires human formal verification before electronic filing via ePCT or USPTO Patent Center.
   - Sequence listings under WIPO Standard ST.26 require XML validation via WIPO Sequence tool prior to official submission.
2. **Parallel-Work Safety:**
   - Scoped strictly to Document #006 (`pct-international-patent-application`).
   - Resolved syntax export conflict in parallel agent's `provisional-patent-interview-graph.js` without altering any logic.
   - All 17 Document #001 utility patent tests, all 21 Document #005 plant patent tests, all 70 security tests, and all 17 voice tests pass with 0 regressions.
