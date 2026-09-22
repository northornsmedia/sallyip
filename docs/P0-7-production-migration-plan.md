# P0-7 Production Migration Plan

## Prerequisites (must complete before any prod apply)
- [ ] Staging RLS proof complete (P0-2 evidence in `docs/p0-2-staging-rls-evidence.json`)
- [ ] Role separation verified (P0-3 script passes against staging)
- [ ] Cross-tenant API + SQL attacks pass on staging (P0-4)
- [ ] Audit coverage 100% for security-relevant handlers (P0-5)
- [ ] Secret scan enforcement in CI/pre-commit (P0-6)
- [ ] Approved confidential provider configured OR decision to launch without (BLOCKED state documented)
- [ ] Backup/restore capability tested (Neon point-in-time recovery)

---

## Pre-flight Checks (run immediately before migration)

```bash
# 1. Verify staging evidence exists and is recent
cat docs/p0-2-staging-rls-evidence.json | jq '.after.rls_tables, .after.force_tables, .after.policy_count'
# Expect: rls_tables >= 80, force_tables >= 80, policy_count >= 9
# (055 ARRAY holds ~91 names; vintage skips missing tables; 9 sally_app_own_rows policies)

# 2. Verify current prod state (read-only)
node scripts/rls-staging-check.mjs
# Expect: bypass_rls=true, rls_tables=0, app_roles=[]

# 3. Confirm backup window
# Neon: point-in-time recovery available for last 7 days
# Document: restore command + expected RTO/RPO
```

---

## Migration Command (run as ADMIN role)

```bash
# Apply migration 055 to production
node --env-file=.env.local scripts/apply-migration.mjs database/055_tenant_isolation.sql
```

Expected output:
- ~91 tables with `ENABLE ROW LEVEL SECURITY` (055 ARRAY length; count varies by vintage)
- ~91 tables with `FORCE ROW LEVEL SECURITY`
- Roles `sally_app` and `sally_readonly` created (NOLOGIN; owner grants in prod)
- 9 policies created (`sally_app_own_rows` on matters, conversations, generated_files, legal_sources, artifacts, legal_contracts, legal_workflow_runs, answer_citations, auth_sessions)

---

## Role Creation / Switch Order

### 1. Verify ADMIN role works (migration runner)
```bash
# Already used for migration above
# Must have: bypassrls=true OR superuser=true
```

### 2. Create APP role connection string
- In Neon: create new role `sally_app` with password
- Grant: `GRANT USAGE ON SCHEMA public TO sally_app;`
- Grant: `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sally_app;`
- Grant: `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sally_app;`
- Grant: `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sally_app;`
- Build `DATABASE_URL_APP` = `postgresql://sally_app:<placeholder_password>@host/db?sslmode=require`

### 3. Create READONLY role connection string
- In Neon: create new role `sally_readonly` with password
- Grant: `GRANT USAGE ON SCHEMA public TO sally_readonly;`
- Grant: `GRANT SELECT ON ALL TABLES IN SCHEMA public TO sally_readonly;`
- Build `DATABASE_URL_READONLY` = `postgresql://sally_readonly:<placeholder_password>@host/db?sslmode=require`

### 4. Update Vercel Environment Variables
- Add `DATABASE_URL_APP` (user-facing API endpoints)
- Add `DATABASE_URL_READONLY` (observability/analytics)
- Keep `DATABASE_URL` (admin) for migration tooling only

### 5. Deploy application code with role-aware connection logic
- Modify `vite.config.js` and API handlers to use `DATABASE_URL_APP` for user requests
- Set `SET LOCAL app.current_user_id = <user-id>` on every pooled transaction
- Deploy to Vercel preview first, verify against staging DB

---

## Health Checks (after deploy)

```bash
# 1. RLS active
node scripts/rls-staging-check.mjs
# Expect: bypass_rls=false (for app user), rls_tables >= 80, force_tables >= 80

# 2. Role permissions
node scripts/p0-3-role-separation.mjs
# Expect: all APP permission tests pass, READONLY tests pass

# 3. Cross-tenant API
node scripts/p0-4-cross-tenant.mjs
# Expect: SQL adversarial tests all pass

# 4. Audit logging
npm run test:security
# Expect: 70+ tests pass

# 5. Application smoke test
# - Login -> matter create -> document upload -> chat -> workflow -> artifact
# - Verify audit events in security_events table
```

---

## Rollback Trigger

Rollback immediately if ANY of:
- Health check 1 fails (RLS not active / bypass still true)
- Health check 2 fails (any DDL permitted for APP role)
- Health check 3 fails (any cross-tenant access returns data)
- Application error rate > 5% in first 15 minutes
- Audit events not being written

---

## Rollback SQL

```sql
-- Run as ADMIN (owner) role
-- Disable RLS on all tables. Do NOT maintain a second static list:
-- re-run the 055 ARRAY with DISABLE ROW LEVEL SECURITY + DROP POLICY, or
-- enumerate live: SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'matters','conversations','messages','generated_files','legal_sources',
    'source_passages','artifacts','artifact_versions','legal_contracts',
    'legal_workflow_runs','answer_citations','auth_sessions',
    -- ... extend from the 055 ARRAY (same source of truth), not a copy
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I DISABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS sally_app_own_rows ON %I', t);
    EXCEPTION WHEN undefined_table THEN CONTINUE; END;
  END LOOP;
END $$;

-- Drop roles
DROP ROLE IF EXISTS sally_app;
DROP ROLE IF EXISTS sally_readonly;

-- Verify rollback
SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity;
-- Should return 0
```

---

## Post-Migration Verification

- [ ] `DATABASE_URL` (admin) used ONLY by migration scripts
- [ ] `DATABASE_URL_APP` used by all user-facing API endpoints
- [ ] `DATABASE_URL_READONLY` used by observability/metrics
- [ ] `SET LOCAL app.current_user_id` executed on every user request
- [ ] Security events flowing with `actor`, `resource`, `result`, `request_id`
- [ ] Cross-tenant attacks return 403/404 at API + empty at DB
- [ ] Application builds and deploys clean
- [ ] All security tests pass

---

## Sign-off

Migration approved by: _______________ Date: ___________

Rollback tested by: _______________ Date: ___________

Production cutover time: ___________