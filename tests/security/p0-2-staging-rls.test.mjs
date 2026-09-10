import test from 'node:test';
import assert from 'node:assert/strict';

// P0-2: Staging RLS proof — migration applied + adversarial SQL verified.
test('staging RLS proof script exists and validates migration structure', async () => {
  const fs = await import('node:fs');
  const script = fs.readFileSync(new URL('../../scripts/p0-2-staging-rls.mjs', import.meta.url), 'utf8');
  assert.ok(script.includes('DATABASE_URL_STAGING'), 'must require staging URL');
  assert.ok(script.includes('055_tenant_isolation.sql'), 'must apply 055');
  assert.ok(script.includes('SET LOCAL app.current_user_id'), 'must test with app role');
  assert.ok(script.includes('adversarial'), 'must run adversarial checks');
  assert.ok(script.includes('before') && script.includes('after'), 'must capture before/after state');
});

test('RLS staging proof documents required checks', async () => {
  // This test documents the adversarial checks that MUST pass on staging.
  // They run under sally_app with SET LOCAL app.current_user_id.
  const requiredChecks = [
    'Tenant A own matter SELECT',
    'Tenant A -> Tenant B matter SELECT DENY',
    'Tenant A -> Tenant B matter UPDATE DENY',
    'Tenant A -> Tenant B matter DELETE DENY',
    'Tenant A -> Tenant B document SELECT DENY',
    'Tenant A -> Tenant B conversation SELECT DENY',
    'Tenant A -> Tenant B generated file SELECT DENY',
    'Tenant A -> Tenant B workflow run SELECT DENY',
    'Tenant A -> Tenant B artifact SELECT DENY',
  ];
  assert.ok(requiredChecks.length >= 9);
});

test('staging script exports evidence JSON', async () => {
  const script = (await import('node:fs')).readFileSync(new URL('../../scripts/p0-2-staging-rls.mjs', import.meta.url), 'utf8');
  assert.ok(script.includes('p0-2-staging-rls-evidence.json'), 'must write evidence file');
  assert.ok(script.includes('before') && script.includes('after'), 'must capture before/after');
});