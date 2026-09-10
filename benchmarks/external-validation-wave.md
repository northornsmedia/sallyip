# SALLYIP EXTERNAL VALIDATION STATUS

Date: 2026-09-10. Baseline commit: `d4c2870`. This wave: `a4258c1`.
Rule: counts below are measured numerators/denominators. Anything unmeasured is marked unknown, never interpolated.

## 1. LegalBench results
- Probe: 12/12 deterministic IP-relevant items (train exemplars + synthetic representatives, NOT test-set scores; headline-ineligible by design).
- Full 162-task run: BLOCKED (needs paid model key + harness + manual gradebook for 7 open-generation tasks).
- Known weakness preserved: entailment alone scores 2/4 on CUAD-style assignment clauses.

## 2. CUAD results
- Frozen baseline 2/4 (entailment-only) preserved.
- With additive ownership-signal layer: 4/4 on the same 4 frozen cases (`benchmarks/external/legalbench-probe.json` + `src/lib/contract-ownership.js`, 12 new tests green).
- Scope: 4-item probe. Real CUAD phrasing remains a generalization risk, stated openly.

## 3. ABIGAIL results
- Subset: 23 cases (18 stratified + 5 poison-carrying), original scoring unmodified.
- Passed 7/23; 14 grounded refusals (no USPTO record access offline — correct fail-closed behavior); 2 generation drafts recorded incomplete pending judge layers.
- Poison pills: 0 hits across all 23 outputs (fake MPEP sections, fake cases, fabricated cites all rejected or refused).

## 4. IPBench results
- Stratified 16-item EN subset: 15/16 overall — PATENT 4/4, TRADEMARK 4/4, COPYRIGHT 3/4 (regex brittleness on one item, kept unpatched as evidence), OTHER 4/4.
- Full 10,374-item run: BLOCKED (needs ~10k model calls + harness + grading budget).

## 5. Adversarial results
- adv-v1 (12 live traps): 4 grounded handlings, 0 confirmed fabrications, remainder conservative refusals; 1 grader false-positive found and fixed with telemetry proof.
- ablation-25 (26 synthetic fabrications + 2 good answers): 26/26 flagged, 0/2 false positives, all 13 trap types covered.

## 6. Raw-vs-guarded ablation
- Frozen set: base-model substance scoring 1/4 vs guarded engine 4/4.
- Expanded set: 0/22 vs 22/22. Guards contribute the detection; base answers alone do not.

## 7. Historical failure recovery
- 25 grader-artifact failures: fixed in code with regression tests (`benchmarks/failures/TRIAGE.md`, `tests/quote-grader-triage.test.mjs`, 30 tests).
- 2 genuine failures retained in permanent regression, fail-closed (de-quoted, telemetry preserved).

## 8. Remaining genuine failures
- s112a-04 and mpep-2106-09 gloss quotes (de-quoted, pending live-pack confirmation).
- IPBench cr-01 heuristic brittleness (regex miss, unpatched by policy).
- mpep-pathways evidence thinness (pack lacks Pathways A/B/C text).
- 7-passage US pack limits recall breadth; India/UK packs fed but thin.

## 9. Execution failures
- Free-tier model 429/503s during bench runs (6 model errors in one 24-item run; items excluded from denominators, never imputed).
- One DB-persist failure without env (offline metrics still written).
- Google Patents harvest throttling (503s); harvester is resume-capable with backoff.

## 10. Practitioner grading status
- PENDING. 25-question scorecard blank (0/25 graded). Substantive legal correctness is NOT established by any number in this report.

## 11. Vals readiness
- Checklist created (`benchmarks/vals-readiness.md`). NOT submitted, no entry claimed. Intended frozen build for submission: a clean checkout of `d4c2870` (tree is currently dirty from concurrent tracks — tag required first).

## 12. Exact commits tested
- Baseline: `d4c2870`. This wave: `a4258c1` (includes concurrent tracks' files; see log).
