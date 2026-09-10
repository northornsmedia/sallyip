# Benchmark inference policy

Bench runners must not depend on fragile free-tier assumptions. Model
selection for benchmark execution is env-driven, failures are recorded
honestly, and quota exhaustion is never mistaken for a semantic failure.

Scope: `scripts/stanford-bench-run.mjs`. (`scripts/measure-grounding.mjs`
is unchanged.)

## Env contract

| Var | Required | Default | Meaning |
| --- | --- | --- | --- |
| `BENCHMARK_MODEL_PRIMARY` | No | `SALLYIP_PRIMARY_MODEL` → `gemini-flash-lite-latest` | Model that answers every item. |
| `BENCHMARK_MODEL_FALLBACK` | No | _(none)_ | Second model, tried **only** when `BENCHMARK_ALLOW_FALLBACK=1`. |
| `BENCHMARK_ALLOW_FALLBACK` | No | _(unset = `0`/off)_ | Must be exactly `1` to permit fallback. Any other value (including `true`) means primary-only. |
| `RESUME_FROM` | No | _(none)_ | A `patentbench_runs.id`. Items already scored in that run's metrics are skipped. |
| `BENCH_DRY_RUN` | No | _(none)_ | `1` = import the runner without executing (for tests / dry-run import). |

Endpoint / auth are unchanged: `SALLYIP_PRIMARY_BASE_URL` and
`GEMINI_API_KEY` behave exactly as before.

## Paid / reliable endpoint requirement

Benchmarks are the regression signal for release decisions. Run them
against a paid, quota-backed endpoint — never a free tier that can
throttle mid-suite and silently invalidate a run. If a run shows
`quota_errors > 0`, treat the run as capacity-constrained: fix quota,
then resume (below) rather than grading around the gaps.

## No silent fallback

- Every scored or errored row records `answering_model` (the exact model
  whose output was graded, or `null` on total failure).
- If primary errors, the row records `primary_error` (first primary
  error string) regardless of what happens next.
- Fallback is attempted **only** when `BENCHMARK_ALLOW_FALLBACK=1` **and**
  `BENCHMARK_MODEL_FALLBACK` is set to a different model. Otherwise the
  chain is primary-only — identical to the pre-policy single-model
  behavior.
- A fallback success records `answering_model=<fallback>` **plus**
  `primary_error`, so fallback usage is always visible, never silent.

## Retries (max 2, backoff)

- Budget is per item, shared across the chain: 1 initial attempt + up to
  2 retries (max 3 attempts total), with backoff sleeps between attempts.
- The row records `retries` (0 on first-try success).
- This retry policy applies always; what stays identical when the new env
  vars are unset is the **model chain** (primary-only).

## Quota vs semantic failures

- `classifyBenchError(error, status)`: returns `'quota'` for HTTP 429 or
  quota keywords (`quota`, `rate limit` / `rate_limit`, `resource
  exhausted`, `too many requests`, `429`); anything else is `'model'`.
- Error rows carry `error_kind`. Run metrics carry `quota_errors`
  alongside `model_errors`.
- Quota errors indicate capacity, not model quality — do not read them as
  hallucinations.

## Resume rule

Runs persist per execution (`patentbench_runs.metrics` as
`{ <key>: { rows: [...] } }`), so resume is by run id:

- `RESUME_FROM=<run-id>`: the runner loads that run's metrics, extracts
  already-scored ids (`extractScoredIds`), runs only
  `filterResumeItems(SUITE.items, ids)`, and carries the prior rows into
  the new run artifact so the resumed run is complete.
- Unknown `RESUME_FROM` id: the runner logs `not found` and runs the
  full suite (fail-open to a full run, never to fabricated rows).
- Resume assumes the same suite version; do not resume an `sb-v1` run id
  into an `adv-v1` invocation.

## MODEL_ERROR is never scored as wrong

`verdict: 'model_error'` rows are excluded from all denominators
(`scored = rows minus model_error`), exactly as before. They appear in
`model_errors` / `quota_errors` counts and in per-row diagnostics only.

## Examples

```powershell
# Default: primary-only, same model chain as before
node scripts/stanford-bench-run.mjs

# Explicit primary + gated fallback
$env:BENCHMARK_MODEL_PRIMARY='paid-model-a'
$env:BENCHMARK_MODEL_FALLBACK='paid-model-b'
$env:BENCHMARK_ALLOW_FALLBACK='1'
node scripts/stanford-bench-run.mjs

# Resume after quota interruption
$env:RESUME_FROM='<prior-run-id>'
node scripts/stanford-bench-run.mjs

# Dry-run import (no DB, no model calls)
$env:BENCH_DRY_RUN='1'
node -e "import('./scripts/stanford-bench-run.mjs').then(m => console.log(typeof m.classifyBenchError))"
```
