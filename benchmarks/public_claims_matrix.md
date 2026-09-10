# SallyIP public claims matrix — validation closeout

- Date: 2026-09-10 (UTC)
- Baseline: `d4c2870` · Wave: `a4258c1` · HEAD at draft: `0279cc1` (dirty tree — clean tag required before submission)
- Rule: every verdict cites a file artifact + run ID + fraction. No number without a source. Mechanical grader verdicts are regression signals, not lawyer review.
- Classes: **SAFE_TO_PUBLISH** = may publish verbatim with the quoted qualification. **QUALIFIED_ONLY** = may publish ONLY with the exact qualification in the `Required qualification` column. **NOT_YET_SUPPORTED** = do not publish in any form until the `To unblock` work is done.
- Feed linkage: `public/benchmarks/latest.json` (34 metrics, read-only this session) + proposal `benchmarks/latest-closeout-proposal.json` (40 metrics, NEW). Scoreboard: `benchmarks/external-scoreboard.md`. Readiness: `benchmarks/vals-readiness.md` (NOT SUBMITTED).

## Required six

### 1. "0 poison hits on 23 ABIGAIL cases" — QUALIFIED_ONLY
- Evidence: `benchmarks/external/abigail-subset.json` (`ran_at` 2026-09-10T07:26:43.023508+00:00, PatentBench repo `2e185f4`, 23 items: 18 stratified + 5 poison-carrying per `subset_rule`, frozen before run).
- Fractions: `poison_pill_results.total_poison_hits_in_sally_outputs` **0**; `cases_with_poisons` **4** (`mini-oa-001`, `mini-oa-002`, `mini-103-001`, `mini-103-002`); `per_case[].checker_poison_hits` **[] ×4**; `poison_substring_hits` **[] ×4**. Deterministic pass **7/23**, refusals **14/23**, `deterministic_mean_all23` 0.2578.
- Required qualification: say **"0 hits on the 4 poison-carrying cases within a 23-case local ABIGAIL subset (PatentBench-Mini, deterministic + AntiHallucinationChecker only); 7/23 deterministic passes, 14 grounded refusals, 2 generation drafts incomplete pending judge layers"**. Do NOT say "0/23 poison tests" — only 4 cases carried poisons.
- Caveats: checker covers MPEP/case/statute fabrication only (`limits`); prose factuality needs judge/human (recorded incomplete for 4 cases). 4 execution errors (HTTP 400 shape/key on `mini-103-001/002` attempts 1–2; 2 live drafts ultimately succeeded of 6 attempts, 15 allowed). `all_fabricated_invalid_counts: 2` refers to truncated `Graham v. Jo` / `KSR v. Te` strings on `mini-103-001` (checker tokenisation artefact, not a poison hit) — disclose if asked.
- To unblock unqualified form: full 7,200-case run + judge/human layers + independent poison design.

### 2. "15/16 IPBench subset" — QUALIFIED_ONLY
- Evidence: `benchmarks/external/ipbench-subset.json` (`ran_at` 2026-09-10T00:00:00.000Z, baseline `d4c2870`, 0 live calls of 15 allowed).
- Fractions: `summary.correct` **15/16** (93.8%); PATENT **4/4**, TRADEMARK **4/4**, COPYRIGHT **3/4**, OTHER **4/4**; quote handling **4/4** (2 supported-exact, 2 rejected-missing); `completed` 16/16; sole miss `ipbench-cr-01` (regex required contiguous `within scope`, item says `within the scope of employment` — kept unpatched).
- Required qualification: say **"15/16 on a 16-item EN-only probe of representative paraphrases (not verbatim IPBench test content; CN split, generation tasks excluded; 0 live model calls); full 10,374-item run BLOCKED"**. Do NOT compare to DeepSeek-V3 75.8% (full-set reference, NOT reproduced).
- To unblock: paid-key full run (HF `IPBench/IPBench` 53.3 MB parquet + `eval-mcqa/classification/generation` harness + bilingual grading).

### 3. "26/26 injected fabrications detected" — QUALIFIED_ONLY
- Evidence: `benchmarks/ablation-25-report.md` (generated 2026-09-10T07:26:34.649Z, 0 live calls; source `benchmarks/ablation-25.json`: 22 NEW + 6 frozen refs = 28 total = 26 fabrications + 2 good) + `benchmarks/ablation-report.md` (2026-09-10T07:08:49.276Z, frozen 4/4 vs substance 1/4).
- Fractions: combined **26/26** flagged (100.0%), NEW **22/22** flagged, substance-only **0/22** NEW (1/26 combined via frozen `SYN-FAB-112G`); false positives **0/2**; preservation **2/2**; 13/13 trap types 100%; per-layer NEW: A 0/22, B 2/22, C 22/22 (fail-closed demo), D 2/22, E 22/22.
- Required qualification: say **"26/26 hand-written SYNTHETIC injected fabrications flagged by the full local pipeline in a pure-local simulation (fixed 5-passage fixture; no DB, retrieval, or model in the loop); substance-only baseline catches 0/22 NEW"**. Do NOT say "detects all hallucinations" or "26/26 model hallucinations caught" — fixtures are NOT model output.
- To unblock live claim: `SALLYIP_ABLATION25_LIVE=1` calibration (≤10 calls) + live-model replication.

### 4. "0% hallucination rate" (unqualified) — NOT_YET_SUPPORTED
- Sliced evidence (all mechanical, small-n, NOT a universal rate): `benchmarks/cross-bench-report.md` §1+§4 — adversarial live run `3368daf1-6321-4c64-a3e8-20b28eb23d26` (2026-09-10, `gemini-flash-lite-latest`): hallucinated **0/12**, accurate **6/12**, incomplete **6/12** (all over-abstention), 0 model errors; stanford auto `fe26da44…` (2026-09-09): hallucinated **0/24**, accurate **14/24**, incomplete **10/24**. Prior adversarial `126f1b79…` (2026-09-09): hallucinated **1/9** (11.1%) with 3 model_errors — non-zero history exists.
- Contrary evidence: golden baseline unsupported **27/120** (22.5%, run `f8dfe146`, `benchmarks/v1.0/manifest.json`); P0 unsupported **81.0%** (no fraction, FAIL vs <2%) + entailment **66.7%** (FAIL vs ≥95%) + missing-quote **4/96** (FAIL) — `benchmarks/regression_report_p0_full.md`, RELEASE BLOCKED.
- Allowed form (QUALIFIED_ONLY sub-claims): "0/12 hallucinated on adv-v1 live run `3368daf1` (2026-09-10)" or "0/24 hallucinated on sb-v1 automated run `fe26da44` (2026-09-09, mechanical grading)". Unqualified "0%" is NOT_YET_SUPPORTED.
- To unblock: hallucination-100 live run (100 items, dataset `benchmarks/hallucination-100.mjs`, currently BLOCKED — no run in top-10) + P0 entailment/unsupported re-grade with fractions + practitioner review.

### 5. "100% legally correct" — NOT_YET_SUPPORTED
- Evidence of absence: `benchmarks/v1.0/scorecard_sample_25.md` (2026-09-09): **0/25 graded**, all checkboxes blank; `benchmarks/regression_report_p0_full.md`: substantive correctness "Not independently regraded" / NOT ESTABLISHED; `benchmarks/external-scoreboard.md` §5 + `benchmarks/vals-readiness.md` §4: correctness NOT ESTABLISHED anywhere; LegalBench open-generation (~7 tasks) ungraded.
- Mechanical ≠ correctness: authority 95/95, integrity 98/98, exact-quote 92/96 are retrieval/quotation signals, not rule-accuracy grades. P0 gates FAIL (entailment, unsupported, missing-quote, completion).
- To unblock: 25-q practitioner grading (Pass/Partial/Fail per instrument) + P0 100-q independent regrade + open-generation gradebook.

### 6. "practitioner-validated" — NOT_YET_SUPPORTED
- Evidence: same as (5). Scorecard instrument exists, **0/25** graded. P0 substantive PENDING. L1 ellipsis-vs-full-statute confirmation PENDING practitioner review (`benchmarks/failures/TRIAGE.md` L1). No third-party grading exists (`public/benchmarks/latest.json`: `third-party-graded-placeholder` PENDING).
- Allowed today: "practitioner instrument created (25-q scorecard, 2026-09-09), grading PENDING" — not "validated".
- To unblock: completed scorecard + published grader credentials/method + L1 confirmation.

## Derived six (governance coverage)

### 7. "100% authority recall (95/95) / grounding validated" — QUALIFIED_ONLY
- Evidence: `benchmarks/v1.0/manifest.json` (run `f8dfe146-4400-49b9-a206-72c8607622d3`, 2026-09-09T12:18:12.643Z, `gemini-flash-lite-latest`): authority **95/95**, zero-dangling **95/95**, exact **87/120**, unsupported **27/120**, cited-answers **92/95**; scored **95/100** (5 unscored — failure accounting UNKNOWN for this run). P0 full (2026-09-09): recall **98/100** (2 exec failures `s102b-08`, `s112d-02`), integrity **98/98**, exact **92/96**.
- Required qualification: quote run ID + scored denominator + date + model, e.g. **"95/95 authority recall on 95 scored of 100 golden questions (run `f8dfe146`, 2026-09-09, mechanical retrieval check, not legal-correctness review)"**. Do NOT merge with P0 (98/100) or 10-q (10/10) into one number; do NOT omit the 5 unscored / 27 unverified quotes.
- To unblock headline without qualification: close the 5-unscored accounting + practitioner correctness (see 5).

### 8. "195/195 unit tests pass" — SAFE_TO_PUBLISH
- Evidence: `benchmarks/cross-bench-report.md` §1 (2026-09-10): **195/195** across 42 files, ~1.8s, per-file table all 0-fail; build PASS (`✓ built in 5.86s`, pre-existing chunk-size warning only).
- Allowed verbatim: **"Unit suite 195/195 green across 42 files (2026-09-10, `node --test tests/*.test.mjs`)"**. Scope: engineering health only — not a legal-accuracy claim. Re-run command is in `benchmarks/vals-readiness.md` §6.

### 9. "99/120 retrieval checks pass" — QUALIFIED_ONLY
- Evidence: `benchmarks/patent_retrieval_v1/run_report.md` (2026-09-10T06:56:31.586Z, dataset `v1-frozen` 19 cases): **99 passed / 21 failed**; failures: 19× `family-resolution` (`ret-001`–`ret-019`), 1× `duplicate-collapse` (18 families for 19 cases×2), 1× `false-merge-rate` (1 cross-case merge `stem:3454709` EP3454709B1+A2); 0 test errors + 1 environmental (DB persist needs `DATABASE_URL`; offline metrics unaffected). Tier-C spot checks **4/4**.
- Required qualification: **"99/120 offline checks (19 cases); 21 failures are open triage (family-resolution expectation vs offline design; overlapping corpus cases incl. same-application pub/grant pair) — not INPADOC truth; recall@k/precision@k/rank BLOCKED (no provider keys)"**. Cite `benchmarks/patent_retrieval_v1/methodology.md` + `ground_truth_sources.md` (Tier A/B only count toward headlines; INPADOC graduation needs EPO OPS credentials, none at snapshot).
- To unblock stronger form: seed real priority numbers or downgrade `family-resolution` to report-only (fix direction in `cross-bench-report.md` §5.1, NOT applied) + disjoint corpus + INPADOC graduation.

### 10. "LegalBench 12/12 (or IPBench-style) proves external performance" — NOT_YET_SUPPORTED
- Evidence: `benchmarks/external/legalbench-probe.json` (`ran_at` 2026-09-10T07:08:58.350Z, 0 live calls): abercrombie-train **5/5**, cuad-synth **4/4** (entailment-alone diagnostic **2/4**), cite-proxy **3/3** = **12/12**; `limits`: train/synthetic only, NOT test-set scores, NOT comparable to published numbers; full 162-task run BLOCKED (~91k samples, ~85–91k calls, ~110M in/5M out tokens, paid key + harness + gradebook for ~7 open tasks). LegalBench is contract/corporate-heavy (58+58 tasks, ~3 statutory-text) — Sally patent strengths barely exercised.
- Verdict: as an *external score* this is NOT_YET_SUPPORTED. Allowed QUALIFIED_ONLY form: "12/12 on local LegalBench probes (5 train exemplars + 4 synthetic + 3 style proxies, 0 live calls, headline-ineligible)".
- To unblock: full per-task run with pinned HF revision + balanced-accuracy/F1/exact-match harness + manual gradebook.

### 11. "Guards catch 4/4 vs base 1/4 — proves live hallucination defence" — QUALIFIED_ONLY
- Evidence: `benchmarks/ablation-report.md` (2026-09-10T07:08:49.276Z, 0 live calls, 8-item subset, 6 synthetic fixtures + fixed 5 passages): full pipeline (E) **4/4** flagged, **2/2** good supported; substance-only (A) **1/4** (only `SYN-FAB-112G`); B 1/4, C 4/4 (+2/2 good stripped — expected fail-closed demo), D 2/4. Expanded `ablation-25`: E **22/22 NEW** vs A **0/22**.
- Required qualification: **"In pure-local simulation with hand-written fixtures (fixed 5-passage stand-in for retrieval; no ranking, gating, packs, orchestrator, or answer modes live); live calibration skipped (`SALLYIP_ABLATION_LIVE=1`, ≤2 calls)"**. Contribution reading: B alone adds nothing (plausible `[S1]` counts valid); C fail-closed needs B-fed evidence; D pins bad quotes but blind to quoteless fabs; E separation depends on evidence + entailment.
- To unblock live-defence claim: live calibration + adv-v1 live replication of triaged fixes (limitation L4).

### 12. "Zero dangling citations (95/95) means no unsupported propositions" — NOT_YET_SUPPORTED
- Evidence for premise: manifest run `f8dfe146`: zero-dangling **95/95**, integrity P0 **98/98** — citation *existence*. Evidence against inference: P0 entailment **66.7%** FAIL (target ≥95%) + unsupported-proposition **81.0%** FAIL (target <2%) — cited sources often do not support the proposition (`regression_report_p0_full.md`: "Citation existence alone did not establish entailment"). 10-q entailment/unsupported fractions PENDING (100%/0% stated without fractions).
- Verdict: dangling-free ≠ supported. Do not publish the inference. Allowed: "95/95 zero-dangling on golden run `f8dfe146` (citation-existence check; entailment measured separately and FAILs P0 gates)".
- To unblock: P0 re-grade export with numerators/denominators + entailment ≥95% + unsupported <2% + practitioner confirmation (L1).

## Counts
- SAFE_TO_PUBLISH: 1 (claim 8)
- QUALIFIED_ONLY: 6 (claims 1, 2, 3, 7, 9, 11)
- NOT_YET_SUPPORTED: 5 (claims 4, 5, 6, 10, 12)

## Flags / unattested items (could not attest)
- Per-run Sally commits for all DB-backed runs (in `patentbench_runs`/`eval_runs` contexts via `scripts/stanford-bench-run.mjs:runContext()`; not extracted this session — SELECT-only, no secret access). Commit cells are null/UNKNOWN, never interpolated.
- Model for stanford `fe26da44`, grounding-100 restatement, grounding probe `e86eadd1`, prior adversarial `126f1b79` (in DB, not extracted).
- Fractions behind P0 entailment 66.7% / unsupported 81.0% and 10-q entailment 100.0% / unsupported 0.0%; grounding-probe recall/valid/dangling (only 13/16 quote-exact stated).
- Execution-failure counts for golden run + 10-q run (not stated).
- Wave §5 "4 grounded handlings" vs cross-bench live run `3368daf1` "6 accurate" — discrepancy flagged; this matrix uses the run-ID-quoted 6/12 (primary artifact) and treats the wave's "4" as unattested counting-method difference.
- CUAD "4/4 with additive ownership-signal layer (`src/lib/contract-ownership.js`, 12 new tests)" reported in `benchmarks/external-validation-wave.md` §2 — underlying test file not opened this session, so NOT added as a standalone matrix row; remains PENDING independent verification (probe diagnostic 2/4 entailment-only IS attested).
- Full external runs (LegalBench 162-task ~91k, IPBench 10,374, hallucination-100 live, ablation live calibration) and ALL practitioner grading (25-q blank, P0 NOT ESTABLISHED, L1 open) — PENDING/BLOCKED, never implied.
