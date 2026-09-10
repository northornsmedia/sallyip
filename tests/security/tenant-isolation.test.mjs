import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 17. RLS enabled on required tables; 13. role cannot bypass tenant isolation.
test('RLS migration enables row-level security and least-privilege roles', () => {
  const sql = fs.readFileSync(new URL('../../database/055_tenant_isolation.sql', import.meta.url), 'utf8');
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'must enable RLS');
  assert.ok(sql.includes('CREATE ROLE sally_app'), 'must create least-privilege role');
  assert.ok(sql.includes('CREATE ROLE sally_readonly'), 'must create readonly role');
  assert.ok(sql.includes('app.current_user_id'), 'policies must scope to app.current_user_id');
  for (const t of ['matters', 'conversations', 'generated_files', 'legal_sources', 'artifacts']) {
    assert.ok(sql.includes(t), `migration must cover ${t}`);
  }
  assert.ok(sql.includes('Rollback'), 'must document rollback');
});

// 1/2/3/14/15/18/19 — app-layer ownership checks exist independently from RLS.
test('ownership checks exist in service layer (defense in depth, not RLS-only)', () => {
  const checks = [
    ['src/lib/contract-service.js', 'AND user_id=${userId}'],
    ['src/lib/playbook-service.js', 'user_id'],
    ['api/_handlers/matters.js', 'user_id'],
  ];
  for (const [file, marker] of checks) {
    const src = fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.ok(src.includes(marker), `${file} must scope by user`);
  }
});

test('cross-user substitution attack pattern is blocked by user scoping', async () => {
  // Simulate attacker passing victim matter_id: service must still filter by user_id.
  const { getContract } = await import('../../src/lib/contract-service.js');
  let lastQuery = '';
  const fakeSql = (strings, ...values) => {
    lastQuery = strings.join('?') + JSON.stringify(values);
    return Promise.resolve([]);
  };
  // getContract with unknown id should throw 'Contract not found' (not leak).
  await assert.rejects(() => getContract(fakeSql, 'attacker-id', 'victim-contract-id'), /Contract not found/);
  assert.ok(lastQuery.includes('attacker-id'), 'query must bind attacker user_id, not victim');
});
