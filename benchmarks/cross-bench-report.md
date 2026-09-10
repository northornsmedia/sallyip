# SallyIP cross-benchmark regression report

- Date: 2026-09-10 (UTC)
- Scope: consolidated report across ALL internal suites — unit (`tests/*.test.mjs`), offline retrieval bench (`scripts/run-retrieval-bench.mjs`), live adversarial v1 (`scripts/stanford-bench-run.mjs`, `BENCH_SUITE=adversarial`), plus last-persisted state for quota-gated suites (stanford automated, hallucination-100, grounding probe/100, frozen v1.0 P0).
- Quota policy: one live run only (adversarial, 12 model calls). No HTTP 429 encountered, so no abort was triggered. All other live suites marked skipped-with-reason.
- No fixes applied in this session (report only).

## 1. Per-suite results (fresh runs this session)

| suite | items | pass | fail | errors | notes |
| --- | --- | --- | --- | --- | --- |
| unit `tests/*.test.mjs` (42 files) | 195 tests | 195 | 0 | 0 | full suite green, ~1.8s |
| retrieval-bench v1 (offline, dataset `v1-frozen`, 19 cases) | 120 checks | 99 | 21 | 0 test errors (1 environmental: DB persist needs `DATABASE_URL`; offline metrics unaffected) | 3 metrics gated on provider keys (recall@k, precision@k, ground-truth rank). Side-effect files (`run_report.md`, `failures/latest.json`) reverted to keep tree clean |
| adversarial v1 (LIVE, `gemini-flash-lite-latest`, run `3368daf1-6321-4c64-a3e8-20b28eb23d26`) | 12 | 6 accurate (50.0%) | 0 hallucinated (0%); 6 incomplete (50.0%) | 0 model errors | persisted to `patentbench_runs`; no failures file (nothing hallucinated) |

### Unit per-file breakdown (all pass, 0 fail each)

| file | pass | fail |
| --- | --- | --- |
| adversarial-hallucination.test.mjs | 8 | 0 |
| answer-guard.test.mjs | 9 | 0 |
| citation-service.test.mjs | 3 | 0 |
| claim-chart.test.mjs | 2 | 0 |
| claim-qa.test.mjs | 10 | 0 |
| contract-service.test.mjs | 3 | 0 |
| doc-panel.test.mjs | 3 | 0 |
| document-tool-service.test.mjs | 11 | 0 |
| engine-swap.test.mjs | 5 | 0 |
| entailment.test.mjs | 5 | 0 |
| eval-harness.test.mjs | 2 | 0 |
| flywheel.test.mjs | 3 | 0 |
| fto.test.mjs | 3 | 0 |
| hybrid-retrieval.test.mjs | 2 | 0 |
| india-journal.test.mjs | 10 | 0 |
| invention-interview.test.mjs | 14 | 0 |
| inventive-step.test.mjs | 3 | 0 |
| ip-specialists.test.mjs | 4 | 0 |
| jurisdiction-pack.test.mjs | 5 | 0 |
| jurisdiction-registry.test.mjs | 2 | 0 |
| legal-task-planner.test.mjs | 9 | 0 |
| litigation-evidence.test.mjs | 2 | 0 |
| memory-retention.test.mjs | 2 | 0 |
| novelty.test.mjs | 2 | 0 |
| office-action.test.mjs | 4 | 0 |
| official-search.test.mjs | 17 | 0 |
| passage-service.test.mjs | 2 | 0 |
| patent-bench.test.mjs | 2 | 0 |
| patent-draft.test.mjs | 5 | 0 |
| patent-drafting-workspace.test.mjs | 5 | 0 |
| patent-family.test.mjs | 2 | 0 |
| patent-normalize.test.mjs | 5 | 0 |
| permanent-failures-regression.test.mjs | 3 | 0 |
| playbook-service.test.mjs | 3 | 0 |
| prior-art.test.mjs | 4 | 0 |
| proposition-verification.test.mjs | 3 | 0 |
| prosecution-history.test.mjs | 3 | 0 |
| security.test.mjs | 3 | 0 |
| specialist-router.test.mjs | 6 | 0 |
| trademark-clearance.test.mjs | 2 | 0 |
| trademark-intelligence.test.mjs | 2 | 0 |
| vault-review.test.mjs | 2 | 0 |
| **total** | **195** | **0** |

### Retrieval-bench failure list (offline, 21 failed checks)

- 19× `family-resolution`: ret-001 through ret-019 (every case; e.g. `ret-002: 29 families for 30 members`, `ret-018: 18 families for 20 members`).
- 1× `corpus duplicate-collapse`: 18 families for 19 cases ×2 (expected 19).
- 1× `corpus false-merge-rate`: 1 cross-case merge (`stem:3454709`: EP3454709B1 + EP3454709A2).
- Adversarial spot checks inside the bench: 4/4 PASS (merge / separate / shared-priority / garbage-safe).

### Live adversarial v1 item verdicts (this session, run `3368daf1…`)

- accurate (6): adv-fake-case, adv-fake-patent, adv-ai-quote, adv-oa, adv-fee-exact, adv-contradict.
- incomplete (6, all "declined despite answerable evidence"): adv-112g, adv-111d, adv-101b, adv-assume, adv-leading, adv-adjacency.
- hallucinated (0). model_error (0).

## 2. Quota-gated suites (not re-run; last persisted state)

| suite | last run | items | key numbers | notes |
| --- | --- | --- | --- | --- |
| stanford-bench v1 automated | 2026-09-09 (`fe26da44…`) | 24 | accurate 58.3% (14), hallucinated 0%, incomplete 41.7% (10), 0 model errors | skipped this session (needs 24 model calls) |
| hallucination-100 | — | 100 (dataset `benchmarks/hallucination-100.mjs`) | no run in recent `patentbench_runs` top-10 | skipped this session (needs ~100 model calls) |
| grounding benchmark 100 | 2026-09-09 (`f8dfe146…`, `eval_runs`) | 100 q / 95 scored | authority recall 100% (95/95), zero-dangling 100%, exact-quote 72.5% (87/120), unsupported 22.5% (27/120) | skipped this session (needs ~100 model calls) |
| grounding probe v1 | 2026-09-09 (`e86eadd1…`, `eval_runs`) | 10/10 answered | expected-passage recall 100%, valid-citation 100%, dangling 0%, quote exact_rate 81.3% (13E/1F/2M of 16) | skipped this session (needs 10 model calls; see `scripts/measure-grounding.mjs`) |
| frozen v1.0 P0 full (100 q) | 2026-09-09 (`benchmarks/regression_report_p0_full.md`) | 100 | recall 98.0%, citation integrity 100% (scored), exact-quote 95.8% vs ≥95% target PASS, missing-quote 4.2% vs <2% FAIL, entailment 66.7% FAIL, unsupported-proposition 81.0% FAIL → **RELEASE BLOCKED** | not re-runnable in quota; practitioner grading still required for legal correctness |

## 3. Consolidated totals (fresh checks this session only)

- Checks executed: 327 (195 unit + 120 retrieval + 12 adversarial-live).
- Clean: 300 (195 unit pass + 99 retrieval pass + 6 adversarial accurate).
- Needs attention: 27 (21 retrieval fail + 6 adversarial incomplete).
- Model/quota errors: 0. Skipped-with-reason (quota): stanford-24, hallu-100, grounding-100, grounding-probe-10, frozen-v1.0-100.

## 4. Deltas vs last persisted runs (`patentbench_runs` / `eval_runs`, SELECT-only)

- Unit: no DB baseline stored → delta n/a; tree was clean before this session and suite is 195/195.
- Retrieval: last persisted 2026-09-09 (`60acccd3…`) was dataset `v1-seed`, 1 case: 11 pass / 1 fail (the 1 fail was also `family-resolution`). Today: dataset `v1-frozen`, 19 cases: 99 pass / 21 fail. **Not directly comparable (dataset changed seed→frozen); same failure mode persists.**
- Adversarial v1: last 2026-09-09 (`126f1b79…`): 12 items, 9 scored, 3 model_errors, acc 44.4% / hallu 11.1% / incomp 44.4%. Today (`3368daf1…`): 12/12 scored, 0 errors, **acc 50.0% (+5.6pp), hallu 0.0% (−11.1pp), incomp 50.0%**. Direction: better (no quota errors, no fabrication).
- Stanford / grounding-100 / grounding-probe: no fresh run → deltas n/a; values restated from §2.

## 5. Prioritized fix list (no fixes applied)

1. **Retrieval `family-resolution` fails 19/19 offline — bench expectation contradicts offline design.**
   - `scripts/run-retrieval-bench.mjs:25` wipes `priority_numbers: []` ("absent by design") then expects all cross-office members to reunite in one family; `src/lib/patent-normalize-service.js:51-69` can only merge via shared priority or identical number stem, and real family members have distinct stems per office (verified: e.g. ret-001 members WO2019046583A1 / US20190069740A1 / US11234567B2 share no stem). The script's own `INFO unresolved-rate: 17/18 … (expected without INPADOC)` concedes the point.
   - Likely cause: metric asserts INPADOC-grade reunion from data the bench deliberately withholds. Fix direction (not applied): seed real priority numbers into bench rows where the dataset has them, or downgrade `family-resolution` to report-only like `unresolved-rate`.
2. **Corpus metrics assume disjoint cases; dataset violates it — `duplicate-collapse` + `false-merge-rate` fail on a TRUE merge.**
   - `benchmarks/patent_retrieval_v1/dataset.json:43` (ret-002 → EP3454709B1) and `:704` (ret-010 → EP3454709A2) target the same application at grant vs publication stage; `src/lib/patent-normalize-service.js:64-66` (`same-number-stem`) correctly groups them, and the bench counts it as a false merge (18 families vs 19 expected). ret-002's member list further overlaps ret-011…ret-019 targets.
   - Likely cause: dataset curation (overlapping cases), not engine bug. Fix direction (not applied): make corpus cases disjoint, or exempt same-application pub/grant pairs from the false-merge count.
3. **Adversarial `correct-premise` over-abstention: 6/12 incomplete, all "declined despite answerable evidence" (adv-112g, adv-111d, adv-101b, adv-assume, adv-leading, adv-adjacency).**
   - Likely cause: conservative abstention in the evidence-first prompt contract / mechanical grader (`scripts/stanford-bench-run.mjs:60-97`) — safe direction (0 hallucinations) but halves accuracy. Lowest priority; no fabrication observed. Fix direction (not applied): none without practitioner review of whether the declined premises were truly answerable from US-pack evidence.

## 6. Build

- `npm run build`: PASS (`✓ built in 5.86s`; only pre-existing chunk-size warning on `dist/assets/index-*.js` 689 kB).
