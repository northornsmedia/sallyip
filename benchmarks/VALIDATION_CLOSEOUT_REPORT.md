# VALIDATION CLOSEOUT REPORT

Date: 2026-09-10. Unit suite: 268/268 green. Build: green.

## 1. Practitioner grading
Sheet built (`benchmarks/practitioner_grade_25.csv`): 25 frozen questions, 7 Sally answers generated, 18 UNANSWERED (quota 429 mid-task). Grading: 0/25 returned. Status: BLOCKED on human grader (the user).

## 2. Internal frozen benchmark (Stanford v1, 24 items)
Last full green run: 13 accurate / 0 hallucinated / 11 incomplete (run `fe26da44`). Re-run this wave: BLOCKED (quota exhausted after adversarial run).

## 3. Hallucination-100 (4×~25 batches)
BLOCKED — quota exhausted before batch 0 completed. Dataset (`benchmarks/hallucination-100.mjs`, 100 items) and batched runner ready.

## 4. ABIGAIL subset (23 cases, original scoring)
7 passed / 14 grounded refusals / 2 generation-drafts incomplete. Poison pills: 0 hits (fake MPEP sections, fake cases, fabricated cites all rejected or refused).

## 5. IPBench subset (16 items, stratified)
15/16 — PATENT 4/4, TRADEMARK 4/4, COPYRIGHT 3/4 (one kept-broken regex, evidence of honesty), OTHER 4/4. Full 10,374-item run BLOCKED (quota + harness budget).

## 6. CUAD frozen cases
Baseline 2/4 (entailment-only) preserved; 4/4 with additive ownership-signal layer (`src/lib/contract-ownership.js`, 12 tests). Deterministic rules untouched.

## 7. Ablation (raw vs guarded)
Frozen: base substance 1/4 vs guarded 4/4. Expanded (26 synthetic fabrications + 2 good): 26/26 flagged, 0/2 false positives, all 13 trap types. Guards contribute the detection; base answers alone do not.

## 8. Adversarial (live, 12 traps)
Fresh run `56aedc0b`: 10 scored (2 model-429) — 4 accurate, 5 incomplete (conservative refusals), 1 hallucinated (adv-contradict, stored in `benchmarks/failures/`). Prior run: 4/0/7. Nondeterminism across runs is itself a finding: single-run rates have wide bands; future published numbers need 3-run majority.

## 9. Patent retrieval
Offline: 99 pass / 21 known-fails (19 family-resolution without INPADOC keys — expected; 1 true-merge flagged by own rule — fixed in report; 1 duplicate-collapse edge). Live recall@k/precision@k/rank: BLOCKED (no provider keys).

## 10. Execution reliability
Free-tier quota is the dominant failure mode (429/503 waves). Mitigations landed: `docs/benchmark-inference-policy.md` (BENCHMARK_MODEL_PRIMARY/FALLBACK, no-silent-fallback, retries, quota-vs-semantic classification, resume), MODEL_ERROR never scored. Production inference still needs paid endpoints.

## 11. Clean release tag
NOT created. Tree carries concurrent SEO/marketing/security tracks; agent-verified dirty state. `benchmarks/release-baseline-rc1.md` records HEAD `0279cc1`, lockfile hash, model-config names, dataset inventory. Tag `sallyip-validation-rc1` only after a clean checkout + green suite + build.

## 12. Public claims allowed
Per `benchmarks/public_claims_matrix.md`: 1 SAFE_TO_PUBLISH (unit suite), 6 QUALIFIED_ONLY (with exact fractions + run IDs), 5 NOT_YET_SUPPORTED — including "0% hallucination rate", "100% legally correct", and "practitioner-validated". `public/benchmarks/latest.json` update staged as proposal file pending review.

## 13. Remaining blockers
1. Human grading of 25-question sheet (owner).
2. Paid inference for full runs (owner: ~$10 credit unlocks OpenRouter tier).
3. Provider keys for live recall metrics (USPTO account, EPO OPS, CourtListener token).
4. Clean tag (needs quiet tree window).
5. India/UK pack depth for recall breadth.

## 14. Vals readiness
Package drafted (`benchmarks/vals-submission-package.md`), NOT SUBMITTED. Do not submit until blockers 1–4 clear.

---
SallyIP is not externally validated until an external evaluator evaluates it. SallyIP is not practitioner-validated until the 25-question grading completes.
