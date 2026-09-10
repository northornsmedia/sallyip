import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { redactConfidential, logSecurityEvent } from '../../src/lib/security.js';

// 10. audit event written (structured, no confidential content)
test('audit event written with structured fields and redaction', async () => {
  const seen = [];
  const fakeSql = (strings, ...values) => {
    seen.push({ strings: strings.join('?'), values });
    return Promise.resolve([]);
  };
  const res = await logSecurityEvent(fakeSql, {
    userId: 'u1', event_type: 'login_failed',
    metadata: { email: 'a@b.com', disclosure: 'secret invention XYZ', content: 'full doc' },
    matter_id: 'm1', action: 'login', resource: 'session', result: 'denied', request_id: 'r1', severity: 'warn',
  });
  assert.ok(res.event_id && res.timestamp && res.actor === 'u1');
  const stored = JSON.stringify(seen[0].values);
  assert.ok(!stored.includes('secret invention XYZ'), 'confidential text must be redacted');
  assert.ok(stored.includes('[REDACTED]'));
});

// 11. audit failure observable (no silent catch)
test('audit failure is observable via AUDIT_WRITE_FAILED', async () => {
  const failingSql = () => Promise.reject(new Error('db down'));
  await assert.rejects(() => logSecurityEvent(failingSql, { userId: 'u1', event_type: 'test_event' }), (e) => e.code === 'AUDIT_WRITE_FAILED');
});

// 16. confidential text absent from logs
test('redactConfidential strips nested confidential keys and truncates', () => {
  const out = redactConfidential({ nested: { invention_disclosure: 'TOP SECRET', ok: 'fine' }, notes: 'x'.repeat(5000), prompt: 'secret prompt text' });
  assert.equal(out.nested.invention_disclosure, '[REDACTED]');
  assert.equal(out.prompt, '[REDACTED]');
  assert.ok(out.notes.includes('[TRUNCATED]'));
});

test('security.js has no silent catch around audit writes', () => {
  const src = fs.readFileSync(new URL('../../src/lib/security.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('catch {\n    // Audit must never break'), 'silent audit catch must be removed');
  assert.ok(src.includes('AUDIT_WRITE_FAILED'), 'audit failure code must exist');
});
