# Ground-truth sources

## Tier A (page-stated, independently documented)
- Google Patents public patent pages (`https://patents.google.com/patent/<PUB>/en`),
  which aggregate USPTO/EPO/WIPO office data: publication/application numbers,
  filing/publication/grant dates, inventors, assignees, DOCDB family tables
  ("Also published as"), backward citations (`DC.relation`), CPC classes.
  Each dataset case records its `source_url`.

## Tier B (aggregated with caveats)
- Google-computed fields the page itself flags as assumptions (e.g. priority
  date, legal-status estimates). Recorded with `ground_truth_confidence: 'B'`.
- EPO INPADOC family Sydney? Not used (no key). When EPO OPS credentials exist,
  family expectations graduate to Tier A against INPADOC.

## Tier C (engine-behaviour contracts)
- Synthetic adversarial inputs in the runner (not in `dataset.json`):
  same-number pub/grant collapse, unrelated-number separation, shared-priority
  merge, garbage-input safety.

## Deliberately excluded
- Examiner-cited references as exhaustive relevance truth (anchors only).
- Any number, date, or family link recalled from model memory rather than a
  fetched page. If it has no source URL, it is not ground truth.
