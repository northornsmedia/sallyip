# SallyIP external scoreboard — frozen reporting snapshot

- Snapshot date: 2026-09-10 (UTC)
- Repo baseline commit: `d4c2870` (HEAD at time of writing; `git log` confirms)
- Policy: **five separate sections, never merged into one score.** Mechanical grader
  verdicts are regression signals, not lawyer review and not publications.
- Cell rule: `UNKNOWN` = not stated in the sourced artifact and not interpolated.
  `BLOCKED` = cannot run without a missing input (keys, quota, graders).
  `PENDING` is not used in this file; ungraded work is marked `NOT GRADED` / `NOT RUN`.
- Per-run Sally commits live in DB run contexts (`patentbench_runs` / `eval_runs`,
  written by `scripts/stanford-bench-run.mjs:runContext()` via `git rev-parse --short HEAD`)
  and were **not** extracted here (SELECT-only, no secret access this session).
  Commit cells therefore read `UNKNOWN (DB run context, not extracted)` unless a file states otherwise.
- Dates are run dates as stated in the source artifact, not file-mtime.

---

## 1. INTERNAL FROZEN (frozen datasets, verifiable internal runs)

| benchmark | version | sample size | model | Sally commit | metric | numerator / denominator | execution failures | methodology / source | date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grounding benchmark v1.0 golden baseline | v1.0 (`benchmarks/v1.0/dataset.json`, run `f8dfe146-4400-49b9-a206-72c8607622d3`, `eval_runs`) | 100 q / 95 scored | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | authority recall | 95 / 95 | UNKNOWN (not stated for this run) | `benchmarks/v1.0/manifest.json`, restated in `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding benchmark v1.0 golden baseline | v1.0 (same run as above) | 100 q / 95 scored | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | zero-dangling (citation integrity) | 95 / 95 | UNKNOWN | `benchmarks/v1.0/manifest.json` | 2026-09-09 |
| Grounding benchmark v1.0 golden baseline | v1.0 (same run as above) | 100 q / 95 scored | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | exact-quote verification | 87 / 120 | UNKNOWN | `benchmarks/v1.0/manifest.json` | 2026-09-09 |
| Grounding benchmark v1.0 golden baseline | v1.0 (same run as above) | 100 q / 95 scored | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | unsupported (missing/unverified) quote rate | 27 / 120 | UNKNOWN | `benchmarks/v1.0/manifest.json` | 2026-09-09 |
| Grounding benchmark v1.0 golden baseline | v1.0 (same run as above) | 100 q / 95 scored | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | answers with citations | 92 / 95 | UNKNOWN | `benchmarks/v1.0/manifest.json` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen `benchmarks/v1.0/dataset.json` (100 unchanged questions) | 100 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | authority recall | 98 / 100 | 2 (`s102b-08`, `s112d-02`, `max_retries_exceeded`; not replaced/hidden) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen v1.0 (same run as above) | 100 (98 scored) | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | citation integrity (scored answers) | 98 / 98 | 2 (same as above) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen v1.0 (same run as above) | 100 (96 quotes scored) | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | exact-quote verification | 92 / 96 | 2 (same as above) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen v1.0 (same run as above) | 100 (96 quotes scored) | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | missing/unverified quote rate | 4 / 96 | 2 (same as above) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen v1.0 (same run as above) | 100 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | citation entailment | UNKNOWN / UNKNOWN (report states 66.7% only) | 2 (same as above) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen v1.0 (same run as above) | 100 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | unsupported-proposition rate | UNKNOWN / UNKNOWN (report states 81.0% only) | 2 (same as above) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Frozen v1.0 P0 full run | frozen v1.0 (same run as above) | 100 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | release gate | **RELEASE BLOCKED** (missing-quote, entailment, unsupported-proposition gates FAIL; completion gate FAIL) | 2 (same as above) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| Current-build regression (10 q) | `dataset.json` (10 questions) vs v1.0 baseline run `f8dfe146` | 10 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | authority retrieval (R@k) | 10 / 10 | UNKNOWN (not stated) | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Current-build regression (10 q) | same 10-q run as above | 10 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | citation integrity (0-dangling) | 10 / 10 | UNKNOWN | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Current-build regression (10 q) | same 10-q run as above | 10 (9 quotes) | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | quotation fidelity (exact) | 9 / 9 | UNKNOWN | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Current-build regression (10 q) | same 10-q run as above | 10 (9 quotes) | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | quotation missing/unverified | 0 / 9 | UNKNOWN | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Current-build regression (10 q) | same 10-q run as above | 10 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | citation entailment | UNKNOWN / UNKNOWN (report states 100.0% only) | UNKNOWN | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Current-build regression (10 q) | same 10-q run as above | 10 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | unsupported-proposition rate | UNKNOWN / UNKNOWN (report states 0.0% only) | UNKNOWN | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Current-build regression (10 q) | same 10-q run as above | 10 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | release gate (this 10-q build) | PASS (all gates; legal correctness still practitioner-graded, not inferred) | UNKNOWN | `benchmarks/regression_report_latest_vs_v1.0.md` §1 | 2026-09-09 |
| Patent retrieval bench v1 (offline) | dataset `v1-frozen`, 19 cases (`benchmarks/patent_retrieval_v1/dataset.json`) | 120 checks | N/A (offline deterministic engine; no model) | UNKNOWN (local run, commit not recorded in report) | overall pass | 99 / 120 | 0 test errors; 1 environmental (DB persist needs `DATABASE_URL`; offline metrics unaffected) | `benchmarks/patent_retrieval_v1/run_report.md`, `benchmarks/cross-bench-report.md` §1 | 2026-09-10 |
| Patent retrieval bench v1 (offline) | `v1-frozen` (same run as above) | 19 cases | N/A (offline) | UNKNOWN | `family-resolution` pass | 0 / 19 (all 19 fail; bench expectation contradicts offline design per triage) | 0 test errors; 1 environmental (same as above) | `benchmarks/patent_retrieval_v1/run_report.md`, `benchmarks/cross-bench-report.md` §5.1 | 2026-09-10 |
| Patent retrieval bench v1 (offline) | `v1-frozen` (same run as above) | 19 cases ×2 | N/A (offline) | UNKNOWN | corpus `duplicate-collapse` | 18 families observed / 19 expected (FAIL; TRUE same-application pub/grant merge counted as false) | 0 test errors; 1 environmental (same as above) | `benchmarks/patent_retrieval_v1/run_report.md`, `benchmarks/cross-bench-report.md` §5.2 | 2026-09-10 |
| Patent retrieval bench v1 (offline) | `v1-frozen` (same run as above) | corpus-wide | N/A (offline) | UNKNOWN | corpus `false-merge-rate` | 1 cross-case merge (`stem:3454709`: EP3454709B1 + EP3454709A2) / UNKNOWN denominator (threshold not stated) | 0 test errors; 1 environmental (same as above) | `benchmarks/patent_retrieval_v1/run_report.md` | 2026-09-10 |
| Patent retrieval bench v1 (offline) | `v1-frozen` (same run as above) | UNKNOWN (recall@k / precision@k / ground-truth rank need live USPTO/EPO searches) | BLOCKED (needs provider keys) | UNKNOWN | recall@k, precision@k, ground-truth rank | UNKNOWN / UNKNOWN (BLOCKED, never silently skipped) | BLOCKED | `benchmarks/patent_retrieval_v1/methodology.md`, `benchmarks/patent_retrieval_v1/run_report.md` | 2026-09-10 |
| Unit suite | `tests/*.test.mjs` (42 files) | 195 tests | N/A (no model) | UNKNOWN (tree had dirty files from a concurrent session; commit not recorded in report) | pass | 195 / 195 | 0 | `benchmarks/cross-bench-report.md` §1 (+ per-file table, all 0-fail) | 2026-09-10 |
| Stanford-bench v1 automated | `sb-v1` (`scripts/stanford-bench-dataset.mjs`, 24 items; run `fe26da44…`, `patentbench_runs`) | 24 | UNKNOWN (runner default `gemini-flash-lite-latest` unless overridden; actual value in DB, not extracted) | UNKNOWN (DB run context, not extracted) | accurate | 14 / 24 (58.3%) | 0 model errors | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Stanford-bench v1 automated | `sb-v1` (same run as above) | 24 | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | hallucinated | 0 / 24 (0%) | 0 model errors | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Stanford-bench v1 automated | `sb-v1` (same run as above) | 24 | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | incomplete | 10 / 24 (41.7%) | 0 model errors | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding benchmark 100 (last persisted) | UNKNOWN version (run `f8dfe146…` is v1.0 golden id; run `grounding-benchmark-100.mjs`, `eval_runs`) | 100 q / 95 scored | UNKNOWN (manifest v1.0 says `gemini-flash-lite-latest`; runner model in DB, not extracted) | UNKNOWN (DB run context, not extracted) | authority recall | 95 / 95 | UNKNOWN (not stated) | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding benchmark 100 (last persisted) | same run as above | 100 q / 95 scored (120 quotes) | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | exact-quote | 87 / 120 (72.5%) | UNKNOWN | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding benchmark 100 (last persisted) | same run as above | 100 q / 95 scored (120 quotes) | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | unsupported | 27 / 120 (22.5%) | UNKNOWN | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding probe v1 (last persisted) | probe v1 (`scripts/measure-grounding.mjs`; run `e86eadd1…`, `eval_runs`) | 10 / 10 answered | UNKNOWN (live model used; value in DB, not extracted) | UNKNOWN (DB run context, not extracted) | expected-passage recall | UNKNOWN / UNKNOWN (report states 100% only) | UNKNOWN (not stated) | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding probe v1 (last persisted) | probe v1 (same run as above) | 10 / 10 answered | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | valid-citation | UNKNOWN / UNKNOWN (report states 100% only) | UNKNOWN | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding probe v1 (last persisted) | probe v1 (same run as above) | 16 quotes (13E / 1F / 2M) | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | quote exact_rate | 13 / 16 (81.3%) | UNKNOWN | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |
| Grounding probe v1 (last persisted) | probe v1 (same run as above) | 10 / 10 answered | UNKNOWN (same as above) | UNKNOWN (DB run context, not extracted) | dangling citations | UNKNOWN / UNKNOWN (report states 0% only) | UNKNOWN | `benchmarks/cross-bench-report.md` §2 | 2026-09-09 |

Notes on §1: the 10-question current-build run is a small-n regression check, not a
headline result (see `public/benchmarks/latest.json` rules). Retrieval `family-resolution`
and corpus failures are open triage items (`cross-bench-report.md` §5.1–§5.2), not engine
regressions proven against INPADOC truth. Quota-gated suites were skipped-with-reason this
session (stanford-24, hallu-100, grounding-100, grounding-probe-10, frozen-v1.0-100).

---

## 2. EXTERNAL PUBLIC (third-party benchmarks; nothing submitted, nothing claimed)

| benchmark | version | sample size | model | Sally commit | metric | numerator / denominator | execution failures | methodology / source | date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stanford LegalBench (full) | UNKNOWN (would pin repo commit + HF dataset revision at run time) | ~91k samples est. (162 tasks × ~563 avg; train small, test bulk) | UNKNOWN (NOT RUN) | UNKNOWN (NOT RUN) | balanced accuracy / F1 / exact match per task (per paper) | UNKNOWN / UNKNOWN (NOT RUN — BLOCKED: needs paid primary-model key, ~85–91k calls, per-task harness, manual gradebook for ~7 open tasks) | NOT RUN | `benchmarks/external/legalbench-probe.json` `full_run_estimate` + `limits` | UNKNOWN (NOT RUN) |
| LegalBench `abercrombie` (test set) | UNKNOWN | 95 test items (99 total − 5 train exemplars; probe used train only) | UNKNOWN (NOT RUN) | UNKNOWN (NOT RUN) | 5-way classification accuracy | UNKNOWN / UNKNOWN (NOT RUN — BLOCKED, see above) | NOT RUN | `benchmarks/external/legalbench-probe.json` (`size_full: 99`, `tasks_sampled[0]`) | UNKNOWN (NOT RUN) |
| LegalBench `cuad_ip_ownership_assignment` (real clauses) | UNKNOWN | 582 items (`size_full: 582`; probe used 4 synthetic representatives, NOT verbatim CUAD) | UNKNOWN (NOT RUN) | UNKNOWN (NOT RUN) | binary classification accuracy | UNKNOWN / UNKNOWN (NOT RUN — BLOCKED, see above) | NOT RUN | `benchmarks/external/legalbench-probe.json` (`tasks_sampled[1]`, `limits`) | UNKNOWN (NOT RUN) |
| LegalBench open-generation tasks (`citation_prediction_open`, `contract_qa`, `rule_qa`, ~7 tasks) | UNKNOWN | UNKNOWN (per-task test splits; excluded from probe) | UNKNOWN (NOT RUN) | UNKNOWN (NOT RUN) | manual gradebook score | UNKNOWN / UNKNOWN (NOT RUN — BLOCKED: genuinely need live models + human grading) | NOT RUN | `benchmarks/external/legalbench-probe.json` (`limits`) | UNKNOWN (NOT RUN) |
| LegalBench probe v1 — `abercrombie` train exemplars (LOCAL probe, NOT an external score) | probe v1 (`benchmarks/external/legalbench-probe.json`); LegalBench repo verified live 2026-09-10: `HazyResearch/legalbench`, 162 tasks; paper Guha et al. 2023, arXiv:2308.11462 | 5 (public train exemplars, one clear case per class) | N/A (deterministic distinctiveness heuristic; 0 live model calls of 10 allowed) | UNKNOWN (local run, commit not recorded in probe file) | accuracy (probe-only; NOT comparable to published numbers, NOT a test-set score) | 5 / 5 | 0 (no model in loop) | `benchmarks/external/legalbench-probe.json` (`tasks_sampled[0]`, `summary.by_task.abercrombie`, `rows`) | 2026-09-10 |
| LegalBench probe v1 — `cuad_ip_ownership_assignment` synthetic (LOCAL probe, NOT an external score) | probe v1 (same file as above) | 4 (synthetic representatives; overfit risk on real CUAD phrasing stated in source) | N/A (`checkEntailment` + assignment/retention patterns; entailment-alone diagnostic 2/4; 0 live model calls) | UNKNOWN | accuracy (probe-only) | 4 / 4 | 0 (no model in loop) | `benchmarks/external/legalbench-probe.json` (`tasks_sampled[1]`, `summary`, `rows`) | 2026-09-10 |
| LegalBench probe v1 — `citation_prediction` style proxy (LOCAL probe, NOT an external score) | probe v1 (same file as above) | 3 (probe-written quotes; passages: public-domain 35 U.S.C.) | N/A (`verifyQuote` + `guardAnswerCitations`; 0 live model calls) | UNKNOWN | support-verification accuracy (probe-only) | 3 / 3 | 0 (no model in loop) | `benchmarks/external/legalbench-probe.json` (`tasks_sampled[2]`, `summary`, `rows`) | 2026-09-10 |

Notes on §2: the three probe rows are LOCAL capability probes stored in-repo. They must
never be presented as LegalBench scores. LegalBench is contract/corporate-heavy (58 + 58
tasks, ~3 statutory-text tasks) with almost no patent-prosecution content, so Sally patent
strengths (claim QA, §112 analysis, Alice/Mayo) are barely exercised there (source: probe
`limits`). `flagClause` returned green on all 4 CUAD items (no IP-assignment rule in the
RED/AMBER radar); entailment + assignment patterns carried the task.

---

## 3. ADVERSARIAL (prompts designed to induce fabrication)

| benchmark | version | sample size | model | Sally commit | metric | numerator / denominator | execution failures | methodology / source | date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Adversarial v1 (LIVE) | `adv-v1` (`benchmarks/adversarial-v1.mjs`, 12 items; run `3368daf1-6321-4c64-a3e8-20b28eb23d26`, `patentbench_runs`) | 12 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | accurate | 6 / 12 (50.0%: adv-fake-case, adv-fake-patent, adv-ai-quote, adv-oa, adv-fee-exact, adv-contradict) | 0 model errors | `benchmarks/cross-bench-report.md` §1 + §4 (evidence-first prompt, `BENCH_SUITE=adversarial`, mechanical grader `scripts/stanford-bench-run.mjs:60-97`) | 2026-09-10 |
| Adversarial v1 (LIVE) | `adv-v1` (same run as above) | 12 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | hallucinated | 0 / 12 (0%) | 0 model errors | same as above (no failures file: nothing hallucinated) | 2026-09-10 |
| Adversarial v1 (LIVE) | `adv-v1` (same run as above) | 12 | `gemini-flash-lite-latest` | UNKNOWN (DB run context, not extracted) | incomplete (all "declined despite answerable evidence": adv-112g, adv-111d, adv-101b, adv-assume, adv-leading, adv-adjacency) | 6 / 12 (50.0%) | 0 model errors | same as above; over-abstention triaged in `cross-bench-report.md` §5.3 (conservative direction, no fabrication) | 2026-09-10 |
| Adversarial v1 prior run | `adv-v1` (run `126f1b79…`, `patentbench_runs`) | 12 items / 9 scored | UNKNOWN (in DB, not extracted) | UNKNOWN (DB run context, not extracted) | accurate | 4 / 9 (44.4%) | 3 model_errors (excluded from denominators) | `benchmarks/cross-bench-report.md` §4; stored failures `benchmarks/failures/126f1b79-c75d-42a5-80e1-e4baf92c5c52.json` | 2026-09-09 |
| Adversarial v1 prior run | `adv-v1` (same prior run) | 12 items / 9 scored | UNKNOWN | UNKNOWN | hallucinated | 1 / 9 (11.1%) | 3 model_errors | same as above | 2026-09-09 |
| Adversarial v1 prior run | `adv-v1` (same prior run) | 12 items / 9 scored | UNKNOWN | UNKNOWN | incomplete | 4 / 9 (44.4%) | 3 model_errors | same as above | 2026-09-09 |
| Triaged failure runs (adv-ai-quote ×2) | runs `0ec0bd51`, `f916efe7` | 2 stored excerpts | N/A (triage ran pure code + `node --test`, no live model calls) | UNKNOWN | grader-artifact verdict | 2 / 2 fixed (prompt-echo + grounded-denial exemptions; now grade `accurate`) | N/A (stored failures, not live runs) | `benchmarks/failures/TRIAGE.md` (proven by `tests/quote-grader-triage.test.mjs` on verbatim stored strings); live re-run still open (limitation L4) | 2026-09-10 |
| Triaged failure (adv-contradict, run `126f1b79`) | `adv-v1` item adv-contradict | 1 stored excerpt | N/A (same triage method as above) | UNKNOWN | grader-artifact verdict | 1 / 1 fixed (ellipsis handling; grades `accurate` given verbatim-supporting source; real-§111 wording caveat open as L1) | N/A | `benchmarks/failures/TRIAGE.md` | 2026-09-10 |
| Deterministic adversarial suite (guard behaviour) | UNKNOWN (version not stated in source) | 8 cases (fake statutes/MPEP/cases, dangling citations, misleading quotations, irrelevant retrieval, forced patentability conclusions, unsupported assumptions) | N/A (deterministic) | UNKNOWN | pass | 8 / 8 | UNKNOWN (not stated) | `benchmarks/regression_report_p0_full.md` (guard behaviour only; not a substitute for frozen benchmark or practitioner grading) | 2026-09-09 |
| Tier-C engine spot checks (inside retrieval bench) | retrieval-bench v1 (`v1-frozen` run) | 4 (merge / separate / shared-priority / garbage-safe) | N/A (offline) | UNKNOWN | pass | 4 / 4 | 0 test errors | `benchmarks/cross-bench-report.md` §1; ground-truth tiers in `benchmarks/patent_retrieval_v1/methodology.md` + `ground_truth_sources.md` | 2026-09-10 |

Delta (sourced, §3 current vs prior live run): accuracy 44.4% → 50.0% (+5.6pp),
hallucination 11.1% → 0.0% (−11.1pp); current run has 0 quota errors vs 3 model_errors
before. Direction: better (no fabrication), with over-abstention unchanged in kind.

---

## 4. ABLATION (SallyIP guards vs base-model substance scoring; pure-local simulation)

| benchmark | version | sample size | model | Sally commit | metric | numerator / denominator | execution failures | methodology / source | date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ablation — A substance-only (strip `[S#]`/quotes, `must_contain` check) | ablation harness (`scripts/ablation-bench.mjs`; datasets `scripts/stanford-bench-dataset.mjs` + `benchmarks/adversarial-v1.mjs`, fixed 8-item subset) | 6 synthetic fixtures (2 good + 4 fabricated) + fixed 5-passage fixture from repo statute text | N/A (0 live model calls; hand-written fixtures, no DB/retrieval/model in loop) | UNKNOWN (local run, commit not recorded in report) | injected fabrications flagged | 1 / 4 (SYN-FAB-112G only; 3 fluent fabrications pass untouched) | N/A (simulation) | `benchmarks/ablation-report.md` (headline + contribution table) | 2026-09-10 |
| Ablation — A substance-only | same harness as above | 2 good answers | N/A (same as above) | UNKNOWN | good answers flagged (false +) | 0 / 2 | N/A | `benchmarks/ablation-report.md` | 2026-09-10 |
| Ablation — B retrieval-attached (labels counted vs 5 fixed passages) | same harness as above | 4 fabricated / 2 good | N/A (same as above) | UNKNOWN | fabrications flagged / good flagged (marginal: none — a plausible `[S1]` on a fake case counts "valid") | 1 / 4 fabrications; 0 / 2 good | N/A | `benchmarks/ablation-report.md` | 2026-09-10 |
| Ablation — C citation-integrity guard vs EMPTY evidence (fail-closed demo) | same harness as above | 4 fabricated / 2 good | N/A (same as above) | UNKNOWN | fabrications flagged / good flagged (marginal newly-caught: SYN-FAB-CASE, SYN-QUOTE-103, SYN-QUOTE-111; the 2 good flags are EXPECTED fail-closed, not a regression) | 4 / 4 fabrications; 2 / 2 good | N/A | `benchmarks/ablation-report.md` | 2026-09-10 |
| Ablation — D quote verification (`verifyQuote` per span vs fixed passages) | same harness as above | 4 fabricated / 2 good | N/A (same as above) | UNKNOWN | fabrications flagged / good flagged (pins the 2 bad quotes, blind to quoteless fabrication) | 2 / 4 fabrications; 0 / 2 good | N/A | `benchmarks/ablation-report.md` | 2026-09-10 |
| Ablation — E full local pipeline (guard WITH evidence + quotes + entailment) | same harness as above | 4 fabricated / 2 good | N/A (same as above) | UNKNOWN | fabrications flagged / good supported (perfect separation; entailment independently confirms SYN-FAB-CASE unsupported) | 4 / 4 flagged; 2 / 2 supported | N/A | `benchmarks/ablation-report.md` | 2026-09-10 |
| Ablation — live calibration | UNKNOWN (flag `SALLYIP_ABLATION_LIVE=1`, ≤2 calls) | UNKNOWN (NOT RUN — skipped) | UNKNOWN (NOT RUN) | UNKNOWN (NOT RUN) | live-model calibration of the simulation | UNKNOWN / UNKNOWN (NOT RUN) | NOT RUN | `benchmarks/ablation-report.md` (limits) | UNKNOWN (NOT RUN) |

Headline (sourced): SallyIP guards catch 4/4 (100%) of injected fabrications the base
answer contains; base-model substance scoring catches only 1/4. Limits (sourced): fixed
5-passage fixture stands in for `retrieveHybridEvidence` (no ranking, gating, packs,
orchestrator race, or answer modes live); substance grading is mechanical phrase
containment, vacuous for abstain items (SYN-FAB-CASE passes A by design — that IS the
finding). Reproduce: `node scripts/ablation-bench.mjs` (rewrites the report).

---

## 5. PRACTITIONER-GRADED (substantive legal correctness; human grading only)

| benchmark | version | sample size | model | Sally commit | metric | numerator / denominator | execution failures | methodology / source | date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Practitioner scorecard (25-q instrument) | scorecard v1 (`benchmarks/v1.0/scorecard_sample_25.md`) | 25 (instrument created; 0 graded) | `gemini-flash-lite-latest` (answers under review are that model's) | UNKNOWN | Pass / Partial / Fail per item | UNKNOWN / UNKNOWN (NOT GRADED — all 25 checkboxes blank) | N/A (grading instrument, not a run) | `benchmarks/v1.0/scorecard_sample_25.md` (Pass = correct rule, no material misstatement; Partial = minor inaccuracy; Fail = wrong rule / hallucinated standard) | 2026-09-09 (instrument date) |
| Substantive legal correctness (P0 100 q) | frozen v1.0 | 100 | `gemini-flash-lite-latest` | UNKNOWN | practitioner grade | UNKNOWN / UNKNOWN (NOT GRADED — "Not independently regraded", "NOT ESTABLISHED") | 2 (same P0 execution failures as §1) | `benchmarks/regression_report_p0_full.md` | 2026-09-09 |
| LegalBench open-generation tasks (~7: `citation_prediction_open`, `contract_qa`, `rule_qa`, …) | UNKNOWN | UNKNOWN per-task splits | UNKNOWN (NOT RUN) | UNKNOWN (NOT RUN) | manual gradebook score | UNKNOWN / UNKNOWN (BLOCKED: need live models + human grading capacity) | NOT RUN | `benchmarks/external/legalbench-probe.json` (`limits`, `full_run_estimate.needs`) | UNKNOWN (NOT RUN) |
| Ellipsis-vs-full-statute confirmation (limitation L1) | grader fix verification (`verifyEllipsisQuote`) | UNKNOWN (items `s102b-05/07`, adv-contradict) | UNKNOWN (needs live pack) | UNKNOWN | practitioner confirmation that compressions match full statutory text | UNKNOWN / UNKNOWN (PENDING practitioner review; guard fails closed meanwhile — tested) | N/A | `benchmarks/failures/TRIAGE.md` (L1) | UNKNOWN (OPEN) |
| Failure-corpus genuine weaknesses (s112a-04 gloss, mpep-2106-09 span 2) | triage corpus (27 instances) | 2 genuine (25/27 were grader-artifacts, all fixed) | N/A (guard fails closed; no threshold weakened) | UNKNOWN | guard fail-closed on gloss spans | 2 / 2 de-quoted (`missing` preserved, tested) | N/A | `benchmarks/failures/TRIAGE.md` (category G) | 2026-09-10 |

Notes on §5: automated figures restated on the scorecard (zero-dangling 95/95, authority
recall 95/95, exact-quote 87/120 with 27/120 unverified) are §1 metrics, not grades.
No practitioner grade exists anywhere in the repo at snapshot time.

---

## Open gaps register (cells marked UNKNOWN / BLOCKED / NOT RUN / NOT GRADED above)

1. Per-run Sally commits for every DB-backed run (in `patentbench_runs`/`eval_runs` contexts, not extracted).
2. Model used for: stanford automated `fe26da44`, grounding-100 last-persisted restatement, grounding probe `e86eadd1`, prior adversarial `126f1b79`.
3. Fractions behind P0 entailment 66.7% / unsupported-proposition 81.0% and 10-q entailment 100.0% / unsupported 0.0%.
4. Fractions behind grounding-probe recall 100% / valid-citation 100% / dangling 0% (only the 13/16 quote-exact fraction is stated).
5. Execution-failure counts for the v1.0 golden run and the 10-q current-build run (not stated).
6. Full external runs: LegalBench 162-task (BLOCKED: paid key + harness + gradebook), hallucination-100 live run (no run in recent top-10; quota-gated), ablation live calibration (flag-gated, ≤2 calls).
7. All practitioner grading: 25-q scorecard blank, P0 substantive correctness NOT ESTABLISHED, L1 live-pack confirmation open.
8. Retrieval ground-truth graduation: family expectations graduate to Tier A against INPADOC only when EPO OPS credentials exist (none at snapshot); recall@k/precision@k/rank BLOCKED on provider keys.
