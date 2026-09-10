# Vals readiness — submission checklist ONLY

- Date: 2026-09-10 (UTC). Intended build/commit: `d4c2870`
  (`feat: 5-agent benchmark wave`, HEAD at time of writing).
- Status: **NOT SUBMITTED. No entry claimed.** Nothing in this file is a submission;
  it is a preparation checklist for a future external-validation submission
  (e.g. a Vals-style third-party evaluation). Confirm the venue's *current*
  requirements at submission time — the repo contains no Vals specification
  (verified: no `vals` mention anywhere in the tree).
- Evidence shorthand: [S] `benchmarks/external-scoreboard.md`,
  [J] `public/benchmarks/latest.json`, [C] `benchmarks/cross-bench-report.md`,
  [P0] `benchmarks/regression_report_p0_full.md`, [R10] `benchmarks/regression_report_latest_vs_v1.0.md`,
  [A] `benchmarks/ablation-report.md`, [P] `benchmarks/external/legalbench-probe.json`,
  [T] `benchmarks/failures/TRIAGE.md`, [V] `benchmarks/v1.0/`.

## 1. Required info (prepare before any submission)

- [ ] Venue + track confirmed (which Vals suite / task list / protocol version). Status: TO CONFIRM.
- [ ] Task-to-capability mapping: which Sally capabilities each venue task exercises. Draft input: §2 below.
- [ ] Frozen model identifier pinned (`gemini-flash-lite-latest` was the evaluated model; re-pin at run time — runner default `SALLYIP_PRIMARY_MODEL`, see `scripts/stanford-bench-run.mjs:34`).
- [ ] Frozen Sally commit pinned (intended: `d4c2870`; re-verify `git rev-parse HEAD` at submission; tree currently has dirty files from a concurrent session — see `git status --short` — so a clean checkout/tag is required first).
- [ ] Dataset/benchmark versions pinned (venue dataset revision + Sally harness versions `sb-v1` / `adv-v1` / `v1-frozen` / probe v1).
- [ ] Sample sizes + denominators for every reported number (fractions currently missing for P0 entailment 66.7% / unsupported 81.0% and 10-q entailment/unsupported — see [S] §1 gaps; export numerators/denominators from `eval_runs` before submitting).
- [ ] Execution-failure accounting (P0: 2, `s102b-08` + `s112d-02` `max_retries_exceeded`, disclosed not hidden — [P0]; golden-run and 10-q failure counts UNKNOWN — close before submitting).
- [ ] Grading protocol stated (mechanical vs practitioner; our mechanical grader is `scripts/stanford-bench-run.mjs:60-97` + shared `auditAnswerQuotes`).
- [ ] Confidentiality / data-use clearance (see §5).
- [ ] Reproducibility bundle (see §6).

## 2. Relevant Sally capabilities (what a venue would actually exercise)

- Evidence-first answering with citation labels (`[S1]`…), enforced by `guardAnswerCitations` (fail-closed on dangling citations).
- Verbatim quote verification (`verifyQuote`, `auditAnswerQuotes`): bracket/citation/markdown conventions, `...` ellipsis segments, prompt-echo and grounded-denial exemptions — every checked word still verbatim in one source ([T]).
- Proposition entailment (`checkEntailment`) + citation ledger (`answer_citations`, `proposition_sources`).
- Hybrid retrieval (lexical + pack fallback + section refs + concept aliases) over US/IN/GB jurisdiction packs; temperature 0, max_tokens 600 (runner context, `scripts/stanford-bench-run.mjs:22-34`).
- Adversarial posture: abstain/correct-premise on fake authorities, fee specifics, and unanswerable specifics (12-item `adv-v1` suite, [S] §3).
- Patent-intelligence layer (offline): publication-number parsing, biblio preservation, family grouping, duplicate collapse, false-merge resistance ([S] §1; `benchmarks/patent_retrieval_v1/methodology.md`).
- Known capability gaps to declare: lexical entailment misses synonyms/antonym retention ([P] CUAD note); `flagClause` has no IP-assignment rule (all-green on CUAD items); short quotes exempt from verification by design ([T] L3).

## 3. Available evidence (sourced, no new claims)

- [S] five-section scoreboard (internal frozen / external public / adversarial / ablation / practitioner-graded; no single merged score).
- [J] machine-readable feed with per-metric value, numerator, denominator, sample_size, benchmark_version, run_date, model, commit, status + anti-headline rules.
- [V] frozen v1.0 dataset (100 q, immutable), golden run (`f8dfe146`), 25-q practitioner instrument (blank), 27-quote failure corpus.
- [P0] P0 full run: recall 98/100, integrity 98/98, exact-quote 92/96 — **RELEASE BLOCKED** (missing-quote 4/96, entailment 66.7%, unsupported 81.0%, 2 exec failures).
- [R10] 10-q current-build check (small-n; not a headline).
- [C] cross-bench consolidation: 195/195 unit, 99/120 retrieval offline, 6/12 adversarial-live accurate with 0 hallucinated.
- [A] ablation: full pipeline flags 4/4 injected fabrications vs 1/4 for substance-only baseline (pure-local simulation, 0 model calls).
- [P] LegalBench probe v1: 12/12 on train/synthetic probes (NOT test-set scores) + full-run cost/blocker estimate.
- [T] failure triage: 25/27 grader-artifacts fixed without weakening thresholds; 2 genuine gloss spans fail closed; limitations L1–L4 published.

## 4. Unresolved weaknesses (must accompany any submission, not be hidden)

- [ ] P0 release gates FAIL: missing-quote 4.2% vs <2%, entailment 66.7% vs ≥95%, unsupported-proposition 81.0% vs <2%; completion gate FAIL (2 exec failures). Production stays on pre-change build.
- [ ] Substantive legal correctness NOT ESTABLISHED anywhere (scorecard blank; open-generation tasks ungraded).
- [ ] Retrieval `family-resolution` 0/19 + corpus collapse/merge failures: open triage (§5.1–§5.2 in [C]) — bench expectation vs offline design / overlapping dataset cases; INPADOC truth unavailable.
- [ ] Adversarial over-abstention 6/12 (safe direction, halves accuracy).
- [ ] Live recall@k / precision@k / ground-truth rank BLOCKED (no provider keys); hallucination-100 live run missing (quota); ablation live calibration missing (flag-gated).
- [ ] L1 ellipsis-vs-full-statute needs live pack + practitioner review; L2 guard over-blocks uncited grounded denials (policy decision, out of scope); L4 no live re-run of triaged fixes.

## 5. Confidentiality / config notes

- [ ] NEVER print secrets: runner needs `GEMINI_API_KEY` (or `SALLYIP_PRIMARY_*` / OpenRouter paid key for a full run) and `DATABASE_URL` — pass via environment only, never into submissions, logs, or the repo.
- [ ] `.env.local` / `.ai-keys.local.json` exist in the worktree and are local-only; verify `.gitignore` coverage before any bundle leaves the machine.
- [ ] Retrieval dataset cases link public Google Patents pages (Tier A/B ground truth, `ground_truth_sources.md`); probe uses CC BY 4.0 train exemplars (abercrombie) + synthetic CUAD representatives — attribute per `provenance` fields in [P] if redistributed.
- [ ] Confirm venue data-retention / training-use terms before sending any proprietary matter data — all current benches use public-domain statutes and public patent pages; no client data is involved.

## 6. Reproducibility requirements (pin before submitting)

- [ ] Clean checkout at the submitted commit (tag it; current tree is dirty — concurrent session).
- [ ] Commands: unit (`node --test tests/*.test.mjs` per [C] §1), retrieval (`scripts/run-retrieval-bench.mjs`), adversarial/stanford (`BENCH_SUITE=adversarial node scripts/stanford-bench-run.mjs`), ablation (`node scripts/ablation-bench.mjs`), probe (`node scripts/legalbench-probe.mjs`).
- [ ] Live runs need: paid primary-model key with budget approval, `DATABASE_URL` (persist + SELECT audit), single-run quota policy (adversarial used 12 calls; full LegalBench ≈ 85–91k calls / ~110M in + ~5M out tokens per [P] estimate).
- [ ] Record per-run: model, `git rev-parse --short HEAD`, bench_version, temperature/max_tokens, run IDs (`patentbench_runs` / `eval_runs`), and export full numerators/denominators (closes the §1 fraction gaps).
- [ ] Do not edit frozen datasets to make the engine pass (`dataset.json` append-only once frozen; corrections as NEW revisions — `methodology.md`).

## 7. Submission log (keep blank until a real submission happens)

| date | venue / track | build / commit | tasks + sample sizes | result reference | submitted by |
| --- | --- | --- | --- | --- | --- |
| — | — (NOT SUBMITTED) | intended `d4c2870` | — | — | — |
