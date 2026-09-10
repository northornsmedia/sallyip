# Outreach Pack: "Why Citation Integrity Is Not Legal Correctness"

## Subject Line Options
- Why 100% citation integrity ≠ legal correctness: P0 run case study
- Research: Entailment gap in legal AI — 100% cited, 66.7% supported
- Legal AI eval: The three properties everyone conflates

## Outreach Note (110 words)
We published a case study showing why citation integrity (existence + fidelity) does not establish legal correctness. In a frozen 100-question run (gemini-flash-lite-latest, 2026-09-09):

- Citation integrity of scored answers: **100% (98/98)**
- Exact-quote verification: **95.8% (92/96)**
- Citation entailment: **66.7% (FAIL)**
- Unsupported-proposition rate: **81.0% (FAIL)**

Release: BLOCKED. The build with perfect citation integrity was blocked from production because real citations supported wrong conclusions. Practitioner grading remains PENDING (0/25).

The note separates three properties: existence, fidelity, entailment — and shows why collapsing them into "accuracy" misleads buyers.

## Research Summary
- **Question**: Does perfect citation integrity imply legal correctness?
- **Method**: Frozen 100Q dataset, mechanical citation/quote/entailment grading, blocked release disclosure
- **Key finding**: 100% citation integrity coexisted with 66.7% entailment and 81% unsupported propositions.
- **Limitations**: Mechanical grading ≠ practitioner review; legal correctness NOT ESTABLISHED.
- **Why it matters**: Legal AI marketing conflates "cited" with "correct"; this publishes the gap with the blocked build.

## Links
- Note: https://sallyip.com/research/citation-integrity/
- Full P0 report: https://sallyip.com/benchmarks/ (regression_report_p0_full.md)
- Methodology: https://sallyip.com/benchmarks/verification-methodology/

## Why You May Care
- Legal AI evaluation rigor
- Entailment vs citation existence
- Blocked-release transparency
- Practitioner grading separation