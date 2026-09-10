# Outreach Pack: Patent Retrieval Benchmark Methodology

## Subject Line Options
- Patent retrieval benchmark: 99/120 pass, metric bug disclosed, recall-at-k blocked
- Retrieval eval without fabricated ground truth: 19 cases, 120 checks
- Patent AI benchmark: family-resolution 0/19 by design — disclosed

## Outreach Note (110 words)
We published a patent retrieval benchmark (19 cases, 120 offline checks) with unusual transparency: the failures are documented as metric and dataset issues, not hidden. Results:

- Overall: 99/120 checks pass
- Family-resolution: 0/19 — **metric bug disclosed**: bench wipes priority numbers then expects INPADOC-grade reunion
- Corpus overlap: two cases target same application (grant vs pub); engine correctly groups, bench counts as false merge
- Recall@k / Precision@k / Ground-truth rank: **BLOCKED** (needs live USPTO/EPO keys)

Adversarial spot checks: 4/4 pass (forced merges refused, shared-priority united, garbage handled). No imputed data — free-tier 429s excluded, Google Patents 503s resumed with backoff.

## Research Summary
- **Question**: How does patent family normalization perform on deterministic offline cases?
- **Method**: 19 patent-family cases, 120 checks, offline engine, no model
- **Key finding**: Normalization works; the family-resolution metric contradicts its own withheld data
- **Limitations**: Recall/precision need live keys (BLOCKED, not approximated); corpus has overlapping cases
- **Why it matters**: Most benchmarks hide metric flaws; this publishes the bug and the fix direction.

## Links
- Benchmark page: https://sallyip.com/benchmarks/patent-retrieval/
- Cross-bench report: https://sallyip.com/benchmarks/ (cross-bench-report.md §1, §5)
- Machine-readable: https://sallyip.com/benchmarks/latest.json (metrics: `retrieval-offline-pass`, `retrieval-tier-c-spot-checks`)

## Why You May Care
- Patent retrieval evaluation
- Metric design transparency
- Blocked vs approximated metrics
- Deterministic offline bench architecture