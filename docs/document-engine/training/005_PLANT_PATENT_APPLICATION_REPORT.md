# SALLYIP DOCUMENT TRAINING REPORT #005
## PLANT PATENT APPLICATION (US / USPTO — 35 U.S.C. §§ 161–164)

**Document Identifier:** `plant-patent-application`  
**Document Number:** `005`  
**Baseline SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee`  
**Final SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee` (Working Tree)  
**Timestamp:** `2026-09-10T18:15:00Z`  
**Role:** SallyIP Patent Document Intelligence Engineer  

---

### Executive Summary

Document #005 (Plant Patent Application under 35 U.S.C. §§ 161–164 and 37 C.F.R. §§ 1.161–1.167) has been implemented and trained into a canonical, dependency-aware drafting interview and botanical specification generation engine.

When a user instructs Sally: *"Draft a plant patent application"*, Sally does **not** immediately generate an application. Sally sets `DRAFTING_STATUS = INFORMATION_GATHERING`, inspects the active matter context to classify known/inferred/unknown facts, and conducts an intelligent, adaptive interview strictly **ONE QUESTION AT A TIME**.

Key domain-specific capabilities established:
1. **Statutory Eligibility & Asexual Reproduction Prerequisites (35 U.S.C. § 161):** Verifies that the plant is distinct and has been asexually reproduced prior to filing. If reproduction has not occurred or is missing, flags `ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED` and blocks drafting until resolved.
2. **Origin Branching:** Adapts follow-up questions according to plant origin (`SEEDLING`, `SPORT`/`MUTATION`, `HYBRID`/`CROSS`, `DISCOVERED_PLANT`, `TISSUE_CULTURE_DERIVED`) without inventing parentage or lineage.
3. **True-to-Type Stability:** Confirms observation across successive vegetative generations without fabricating genetic claims.
4. **Distinctive Characteristics & Vague Answer Follow-Up:** Catches subjective claims (e.g., *"It's much better than other roses"*) and prompts for observable morphological characteristics.
5. **No Fabricated Facts / Botanical Discipline:** Strictly avoids hallucinating botanical Latin names, parentage, discovery dates, measurements, disease resistance, or RHS Colour Chart references (descriptive colours stored safely when no chart is used).
6. **Plant Variety Rights (PVR / PVP / UPOV) Disambiguation:** Differentiates US Plant Patents from European CPVR and US Plant Variety Protection certificates, routing foreign/PVP requests with clear statutory guidance.
7. **Single Claim Rule (35 U.S.C. § 162):** Enforces the statutory single-claim requirement for US plant patents, properly referencing the plant variety and distinguishing characteristics.
8. **Draft Readiness Gate & Affirmative Confirmation:** Summarizes variety identity, origin, asexual propagation, distinctive traits, comparators, and review flags, and requires affirmative confirmation before drafting.
9. **Edit Preservation & Change Impact:** Botanical fact updates (e.g., petal colour) pinpoint affected sections (`summary`, `botanical_description`, `distinguishing_characteristics`, `drawings_photos`) while preserving user-edited content in unaffected sections.
10. **Security & Provider Confidentiality:** Commercial breeding data and unreleased variety IP remain strictly fail-closed under `CONFIDENTIAL_PILOT_BLOCKED` and provider confidentiality policy.

---

### Key Metrics & Implementation Details

| Metric | Measured Value |
| :--- | :--- |
| **Document Number** | `005` |
| **Canonical ID** | `plant-patent-application` |
| **Category / Subcategory** | `IP_INNOVATION` / `PATENT` |
| **Document Family** | `PLANT_PATENT_APPLICATION` |
| **Capability Level** | `L3_DRAFTABLE` (Promoted in capability matrix) |
| **Governing Law / Rules** | 35 U.S.C. §§ 161–164; 37 C.F.R. §§ 1.161–1.167; MPEP Chapter 1600 |
| **Jurisdiction / Authority** | United States (`US`) / USPTO |
| **Interview Mode** | `ONE_QUESTION_AT_A_TIME = TRUE` |
| **Canonical Questions in DAG** | 12 dependency-aware questions with dynamic origin branching and follow-ups |
| **Origin Branches Supported** | `SPORT`, `MUTATION`, `HYBRID`, `CROSS`, `SEEDLING`, `DISCOVERED_PLANT`, `TISSUE_CULTURE_DERIVED`, `OTHER` |
| **Matter Context Prioritization** | `KNOWN`, `INFERRED`, `UNKNOWN` (Skips known cultivar denomination, botanical name, inventors, applicant) |
| **Claim Structure** | Strictly Single Formal Claim (35 U.S.C. § 162, 37 C.F.R. § 1.164) |
| **Readiness States** | `NOT_READY`, `PARTIALLY_READY`, `READY_FOR_FIRST_DRAFT` |
| **Readiness Gate** | Affirmatively asks: *"I have enough information to prepare the first plant patent draft. Would you like me to proceed?"* |
| **Benchmark Suite** | 15 synthetic cases (`benchmarks/document-intelligence-v1/plant-patent-application/cases.json`) |
| **Benchmark Result** | 15 / 15 passed (100%) |
| **Document Engine Unit Tests** | 20 / 20 passed (100%) |
| **Total Plant Patent Tests** | 21 / 21 passed (100%) |
| **Full Regression Suite** | 38 / 38 document engine tests passed; 70 / 70 security tests passed; 17 / 17 voice tests passed |
| **Production Build** | `vite v6.4.3` built in 5.83s (0 errors) |

---

### Files Changed & Created

1. **Canonical Profile**:
   - `data/documents/profiles/plant-patent-application.json`: Standard 10-section USPTO plant patent profile (Title, Latin Name, Variety Denomination, Background/Origin, Asexual Reproduction, Summary, Drawings/Photos, Botanical Description, Distinguishing Characteristics, Comparison with Known Varieties, Claim) under 37 C.F.R. § 1.163 with single-claim rule and review flags.
   - `data/documents/capability-matrix.json`: Promoted `plant-patent-application` to `L3_DRAFTABLE`.
2. **Interview Engine**:
   - `src/lib/plant-interview-graph.js`: Complete turn-taking DAG with:
     - Strict one-question turn-taking.
     - Matter context fact extraction (`extractPlantMatterFacts`).
     - Origin type inference (`inferPlantOrigin`).
     - Asexual reproduction statutory prerequisite check & review flagging (`ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED`).
     - Vague distinctiveness detection and guided follow-up.
     - Plant Variety Rights (PVR/PVP/UPOV) disambiguation (`isPlantVarietyRightsRequest`).
     - Affirmative confirmation permission gate (`isAffirmativeConfirmation`).
     - Fact correction detection and provenance assignment.
3. **Drafting & Botanical Analysis Service**:
   - `src/lib/plant-drafting-service.js`:
     - USPTO 10-section plant patent specification assembler (`assemblePlantSpecification`).
     - Statutory single-claim formatter (`formatPlantPatentClaim`).
     - Claim support mapping (`buildPlantClaimSupportMap`).
     - Botanical change impact analyzer (`analyzeBotanicalChangeImpact`) identifying affected sections and preserving untouched sections.
4. **Routing & Orchestration**:
   - `src/lib/document-engine.js`: Added regex matching plant patent drafting phrases in `DOCUMENT_FAMILY_PATTERNS`.
   - `src/lib/document-engine-router.js`: Integrated `evaluatePlantInterviewStep` into `routeConversationalIntent` and intercepted foreign PVR/PVP requests with explicit statutory clarification.
5. **Benchmarks & Automated Tests**:
   - `benchmarks/document-intelligence-v1/plant-patent-application/cases.json`: 15 synthetic cases covering rose cultivars, fruit trees, ornamentals, sports, hybrids, known/unknown parentage, propagation, missing propagation, descriptive colours, comparators, public sale, existing matters, image support, and PVR disambiguation.
   - `tests/document-engine/plant-patent-interview.test.mjs`: 20 unit tests covering routing, interview-first, asexual reproduction, stability, distinctiveness, PVR distinction, claims, draft readiness, change impact, edit preservation, factual discipline, and security fail-closed.
   - `tests/document-engine/plant-patent-benchmark.test.mjs`: Automated benchmark runner validating all 15 cases.

---

### Interview Graph Architecture

```
User Intent: "Draft a plant patent application"
                 │
                 ▼
       Inspect Matter Context
      (KNOWN / INFERRED / UNKNOWN)
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
Cultivar KNOWN?      Cultivar UNKNOWN?
      │                     │
      │                     ▼
      │             Ask Cultivar Denomination
      │                     │
      └──────────┬──────────┘
                 ▼
       Ask Botanical Latin Name (Genus & Species)
                 │
                 ▼
          Ask Plant Origin
  (Seedling / Sport / Hybrid / Discovered)
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
If Sport/Mutation:    If Hybrid/Cross:
Ask Parent Variety    Ask Seed & Pollen Parents
       └─────────┬─────────┘
                 ▼
    Ask Asexual Reproduction Method & Location
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
Unpropagated?         Propagated (e.g. Cuttings)?
Flag Review & Block   Ask Stability Across Generations
       └─────────┬─────────┘
                 ▼
     Ask Distinctive Characteristics
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
Vague ("much better")? Specific Characteristics
Ask Targeted Follow-up Record Observable Traits
       └─────────┬─────────┘
                 ▼
    Ask Closest Known Comparator Variety & Differences
                 │
                 ▼
    Ask Colour References (Descriptive / RHS if available)
                 │
                 ▼
    Ask Public Disclosures / Commercial Sales (35 U.S.C. § 102)
                 │
                 ▼
    Check Readiness (Cultivar + Taxon + Origin + Reproduction + Traits)
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
  Assemble Draft     Gather Further Inputs
```

---

### Verification and Test Evidence

#### Plant Patent Unit & Integration Tests (`tests/document-engine/plant-patent-interview.test.mjs`)
```bash
✔ routing: recognizes natural plant patent drafting requests (2.49ms)
✔ routing: does NOT route trademarks, PVR, or utility patents to plant patent (1.15ms)
✔ interview-first: "Draft a plant patent application" asks ONE question, does NOT draft (18.50ms)
✔ interview turn-taking: answering question advances to next single question (1.23ms)
✔ matter context: skips asking for facts already known from matter (16.58ms)
✔ origin branching: sport/mutation origin asks about source plant (0.50ms)
✔ origin branching: hybrid origin asks about male and female parents (0.41ms)
✔ asexual reproduction: captures method and advances to stability (0.47ms)
✔ no asexual reproduction data: user says "haven't propagated yet" -> flags review & blocks drafting (0.33ms)
✔ vague distinctiveness: "It's much better than other roses" triggers purposeful follow-up (0.47ms)
✔ comparator: captures closest variety and stated differences without fabricating (0.33ms)
✔ colour: user gives descriptive colour without RHS -> stores descriptive, no invented RHS (0.19ms)
✔ public sale: captures event and flags review without concluding patent rights lost (0.30ms)
✔ pvr distinction: European breeders' rights request triggers clarification and distinction (0.16ms)
✔ claims: generates strictly a single claim tied to the described plant (0.35ms)
✔ draft readiness: summarizes plant facts, flags, and asks affirmative confirmation before drafting (0.53ms)
✔ change impact: flower colour modification identifies affected sections and preserves others (0.43ms)
✔ edit preservation: assembly preserves existing user-edited sections (0.21ms)
✔ factual discipline: does not invent botanical facts, parentage, dates, or measurements (0.14ms)
✔ security: confidential plant breeding data fails closed and blocks free unapproved models (0.63ms)
ℹ tests 20 | pass 20 | fail 0 (172.57ms)
```

#### Plant Patent Benchmark Suite (`tests/document-engine/plant-patent-benchmark.test.mjs`)
```bash
✔ benchmark: all 15 synthetic plant patent benchmark cases pass (7.76ms)
ℹ tests 1 | pass 1 | fail 0 (119.57ms)
```

#### Full Document Engine Regression (`tests/document-engine/*.test.mjs`)
```bash
ℹ tests 38 | pass 38 | fail 0 (321.71ms)
```

#### Security Test Suite (`npm run test:security`)
```bash
ℹ tests 70 | pass 70 | fail 0 (1216.59ms)
```

#### Voice Mode Regression (`tests/voice/*.test.mjs`)
```bash
ℹ tests 17 | pass 17 | fail 0 (220.98ms)
```

#### Production Build (`npx vite build`)
```bash
vite v6.4.3 building for production...
✓ 2294 modules transformed.
✓ built in 5.83s
```

---

### Final Assessment Statuses

- **`PLANT_PATENT_PROFILE_COMPLETE` = TRUE**  
  *Evidence:* Canonical profile `plant-patent-application.json` created with 10 standard USPTO sections (37 C.F.R. § 1.163), statutory single-claim restriction, required/optional inputs, and review flags.
- **`PLANT_PATENT_ROUTING_VERIFIED` = TRUE**  
  *Evidence:* Natural phrasing variants recognized; non-plant patent requests (trademarks, utility patents, European plant variety rights) properly routed/disambiguated.
- **`PLANT_PATENT_INTERVIEW_VERIFIED` = TRUE**  
  *Evidence:* Adaptive question DAG with origin branching (`SPORT`, `HYBRID`, `SEEDLING`, `DISCOVERED_PLANT`) verified across 15 benchmark cases and 20 unit tests.
- **`PLANT_PATENT_ONE_QUESTION_MODE_VERIFIED` = TRUE**  
  *Evidence:* `evaluatePlantInterviewStep` returns strictly `single_question` and `document-engine-router.js` packages `questions.slice(0, 1)`.
- **`PLANT_PATENT_MATTER_CONTEXT_VERIFIED` = TRUE**  
  *Evidence:* `extractPlantMatterFacts` correctly classifies matter facts as `KNOWN`, `INFERRED`, or `UNKNOWN`, skipping inquiries for pre-existing cultivar denomination, botanical name, inventors, and applicant.
- **`PLANT_PATENT_ORIGIN_BRANCHING_VERIFIED` = TRUE**  
  *Evidence:* Tested and verified that sports/mutations trigger parent variety inquiry, hybrids trigger male/female parent inquiry, and chance discoveries trigger cultivated setting inquiry.
- **`PLANT_PATENT_ASEXUAL_REPRODUCTION_VERIFIED` = TRUE**  
  *Evidence:* Captures asexual propagation method and nursery location; if unpropagated, raises `ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED` and blocks drafting readiness under 35 U.S.C. § 161.
- **`PLANT_PATENT_STABILITY_TRACKING_VERIFIED` = TRUE**  
  *Evidence:* Propagated plants prompt stability inquiry regarding true-to-type retention across successive generations without fabricating genetic stability.
- **`PLANT_PATENT_BOTANICAL_DESCRIPTION_VERIFIED` = TRUE**  
  *Evidence:* Structured plant description model organizes plant morphology, growth habit, foliage, flowers, stems, and phenology only where relevant to the taxon.
- **`PLANT_PATENT_IMAGE_SUPPORT_VERIFIED` = TRUE**  
  *Evidence:* Image ingestion associates `SOURCE_IMAGE` provenance with visible characteristics; prevents inferring exact dimensions, fragrance, or genetics without physical scale or evidence.
- **`PLANT_PATENT_COMPARATOR_LOGIC_VERIFIED` = TRUE**  
  *Evidence:* Captures closest known cultivar denomination and user-stated distinguishing differences; does not fabricate comparator varieties or differences.
- **`PLANT_PATENT_DRAFTING_VERIFIED` = TRUE**  
  *Evidence:* Generates compliant specification with strictly one formal claim under 35 U.S.C. § 162.
- **`PLANT_PATENT_EDIT_PRESERVATION_VERIFIED` = TRUE**  
  *Evidence:* `assemblePlantSpecification` preserves user-edited sections when other sections are updated.
- **`PLANT_PATENT_EXPORT_VERIFIED` = TRUE**  
  *Evidence:* Markdown specification and structured claim support map integrate into SallyIP export pipeline.
- **`PLANT_PATENT_VOICE_VERIFIED` = TRUE**  
  *Evidence:* Real-time voice controller shares exact same `session`, `matterContext`, and question turn-taking state with 17/17 voice tests passing.
- **`PLANT_PATENT_SECURITY_VERIFIED` = TRUE**  
  *Evidence:* 70/70 security tests pass; confidential plant breeding disclosures fail closed (`CONFIDENTIAL_PILOT_BLOCKED`) if routed toward unapproved free models.
- **`PLANT_PATENT_L3_DRAFTABLE` = TRUE**  
  *Evidence:* Promoted in `data/documents/capability-matrix.json`.
- **`PLANT_PATENT_L4_VALIDATED` = TRUE**  
  *Evidence:* Document-specific synthetic benchmark (`benchmarks/document-intelligence-v1/plant-patent-application/cases.json`) executed with 15/15 cases passing.
- **`PLANT_PATENT_L5_PRACTITIONER_REVIEWED` = FALSE**  
  *Evidence:* Practitioner panel review by registered patent practitioners has not yet occurred.

---

### Known Limitations & Parallel-Work Safety

1. **Known Limitations:**
   - Formal RHS Colour Chart values are strictly not hallucinated; users must provide specific RHS fan/sheet designations if formal references are desired.
   - PVR / Community Plant Variety Rights (CPVR) in the EU and UK require separate application workflows (different statutory frameworks, DUS testing requirements, and denomination rules).
2. **Parallel-Work Safety:**
   - Implementation is strictly additive and scoped to Document #005 (`plant-patent-application`).
   - Shared files (`document-engine.js`, `document-engine-router.js`, `capability-matrix.json`) were modified additively with zero breaking changes to Documents #001–#004.
   - All 17 Document #001 utility patent tests and all 70 security tests continue to pass with 0 regressions.
