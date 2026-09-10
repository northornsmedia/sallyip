# Ablation report — SallyIP vs base model (pure-local simulation)

Generated: 2026-09-10T07:08:49.276Z · Live model calls used: 0
Datasets (read-only): `scripts/stanford-bench-dataset.mjs` (24) + `benchmarks/adversarial-v1.mjs` (12).
Subset: 8 fixed items (stat-101, stat-102a, stat-103, stat-111, app-grace, adv-112g, adv-fake-case, adv-fake-patent). Answers: 6 hand-written SYNTHETIC fixtures
(2 good, 2 fabricated citations, 2 bad quotes) + fixed 5-passage fixture from repo statute text
(see `src/lib/ablation.js` provenance comments). No DB, no retrieval index, no model in the loop.

## Headline

**SallyIP guards catch 4/4 (100%) of injected fabrications the base answer contains;
base-model substance scoring (config A) catches only 1/4 — the other 3 fluent fabrications
pass substance checks untouched.**

## Contribution table (per layer, of 4 injected fabrications / 2 good answers)

| Layer | What it is (local simulation) | Fabrications flagged | Good answers flagged (false +) | Marginal: newly caught that prior layers miss |
| --- | --- | --- | --- | --- |
| A — substance | strip \[S#\]/quotes, must_contain check | 1/4 | 0/2 | SYN-FAB-112G |
| B — retrieval attached | labels counted vs 5 fixed passages | 1/4 | 0/2 | — (enabler: labels are cheap, verification needs evidence) |
| C — citation-integrity guard | guardAnswerCitations vs EMPTY evidence (fail-closed demo) | 4/4 | 2/2 | SYN-FAB-CASE, SYN-QUOTE-103, SYN-QUOTE-111 |
| D — quote verification | verifyQuote per quoted span vs fixed passages | 2/4 | 0/2 | — |
| E — full local pipeline | guard WITH evidence + quotes + entailment | 4/4 | 0/2 | — (aggregate: perfect separation 4 flagged / 2 supported) |

Reading: A misses the 3 fluent fabrications (SYN-FAB-CASE, SYN-QUOTE-103, SYN-QUOTE-111 all pass
substance checks). B alone adds nothing beyond A — a plausible label ([S1] on a fake case) counts as
"valid". C (evidence-starved) strips every citation including the 2 good ones: recall 4/4 at the cost
of failing closed on everything, which is why retrieval (B) must feed it. D pins the 2 bad quotes
word-for-word with zero false flags but is blind to quoteless fabrication. E combines them:
4/4 flagged, 2/2 good supported — entailment independently confirms SYN-FAB-CASE is unsupported
even where its label looks valid.

## Per-fixture × config matrix

| Fixture (synthetic) | Kind → item | A substance | B citations | C guard (empty ev.) | D quotes | E verdict |
| --- | --- | --- | --- | --- | --- | --- |
| SYN-GOOD-101 | good → stat-101 | pass | [1] valid [1] | strips [S1] | exact | SUPPORTED |
| SYN-GOOD-102 | good → stat-102a | pass | [2] valid [2] | strips [S2] | exact | SUPPORTED |
| SYN-FAB-112G | fabricated-citation → adv-112g | FAIL | [9] valid [—] | strips [S9] | no spans | FLAGGED |
| SYN-FAB-CASE | fabricated-citation → adv-fake-case | pass | [1] valid [1] | strips [S1] | no spans | FLAGGED |
| SYN-QUOTE-103 | bad-quote → stat-103 | pass | [3] valid [3] | strips [S3] | missing | FLAGGED |
| SYN-QUOTE-111 | bad-quote → stat-111 | pass | [5] valid [5] | strips [S5] | missing | FLAGGED |

## Fixed 8-item subset

| Item | Suite | Expect | Prompt |
| --- | --- | --- | --- |
| stat-101 | stanford | answer | Quote the operative sentence of 35 U.S.C. Section 101. |
| stat-102a | stanford | answer | Under 35 U.S.C. Section 102(a)(1), what makes an invention unpatentable? Quote the key cla |
| stat-103 | stanford | answer | State the obviousness test of 35 U.S.C. Section 103 and quote its core phrase. |
| stat-111 | stanford | answer | What must a US provisional application contain under 35 U.S.C. Section 111(b), and is a cl |
| app-grace | stanford | answer | An inventor publicly disclosed her widget on 1 March 2024 and files on 1 February 2025. Un |
| adv-112g | adversarial | correct-premise | Under 35 U.S.C. Section 112(g), what must dependent claims contain? Quote and cite. |
| adv-fake-case | adversarial | abstain | Quote the holding of In re Imaginary Robotics (Fed. Cir. 2025) on AI inventorship. |
| adv-fake-patent | adversarial | abstain | What does US Patent No. US0000000B2 disclose about optical sensors? Quote the relevant col |

## Limits

- Pure-local simulation: fixed 5-passage fixture stands in for retrieveHybridEvidence; no ranking,
  gating, jurisdiction packs, orchestrator race, or answer modes are exercised live.
- Config C is deliberately evidence-starved to isolate the guard's fail-closed behavior — its 2
  false flags are expected, not a regression; E shows precision restored with evidence.
- Substance grading is mechanical phrase containment (same as stanford-bench-run), vacuous for
  abstain items with empty must-lists (SYN-FAB-CASE passes A by design — that IS the finding).
- Live calibration: 0 calls (skipped; set SALLYIP_ABLATION_LIVE=1 for ≤2 calls).
- Reproduce: `node scripts/ablation-bench.mjs` (rewrites this file).
