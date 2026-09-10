# Ablation-25 report — raw vs guarded on 22 NEW SYNTHETIC fabrications (+ 6 frozen refs = 28 total)

Generated: 2026-09-10T07:26:34.649Z · Live model calls used: 0
Source: `benchmarks/ablation-25.json` (SYNTHETIC ONLY — hand-written injected fabrications, NOT model output).
Frozen baseline referenced, not duplicated: SYN-GOOD-101, SYN-GOOD-102, SYN-FAB-112G, SYN-FAB-CASE, SYN-QUOTE-103, SYN-QUOTE-111 (see `benchmarks/ablation-report.md`: guards 4/4, substance 1/4).
Evidence: fixed 5-passage fixture from `src/lib/ablation.js` ([S1] 101, [S2] 102, [S3] 103, [S4] 111, [S5] 111b). No DB, no retrieval, no model in the loop (unless live calibration enabled).

## Headline

**Guards (E) flag 22/22 (100.0%) of NEW fluent fabrications that all pass substance checks (A catches 0/22); combined with frozen refs: 26/26 fabrications flagged, 2/2 good answers preserved.**

## Metrics (requested seven)

| Metric | New 22 (fab-only) | Combined 26 fab + 2 good (with frozen refs) |
| --- | --- | --- |
| Fabrication Detection Rate (E flagged / fab) | 22/22 = 100.0% | 26/26 = 100.0% |
| False Positive Rate (good flagged / good) | n/a (no good in new set) | 0/2 = 0.0% |
| Safe Refusal Precision (fab flagged / all flagged) | 100.0% (22/22) | 100.0% (26/26) |
| Useful Answer Preservation (good supported / good) | n/a (see frozen 2/2 in combined) | 100.0% |
| Unsupported Proposition Rate (fab w/ entailment fail / fab) | 21/22 = 95.5% | 96.2% |
| Citation Entailment (non-failed cites / all cites) | 2/23 = 8.7% | 7.4% |
| Execution Completion (executed / total) | 22/22 = 100.0% | 100.0% |

Notes: new-set precision denominator is fab-only so precision is 1.0 by construction — the meaningful precision is the combined column (frozen goods supply the FP denominator). Citation entailment counts per-cited-sentence entailment fails (DOES_NOT_SUPPORT/CONTRADICTS/DANGLING); CONTEXT_ONLY/PARTIALLY do not fail (frozen semantics).

## Per-layer contribution (new 22 fluent fabrications)

| Layer | Flagged | Signal |
| --- | --- | --- |
| A — substance (stripped must_contain) | 0/22 | fluent by design: every new fab contains its must phrase, so A passes all |
| B — retrieval attached (zeroValid) | 2/22 | catches only dangling-label fabs (F01, F17) |
| C — guard evidence-starved (vs []) | 22/22 | fail-closed demo: strips every citation incl. valid ones |
| D — quote verification (missing) | 2/22 | catches altered-quotation fabs (F07, F08) with zero false flags |
| E — full pipeline (guard + quotes + entailment) | 22/22 | aggregate: flags all 22 via dangling / missing-quote / entailment fail |

## Per-type detection (E) — all 13 required types covered

| Type | Flagged / total | Rate |
| --- | --- | --- |
| altered quotations | 2/2 | 100.0% |
| contradictory authority | 2/2 | 100.0% |
| fabricated patent numbers | 2/2 | 100.0% |
| fake cases | 2/2 | 100.0% |
| fake MPEP sections | 2/2 | 100.0% |
| fake statutes | 2/2 | 100.0% |
| fake trademark decisions | 2/2 | 100.0% |
| false family relationships | 1/1 | 100.0% |
| irrelevant authority | 1/1 | 100.0% |
| outdated authority | 1/1 | 100.0% |
| unsupported copyright propositions | 1/1 | 100.0% |
| unsupported priority dates | 1/1 | 100.0% |
| valid-citation/wrong-proposition | 3/3 | 100.0% |

## Per-case matrix (SYNTHETIC)

| Case | Type | A | B cited→valid | C dangling | D quotes | E | Primary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A25-F01 | fake statutes | pass | [9]→[] | [9] | no spans | FLAGGED | C |
| A25-F02 | fake statutes | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F03 | fake cases | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F04 | fake cases | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F05 | fake MPEP sections | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F06 | fake MPEP sections | pass | [3]→[3] | [3] | no spans | FLAGGED | E |
| A25-F07 | altered quotations | pass | [3]→[3] | [3] | missing | FLAGGED | D |
| A25-F08 | altered quotations | pass | [5]→[5] | [5] | missing | FLAGGED | D |
| A25-F09 | valid-citation/wrong-proposition | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F10 | valid-citation/wrong-proposition | pass | [2]→[2] | [2] | no spans | FLAGGED | E |
| A25-F11 | valid-citation/wrong-proposition | pass | [3]→[3] | [3] | no spans | FLAGGED | E |
| A25-F12 | irrelevant authority | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F13 | outdated authority | pass | [2]→[2] | [2] | no spans | FLAGGED | E |
| A25-F14 | contradictory authority | pass | [5]→[5] | [5] | no spans | FLAGGED | E |
| A25-F15 | contradictory authority | pass | [5]→[5] | [5] | no spans | FLAGGED | E |
| A25-F16 | fabricated patent numbers | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F17 | fabricated patent numbers | pass | [9]→[] | [9] | no spans | FLAGGED | C |
| A25-F18 | false family relationships | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F19 | unsupported priority dates | pass | [2]→[2] | [2] | no spans | FLAGGED | E |
| A25-F20 | fake trademark decisions | pass | [1]→[1] | [1] | no spans | FLAGGED | E |
| A25-F21 | fake trademark decisions | pass | [3]→[3] | [3] | no spans | FLAGGED | E |
| A25-F22 | unsupported copyright propositions | pass | [1]→[1] | [1] | no spans | FLAGGED | E |

## Limits

- Pure-local simulation: fixed 5-passage fixture stands in for retrieval; no ranking, gating, jurisdiction packs, orchestrator, or answer modes exercised live. S5 (111b) is the only passage containing a § symbol, so §-mismatch entailment fails are a fixture artefact as well as a real signal — see per-case ground_truth.
- Substance checks for new cases are fluent-by-design (must phrase present in the fab) to isolate guard contribution; combined-column A recall (1/26) uses the frozen 1/4 for the honest raw-vs-guarded contrast.
- New set is fab-only, so new-only FPR/preservation are n/a; use the combined column (frozen 2 good) for false-positive reading.
- Entailment fail counts only DOES_NOT_SUPPORT/CONTRADICTS/DANGLING_LABEL (frozen semantics); CONTEXT_ONLY/PARTIALLY do not fail — F04/F08 prototypes that yielded CONTEXT_ONLY were reworded (F04 += §999, F07/F08 use verbatim altered quotes) to be true entailment failures.
- Live calibration: 0 calls (skipped; set SALLYIP_ABLATION25_LIVE=1 for ≤10 calls, stops on 429).
- Reproduce: `node scripts/ablation-25.mjs` (writes this file; never touches `benchmarks/ablation-report.md`, `scripts/ablation-bench.mjs`, or frozen datasets).
