# SALLYIP DOCUMENT TRAINING REPORT #020
## PATENT CLAIM CHART (Canonical Generic Evidence-Mapping Infrastructure — Never a Legal Conclusion)

**Document Identifier:** `patent-claim-chart`
**Document Number:** `020`
**Baseline SHA (working tree, SHA256 — post-#019 state, before #020 edits):**
- `src/lib/document-engine.js`: `6A4DB21BFF716F3684C6FB6257344CB377FB7E2954FF382204C15938C168B977`
- `src/lib/document-engine-router.js`: `A554DA05BFD0C1EA06C0190B86E3685D8B538FC36F145889B1E61D779ED731DD`
- `data/documents/capability-matrix.json`: `F2CF5F5C3536ED0650576BEDBFCB8AC8153E993492943AD4BF5379FF67360D77`
- No git repository is present in the workspace, so there is no commit SHA; file hashes are the baseline evidence. Parallel agents were concurrently editing shared files; all #020 edits below are additive and regression-verified.
**Final SHA (working tree, SHA256):**
- `src/lib/document-engine.js`: `9A6B4F829A47948CDD583704A9212EB0B75BEBBA69EE65C02A7919558DA35A15`
- `src/lib/document-engine-router.js`: `FE457942077A5637F5CA54C2EB0060FFFD2486AC0EFF5140C6B2F52EFC53C1EE`
- `src/lib/patent-claim-chart-service.js` (new): `33004E9D1A2250BD42252548B8307BA03362EF41085A8AD3A202EE5A5C537BDA`
- `src/lib/patent-claim-chart-interview-graph.js` (new): `D28F1C1B4EC41742B92596A230AFEFA40B838E59DAB67124858BA809A7883E99`
- `data/documents/profiles/patent-claim-chart.json` (new): `B39C025467979DE6E426B258E71B7C0C3822E3FDDBFB7168823191AE873EC42D`
- `data/documents/capability-matrix.json`: `61D2557C0676C089726B1A9EB6E87AC6C0743367EC403B571F835A62DC3C2069`
- `benchmarks/document-intelligence-v1/patent-claim-chart/cases.json` (new): `C9C570A6FD20398FAC1E169757230B36513CFCC7242B366DE37BE21C85B2907A`
**Timestamp:** `2026-09-11`
**Role:** SallyIP Patent Document Intelligence and Verification Engineer

---

### Executive Summary

Document #020 (Patent Claim Chart) is implemented as SallyIP's canonical generic claim-to-evidence mapping infrastructure. It identifies the exact claim/version, snapshots claim text immutably, decomposes via the canonical #010 claim model (preserving dependency, relational/functional/method/numerical structure, preamble, and transitions), records versioned evidence sources with precise locators, verifies quotes and entailment, classifies mappings qualitatively (never as legal conclusions), keeps multiple references source-separated (never synthetic), supports product/image/code/standard/specification/priority/prosecution evidence with provenance, versions/staleness-tracks/locks/audits every row, renders all exports from one canonical dataset, and hands source-separated mappings to novelty, invalidity, FTO, prior-art, patentability, specification, and future infringement (#021-ready) workflows. No parallel parser, chart engine, evidence graph, or citation validator was created; no unrelated profiles were modified; verification controls were strengthened, never weakened.

### Files Added
1. `data/documents/profiles/patent-claim-chart.json` — canonical profile (`020`, `PATENT_ANALYSIS`, `BETA`, `HIGH`, `review_required`, `verification_required`, `MULTI_JURISDICTION`/`CONTEXT_DEPENDENT`, 19 report sections, 14 chart modes).
2. `src/lib/patent-claim-chart-service.js` — claim identity/version/snapshot; canonical decomposition wrapper with limitation typing, preamble/transition extraction, dependency validation; source model + verification + versioning; evidence locations; passage/quote/entailment wrappers; mapping assessment (relational/functional auto-map guard); terminology mapping; multi-source matrix + completeness + mosaic safety; construction recording; product evidence (provenance/version/USER_ASSERTED); image/drawing/code/standard/spec/priority/prosecution recorders; rows + canonical chart + single-source table rendering; summary/gaps; contradictions; integrity/staleness/recomputation/versions/locks/overrides; evidence graph; verification gates; seven handoffs including an infringement target shaped for #021 extension; 19-section report assembler with boundary guard (`CHART_BOUNDARY_VIOLATION`).
3. `src/lib/patent-claim-chart-interview-graph.js` — thin orchestration: matter-first intake, one-question flow (claim → version → target → purpose → constructions), readiness, confirmation, DRAFT scaffold assembly, session persistence of chart/claim/target/source/mapping/review/verification IDs.
4. `benchmarks/document-intelligence-v1/patent-claim-chart/cases.json` — 45 synthetic cases covering all §138 categories plus adversarial fail-closed cases (§139).
5. `tests/document-engine/patent-claim-chart-benchmark.test.mjs` — benchmark runner (45/45 cases).
6. `tests/document-engine/patent-claim-chart-interview.test.mjs` — 18 focused unit tests.
7. `tests/document-engine/patent-claim-chart-routing.test.mjs` — 3 router integration tests.

### Files Modified (additive, backward-compatible only)
1. `src/lib/document-engine.js` — added one #020 routing pattern; one narrow alternation so `Is Claim 1 novel?` resolves to the novelty workflow instead of falling through.
2. `src/lib/document-engine-router.js` — added imports, pre-resolution infringement/support guards (infringement clarifies toward the future #021 workflow with a #020 evidence chart offer; support questions enter #020 support-chart mode on the shared infrastructure), and the #020 interview branch.
3. `data/documents/capability-matrix.json` — added the `patent-claim-chart` entry, promoted to `L3_DRAFTABLE` after tests passed (entry only; summary rollups untouched).

### Canonical Profile
`id: patent-claim-chart`, `name: Patent Claim Chart`, `category: IP_INNOVATION`, `subcategory: PATENT`, `family: PATENT_ANALYSIS`, `document_number: 020`, `status: BETA`, `risk_level: HIGH`, `review_required: true`, `verification_required: true`, `jurisdiction: MULTI_JURISDICTION`, `jurisdiction_classification: CONTEXT_DEPENDENT`. Description states the chart supports analysis but determines no legal conclusion.

### Routing Aliases (all verified; specialist intents verified un-stolen)
`create a claim chart`, `chart Claim 1`, `map this claim`, `map the claim against this document`, `compare these claims against the reference`, `break this claim into limitations`, `create a limitation chart`, `map each element`, `show where each claim element appears`, `compare Claim 1 with this patent`, `chart these claims against the evidence`, plus `patent claim chart` / `claim limitation chart`.

### Chart Modes / Purpose Model
All 14 modes are profile inputs; all 10 purposes route presentation and handoffs only — purpose never alters evidence facts (tested via confirmation-gate content checks).

### Matter-Context / One-Question Behaviour
Held patents, claim sets, versions, evidence sources, existing charts, purposes, and jurisdictions merge as KNOWN and are never re-asked (tested). Vague requests ask exactly one claim question; every turn returns one question.

### Claim Identity / Versioning / Snapshot / Decomposition / Dependencies
Unidentified claims never chart. Competing versions require explicit confirmation (never silent latest/broadest). Snapshots hash claim text; later edits raise `CLAIM_TEXT_INTEGRITY_FAILURE` without rewriting history. Decomposition reuses `parsePatentClaims`/`buildClaimTree`/`buildEffectiveClaimLimitations` with exact language preserved alongside normalised concepts; limitation types classified (structural/functional/relational/method/numerical/...); preamble and transitions preserved verbatim with review notes. Missing/circular/invalid dependencies raise `CLAIM_DEPENDENCY_REVIEW_REQUIRED`; dependents chart full effective sets exactly once (multi-level tested).

### Relational / Functional / Method / Numerical / Negative / Markush Handling
Relationships require relationship entailment (component presence alone yields at most `POSSIBLY_MAPPED_REVIEW_REQUIRED` — enforced structurally, regression-fixed during training). Functions require functional evidence. Method order verified step-by-step. Numerical overlap reuses shared comparison with zero fabrication. Negative limitations never map from silence. Markush alternatives stay listed, never flattened.

### Construction / Sources / Locations / Quotes / Entailment / Mapping Model
Constructions record type + full provenance or stay `CONSTRUCTION_UNRESOLVED`; no authoritative construction invented. Sources carry identity/version/verification; versions tracked with stale-marking. Locations require precise locators (never fabricated). Quotes verify EXACT/FUZZY/NOT_FOUND (only EXACT counts as verified quotation). Entailment gates every mapping (topical similarity insufficient). Mapping statuses are qualitative evidence states; `MAPPED` explicitly disclaims legal meaning; partial evidence never upgrades; `NOT_IDENTIFIED` is never `ABSENT`. Terminology relationships require recorded reasoning. Multiple references stay per-source (no synthetic combined source; novelty handoff receives separated per-reference mappings, tested). Reference completeness is technical candidate status only.

### Product / Image / Code / Standard / Spec / Priority / Prosecution Evidence
Product facts carry source/status/version with `USER_ASSERTED` labelling and version-confirmation gates. Images record visible observations only. Code preserves repo/commit/file/lines without behaviour fabrication. Standards never prove optional-feature implementation. Specification mappings never conclude §112; priority mappings never grant/deny entitlement; prosecution statements never imply estoppel.

### Rows / Machine-Readable Chart / Table / Gaps / Contradictions / Integrity / Staleness / Versions / Locks / Overrides / Graph / Gates
Rows carry the full §68 schema; canonical chart data renders the human table; table/JSON/CSV exports derive from one dataset (tested). Summaries are qualified; gaps explicit. Matrix/narrative contradictions raise `ANALYSIS_CONTRADICTION` and block finalisation. Claim-text integrity, source-version change, and six staleness triggers tracked with targeted recomputation. Versions never overwrite history. Locked rows flag `LOCKED_ROW_UPSTREAM_CHANGE` instead of silently persisting. Human overrides preserve machine originals with reviewer/timestamp/reason. Evidence graph traces the full §84 chain. Seven verification gates fail closed on unverified material.

### Downstream Handoffs / #021 Readiness / Exports / Inspector / Confidentiality / Voice
Handoffs to novelty (source-separated, null synthetic reference), invalidity, FTO, prior-art, patentability, specification carry evidence with `legal_conclusion_transfer: NONE`; the infringement target (`patent-infringement-claim-chart`) is pre-registered so #021 extends rather than forks this engine. Exports reuse existing infrastructure from canonical data with locators preserved. The existing inspector surfaces all §104 fields; no new inspector built. Confidential charts fail closed (`CONFIDENTIAL_PILOT_BLOCKED`, tested); uploads untrusted. Voice/text share all ten session IDs (tested); voice stack untouched (30/30 pass).

---

### Verification and Test Evidence (exact denominators)

**#020 interview tests (`tests/document-engine/patent-claim-chart-interview.test.mjs`): 18/18 pass.**
**#020 benchmark (`tests/document-engine/patent-claim-chart-benchmark.test.mjs` over 45 cases): 45/45 cases pass (1/1 test).**
**#020 routing tests (`tests/document-engine/patent-claim-chart-routing.test.mjs`): 3/3 pass.**
**Full document-engine regression (`node --test tests/document-engine/*.test.mjs`): 354/354 pass.**
**Foundation suite (`npm run test:foundation`): 77/77 node + 12/12 Python pass.**
**Verification suite (`npm run test:verification`): 28/28 pass.**
**Voice suite (`node --test tests/voice/*.test.mjs`): 30/30 pass.**
**Security suite (`npm run test:security`): 70/70 pass.**
**Production build (`npm run build`, vite v6.4.3): PASS — 2303 modules transformed, built in 6.69s, 0 errors.**

### Benchmark Dimensions (reported separately, not collapsed)
routing accuracy; matter-context reuse; one-question behaviour; claim identity accuracy; claim-version accuracy; claim-text integrity; claim decomposition; dependency resolution; effective limitation-set accuracy; relational limitation handling; functional limitation handling; method-order handling; numerical limitation handling; negative-limitation handling; source identity verification; source-version integrity; evidence-locator integrity; quote verification; entailment; mapping classification; multi-reference separation; mosaic safety; construction handling; product-version handling; staleness detection; contradiction detection; downstream handoff correctness; export consistency; confidential-provider compliance — each covered by ≥1 passing case/test above.

### Known Limitations
1. Mapping rows scaffold as `RESEARCH_REQUIRED` until reviewer evidence is supplied; the workflow structures and verifies mappings but does not auto-generate evidence content.
2. No practitioner review; no legal conclusions are permitted by the assembler under any purpose.
3. Document #021 (infringement) does not exist yet; the infringement handoff target is pre-registered and the router explains this boundary honestly.

### Parallel-Work Conflicts
Shared `document-engine.js` / `document-engine-router.js` show ongoing concurrent-agent activity. All #020 edits were additive (one pattern, one narrow alternation, two imports, two guards, one branch, one capability entry) and the full 354-test document-engine suite passes with zero regressions. Nothing unrelated was reverted or overwritten.

---

### Final Statuses (evidence-backed; TRUE / FALSE / PARTIAL / BLOCKED only)

PATENT_CLAIM_CHART_PROFILE_COMPLETE = TRUE
PATENT_CLAIM_CHART_ROUTING_VERIFIED = TRUE
PATENT_CLAIM_CHART_MODES_VERIFIED = TRUE
PATENT_CLAIM_CHART_PURPOSE_MODEL_VERIFIED = TRUE
PATENT_CLAIM_CHART_MATTER_CONTEXT_VERIFIED = TRUE
PATENT_CLAIM_CHART_ONE_QUESTION_MODE_VERIFIED = TRUE
PATENT_CLAIM_CHART_CLAIM_IDENTITY_VERIFIED = TRUE
PATENT_CLAIM_CHART_CLAIM_VERSIONING_VERIFIED = TRUE
PATENT_CLAIM_CHART_CLAIM_SNAPSHOT_VERIFIED = TRUE
PATENT_CLAIM_CHART_DECOMPOSITION_VERIFIED = TRUE
PATENT_CLAIM_CHART_DEPENDENCY_VERIFIED = TRUE
PATENT_CLAIM_CHART_EFFECTIVE_LIMITATION_SET_VERIFIED = TRUE
PATENT_CLAIM_CHART_PREAMBLE_HANDLING_VERIFIED = TRUE
PATENT_CLAIM_CHART_TRANSITION_HANDLING_VERIFIED = TRUE
PATENT_CLAIM_CHART_RELATIONAL_LIMITATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_FUNCTIONAL_LIMITATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_METHOD_ORDER_VERIFIED = TRUE
PATENT_CLAIM_CHART_NUMERICAL_LIMITATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_NEGATIVE_LIMITATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_ALTERNATIVE_LIMITATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_CONSTRUCTION_HANDLING_VERIFIED = TRUE
PATENT_CLAIM_CHART_SOURCE_MODEL_VERIFIED = TRUE
PATENT_CLAIM_CHART_SOURCE_EXISTENCE_VERIFIED = TRUE
PATENT_CLAIM_CHART_SOURCE_VERSIONING_VERIFIED = TRUE
PATENT_CLAIM_CHART_EVIDENCE_LOCATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_QUOTE_VERIFICATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_ENTAILMENT_VERIFIED = TRUE
PATENT_CLAIM_CHART_MAPPING_MODEL_VERIFIED = TRUE
PATENT_CLAIM_CHART_MAPPING_STATUS_VERIFIED = TRUE
PATENT_CLAIM_CHART_TERMINOLOGY_MAPPING_VERIFIED = TRUE
PATENT_CLAIM_CHART_MULTI_REFERENCE_SEPARATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_MOSAIC_SAFETY_VERIFIED = TRUE
PATENT_CLAIM_CHART_PRODUCT_EVIDENCE_VERIFIED = TRUE
PATENT_CLAIM_CHART_PRODUCT_VERSIONING_VERIFIED = TRUE
PATENT_CLAIM_CHART_SPEC_SUPPORT_VERIFIED = TRUE
PATENT_CLAIM_CHART_PRIORITY_SUPPORT_VERIFIED = TRUE
PATENT_CLAIM_CHART_PROSECUTION_EVIDENCE_VERIFIED = TRUE
PATENT_CLAIM_CHART_EVIDENCE_GRAPH_VERIFIED = TRUE
PATENT_CLAIM_CHART_CONTRADICTION_DETECTION_VERIFIED = TRUE
PATENT_CLAIM_CHART_STALENESS_VERIFIED = TRUE
PATENT_CLAIM_CHART_TARGETED_RECOMPUTATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_VERSIONING_VERIFIED = TRUE
PATENT_CLAIM_CHART_REVIEW_LOCKING_VERIFIED = TRUE
PATENT_CLAIM_CHART_HUMAN_OVERRIDE_VERIFIED = TRUE
PATENT_CLAIM_CHART_NOVELTY_HANDOFF_VERIFIED = TRUE
PATENT_CLAIM_CHART_INVALIDITY_HANDOFF_VERIFIED = TRUE
PATENT_CLAIM_CHART_FTO_HANDOFF_VERIFIED = TRUE
PATENT_CLAIM_CHART_PRIOR_ART_HANDOFF_VERIFIED = TRUE
PATENT_CLAIM_CHART_FUTURE_INFRINGEMENT_EXTENSION_READY = TRUE
PATENT_CLAIM_CHART_REPORT_GENERATION_VERIFIED = TRUE
PATENT_CLAIM_CHART_EXPORT_VERIFIED = TRUE
PATENT_CLAIM_CHART_VOICE_VERIFIED = TRUE
PATENT_CLAIM_CHART_SECURITY_VERIFIED = TRUE
PATENT_CLAIM_CHART_L3_DRAFTABLE = TRUE
PATENT_CLAIM_CHART_L4_VALIDATED = FALSE
PATENT_CLAIM_CHART_L5_PRACTITIONER_REVIEWED = FALSE
