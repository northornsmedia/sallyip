# Recent Changes

## Repository status

- Branch reviewed: `main`
- Working tree before this report was created: clean (no staged, modified, or untracked files)
- Primary change reviewed: commit `9e024a5` from September 8, 2026
- Commit summary: 53 files changed, 1,811 lines added, and 48 lines removed

## Summary

The latest update expands SallyIP from its existing research and chat foundation into a broader legal-work platform. It adds reusable playbooks, contract drafting and review, citation tracking, scalable vault reviews, two more official search providers, role-based access controls, security auditing, evaluation tools, model-output safeguards, and a configurable primary AI engine. It also adds a basic Microsoft Word add-in for running playbooks and inserting their results.

## Major changes

### Reusable legal playbooks

- Added versioned legal playbooks for the existing IP workflow types and the new contract workflows.
- Added API operations to list, read, create, update, and run playbooks.
- Playbook runs substitute user variables into instruction templates and record the playbook/version used by each workflow run.
- Added a chat-page workspace where users can create, inspect, and execute playbooks against a matter.
- Playbook execution is restricted to users with the `researcher` role or higher and is written to the security audit log.

Key files: `src/lib/playbook-service.js`, `api/_handlers/playbooks.js`, `src/components/playbook-workspace.jsx`, and `database/042_playbooks.sql`.

### Contract drafting, review, and export

- Added contract templates, contracts, version history, and clause records.
- Seeded seven initial contract templates in the database migration.
- Added template variable validation and contract creation from a selected template.
- Added clause splitting and keyword-based risk flags, including detection of language such as uncapped liability.
- Added a contract workspace for drafting, editing, reviewing, versioning, and exporting contracts in supported document formats.
- Contract mutations require `researcher` access or higher; reviews are audit logged.

Key files: `src/lib/contract-service.js`, `api/_handlers/contracts.js`, `src/components/contract-workspace.jsx`, and `database/043_contracts.sql`.

### Citation ledger and answer guard

- Added an `answer_citations` ledger that connects answer citations to matters, conversations, agent runs, sources, and passages.
- Added exact and normalized/fuzzy quote verification against stored source passages.
- Proposition sources can now store the quoted text and its match status; missing quotes are rejected when attaching evidence.
- Chat answers now pass through a citation guard that detects unsupported source labels and warns when legal analysis lacks pinned citations.
- Citation-guard results are returned in `sally_meta.citation_guard` for transparency.

Key files: `src/lib/citation-service.js`, `api/_handlers/citations.js`, `src/lib/verification-service.js`, `src/lib/proposition-verification-service.js`, and `database/044_citation_ledger.sql`.

### Vault review and retrieval scaling

- Added configurable vault review tables and generated review rows for matter source passages.
- Review columns support validated keys plus regex or keyword-based extraction.
- Added trigram and lookup indexes to improve text retrieval and matter/source queries as the vault grows.

Key files: `src/lib/vault-review-service.js`, `api/_handlers/vault-reviews.js`, and `database/045_vault_scale.sql`.

### Official-source search expansion

- Added USPTO patent search with API-key authentication and normalized patent results.
- Added CourtListener opinion search with token authentication and optional court filtering.
- The provider-status response now covers EPO, EUIPO, USPTO, and CourtListener and reports unavailable providers honestly instead of simulating results.
- Official-search persistence now supports the new provider result types.

Key files: `src/lib/official-search-service.js`, `src/lib/official-search-persistence.js`, `.env.example`, and `vite.config.js`.

New optional environment settings:

```env
USPTO_API_KEY=
USPTO_API_BASE=https://api.uspto.gov/patents/v1
COURTLISTENER_TOKEN=
COURTLISTENER_COURT=
```

### Roles, login protection, and audit records

- Defined a role hierarchy: `viewer`, `researcher`, `admin`, and `owner`.
- Viewer accounts can read data but cannot perform protected mutations such as creating matters, contracts, or playbooks.
- Added login-attempt tracking and temporary blocking after repeated failures.
- Added audit events for signup, login success/failure, rate limiting, logout, playbook runs, and contract reviews.
- Audit failures are deliberately prevented from breaking the main request path.

Key files: `src/lib/security.js`, `api/_handlers/auth.js`, `api/_handlers/matters.js`, and `database/046_security.sql`.

### Evaluation and data flywheel

- Added evaluation runs that calculate verification and unsupported-citation metrics from stored activity.
- The transparency endpoint now includes the latest evaluation result when available.
- Added user-scoped JSONL exports for grounding pairs and contract-risk training/evaluation data.
- Added a grounding probe script for exercising answer-grounding behavior.

Key files: `src/lib/eval-harness.js`, `api/_handlers/eval-runs.js`, `src/lib/flywheel-export.js`, `api/_handlers/flywheel.js`, `scripts/grounding-probe.mjs`, and `database/047_eval_harness.sql`.

### Configurable engine swap and safer output

- Added optional environment-driven configuration for a primary flagship model without changing the default engine set.
- Duplicate or malformed engine configuration is ignored safely, and adaptive weights use the resolved engine list.
- Model responses are sanitized to remove leaked internal tool syntax before content is shown or exported.
- Chat rendering and artifact generation now consistently use the sanitized response.

Example primary-engine configuration is documented in `.env.example` using `SALLYIP_PRIMARY_MODEL`, `SALLYIP_PRIMARY_KEY`, `SALLYIP_PRIMARY_NAME`, and `SALLYIP_PRIMARY_WEIGHT`.

### Microsoft Word add-in

- Added a basic Office task pane manifest and interface.
- The add-in loads SallyIP playbooks, runs a selected playbook for a matter, and inserts the resulting text into the open Word document.
- The manifest currently uses `https://sallyip.vercel.app`; it must be changed if deployment uses another production domain before sideloading.

Key files: `public/word-addin/manifest.xml`, `public/word-addin/taskpane.html`, and `public/word-addin/taskpane.js`.

### API and local-development wiring

- Registered six new serverless endpoints: `/api/citations`, `/api/contracts`, `/api/eval-runs`, `/api/flywheel`, `/api/playbooks`, and `/api/vault-reviews`.
- Updated the Vite development API layer to expose the new capabilities and environment settings locally.
- Added the latest evaluation result to both production and local transparency responses.

## Database deployment

Six migrations were added and should be applied in numeric order on a fresh or second database:

1. `database/042_playbooks.sql`
2. `database/043_contracts.sql`
3. `database/044_citation_ledger.sql`
4. `database/045_vault_scale.sql`
5. `database/046_security.sql`
6. `database/047_eval_harness.sql`

According to `sqlrun.md`, these migrations are already applied to the current live database. The same file contains the exact migration commands for another database.

## Validation

The focused test set for the latest features was run locally on September 8, 2026:

- 45 tests passed
- 0 tests failed
- Coverage included answer guarding, citations, contracts, engine swapping, evaluations, flywheel exports, all four official-search providers, playbooks, role security, login throttling, and vault reviews

Full integration tests requiring configured external services or a database were not run as part of this report.

## Earlier recent commits

- `d36d348` (August 25, 2026): added the OmniRoute engine, brain observatory, and resilient chat retry behavior.
- `d46825c` (August 25, 2026): kept Sally chat available during engine failures.
- `d9344ba` (August 25, 2026): restored the main chat fallback.
- `51763d4` (August 25, 2026): consolidated serverless functions into a unified catch-all router for the Vercel Hobby tier.
