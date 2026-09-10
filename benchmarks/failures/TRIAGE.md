# Failure-corpus triage — benchmarks/failures/*.json + v1.0 failures_27

Date: 2026-09-10. No datasets or expected answers were edited. No live model
calls were made (pure code + `node --test`). All verdicts below are proven by
unit tests against the EXACT stored strings (loaded verbatim from disk in
`tests/quote-grader-triage.test.mjs`) with synthetic evidence stand-ins; where
the real pack wording is unknown the assumption is stated per row.

## Root causes found (all in grader/extractor strictness, not in product guard)

The product guard (`finalizeVerifiedAnswer`) was already fail-closed on all 24
v1.0 cases (proven by `tests/permanent-failures-regression.test.mjs`): every
unverified quotation loses its marks. What failed was the *graders*:

1. **Length-in-pattern pairing bug** — harvesters used `/"([^"]{18,400})"/g`.
   A short real quote (`"manufacture"`, `"never § 111(a)"`, `"best mode"`) fails
   the `{18,}` minimum, so the engine re-opens at its *closing* mark and pairs
   it with the next opening mark, manufacturing garbage spans such as
   `" [S1]. … Regarding … have "` that were never claimed verbatim
   (s101-08, s111-09, s112a-04, s112a-08, s112b-06). Fixed by
   extract-then-filter (`auditAnswerQuotes`, `src/lib/verification-service.js:327`).
2. **No prompt-echo exemption** (grounding harvester + 5D framework; stanford
   runner already had one) — user wording repeated by the model
   (`"further limitation"`, `"certain methods of organizing human activity"`)
   was demanded verbatim from sources. Fixed by `isPromptEcho`
   (`src/lib/verification-service.js:238`), shared by all four graders.
3. **No grounded-denial exemption** — `Section 101 does not mention "X"`: the
   quoted span is the thing being *denied*, not evidence furnished
   (adv-ai-quote x2). Fixed by `NON_EVIDENTIARY_SENTENCE`
   (`src/lib/verification-service.js:234`). Verb-scoped so assertive sentences
   (`does not satisfy Step 2B`) stay checkable.
4. **Convention-blind matching** — `[W]hoever`/`[P]atentability`/`[i]ntegration`
   bracket alterations, trailing `[S1]` swept inside spans, and `...` ellipsis
   omissions all graded `missing`. Fixed by `cleanQuoteText`/`flipFirstLetter`
   (`src/lib/citation-service.js:13,20`), `verifyEllipsisQuote`
   (`src/lib/verification-service.js:282`). Every quoted word must still be
   verbatim in ONE source in order — thresholds not weakened.

## Fixes shipped

- `src/lib/citation-service.js:13,20,26` — shared `cleanQuoteText`,
  `flipFirstLetter`; `verifyQuote` recognises bracket/citation/markdown
  conventions (still strict otherwise; fixes s101-04/s101-07/s103-06/s103-10/
  mpep-2106-04 at the lowest level, unifies API + guard verdicts).
- `src/lib/verification-service.js:234-345` — `NON_EVIDENTIARY_SENTENCE`,
  `isPromptEcho`, `isGarbageSpan`, `sentencesWithOffsets`,
  `verifyEllipsisQuote`, `verifySpanAgainstSources`, `auditAnswerQuotes`.
- `src/lib/verification-service.js:550-601` — guard audit uses the shared
  verifier (ellipsis-accepted: all words verbatim); prompt-echo inside a denial
  is recorded `skipped`, never `missing` (requires BOTH conditions, so no
  laundering path; denials alone stay strictly audited).
- Graders unified on the helper (thresholds/caps/telemetry shapes preserved):
  `scripts/stanford-bench-run.mjs:65`, `scripts/grounding-benchmark-100.mjs:206`,
  `scripts/measure-grounding.mjs:61`, `src/lib/benchmark-eval-framework.js:181`.
- `src/lib/chat-orchestrator.js:57,95` — user prompt passed to the guard.
- Tests: `tests/quote-grader-triage.test.mjs` (30 tests, one per failure
  pattern + completeness gate), `tests/citation-service.test.mjs` (+3).

## Per-failure disposition

Category: **A** = grader-artifact (fixed) · **G** = genuine model weakness
(guard fails closed, no threshold change).

| stored failure | category | disposition | test covering it |
|---|---|---|---|
| adv-ai-quote ×2 runs (`0ec0bd51`, `f916efe7`) | A (echo + denial) | fixed — grades `accurate` | quote-grader-triage: adv-ai-quote ×2 + guard denial test |
| adv-contradict (`126f1b79`) | A (ellipsis) | fixed — grades `accurate` given verbatim-supporting source; real-§111 wording caveat → open limitation L1 | quote-grader-triage: adv-contradict |
| s101-04 `[W]hoever` | A (bracket) | fixed — exact | quote-grader-triage: s101-04; citation-service bracket test |
| s101-07 `[S1]` inside span | A (citation-in-span) | fixed — exact | quote-grader-triage: s101-07; citation-service cleaning test |
| s101-08 bridge artifact | A (pairing bug) | fixed — artifact gone, real quote exact | quote-grader-triage: s101-08 |
| s102b-05 ellipsis | A (ellipsis) | fixed — exact via segments; full-statute wording caveat → L1 | quote-grader-triage: s102b-05 |
| s102b-07 long ellipsis | A (ellipsis) | fixed — exact via segments; full-statute caveat → L1 | quote-grader-triage: s102b-07 |
| s103-06 `[P]…` | A (bracket) | fixed — exact | quote-grader-triage: s103-06 |
| s103-10 `[p]…` | A (bracket) | fixed — exact | quote-grader-triage: s103-10 |
| s111-09 bridge artifact | A (pairing bug) | fixed — real quotes exact | quote-grader-triage: s111-09 |
| s112a-04 bridge + gloss | A+G | artifact gone by construction; gloss span stays `missing`, guard de-quotes (fail closed) | quote-grader-triage: s112a-04 |
| s112a-08 bridge artifact | A (pairing bug) | fixed — real quote exact | quote-grader-triage: s112a-08 |
| s112a-09 abstention fragments | A (pairing + denial) | fixed — zero missing | quote-grader-triage: s112a-09 |
| s112b-06 bridge artifact | A (pairing bug) | fixed — real quote exact | quote-grader-triage: s112b-06 |
| s112d-02 `further limitation.` | A (echo + denial) | fixed — skipped | quote-grader-triage loop |
| s112d-04 `§ 112(d)` | A (echo + denial) | fixed — skipped | quote-grader-triage loop |
| mpep-2106-01 bridge artifact | A (pairing bug) | fixed — real quote exact | quote-grader-triage: mpep-2106-01 |
| mpep-2106-04 `[i]…` | A (bracket) | fixed — exact | quote-grader-triage: mpep-2106-04 |
| mpep-2106-06 denial bridge | A (pairing + denial) | fixed — real quote exact | quote-grader-triage: mpep-2106-06 |
| mpep-2106-07 | A (echo + denial) | fixed — skipped | quote-grader-triage loop |
| mpep-2106-09 span 1 (denied phrase) | A (echo + denial) | fixed — skipped | quote-grader-triage: mpep-2106-09 |
| mpep-2106-09 span 2 (`…(Enfish, McRO, Diehr)`) | G (appended gloss in quotes) | guard de-quotes, `missing` preserved (fail closed) | quote-grader-triage: mpep-2106-09 |
| mpep-2106-10 ×2 | A (echo + denial) | fixed — skipped | quote-grader-triage loop |
| mpep-2106b-02 bridge artifact | A (pairing + denial) | fixed — real quote exact | quote-grader-triage: mpep-2106b-02 |
| mpep-2106b-03 prompt phrase | A (echo) | fixed — skipped in grader; strict-audit guard still de-quotes if unsupported | quote-grader-triage: mpep-2106b-03 ×2 |
| mpep-2106b-04 | A (echo + denial) | fixed — skipped | quote-grader-triage loop |
| mpep-2106b-06 | A (echo + denial) | fixed — skipped | quote-grader-triage loop |

Counts: **27 instances triaged — 25 grader-artifact (all fixed), 2 genuine
(s112a-04 gloss, mpep-2106-09 span 2; both fail closed with tests).**
No failure was closed by weakening a threshold: every evidentiary span still
requires verbatim support; skips apply only to prompt echoes, denied mentions,
and structural cross-span garbage.

## Known limitations left open (published, not fixed)

- **L1 — ellipsis vs full statutory text.** Tests synthesize pack passages
  containing both ellipsis segments verbatim. Against the *full* statute,
  `s102b-05/07` compressions (`had already been` vs `had, before such
  disclosure, been`) and adv-contradict's `if not converted` gloss may be
  paraphrase: the guard then still de-quotes (fail closed, tested). Confirming
  needs the live pack + practitioner review.
- **L2 — guard over-blocks uncited grounded denials.** `finalizeVerifiedAnswer`
  still Category-E-blocks an uncited denial sentence (e.g. adv-ai-quote's
  `Section 101 does not mention…`) while keeping its verified blockquote.
  Conservative (fail closed); relaxing it is a policy change, out of scope.
- **L3 — short-quote exemptions by design.** Bench spans <18 chars and guard
  spans <8 chars are never verification-checked (scare-quote noise control).
  A short fabricated quote rides on citation + proposition entailment checks.
- **L4 — no live re-run.** Bench scripts need DB + model quota; graders were
  proven via pure replication of `grade()` on stored excerpts, not a live run.
