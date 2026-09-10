#!/usr/bin/env node
// P0-B read-only staging inspection. No writes, no migration apply.
// Prints machine-readable facts without secrets.
import { neon } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;
if (!url) { console.log(JSON.stringify({ ok: false, reason: 'no DATABASE_URL' })); process.exit(2); }
const sql = neon(url);
try {
  const [me] = await sql`SELECT current_user AS user, session_user AS session_user`;
  const [flags] = await sql`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  const rls = await sql`SELECT count(*)::int AS rls_tables FROM pg_tables WHERE schemaname='public' AND rowsecurity`;
  const force = await sql`SELECT count(*)::int AS force_tables FROM pg_tables WHERE schemaname='public' AND rowsecurity AND (SELECT relforcerowsecurity FROM pg_class WHERE relname = pg_tables.tablename LIMIT 1)`;
  const roles = await sql`SELECT rolname FROM pg_roles WHERE rolname IN ('sally_app','sally_readonly')`;
  const policies = await sql`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'`;
  console.log(JSON.stringify({
    ok: true,
    current_user: me?.user || null,
    is_superuser: !!flags?.rolsuper,
    bypass_rls: !!flags?.rolbypassrls,
    rls_tables: rls?.[0]?.rls_tables ?? null,
    force_tables: force?.[0]?.force_tables ?? null,
    app_roles_present: (roles || []).map((r) => r.rolname),
    policy_count: policies?.[0]?.n ?? null,
    note: 'read-only inspection; migration 055 NOT applied by this script',
  }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ok: false, reason: String(e?.message || e).slice(0, 200) }));
  process.exit(1);
}
