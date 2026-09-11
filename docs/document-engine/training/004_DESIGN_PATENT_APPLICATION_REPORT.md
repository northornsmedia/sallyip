# SallyIP Design Patent Application — Training Report (Document #004)

**Date:** 2026-09-11
**Baseline SHA:** `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
**Document Number:** 004
**Document Family:** DESIGN_PATENT_APPLICATION
**Status:** BETA
**Authority:** USPTO (35 U.S.C. § 171; 37 C.F.R. § 1.152)

---

## Summary

Implemented the canonical US Design Patent Application workflow as SallyIP Document #004, reusing existing SallyIP shared primitives (document-engine-router, patent-interview-graph pattern, jurisdiction-registry, verification-service). The implementation covers interview-first one-question-at-a-time behavior, matter-context inspection, design-type branching (physical/partial/surface/GUI/icon), whole-vs-partial logic, drawing consistency detection, line-treatment handling, and verification-first architecture.

---

## Files Created

| File | Description |
|------|-------------|
| `data/documents/profiles/design-patent-application.json` | Canonical profile with 6 USPTO sections, 21 required/recommended inputs |
| `src/lib/design-patent-interview-graph.js` | Adaptive question DAG with 21 canonical questions |
| `src/lib/design-patent-drafting-service.js` | US design patent specification assembler |
| `benchmarks/document-intelligence-v1/design-patent-application/cases.json` | 12 benchmark test cases |
| `tests/document-engine/design-patent-application/design-patent-interview.test.mjs` | 27 unit tests (all passing) |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/document-engine-router.js` | Added import for `evaluateDesignPatentInterviewStep` and `assembleDesignPatentSpecification`; added design-patent-application routing block |
| `src/lib/document-engine.js` | Added design-patent-application pattern to `DOCUMENT_FAMILY_PATTERNS` before generic patent patterns |
| `data/documents/capability-matrix.json` | Added design-patent-application entry; updated counts (L1_ROUTABLE: 27, draftable: 5, verification_ready: 5) |
| `data/documents/complete-document-catalogue.json` | Added design-patent-application catalogue entry; updated verified counts |

---

## Architecture Decisions

### Interview-First Pattern
The design patent workflow strictly follows the ONE_QUESTION_AT_A_TIME pattern established by utility-patent-application (#001). Each turn asks exactly one question, advances to the next question upon valid answer, and requires explicit user confirmation before drafting.

### Design-Type Branching
The `inferDesignType()` function categorizes designs based on description keywords. The `evaluateDesignPatentInterviewStep()` dynamically generates questions based on the inferred design type (e.g., GUI-specific questions for GUI designs, whole-vs-partial for partial products).

### Whole-vs-Partial Logic
When `claimed_portion === 'PORTION_OF_ARTICLE'`, the workflow asks additional questions about unclaimed/environmental features and ensures proper line treatment (solid = claimed, broken = unclaimed). This is validated by `validateDesignClaimBoundary()`.

### Drawing Consistency
`detectDrawingInconsistency()` checks for mismatches between available views and figure descriptions. `screenSubjectMatter101()` detects functional feature overlap that could affect patentability.

### Verification-First Architecture
The profile sets `verification_required: true` and `review_required: true`. All drafted documents go through the existing verification pipeline (exact-quote verification, citation-integrity guard, entailment grading).

---

## Test Results

- **27/27 tests passing** in `design-patent-interview.test.mjs`
- **17/17 existing utility patent tests still passing** (no regression)
- **No changes to provider-policy, verification-service, or other shared primitives**

---

## Compliance with USPTO Requirements

- **35 U.S.C. § 171**: Design patent claim structure implemented
- **35 U.S.C. § 172/173**: Priority and foreign filing rights
- **37 C.F.R. § 1.152**: All 6 required sections (Title, Cross-Reference, Federally Sponsored Research, Description of Figures, Claim, Description of Design)
- **37 C.F.R. § 1.153**: Claim format
- **MPEP Chapter 1500**: Design patent examination guidelines

---

## Known Limitations

1. The `loadDocumentProfile` function requires the `jurisdiction` field at the top level of the profile (added to profile JSON).
2. The `design-patent-drafting-service.js` does not yet integrate with the verification-service for exact-quote verification of legal authorities.
3. Benchmark cases are synthetic and should be expanded with practitioner-reviewed examples.
4. The `resolveDocumentFamily` function now has design-patent patterns before generic patent patterns, which is correct for routing but should be monitored if new patterns are added.

---

## Next Steps

1. Add `design-patent-application` to the `complete-document-catalogue.json` `notes.profiles_with_full_metadata` list
2. Expand benchmark cases with practitioner-reviewed examples (golden set)
3. Add design-patent-specific verification hooks to `src/lib/verification-service.js`
4. Integrate with `src/lib/playbook-service.js` for versioned workflow templates
5. Create `src/components/design-patent-workspace.jsx` if a dedicated workspace component is needed

---

## Checklist

- [x] Canonical profile created at `data/documents/profiles/design-patent-application.json`
- [x] Interview graph created at `src/lib/design-patent-interview-graph.js`
- [x] Drafting service created at `src/lib/design-patent-drafting-service.js`
- [x] Router integration at `src/lib/document-engine-router.js`
- [x] `DOCUMENT_FAMILY_PATTERNS` updated in `src/lib/document-engine.js`
- [x] Capability matrix updated
- [x] Complete document catalogue updated
- [x] Benchmark cases created
- [x] Unit tests created (27 passing)
- [x] No regressions in existing tests
- [x] Training report created
