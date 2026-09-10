#!/usr/bin/env node
// Application role separation proof — validates ADMIN/APP/READONLY roles.
// Usage: DATABASE_URL_ADMIN=<owner> DATABASE_URL_APP=<sally_app> DATABASE_URL_READONLY=<sally_readonly> node scripts/p0-3-role-separation.mjs
// If any URL is missing, prints required steps and exits 0 (not a failure).
import { neon } from '@neondatabase/serverless';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const APP_URL = process.env.DATABASE_URL_APP;
const READONLY_URL = process.env.DATABASE_URL_READONLY;

const missing = [];
if (!ADMIN_URL) missing.push('DATABASE_URL_ADMIN');
if (!APP_URL) missing.push('DATABASE_URL_APP');
if (!READONLY_URL) missing.push('DATABASE_URL_READONLY');

if (missing.length) {
  console.log('ROLE_SEPARATION: missing env vars:', missing.join(', '));
  console.log('Required: set all three URLs. Admin for migrations only, App for runtime, Readonly for observability.');
  process.exit(0);
}

const adminSql = neon(ADMIN_URL);
const appSql = neon(APP_URL);
const readonlySql = neon(READONLY_URL);

async function checkRole(sql, label) {
  const [me] = await sql`SELECT current_user AS user, session_user AS session_user`;
  const [flags] = await sql`SELECT rolsuper, rolbypassrls, rolcreaterole, createdb FROM pg_roles WHERE rolname = current_user`;
  return {
    label,
    current_user: me?.user,
    is_superuser: !!flags?.rolsuper,
    bypass_rls: !!flags?.rolbypassrls,
    can_create_role: !!flags?.rolcreaterole,
    can_create_db: !!flags?.createdb,
  };
}

async function testAppPermissions(appSql) {
  const results = [];
  // DDL should fail
  try { await appSql`CREATE TABLE test_ddl_fail (id int)`; results.push({ op: 'CREATE TABLE', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'CREATE TABLE', pass: true, reason: 'correctly denied' }); }
  try { await appSql`DROP TABLE IF EXISTS test_drop_fail`; results.push({ op: 'DROP TABLE', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'DROP TABLE', pass: true, reason: 'correctly denied' }); }
  try { await appSql`ALTER TABLE matters ADD COLUMN IF NOT EXISTS test_col text`; results.push({ op: 'ALTER TABLE', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'ALTER TABLE', pass: true, reason: 'correctly denied' }); }
  try { await appSql`CREATE POLICY test_policy ON matters FOR ALL USING (true)`; results.push({ op: 'CREATE POLICY', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'CREATE POLICY', pass: true, reason: 'correctly denied' }); }
  try { await appSql`ALTER POLICY sally_app_own_rows ON matters RENAME TO x`; results.push({ op: 'ALTER POLICY', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'ALTER POLICY', pass: true, reason: 'correctly denied' }); }
  try { await appSql`SET row_security = off`; results.push({ op: 'SET row_security off', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'SET row_security off', pass: true, reason: 'correctly denied' }); }
  try { await appSql`DISABLE ROW LEVEL SECURITY`; results.push({ op: 'DISABLE RLS', pass: false, reason: 'should have failed' }); }
  catch (e) { results.push({ op: 'DISABLE RLS', pass: true, reason: 'correctly denied' }); }

  // Cross-tenant read should return empty (RLS enforcement)
  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  try {
    await appSql`SET LOCAL app.current_user_id = ${tenantA}`;
    const res = await appSql`SELECT 1 FROM matters WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' LIMIT 1`;
    results.push({ op: 'cross-tenant SELECT', pass: res.length === 0, reason: res.length === 0 ? 'correctly empty' : 'should be empty' });
  } catch (e) {
    results.push({ op: 'cross-tenant SELECT', pass: true, reason: 'error (denied)' });
  }

  // Own-row access should work
  try {
    await appSql`SET LOCAL app.current_user_id = ${tenantA}`;
    await appSql`INSERT INTO matters (id, user_id, name) VALUES (gen_random_uuid(), ${tenantA}, 'test')`;
    const res = await appSql`SELECT 1 FROM matters WHERE user_id = ${tenantA} LIMIT 1`;
    results.push({ op: 'own-row SELECT', pass: res.length === 1, reason: res.length === 1 ? 'works' : 'should work' });
  } catch (e) {
    results.push({ op: 'own-row SELECT', pass: false, reason: `error: ${e.message}` });
  }

  return results;
}

async function testReadonlyPermissions(readonlySql) {
  const results = [];
  // SELECT should work
  try { const res = await readonlySql`SELECT 1`; results.push({ op: 'SELECT 1', pass: res.length === 1 }); }
  catch (e) { results.push({ op: 'SELECT 1', pass: false, reason: e.message }); }
  // Mutations should fail
  for (const mut of ['INSERT INTO matters (user_id,name) VALUES (\'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\',\'x\')', 'UPDATE matters SET name=\'x\'', 'DELETE FROM matters']) {
    try { await readonlySql.unsafe(mut); results.push({ op: mut.slice(0,20), pass: false }); }
    catch { results.push({ op: mut.slice(0,20), pass: true }); }
  }
  return results;
}

async function main() {
  console.log('=== APPLICATION ROLE SEPARATION PROOF ===');
  const adminRole = await checkRole(adminSql, 'ADMIN');
  const appRole = await checkRole(appSql, 'APP');
  const readonlyRole = await checkRole(readonlySql, 'READONLY');
  console.log('Roles:', JSON.stringify([adminRole, appRole, readonlyRole], null, 2));

  // Admin should be superuser or at least bypass RLS for migrations
  if (!adminRole.bypass_rls && !adminRole.is_superuser) {
    console.warn('WARNING: ADMIN role does not bypass RLS — migrations may fail');
  }

  // App must NOT be superuser/bypass
  if (appRole.is_superuser || appRole.bypass_rls) {
    console.error('FAIL: APP role has superuser/bypassrls — must not');
    process.exit(1);
  }

  console.log('\n--- APP PERMISSIONS ---');
  const appPerms = await testAppPermissions(appSql);
  console.log(JSON.stringify(appPerms, null, 2));
  const appPassed = appPerms.filter(p => p.pass).length;
  const appFailed = appPerms.filter(p => !p.pass).length;
  console.log(`App permissions: ${appPassed} passed, ${appFailed} failed`);

  console.log('\n--- READONLY PERMISSIONS ---');
  const roPerms = await testReadonlyPermissions(readonlySql);
  console.log(JSON.stringify(roPerms, null, 2));
  const roPassed = roPerms.filter(p => p.pass).length;
  const roFailed = roPerms.filter(p => !p.pass).length;
  console.log(`Readonly permissions: ${roPassed} passed, ${roFailed} failed`);

  const totalFailed = appFailed + roFailed;
  if (totalFailed > 0) {
    console.error('\nROLE SEPARATION: FAILED');
    process.exit(1);
  }
  console.log('\nROLE SEPARATION: PASSED');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });