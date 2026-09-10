# Tenant / database security model

## Ownership
- `user_id` direct: users, conversations, matters, legal_sources, knowledge_sources, artifacts, generated_files, legal_workflow_runs, legal_contracts, legal_playbooks, answer_citations, auth_sessions, eval_runs, provider_records, professional_search_*, prosecution_*, families, office_actions, patent_drafts, trademark_*, prior_art_*, novelty, inventive_step, fto, litigation.
- Child tables via parent: messages->conversations, source_passages->legal_sources, knowledge_chunks->knowledge_sources, artifact_versions->artifacts, contract versions/clauses->contracts, workflow steps->runs.
- No `organization_id` yet — single-user matters. If orgs are added, add `org_id` + policies before sharing.

## Enforcement layers
1. API/service: every query binds `user_id` (and `matter_id` where scoped). Verified by `tests/security/tenant-isolation.test.mjs`.
2. DB RLS: `database/055_tenant_isolation.sql` enables RLS + `FORCE RLS` on ~70 tables, policies `sally_app_own_rows` keyed to `SET LOCAL app.current_user_id`. Owner bypasses (safe rollout).
3. Roles: `sally_app` (CRUD own), `sally_readonly` (SELECT). No DDL for app. Background jobs use `sally_app` unless elevated need is documented per job.

## App connection guidance
- Today: single `DATABASE_URL` (owner). Next: `DATABASE_URL_APP` (sally_app) for user-facing endpoints + `SET LOCAL app.current_user_id` per transaction; keep owner URL server-only for migrations.
- Direct SQL under app role must return zero foreign rows (test 13 pattern: set role + setting, attempt cross-user select).

## Rollback
Per migration footer: `DISABLE ROW LEVEL SECURITY`, drop policies/roles. No data change, so rollback is metadata-only.
