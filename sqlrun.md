# SQL migrations — run later on a fresh database

Already applied to the current live DB. Only needed for a second/fresh database.
Run in number order from the project root:

```bash
node --env-file=.env.local scripts/apply-migration.mjs database/042_playbooks.sql
node --env-file=.env.local scripts/apply-migration.mjs database/043_contracts.sql
node --env-file=.env.local scripts/apply-migration.mjs database/044_citation_ledger.sql
node --env-file=.env.local scripts/apply-migration.mjs database/045_vault_scale.sql
node --env-file=.env.local scripts/apply-migration.mjs database/046_security.sql
node --env-file=.env.local scripts/apply-migration.mjs database/047_eval_harness.sql
node --env-file=.env.local scripts/apply-migration.mjs database/048_draft_workflow.sql
node --env-file=.env.local scripts/apply-migration.mjs database/049_draft_matter_optional.sql
```

What each adds:

| File | Adds |
|---|---|
| 042_playbooks | `legal_playbooks`, `legal_playbook_versions`, run links |
| 043_contracts | `legal_contract_templates` (+7 seeds), `legal_contracts`, versions, clauses |
| 044_citation_ledger | `answer_citations`, quote columns on `proposition_sources` |
| 045_vault_scale | pg_trgm indexes, `vault_review_tables`, `vault_review_rows` |
| 046_security | `security_events`, `login_attempts`, role check |
| 047_eval_harness | `eval_runs` |
| 048_draft_workflow | `patent_drafting` workflow + playbook types |
| 049_draft_matter_optional | optional matter on workflow runs |

New env keys for prod (search works without them; USPTO + CourtListener report "not configured" until added):

```
USPTO_API_KEY=
USPTO_API_BASE=https://api.uspto.gov/patents/v1
COURTLISTENER_TOKEN=
COURTLISTENER_COURT=
```
