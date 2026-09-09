# SallyIP verification-first architecture audit

Date: 2026-09-09

## Executive finding

SallyIP already had useful evidence primitives, hybrid retrieval, authority metadata, quote checking, proposition records, specialist workflows, and a frozen v1.0 benchmark. The critical enforcement gap was at final chat delivery: the application warned about weak evidence but could still display unsupported legal text, dangling source labels, and unverified generated quotations. P0 therefore adds a deterministic, fail-closed finalizer and a relevance/metadata gate without replacing the existing workflows.

## Existing controls

| Control | Before P0 | Audit finding |
| --- | --- | --- |
| Hybrid retrieval | Present | Lexical, vector, pack lookup and reciprocal-rank fusion existed. |
| Canonical aliases | Partial | Core US patent sections and concepts existed. |
| Authority tiers/jurisdiction metadata | Present | Stored and used for ordering, but not sufficient by itself to prove relevance. |
| Zero-result retrieval | Partial | Supported by functions, but prompts permitted model-knowledge answers. |
| Citation existence | Partial | Dangling labels were detected but remained visible with only a warning. |
| Exact quote verification | Partial | Available in the citation ledger and benchmark, not enforced on normal answers. |
| Proposition/evidence graph | Present for verification-desk workflows | Not automatically populated for every chat proposition. |
| Entailment validation | Evaluation only | NLI/heuristic scoring exists in the benchmark; no independent production pass. |
| Legal validation | Workflow-specific | Patent workflows contain domain checks; generic chat has no independent legal reviewer. |
| Contradiction detection | Metadata only | `contrary_authority_checked` was always false in generic chat. |
| Temporal/version validation | Partial | Dates/status fields exist; currentness is not uniformly enforced during retrieval. |
| Frozen benchmark v1.0 | Present | Dataset, golden run, manifest, scorecard, and quote-failure corpus exist. |
| Release gate | Missing | Metrics were reported, not used to prevent deployment. |
| Adversarial suite | Missing | Added as deterministic P0 regression tests. |

## Implementation plan

### P0 — hallucination-critical

- Enforce complete, current-answer source records before source labels can be treated as valid.
- Reject irrelevant and duplicate retrieval results; permit zero results.
- Fail closed for high-risk legal conclusions when Tier 1/2 evidence is absent.
- Remove dangling citation labels and explicitly mark the proposition unverified.
- Verify every generated quotation against retrieved text; preserve quotation marks only for exact matches.
- Return evidence-derived answer modes (`QUALIFIED_ANSWER` or `RESEARCH_REQUIRED`).
- Add adversarial false-premise regression tests.

Status: implemented in this change, subject to benchmark release gates.

### P1 — reliability improvement

- Add source-type and effective-date filters to every retrieval path.
- Add calibrated reranking and source-quality weighting after relevance filtering.
- Persist the final answer's atomic proposition/evidence map and expose it in the Verify panel.
- Detect and surface contradictory passages before generation.
- Normalize authority tiers to the four-tier policy across all stored source types.

### P2 — advanced verification

- Run an independent entailment model/pass on each proposition/citation pair.
- Run an independent jurisdiction/version/procedural-context legal validator.
- Add patent-specific §101/102/103/112 validators to generic chat, reusing workflow services.
- Add exact limitation-to-passage maps for prior art, FTO, invalidity, and prosecution outputs.
- Add blinded practitioner grading and inter-rater agreement reporting.

### P3 — benchmark/evaluation infrastructure

- Preserve v1.0 and convert each historical failure to one stable file under `benchmarks/failures/`.
- Add full adversarial, development, frozen regression, and inaccessible hidden-holdout partitions.
- Add base-model versus complete-pipeline and component-ablation runners.
- Record model/prompt/retrieval/database/build versions and decoding settings for every run.
- Add a CI/deployment release gate for all target metrics and any returning critical failure.

## P0 behavior contract

The finalizer accepts only evidence objects with a source ID, passage ID, title, jurisdiction, numeric authority tier, and non-empty source text. High-risk answers with no complete Tier 1/2 evidence return: “I could not verify this proposition from the available authorities.” Fuzzy matching is diagnostic only; text that is not an exact source substring is not shown as a quotation.

## Known limitations after P0

P0 does not claim substantive legal correctness. It does not yet provide production-grade proposition extraction, independent NLI/legal review, contradiction resolution, or universal date/version checking. The existing benchmark's grounding and unsupported-proposition heuristics are proxies and must remain separate from practitioner legal grading.
