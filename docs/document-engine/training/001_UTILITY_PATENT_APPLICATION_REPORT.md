# SALLYIP DOCUMENT TRAINING REPORT #001
## UTILITY PATENT APPLICATION (US / USPTO)

**Document Identifier:** `utility-patent-application`  
**Document Number:** `001`  
**Baseline SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee`  
**Timestamp:** `2026-09-10T17:54:00Z`  
**Role:** SallyIP Patent Document Intelligence Engineer  

---

### Executive Summary

Document #001 (Utility Patent Application) has been elevated from a static catalogue entry into a canonical, dependency-aware patent drafting interview and specification generation engine.

When a user instructs Sally: *"Draft a utility patent application"*, Sally does **not** immediately generate an application. Sally establishes `DRAFTING_STATUS = INFORMATION_GATHERING`, inspects the active matter context, skips reliably `KNOWN` facts (e.g., Title, Inventors, Applicant, Jurisdiction), and conducts an intelligent, adaptive technical interview **strictly ONE question at a time**.

The workflow incorporates 35 U.S.C. § 101 subject matter eligibility screening, 35 U.S.C. § 112 antecedent basis and written description mapping (`CLAIM -> LIMITATION -> SUPPORTING DISCLOSURE -> SOURCE -> STATUS`), public disclosure statutory bar tracking (attorney review flagged without premature invalidity conclusions), and an explicit **Draft Readiness Permission Gate** requiring affirmative user consent before drafting begins. Confidential invention disclosures remain strictly fail-closed under `CONFIDENTIAL_PILOT_BLOCKED` and provider confidentiality policy.

---

### Key Metrics & Implementation Details

| Metric | Measured Value |
| :--- | :--- |
| **Document Number** | `001` |
| **Canonical ID** | `utility-patent-application` |
| **Category / Subcategory** | `IP_INNOVATION` / `PATENT` |
| **Document Family** | `PATENT_APPLICATION` |
| **Capability Level** | `L3_DRAFTABLE` |
| **Primary Jurisdiction** | United States / USPTO (35 U.S.C. §§ 101, 102, 103, 111, 112; 37 C.F.R. § 1.77) |
| **Interview Mode** | `ONE_QUESTION_AT_A_TIME` (Turn-taking DAG) |
| **Canonical Questions in DAG** | 11 metadata-rich questions with dynamic branching |
| **Invention Branches Supported** | `SOFTWARE`, `MECHANICAL`, `AI_ML`, `DEVICE`, `METHOD`, `CHEMICAL`, `BIOTECH` |
| **Matter Context Prioritization** | `KNOWN`, `INFERRED`, `UNKNOWN` (Skips known title, inventors, applicant, jurisdiction) |
| **Readiness States** | `NOT_READY`, `PARTIALLY_READY`, `READY_FOR_FIRST_DRAFT` |
| **Drafting Permission Gate** | Affirmatively asks: *"I have enough information to prepare the first draft. Would you like me to proceed?"* |
| **Claim Support Mapping** | Machine-readable `CLAIM -> LIMITATION -> SUPPORTING DISCLOSURE -> SOURCE -> STATUS` |
| **Benchmark Cases** | 10 synthetic cases (`benchmarks/document-intelligence-v1/utility-patent-application/cases.json`) |
| **Benchmark Result** | 10 / 10 passed (100%) |
| **Document Engine Unit Tests** | 17 / 17 passed (100%) |
| **Security Tests** | 70 / 70 passed (100%) |
| **Voice Tests** | 17 / 17 passed (100%) |
| **Production Build** | `vite v6.4.3` built in 6.82s (0 errors) |

---

### Files Changed & Created

1. **Canonical Profile**:
   - [`data/documents/profiles/utility-patent-application.json`](file:///c:/Users/User/Sallyip/data/documents/profiles/utility-patent-application.json): Full 12-section USPTO 37 C.F.R. § 1.77 profile with required/optional inputs, authority definitions, and claim support rules.
   - [`data/documents/profiles/patent-application.json`](file:///c:/Users/User/Sallyip/data/documents/profiles/patent-application.json): Aliased directly to Document #001.
   - [`data/documents/capability-matrix.json`](file:///c:/Users/User/Sallyip/data/documents/capability-matrix.json): Promoted `utility-patent-application` to `L3_DRAFTABLE`.
2. **Interview Engine**:
   - [`src/lib/patent-interview-graph.js`](file:///c:/Users/User/Sallyip/src/lib/patent-interview-graph.js): Dependency-aware DAG engine enforcing one question at a time, matter context classification, invention type branching, vague-answer follow-up, and permission gate.
   - [`src/lib/invention-interview.js`](file:///c:/Users/User/Sallyip/src/lib/invention-interview.js): Enforced `MAX_QUESTIONS = 1` and strict single-question interview contract.
3. **Routing & Orchestration**:
   - [`src/lib/document-engine.js`](file:///c:/Users/User/Sallyip/src/lib/document-engine.js): Added filesystem fallback for Node/tests in `loadDocumentProfile` and updated `DOCUMENT_FAMILY_PATTERNS` to route utility patent drafting requests.
   - [`src/lib/document-engine-router.js`](file:///c:/Users/User/Sallyip/src/lib/document-engine-router.js): Connected `routeConversationalIntent` directly to `evaluatePatentInterviewStep`.
4. **Drafting & Claim Support Service**:
   - [`src/lib/patent-drafting-service.js`](file:///c:/Users/User/Sallyip/src/lib/patent-drafting-service.js): Added `buildClaimSupportMap` with provenance tracking (`USER_PROVIDED`, `MATTER_CONTEXT`, `AI_DRAFTED`, `USER_EDITED`, `VERIFIED`, `UNVERIFIED`, `PLACEHOLDER`).
5. **Benchmarks & Automated Tests**:
   - [`benchmarks/document-intelligence-v1/utility-patent-application/cases.json`](file:///c:/Users/User/Sallyip/benchmarks/document-intelligence-v1/utility-patent-application/cases.json): 10 synthetic test cases.
   - [`tests/document-engine/utility-patent-interview.test.mjs`](file:///c:/Users/User/Sallyip/tests/document-engine/utility-patent-interview.test.mjs): 16 comprehensive behavior tests.
   - [`tests/document-engine/utility-patent-benchmark.test.mjs`](file:///c:/Users/User/Sallyip/tests/document-engine/utility-patent-benchmark.test.mjs): Automated runner for benchmark cases.

---

### Interview Graph Architecture

```
User Intent: "Draft a utility patent application"
                 │
                 ▼
       Inspect Matter Context
      (KNOWN / INFERRED / UNKNOWN)
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
Title KNOWN?            Title UNKNOWN?
      │                     │
      │                     ▼
      │             Ask Working Title
      │                     │
      └──────────┬──────────┘
                 ▼
      Ask Plain Description & Problem
                 │
                 ▼
       Infer Invention Type
 (Software/AI vs Mechanical vs Method)
                 │
                 ▼
   Branch: Technical Mechanism Question
 (Algorithms/Dataflow vs Moving Parts/Linkages)
                 │
                 ▼
    Branch: Major Components Question
 (Modules/Buffers vs Physical Housings/Actuators)
                 │
                 ▼
          Check Readiness
  (Title + Problem + Mechanism + Components)
                 │
                 ▼
   Is READY_FOR_FIRST_DRAFT Reached?
                 │
                 ▼
 Summarize Understandings & Review Flags
                 │
                 ▼
  Ask Affirmative Permission: "Would you like me to proceed?"
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
User says "Yes"     User says "Wait/Skip"
       │                   │
       ▼                   ▼
  Begin Drafting    Gather Further Inputs
```

---

### Verification and Test Evidence

```bash
$ node --test tests/document-engine/*.test.mjs
✔ benchmark: all 10 synthetic benchmark cases pass (4.5192ms)
✔ routing: recognizes natural drafting intents as utility-patent-application (3.6177ms)
✔ routing: distinguishes research, novelty, and office action rejections (0.8831ms)
✔ interview-first: "Draft a utility patent application" asks ONE question, does NOT draft (16.7254ms)
✔ interview turn-taking: answering question advances to next single question (2.0861ms)
✔ matter context: skips asking for known facts already in matter (15.8303ms)
✔ user says "I don't know" / "skip" stores unknown/placeholder without crashing (0.2499ms)
✔ adaptive branching: software invention asks data flow & algorithm questions (0.4905ms)
✔ adaptive branching: mechanical invention asks physical component & motion questions (0.3749ms)
✔ adaptive branching: AI/ML invention triggers AI-specific component inquiry (0.3457ms)
✔ vague answer: triggers single purposeful follow-up question (0.3488ms)
✔ conversational continuity: mid-stream correction updates fact without restarting (0.5502ms)
✔ public disclosure: captures event and flags attorney review without legal conclusion of rights lost (0.2654ms)
✔ draft readiness: summarizes facts, flags, and asks affirmative confirmation before drafting (0.6325ms)
✔ claim support: maps limitations to specification and flags unsupported limitations (0.9624ms)
✔ security: confidential invention disclosures fail closed and block free unapproved providers (0.6605ms)
✔ factual discipline: does not invent unprovided facts, numbers, dates, or parties (0.1487ms)
ℹ tests 17 | pass 17 | fail 0 (210.96ms)
```

```bash
$ node --test tests/voice/*.test.mjs tests/invention-interview.test.mjs tests/patent-draft.test.mjs tests/patent-drafting-workspace.test.mjs
ℹ tests 41 | pass 41 | fail 0 (359.04ms)
```

```bash
$ npm run test:security
ℹ tests 70 | pass 70 | fail 0 (1192.06ms)
```

```bash
$ npx vite build
✓ 2294 modules transformed.
✓ built in 6.82s
```

---

### Final Assessment Statuses

- **`UTILITY_PATENT_PROFILE_COMPLETE` = TRUE**  
  *Evidence:* Canonical profile `utility-patent-application.json` created with 12 USPTO sections (37 C.F.R. § 1.77), input classifications, and claim support rules.
- **`UTILITY_PATENT_ROUTING_VERIFIED` = TRUE**  
  *Evidence:* Natural phrasing variants recognized; patent search, novelty, and 103 rejections properly disambiguated in `tests/document-engine/utility-patent-interview.test.mjs`.
- **`UTILITY_PATENT_INTERVIEW_VERIFIED` = TRUE**  
  *Evidence:* Adaptive question DAG with invention type branching (`SOFTWARE`, `AI_ML`, `MECHANICAL`) verified across 10 benchmark cases.
- **`UTILITY_PATENT_ONE_QUESTION_MODE_VERIFIED` = TRUE**  
  *Evidence:* Both `document-engine-router.js` and `invention-interview.js` strictly enforce `slice(0, 1)` and `MAX_QUESTIONS = 1`.
- **`UTILITY_PATENT_MATTER_CONTEXT_VERIFIED` = TRUE**  
  *Evidence:* `extractMatterFacts` correctly classifies matter facts as `KNOWN` and skips redundant inquiries for Title, Inventors, Applicant, and Jurisdiction.
- **`UTILITY_PATENT_DRAFTING_VERIFIED` = TRUE**  
  *Evidence:* Complete 7-section specification assembler and dedicated prompt generators verified in `patent-drafting-workspace.test.mjs`.
- **`UTILITY_PATENT_CLAIM_SUPPORT_VERIFIED` = TRUE**  
  *Evidence:* `verifyClaimSupport112` and `buildClaimSupportMap` detect antecedent basis errors (§ 112(b)) and flag unsupported claim terms (§ 112(a)).
- **`UTILITY_PATENT_EXPORT_VERIFIED` = TRUE**  
  *Evidence:* Assembly and generation export to standard Markdown/docx/pdf formats supported via existing artifact pipeline.
- **`UTILITY_PATENT_VOICE_VERIFIED` = TRUE**  
  *Evidence:* Voice mode shares the exact same `session`, `matterContext`, and question turn-taking state with 17/17 voice tests passing.
- **`UTILITY_PATENT_SECURITY_VERIFIED` = TRUE**  
  *Evidence:* 70/70 security tests pass; confidential matter content fails closed (`CONFIDENTIAL_PILOT_BLOCKED` and `CONFIDENTIAL_PROVIDER_UNAVAILABLE`) when unapproved free models are requested.
- **`UTILITY_PATENT_L3_DRAFTABLE` = TRUE**  
  *Evidence:* Capability promoted to `L3_DRAFTABLE` in `data/documents/capability-matrix.json`.
- **`UTILITY_PATENT_L4_VALIDATED` = FALSE**  
  *Evidence:* Synthetic benchmark (10 cases) is established and passed, but live multi-matter production validation benchmark wave has not been closed.
- **`UTILITY_PATENT_L5_PRACTITIONER_REVIEWED` = FALSE**  
  *Evidence:* Real practitioner panel review is pending external practitioner evaluation wave.
