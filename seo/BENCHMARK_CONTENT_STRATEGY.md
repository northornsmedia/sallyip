# Benchmark Content Strategy — publish only what the repo proves (2026-09-10)

Sources inspected: `benchmarks/cross-bench-report.md` (2026-09-10), `benchmarks/regression_report_p0_full.md` + `regression_report_latest_vs_v1.0.md` (2026-09-09), `benchmarks/ablation-report.md` (2026-09-10), `eval_scorecard_sample_25.md` (2026-09-09), `benchmarks/hallucination-100.mjs` (100 items), `benchmarks/v1.0/dataset.json` (100 Q), `benchmarks/patent_retrieval_v1` (19 cases), `scripts/stanford-bench-*`.

## Citable numbers (exact approved phrasing — always include n, model, date, method)
1. Grounding-100: "Authority recall 100% (95/95) and zero dangling citations 100% (95/95), exact-quote verification 72.5% (87/120) with 22.5% (27/120) unverified — `gemini-flash-lite-latest`, 100 questions / 95 scored, 2026-09-09. Method: mechanical retrieval + quote check; substantive correctness practitioner-graded separately."
2. P0 frozen full (100Q, `gemini-flash-lite-latest`, 2026-09-09): "Recall 98.0% (98/100), citation integrity 100% of scored (98/98), exact-quote 95.8% (92/96); missing-quote 4.2% vs <2% target FAIL; entailment 66.7% FAIL; unsupported-proposition 81.0% FAIL → RELEASE BLOCKED; 2 execution failures (s102b-08, s112d-02). Practitioner legal-correctness NOT ESTABLISHED." MUST be disclosed alongside any P0 win.
3. Adversarial v1 live (12 items, run 3368daf1, `gemini-flash-lite-latest`, 2026-09-10): "6 accurate (50.0%), 0 hallucinated (0%), 6 incomplete — all conservative abstentions."
4. Stanford-24 (`fe26da44`, 2026-09-09): "14 accurate (58.3%), 0 hallucinated, 10 incomplete."
5. Ablation (8-item fixed subset, pure-local simulation, 0 live calls, 2026-09-10): "Guards flagged 4/4 injected fabrications; substance-only scoring caught 1/4. Simulation with fixed 5-passage fixture — guard behavior demo, not a model-quality claim."
6. Retrieval bench v1 offline (19 cases / 120 checks): "99 pass / 21 fail; family-resolution fails 19/19 because the bench withholds priority numbers the merger needs (`priority_numbers: []` by design) — metric bug, not INPADOC-grade recall. Report as methodology note, never as accuracy score."
7. Unit suite: "195/195 green (42 files)" — engineering hygiene, not a product claim.

## Banned claims
"0% hallucinations", "100% accuracy", "best legal AI", "0% hallucination / 46% refused" without the 24-item internal-bench qualifier, any competitor percentage not from Magesh/Dahl peer review, any customer/testimonial/ranking.

## Pages to build (each with sample size, version, model, date, method, n/d, review status)
1. `/benchmarks` — table of all runs above + changelog + RELEASE-BLOCKED honesty + practitioner-scorecard CTA.
2. `/benchmarks/verification-methodology` — hybrid retrieval → exact-quote verify → citation-integrity guard → entailment → VERIFIED/QUALIFIED/RESEARCH REQUIRED modes; link `docs/verification-architecture-audit.md` concepts.
3. `/benchmarks/hallucination` — Dahl 58–88% + Magesh 17–33% context (peer-reviewed) vs SallyIP mechanical rates with the exact phrasing above.
4. `/benchmarks/patent-retrieval` — 19-case bench + failure modes (family-resolution metric bug disclosed) + adversarial 4/4 spot checks.
5. `/benchmarks/changelog` — every run ID, dataset hash, code version; failures kept immutable (like `failures_27_unverified_quotes.json`).

## Why this wins citations
Answer engines cite quantified, method-open research with failure disclosure. The P0 BLOCKED honesty + frozen datasets + run IDs are the differentiator — keep them prominent, never smooth them into marketing.
