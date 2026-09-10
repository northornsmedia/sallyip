# Outreach Pack: Ablation Study — "Raw LLM vs Verification-First Legal AI"

## Subject Line Options
- Research: Verification gates catch 26/26 injected fabrications base model missed
- Ablation data: Legal AI guard layers vs substance-only scoring
- New benchmark: 26 synthetic fabrications, 0 false positives, 13 trap types

## Outreach Note (120 words)
We published an ablation study measuring what happens when fluent legal fabrications meet a verification-first pipeline versus substance-only scoring. On 26 hand-written synthetic fabrications (invented cases, fake statutes, altered quotations) across 13 trap types:

- Base-model substance scoring: 0/22 detected
- Full verification pipeline (5 gates): 22/22 detected
- Combined with frozen refs: 26/26 fabrications flagged, 0/2 good answers harmed

The study isolates guard mechanics (retrieval attachment → citation-integrity guard → quote verification → entailment grading) on fixed fixtures. No live model calls — pure guard-behavior evidence.

Reproducible: `node scripts/ablation-25.mjs` (generates report + JSON).

## Research Summary
- **Question**: Do verification gates materially improve fabrication detection over substance scoring?
- **Method**: 22 new fluent fabrications + 6 frozen refs, fixed 5-passage statute fixture, 5-layer pipeline
- **Key finding**: Substance scoring caught 0/22; full pipeline caught 22/22. Zero false positives.
- **Limitations**: Fixed passages (no retrieval noise), hand-written fabrications (known trap types), guard-behavior demo not model benchmark.
- **Why it matters**: Most legal AI evals report single "accuracy" scores; this separates existence, fidelity, and entailment — and shows substance scoring alone fails on fluent fabrications.

## Links
- Methodology & results: https://sallyip.com/research/ablation-study/
- Machine-readable report: https://sallyip.com/benchmarks/latest.json (metrics: `ablation-full-pipeline-flag`, `ablation-substance-baseline-flag`)
- Frozen reference ablation: https://sallyip.com/benchmarks/ (ablation-8, 4/4 vs 1/4)

## Why You May Care
- Legal AI evaluation methodology
- Fabrication detection without retrieval
- Guard-layer contribution analysis
- Transparent failure disclosure (no "100% accuracy" claims)