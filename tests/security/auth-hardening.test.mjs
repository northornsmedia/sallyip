import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertNoDevFallback, requireSecureCookie } from '../../src/lib/auth-guards.js';

// 4. dev-user fallback impossible in prod
test('dev authentication fallback cannot execute in production', () => {
  assert.throws(() => assertNoDevFallback({ env: { NODE_ENV: 'production' }, caller: 'resolveDevUser' }), (e) => e.code === 'DEV_FALLBACK_BLOCKED');
  assert.throws(() => assertNoDevFallback({ env: { SALLYIP_ENV: 'production' }, caller: 'resolveDevUser' }), (e) => e.code === 'DEV_FALLBACK_BLOCKED');
  assert.doesNotThrow(() => assertNoDevFallback({ env: { NODE_ENV: 'development' }, caller: 'resolveDevUser' }));
});

test('vite dev fallback is guarded for production', () => {
  const src = fs.readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');
  assert.ok(src.includes('aman@sallyip.com'), 'expected dev fallback marker in vite.config');
  assert.ok(src.includes('DEV_FALLBACK_BLOCKED'), 'vite.config must guard dev fallback in production');
});

test('production api handlers have no dev fallback', () => {
  const dir = new URL('../../api/_handlers/', import.meta.url);
  for (const f of fs.readdirSync(dir)) {
    const content = fs.readFileSync(new URL(`../../api/_handlers/${f}`, import.meta.url), 'utf8');
    assert.ok(!content.includes('aman@sallyip.com'), `prod handler ${f} must not contain dev fallback`);
    assert.ok(!content.includes('resolveDevUser'), `prod handler ${f} must not use resolveDevUser`);
  }
});

// 7. Secure session cookie in prod
test('Secure cookie required in production', () => {
  assert.throws(() => requireSecureCookie({ env: { NODE_ENV: 'production' }, secure: false }), (e) => e.code === 'INSECURE_COOKIE_BLOCKED');
  assert.doesNotThrow(() => requireSecureCookie({ env: { NODE_ENV: 'production' }, secure: true }));
  assert.doesNotThrow(() => requireSecureCookie({ env: { NODE_ENV: 'development' }, secure: false }));
});
