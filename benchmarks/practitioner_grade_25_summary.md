# Practitioner Grading Package — SallyIP 25-Question Set (Summary)

**Status:** TODO pending human grading — do not treat any headline metric as final.
**Questions graded:** 0/25 (until returned by human practitioner)
**Date generated:** 2026-09-10
**Question set (frozen):** `benchmarks/practitioner_set_25.md` (exact copy of `eval_scorecard_sample_25.md`, hash-verified; wording frozen)
**Answers CSV:** `benchmarks/practitioner_grade_25.csv` (25 rows; one Sally answer per question)
**Evaluated model:** `gemini-flash-lite-latest` (from `SALLYIP_PRIMARY_MODEL` at run time)
**Method:** direct single-engine calls — `POST ${SALLYIP_PRIMARY_BASE_URL}/chat/completions`, `temperature: 0`, `max_tokens: 800`, `node --env-file=.env.local`; no retrieval (per task: evidence retrieval only if cheap). System prompt demanded `[S#]`-free plain answers plus exact verbatim quotes with formal source in parentheses for grader citation checking.
**Quota state at end:** 8 live model calls made; HTTP 429 hit on 8th call → model use stopped immediately per instruction. Answers generated: 7. UNANSWERED: 18 (1× `UNANSWERED (HTTP 429)` + 17× `UNANSWERED (quota stopped after HTTP 429)`). No further model calls were made after the 429.

## Headline results (TODO — fill only after human grading)

- Mean legal_correctness (1–5): TODO
- Mean completeness (1–5): TODO
- Mean authority_quality (1–5): TODO
- Mean reasoning_quality (1–5): TODO
- Mean practical_usefulness (1–5): TODO
- Verdict counts — PASS: TODO / PARTIAL: TODO / FAIL: TODO (UNANSWERED rows excluded from means; count separately: 18 UNANSWERED pending rerun or exclusion per practitioner decision)
- Pass rate: TODO

## Counts

- Total questions: 25
- Answers generated: 7 (`s101-01`, `s101-05`, `s101-10`, `s102a-01`, `s102a-05`, `s102a-10`, `s102b-01`)
- UNANSWERED (quota): 18 (`s102b-05` through `mpep-2106-05`)
- CSV rows: 25 (all rows present; UNANSWERED rows have `sally_answer` set to the UNANSWERED marker and all grading columns blank)

## Files

- `benchmarks/practitioner_set_25.md` — frozen 25-question set (DO NOT edit wording)
- `benchmarks/practitioner_grade_25.csv` — per-row grading sheet (see schema below)
- `benchmarks/practitioner_grade_25_summary.md` — this file

## CSV schema (`practitioner_grade_25.csv`)

Columns: `test_id, question, sally_answer, expected_authority, supporting_citations, grader_score, grader_comments, error_category, legal_correctness, completeness, authority_quality, reasoning_quality, practical_usefulness, verdict`

- `test_id` — stable id from the set (e.g. `s101-01`)
- `question` — verbatim question text
- `sally_answer` — full Sally answer text, or `UNANSWERED (...)` marker
- `expected_authority` — expected authority from the set (e.g. `§ 101`), else `practitioner-judgment`
- `supporting_citations` — auto-extracted `[S#]` labels found (expected `none` — answers were elicited `[S#]`-free) plus double-quoted spans for quote verification; blank for UNANSWERED rows
- `grader_score`, `grader_comments`, `error_category` — blank, for practitioner
- `legal_correctness, completeness, authority_quality, reasoning_quality, practical_usefulness` — blank 1–5 scores, for practitioner
- `verdict` — blank; one of `PASS` / `PARTIAL` / `FAIL` (leave blank for UNANSWERED rows unless practitioner directs otherwise)

No grading has been performed by the generating agent. All grading columns are blank.

## Grading instructions (human practitioner only)

Grade each answered row independently. Leave UNANSWERED rows blank (do not score placeholders).

### 1–5 scale rubric (apply per dimension; integers only)

- **1 — Seriously deficient:** materially false, fabricated, or missing the core point; unusable.
- **2 — Poor:** major gaps or significant inaccuracy; core rule distorted or key element omitted.
- **3 — Adequate:** core rule correct; minor inaccuracies, omissions, or imprecision that do not reverse the outcome.
- **4 — Good:** accurate, complete, well-supported; only trivial or stylistic issues.
- **5 — Exemplary:** fully accurate, complete, precisely quoted/cited, clearly reasoned, directly usable in practice.

Dimensions:

- `legal_correctness` — is the stated rule of U.S. patent law substantively correct? No hallucinated standards.
- `completeness` — does it answer the whole question, including requested quotes?
- `authority_quality` — are quoted spans exact/verbatim and attributed to the correct formal source (statute/MPEP section)?
- `reasoning_quality` — is the explanation (where asked, e.g. `s102b-05`, `s103-10`) legally coherent?
- `practical_usefulness` — could a practitioner rely on this without rework?

### Verdict definitions (per row)

- **PASS** — substantively legally accurate: correct rule of law, exact quotes where given, no material misstatements. Minor style issues allowed.
- **PARTIAL** — core rule accurate but minor inaccuracy, omission, or imprecise/partial quote. Usable with correction.
- **FAIL** — incorrect legal rule, hallucinated standard, fabricated or materially altered quote, or invalid interpretation. Misleading if relied on.

### Error categories (optional, `error_category` column)

Use short codes where applicable: `wrong-rule`, `hallucinated-quote`, `altered-quote`, `wrong-citation`, `omission`, `overclaim`, `mpep-confusion`, `other`, or blank if none / UNANSWERED.

### Process

1. For each answered row, read `question` + `sally_answer`, check quotes against the cited statute/MPEP.
2. Enter five 1–5 scores, a `verdict` (`PASS`/`PARTIAL`/`FAIL`), and optional `grader_score`/`grader_comments`/`error_category`.
3. Leave all UNANSWERED rows blank (verdict blank).
4. Return the updated CSV; update `Questions graded: 0/25` above to `n/25` and fill headline slots.

**Note on UNANSWERED rows:** 18 rows are marked UNANSWERED due to the HTTP 429 quota stop, not model refusal. Exclude them from means or rerun them under a fresh quota as a separate batch; do not score the marker text itself.
