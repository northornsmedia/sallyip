# Document #011 — Patent Abstract Training Report

## Baseline and final state

- Baseline SHA: `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
- Final SHA: `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
  - No commit was created. The final state is the same HEAD plus the uncommitted Document #011 working-tree changes listed below.
- Working tree already contained extensive unrelated uncommitted work, including other document workflows. Document #011 changes were kept additive and narrow.

## Files added

- `data/documents/profiles/patent-abstract.json`
- `src/lib/patent-abstract-service.js`
- `src/lib/patent-abstract-interview-graph.js`
- `benchmarks/document-intelligence-v1/patent-abstract/cases.json`
- `tests/document-engine/patent-abstract-interview.test.mjs`
- `tests/document-engine/patent-abstract-benchmark.test.mjs`
- `docs/document-engine/training/011_PATENT_ABSTRACT_REPORT.md`

## Files modified

- `src/lib/document-engine.js`
  - Added narrow Patent Abstract routing patterns before generic patent-application matching.
  - Added a minimal EP-application guard so `EP patent abstract` does not route to the direct-EP workflow.
  - No utility/provisional/PCT/national-phase patterns were renamed.
- `src/lib/document-engine-router.js`
  - Added `patent-abstract` import and Document #011 branch.
  - Removed two unused imports for nonexistent `patent-specification` modules. Those imports broke ESM loading for every router-dependent document-engine test.
- `src/lib/design-patent-interview-graph.js`
  - Fixed one invalid regular expression: an unmatched `)` in `inferDesignType`.
  - This was a genuine unrelated blocker exposed while running router-dependent tests.
- `data/documents/capability-matrix.json`
  - Added `patent-abstract` as Document #011 at `L3_DRAFTABLE`.
  - Updated only the corresponding summary and capability-level counts.

## Canonical profile

- ID/slug: `patent-abstract`
- Name: `Patent Abstract`
- Category: `IP_INNOVATION`
- Subcategory: `PATENT`
- Family: `PATENT_ABSTRACT`
- Document number: `011`
- Status: `BETA`
- Risk level: `MEDIUM`
- Review required: `true`
- Verification required: `true`
- Jurisdiction: `MULTI_JURISDICTION`
- Jurisdiction classification: `CONTEXT_DEPENDENT`
- Profile schema check: `18/18` profiles had all required fields.
- Alias-collision check: `0` collisions involving `patent-abstract`.
- The profile explicitly states that the workflow is not a complete application, patentability opinion, filing package, or substitute for specification/claims.

## Routing aliases

Verified `11/11`:

- `draft a patent abstract`
- `write the abstract`
- `prepare the patent abstract`
- `shorten this invention into an abstract`
- `draft an abstract from the specification`
- `draft an abstract from the claims`
- `review my patent abstract`
- `rewrite this patent abstract`
- `make the abstract more concise`
- `prepare a PCT abstract`
- `prepare an EP patent abstract`

Verified non-stealing `5/5`:

- Full patent specification request is not sent to Patent Abstract.
- Patent-claims request is not sent to Patent Abstract.
- PCT-application request is not sent to Patent Abstract.
- Investor patent summary is not assumed to be a Patent Abstract.
- Section 101 abstract-idea inquiry is not sent to Patent Abstract.

## Abstract-versus-summary distinction

- `isGeneralBusinessSummaryRequest` treats investor/business/executive/marketing summaries as a different artifact.
- A business-summary request returns `CLARIFICATION_REQUIRED`, not a Patent Abstract draft.
- The formal abstract workflow is entered only for patent-abstract language or an explicit formal-abstract request.

## Workflow modes

Implemented `10/10`:

- `ABSTRACT_FROM_SPECIFICATION`
- `ABSTRACT_FROM_CLAIMS`
- `ABSTRACT_FROM_INVENTION_DISCLOSURE`
- `ABSTRACT_FROM_EXISTING_APPLICATION`
- `ABSTRACT_FROM_MATTER_CONTEXT`
- `ABSTRACT_REVIEW`
- `ABSTRACT_REWRITE`
- `ABSTRACT_SHORTENING`
- `ABSTRACT_CONSISTENCY_CHECK`
- `ABSTRACT_JURISDICTION_ADAPTATION`

Directly exercised `7/10` in tests/benchmarks:

- Specification-derived drafting.
- Claims-derived drafting.
- Matter-context drafting.
- Review.
- Rewrite.
- Shortening.
- Software/mechanical/AI branching and readiness.

Existing-application sourcing, consistency-check mode, and jurisdiction adaptation are implemented but only lightly covered; therefore workflow-mode verification is `PARTIAL`.

## Matter-context behaviour

- Matter facts are extracted before any question.
- Supported fields include title, problem, solution, components, effect, specification, claims, disclosure, existing application, existing abstract, and jurisdiction context.
- A complete matter proceeds directly to `PROMPT_DRAFT_CONFIRMATION`.
- The confirmation summarizes sources, core invention, components, supported effect, jurisdiction, limitations, and flags.
- No redundant title/inventor/applicant/jurisdiction questions are asked when those facts are already `KNOWN`.

## Conditional interview behaviour

- If source context is sufficient, the workflow goes to readiness review.
- If essential facts are missing, it follows:
  - inspect context;
  - identify missing essential fact;
  - ask one question;
  - wait;
  - validate;
  - save;
  - recheck readiness.
- Unknown is stored as `UNKNOWN` with a placeholder rather than invented.

## One-question behaviour

- Router and interview-graph responses contain exactly one question object.
- Cold abstract requests begin with the core technical-problem question.
- Turn-taking was verified through problem, solution, components, title, and readiness confirmation.
- No questionnaire dump occurs.

## Source-priority logic

Preferred source order:

1. Current approved specification.
2. Current approved claims.
3. Verified matter technical facts.
4. Invention disclosure.
5. User-provided direct instructions.

A stale abstract is not preferred over a newer specification or claim set. Source drift sets `ABSTRACT_REVIEW_REQUIRED`.

## Source-version tracking

Tracked for specification, claims, disclosure, and application:

- source ID;
- source version;
- deterministic content hash;
- abstract version;
- timestamp;
- creator;
- workflow mode;
- jurisdiction;
- source snapshot.

Each new abstract is appended immutably as `v1`, `v2`, and so on.

## Jurisdiction handling

- Jurisdiction context supports `US`, `PCT`, `EP`, national-phase-specific, other, and undecided values.
- PCT/EP/US signals in the request populate context without inventing filing rules.
- No jurisdiction-specific word limit, formatting rule, or compliance claim is applied unless an explicitly verified rule source, version, and numeric target are supplied.
- Unverified targets remain `RULE_UNVERIFIED`.

## Core technical content model

The abstract captures only supported content for:

- technical field/context;
- technical problem/purpose;
- core solution;
- principal components/steps;
- principal relationships;
- supported technical result where available.

Secondary embodiments and optional variants are excluded from the core abstract unless they are essential and supported.

## Essential/optional feature handling

- Optional language is detected at the source-sentence level.
- An abstract that states an optional feature as mandatory raises `ABSTRACT_OPTIONAL_FEATURE_AS_MANDATORY`.
- Optional detail is preferentially removed during shortening.

## Claim consistency

- Existing `verifyClaimSupport112` and `buildClaimSupportMap` are reused.
- Unsupported claim limitations and antecedent/support problems raise `ABSTRACT_CLAIM_CONFLICT`.
- The abstract is readable prose; it does not merely paraphrase Claim 1.

## Specification consistency

- Abstract sentences are mapped to specification, claims, disclosure, and application sources.
- Unsupported substantive sentences raise specification/claim conflicts.
- Unsupported technical terms are removed from the regenerated abstract while retaining `ABSTRACT_NEW_MATTER_DETECTED`.

## Terminology checks

- Specification and claim terminology is compared against abstract terminology.
- A controlled-component mismatch, including controller/processor substitution without established equivalence, raises `TERM_CONFLICT`.
- Title-abstract inconsistency raises `TITLE_ABSTRACT_CONSISTENCY_REVIEW_REQUIRED`.
- Ambiguous terms are flagged rather than silently merged.

## Technical-effect safety

Effect classifications:

- `SOURCE_SUPPORTED`
- `USER_ASSERTED`
- `INFERRED_REVIEW_REQUIRED`
- `UNSUPPORTED`
- `UNKNOWN`

Only `SOURCE_SUPPORTED` effects are included in generated abstracts. Vague claims such as “works better” do not produce percentages, latency reductions, accuracy improvements, or other quantitative benefits.

## Broadening checks

- Generic abstract language such as “any sensor” is compared against narrower source language such as “optical sensor.”
- Unsupported broadening raises `ABSTRACT_UNSUPPORTED_BROADENING`.

## Over-narrowing checks

- Absolute language such as `only`, `must`, `always`, `exclusively`, or `requires` is compared against source alternatives.
- Unsupported narrowing raises `ABSTRACT_OVER_NARROWING_REVIEW_REQUIRED`.

## Marketing-language filtering

Removed promotional wording includes:

- revolutionary;
- groundbreaking;
- best-in-class;
- industry-leading;
- dramatically superior;
- unprecedented;
- and comparable laudatory terms.

## Legal-conclusion filtering

Removed or blocked abstract language includes:

- novelty assertions;
- non-obviousness assertions;
- patentability assertions;
- Section 101 compliance assertions;
- invalidity conclusions.

## Formal-rule handling

- No USPTO, PCT, EPO, word-limit, formatting, statutory, deadline, or case-law rule is hardcoded.
- A numeric target is honored only when explicitly supplied as a verified limit.
- Otherwise the workflow records counts without claiming compliance.

## Word-count engine

Deterministic policy:

- normalize zero-width characters and whitespace;
- remove Markdown markers without changing visible words;
- count whitespace-separated tokens;
- retain hyphenated compounds and numeric ranges as single tokens.

The word-count record stores text, count, target, jurisdiction, rule source, rule version, and verification status.

## Concision engine

Shortening:

- removes marketing/legal/unsupported material first;
- removes optional, exemplary, alternative, and low-support detail next;
- preserves core concept, principal relationships, principal operation, and supported effects;
- never deletes all core sentences merely to reach a length target.

## Proposition support map

Each abstract sentence records:

- sentence text;
- sentence index;
- propositions;
- supporting sources;
- source locations;
- provenance;
- support status.

Claim-level support reuses SallyIP’s existing claim-support machinery.

## Sentence-level validation

Each substantive sentence is checked for:

- source support;
- terminology consistency;
- claim consistency;
- specification consistency;
- new matter;
- unsupported quantitative assertions;
- unsupported legal conclusions.

Unsupported substantive additions fail closed.

## New-matter detection

- Unsupported technical terms and sentences raise `ABSTRACT_NEW_MATTER_DETECTED`.
- Removed new matter is recorded as `ABSTRACT_NEW_MATTER_REMOVED`.
- Unsupported terms are not silently retained.

## Cross-document change impact

- Specification, claim, disclosure, and application snapshots are compared across turns.
- Changed IDs, versions, or content hashes raise `ABSTRACT_REVIEW_REQUIRED`.
- A changed claim set does not automatically rewrite a user-approved abstract.

## Versioning

- Versions are immutable.
- Each version records text, hash, count, mode, jurisdiction, sources, creator, timestamp, and status.
- Rewrite and shortening flows were verified to produce recoverable `v1`, `v2`, and `v3` records.

## Locking

Supported states:

- `UNLOCKED`
- `USER_LOCKED`
- `REVIEW_LOCKED`

A locked abstract is preserved without silent overwriting. Source drift still raises a consistency-review flag.

## Verification

- Technical, source, drafting, formal-rule, legal, and authority assertions remain separated.
- No formal/legal rule, filing requirement, deadline, statute, or authority is fabricated.
- Existing verification-first services are reused for claim support and confidentiality.

## Confidentiality

- Patent-abstract drafts carry `CONFIDENTIAL_IP` execution context.
- Unpublished invention content is marked `CONFIDENTIAL_MATTER_UNPUBLISHED`.
- Free/unapproved providers fail closed with `CONFIDENTIAL_PROVIDER_UNAVAILABLE`.
- No silent free-model fallback is permitted.

## Voice

- Abstract sessions preserve draft-session, matter, document, abstract, question-state, source-version, draft-state, and review-flag continuity.
- No separate voice abstract workflow was created.
- Limitation: `src/voice/VoiceSessionController.js:517` and `:649` still use hardcoded `PUBLIC_RESEARCH` for chat and TTS requests. Confidential abstract audio therefore requires explicit confidential-mode threading before production voice use.

## Tests added

- `tests/document-engine/patent-abstract-interview.test.mjs`
  - `11/11` tests pass.
- `tests/document-engine/patent-abstract-benchmark.test.mjs`
  - `1/1` test passes.
  - `22/22` benchmark cases pass.

Exact new-test denominator: `12/12`.

Benchmark coverage `22/22`:

- Software, mechanical, and AI branching.
- Existing matter.
- Source versions.
- Insufficient context.
- Investor-summary distinction.
- Specification-derived drafting.
- Claims-only drafting.
- Optional features.
- Unsupported broadening.
- Over-narrowing.
- Unsupported effects.
- Marketing language.
- Legal conclusions.
- Terminology conflict.
- New matter.
- Claim-change staleness.
- Deterministic word count.
- Shortening.
- Versioning.
- Locking.

## Exact denominators

- New Patent Abstract tests: `12/12`.
- Patent Abstract benchmark cases: `22/22`.
- Routing-alias checks: `11/11`.
- Routing non-steal checks: `5/5`.
- Profile schema fields: all required fields present.
- Profile alias collisions: `0`.
- Provider-confidentiality plus abstract security: `19/19`.
- Verification suite: `28/28`.
- Document-engine suite: `233/235`.
  - The two failures are unrelated to Patent Abstract:
    - one utility-routing expectation for `draft my patent`;
    - one patent-drawings readiness expectation.
- Production build: passed.

## Build result

- `npm run build`: passed.
- Vite production build completed successfully.

## Known limitations

- Jurisdiction adaptation is context-aware but intentionally does not assert unverified jurisdiction-specific abstract rules.
- Collaborative editing reuses locks, versions, sessions, and existing export infrastructure; no separate abstract editor was built.
- Export support was not given an abstract-specific export test.
- Voice continuity is implemented at the shared session-ID level, but confidential voice/audio routing still needs explicit production threading.
- The broader document-engine suite remains `233/235` because of two unrelated failures from parallel work.

## Parallel-work conflicts

- Other agents appear to be changing shared document-engine files concurrently.
- Found and fixed two genuine blockers without redesigning unrelated workflows:
  - removed unused imports for nonexistent patent-specification modules;
  - fixed an invalid design-patent regex.
- The EP routing guard is minimal and only prevents `EP patent abstract` from being consumed by direct-EP matching.
- Capability-matrix changes are additive, but concurrent capability entries from other agents may still create merge conflicts.

## Final statuses

- PATENT_ABSTRACT_PROFILE_COMPLETE = TRUE
- PATENT_ABSTRACT_ROUTING_VERIFIED = TRUE
- PATENT_ABSTRACT_SUMMARY_DISTINCTION_VERIFIED = TRUE
- PATENT_ABSTRACT_WORKFLOW_MODES_VERIFIED = PARTIAL
- PATENT_ABSTRACT_MATTER_CONTEXT_VERIFIED = TRUE
- PATENT_ABSTRACT_CONDITIONAL_INTERVIEW_VERIFIED = TRUE
- PATENT_ABSTRACT_ONE_QUESTION_MODE_VERIFIED = TRUE
- PATENT_ABSTRACT_SOURCE_VERSIONING_VERIFIED = TRUE
- PATENT_ABSTRACT_JURISDICTION_CONTEXT_VERIFIED = PARTIAL
- PATENT_ABSTRACT_CORE_CONTENT_VERIFIED = TRUE
- PATENT_ABSTRACT_CLAIM_CONSISTENCY_VERIFIED = TRUE
- PATENT_ABSTRACT_SPEC_CONSISTENCY_VERIFIED = TRUE
- PATENT_ABSTRACT_TERMINOLOGY_VERIFIED = TRUE
- PATENT_ABSTRACT_TECHNICAL_EFFECT_SAFETY_VERIFIED = TRUE
- PATENT_ABSTRACT_BREADTH_CONTROL_VERIFIED = TRUE
- PATENT_ABSTRACT_MARKETING_FILTER_VERIFIED = TRUE
- PATENT_ABSTRACT_LEGAL_CONCLUSION_FILTER_VERIFIED = TRUE
- PATENT_ABSTRACT_WORD_COUNT_VERIFIED = TRUE
- PATENT_ABSTRACT_SUPPORT_MAP_VERIFIED = TRUE
- PATENT_ABSTRACT_NEW_MATTER_GATE_VERIFIED = TRUE
- PATENT_ABSTRACT_CHANGE_IMPACT_VERIFIED = TRUE
- PATENT_ABSTRACT_VERSIONING_VERIFIED = TRUE
- PATENT_ABSTRACT_LOCKING_VERIFIED = TRUE
- PATENT_ABSTRACT_DRAFTING_VERIFIED = TRUE
- PATENT_ABSTRACT_EDIT_PRESERVATION_VERIFIED = PARTIAL
- PATENT_ABSTRACT_EXPORT_VERIFIED = PARTIAL
- PATENT_ABSTRACT_VOICE_VERIFIED = PARTIAL
- PATENT_ABSTRACT_SECURITY_VERIFIED = TRUE
- PATENT_ABSTRACT_L3_DRAFTABLE = TRUE
- PATENT_ABSTRACT_L4_VALIDATED = FALSE
- PATENT_ABSTRACT_L5_PRACTITIONER_REVIEWED = FALSE
