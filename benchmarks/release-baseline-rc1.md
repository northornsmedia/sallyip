# Release baseline — sallyip-validation-rc1 (ATTEMPTED, NOT TAGGED)

> Status: **TAG NOT CREATED** — working tree dirty (concurrent session active).
> Suite + build pass, but baseline is NOT clean, so no tag was created per
> objective ("clean, tagged release baseline").

## Git

- HEAD commit: `0279cc141726df9520624e6ba834a2bbb842070f`
- HEAD subject: `docs: external validation wave final report`
- Proposed tag: `sallyip-validation-rc1`
- Tag created: **NO** — blocker: dirty working tree (see below). Tagging HEAD
  while uncommitted SEO/marketing work is in flight would misrepresent the
  baseline as clean.
- `git log --oneline -5` at check time:
  - `0279cc1 docs: external validation wave final report`
  - `a4258c1 feat: external validation wave (ABIGAIL/IPBench subsets, contract corpus, ablation-25, scoreboard, Vals readiness)`
  - `d4c2870 feat: 5-agent benchmark wave (LegalBench probe, leaderboard survey, cross-bench report, failure triage, ablation harness)`
  - `cf6af63 feat: 5-agent bundle (IN/GB packs fed, 19-case harvest, India journal adapter, suite green)`
  - `d6f50e2 feat: SEO/GEO foundation (meta, OG, JSON-LD, sitemap, robots, llms.txt, compare page, listings kit)`

## History note (NOT rewritten)

Git history was **NOT** rewritten for this baseline. No filter-branch,
rebase, amend, or cherry-pick surgery was performed (active collaborator).
Unrelated tracks share history; per-release file manifest is recorded
instead via `git show --stat HEAD` (embedded below).

```text
commit 0279cc141726df9520624e6ba834a2bbb842070f
Author: aman <amanatnorthorn@gmail.com>
Date:   Thu Sep 10 12:57:57 2026 +0530

    docs: external validation wave final report

 benchmarks/external-validation-wave.md | 55 ++++++++++++++++++++++++++++++++++
 1 file changed, 55 insertions(+)
```

## Working-tree dirt (catalogued, LEFT UNTOUCHED)

`git status --short` at check time showed 11 modified + ~37 untracked paths.
Nothing was staged, stashed, committed, or cleaned.

Modified (unstaged, `git diff --stat`):

```text
 index.html                                         |   2 +-
 package.json                                       |   3 +
 .../harvey-cocounsel-genie-alternatives/index.html |   3 +-
 public/sitemap.xml                                 | 192 +++++++++++++++++++++
 scripts/seo-data.mjs                               |  24 ++-
 seo/GEO_AI_VISIBILITY_PLAN.md                      |   3 +
 seo/IMPLEMENTATION_LOG.md                          |   5 +
 seo/SCHEMA_ENTITY_AUDIT.md                         |   6 +-
 seo/SEO_CONTENT_MAP.md                             |   4 +
 seo/SEO_MASTER_PLAN.md                             |   4 +-
 seo/SEO_TECHNICAL_AUDIT.md                         |   7 +
 11 files changed, 242 insertions(+), 11 deletions(-)
```

Untracked (`git ls-files --others --exclude-standard`), grouped:

- `public/benchmarks/index.html`, `public/benchmarks/verification-methodology/index.html`
- `public/compare/sallyip-vs-general-legal-ai/index.html`, `public/compare/sallyip-vs-patent-ai/index.html`
- `public/copyright/index.html`, `public/design-rights/index.html`
- `public/glossary/` (19 pages incl. index)
- `public/ip-ai/index.html`, `public/patents/index.html`, `public/resources/index.html`
- `public/trade-secrets/index.html`, `public/trademarks/index.html`
- `scripts/generate-public-pages.mjs`, `scripts/seo-pages-core.mjs`
- `scripts/seo-pages-glossary.mjs`, `scripts/seo-validate-public-pages.mjs`
- `scripts/verify-benchmark-data.mjs`
- `seo/WAVE2_REPORT.md`
- `src/marketing/enterprise.css`, `src/marketing/site.js`

Likely owner: the concurrent SEO/GEO session (all dirt is SEO sitemap,
crawlable public pages, marketing assets, `seo:` npm scripts, benchmark
cross-refs in `scripts/seo-data.mjs`). Content spot-check: `index.html`
adds SEO header/nav; `package.json` adds `seo:pages`, `seo:benchmarks`,
`seo:validate` scripts; `scripts/seo-data.mjs` adds `ablation-25` entry
and retargets run_refs to `benchmarks/external-scoreboard.md`.

## Toolchain

- `node --version`: `v24.18.0`
- `npm --version`: `12.0.1`
- Package: `sally-ip@1.0.0`

## package-lock integrity

`Get-FileHash package-lock.json`:

- Algorithm: `SHA256`
- Hash: `29492419171159BA9AB7BC4E5B4FE0E0C5D9EBC9EF8606C59EDA9407CF18B648`
- Path: `C:\Users\User\Sallyip\package-lock.json`

## Model configuration (names + non-secret values ONLY)

Secrets policy: values of any `*_KEY` / `*_SECRET` / `*_PASSWORD` are NEVER
recorded. Only the variable NAME is listed for secrets.

SALLYIP_* names referenced in code (`process.env.SALLYIP_*`):

- `SALLYIP_ABLATION_LIVE`
- `SALLYIP_ABLATION25_LIVE`
- `SALLYIP_DOTS_MODEL`
- `SALLYIP_EMBEDDING_MODEL`
- `SALLYIP_ENV`
- `SALLYIP_EXECUTION_MODE`
- `SALLYIP_PRIMARY_BASE_URL`
- `SALLYIP_PRIMARY_KEY` (SECRET — name only, value omitted)
- `SALLYIP_PRIMARY_MODEL`
- `SALLYIP_RERANK_MODEL`

Also referenced: `OPENROUTER_EMBEDDING_API_KEY` (SECRET — name only),
`GEMINI_API_KEY` (SECRET — name only).

Live environment values at check time (this shell had NO SALLYIP_* set):

- `SALLYIP_PRIMARY_MODEL=<unset>` (code default: `gemini-flash-lite-latest`)
- `SALLYIP_PRIMARY_BASE_URL=<unset>` (code default: `https://generativelanguage.googleapis.com/v1beta/openai`)
- `SALLYIP_EMBEDDING_MODEL=<unset>` (code default: `liquid/lfm-2.5-embedding-350m:free`)
- `SALLYIP_RERANK_MODEL=<unset>` (code default: `nvidia/llama-nemotron-rerank-vl-1b-v2:free`)
- `SALLYIP_DOTS_MODEL=<unset>` (code default: `meta-llama/llama-3.3-70b-instruct`)
- `SALLYIP_ABLATION_LIVE=<unset>`
- `SALLYIP_ABLATION25_LIVE=<unset>`

Recorded benchmark model slugs (from frozen manifests/reports, not env):

- v1.0 golden baseline: `gemini-flash-lite-latest`, run `f8dfe146-4400-49b9-a206-72c8607622d3`
- ablation-25: `none in loop (pure-local simulation, 0 live model calls)`

## Benchmark datasets present

`benchmarks/*/dataset*` matches:

- `benchmarks/patent_retrieval_v1/dataset.json` (42,508 bytes)
- `benchmarks/v1.0/dataset.json` (18,190 bytes; frozen v1.0 golden dataset)

Frozen manifests / companion frozen files:

- `benchmarks/v1.0/manifest.json` — `benchmarkVersion: v1.0`,
  `name: SallyIP Grounding Benchmark v1.0 (Golden Baseline)`,
  `runId: f8dfe146-4400-49b9-a206-72c8607622d3`,
  `frozenDate: 2026-09-09T12:18:12.643Z`, `totalQuestions: 100`,
  `model: gemini-flash-lite-latest`;
  files: `dataset.json`, `golden_run.json`, `scorecard_sample_25.md`,
  `failures_27_unverified_quotes.json`
- `benchmarks/v1.0/golden_run.json` (102,599 bytes)
- `benchmarks/v1.0/failures_27_unverified_quotes.json`
- `benchmarks/v1.0/scorecard_sample_25.md`
- `benchmarks/patent_retrieval_v1/` companions: `harvest-state.json`,
  `methodology.md`, `ground_truth_sources.md`, `run_report.md`,
  `failures/` subdir
- `benchmarks/external/abigail-subset.json` (46,868 bytes)
- `benchmarks/external/ipbench-subset.json` (21,215 bytes)
- `benchmarks/external/legalbench-probe.json` (13,287 bytes)
- `benchmarks/ablation-25.json` (15,630 bytes; SYNTHETIC ONLY per seo-data)
- `benchmarks/contract-failure-corpus.json` (19,970 bytes)
- `benchmarks/failures/` — `0ec0bd51-...json`, `126f1b79-...json`,
  `f916efe7-...json`, `TRIAGE.md`
- Script datasets: `benchmarks/hallucination-100.mjs`,
  `benchmarks/adversarial-v1.mjs`

## Validation results (on DIRTY tree — NOT a clean-baseline signal)

- Unit suite `node --test "tests/*.test.mjs"`: **PASS — 261 pass, 0 fail, 0 skipped** (`duration_ms ~1761`)
- `npm run build` (`vite build`): **PASS — `✓ built in 6.14s`, 2268 modules transformed**
- Caveat: both ran with the dirty SEO tree present, so results validate
  HEAD + uncommitted SEO changes combined, not HEAD alone.

## Blockers / next steps

1. **BLOCKED on dirty tree**: do NOT tag until the concurrent SEO session
   commits or the release owner confirms HEAD is the intended baseline.
   Re-run `git status --short` (expect clean), re-run suite + build, then:
   `git tag -a sallyip-validation-rc1 -m "SallyIP validation baseline RC1: HEAD 0279cc1; suite 261/261 pass; vite build ok; history not rewritten"`.
2. No network git operations were performed (no push/fetch), per instructions.
