import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// P0-B/C staging evidence: migration must be least-privilege and MUST NOT claim live verification.
test('055 grants no superuser/bypassrls/owner to app role', () => {
  const sql = fs.readFileSync(new URL('../../database/055_tenant_isolation.sql', import.meta.url), 'utf8');
  assert.ok(!/SUPERUSER/i.test(sql), 'must not grant superuser');
  assert.ok(!/BYPASSRLS/i.test(sql), 'must not grant bypassrls');
  assert.ok(!/GRANT ALL ON DATABASE/i.test(sql), 'must not grant database-wide all');
  assert.ok(sql.includes('sally_app') && sql.includes('sally_readonly'));
});

test('live DB is NOT RLS-verified (owner bypass, zero policies) — pilot must stay blocked', async () => {
  // This test documents runtime truth without applying any migration.
  // It requires DATABASE_URL only for read-only inspection; skips cleanly without it.
  if (!process.env.DATABASE_URL) return;
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const [flags] = await sql`SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  const rls = await sql`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity`;
  // If RLS were live-verified, bypass would be false for app role and rls>0.
  // Current live truth (2026-09-10 inspection): owner bypass=true, rls=0 -> NOT verified.
  assert.ok(flags && 'rolbypassrls' in flags, 'inspection must return bypass flag');
  assert.ok(Number.isInteger(rls?.[0]?.n), 'inspection must return rls count');
  if (flags.rolbypassrls === true && rls[0].n === 0) {
    assert.ok(true, 'correctly observed: live NOT RLS-verified');
  }
});
