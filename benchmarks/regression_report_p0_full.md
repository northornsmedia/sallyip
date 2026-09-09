# SallyIP P0 full frozen-v1.0 regression report

Date: 2026-09-09  
Model: `gemini-flash-lite-latest`  
Dataset: frozen `benchmarks/v1.0/dataset.json` (100 unchanged questions)  
Result: **RELEASE BLOCKED**

| Metric | v1.0 baseline | P0 full run | Target | Gate |
| --- | --- | --- | --- | --- |
| Authority recall | 100% (95/95 scored) | 98.0% (98/100; 2 execution failures) | >=98% | PASS at boundary |
| Citation integrity | 100% (95/95 scored) | 100% (98/98 scored) | 100% | PASS for scored answers |
| Exact quote verification | 72.5% (87/120) | 95.8% (92/96) | >=95% | PASS |
| Missing/unverified quote rate | 22.5% (27/120) | 4.2% (4/96) | <2% | FAIL |
| Citation entailment | Not measured in v1.0 | 66.7% | >=95% | FAIL |
| Unsupported proposition rate | Not measured in v1.0 | 81.0% | <2% | FAIL |
| Substantive legal correctness | Practitioner scorecard only | Not independently regraded | Separate measure required | NOT ESTABLISHED |

Two questions failed after all model retries: `s102b-08` and `s112d-02` (`max_retries_exceeded`). They were not replaced, hidden, or treated as successful answers. Benchmark completion is therefore also a failed release gate.

The P0 exact-quote guard materially improved exact quotation fidelity and eliminated fuzzy quotations from the scored output, but four missing quotations remained. Citation existence alone did not establish entailment: many answers cited real retrieved sources while stating propositions that the benchmark's independent evaluator did not find supported. Production remains on the pre-change build.

The deterministic adversarial suite passed 8/8 cases covering fake statutes/MPEP/cases, dangling citations, misleading quotations, irrelevant retrieval, forced patentability conclusions, and unsupported assumptions. These tests establish guard behavior only; they do not substitute for the frozen benchmark or practitioner legal grading.
