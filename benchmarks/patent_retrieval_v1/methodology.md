# Patent Retrieval Benchmark v1 — Methodology

## What it measures
Sally's canonical patent-intelligence layer, not live discovery: publication-number
parsing, date/biblio preservation through normalisation, family grouping,
duplicate collapse, false-merge resistance, and adversarial engine behaviour.

## What it does NOT measure (gated, needs provider keys)
Recall@k, precision@k, ground-truth rank. These require live USPTO/EPO searches.
They are declared in every report as `gated_pending_keys`, never silently skipped.

## Ground truth
`dataset.json`: cases harvested from Google Patents public pages (aggregated
official office data). Every case links its source URL. Confidence tiers:
- **Tier A**: field stated directly on the source page (biblio, dates, family table).
- **Tier B**: aggregated/inferred fields (e.g. priority assumptions Google flags).
- **Tier C**: adversarial engine-behaviour contracts (synthetic inputs, explicit expectations).

Only Tier A/B cases count toward headline claims.

## Rules
- `dataset.json` is append-only once frozen items exist; never edit a frozen case
  to make the engine pass. Corrections go in as NEW revisions with a note.
- Examiners' cited references are anchors, not exhaustive truth.
- Adversarial cases must never merge unrelated records; same-application
  pub/grant pairs must collapse.
- Re-run after every normalisation-engine change; regressions block release.
