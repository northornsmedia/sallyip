import test from 'node:test'
import assert from 'node:assert/strict'
import { getClientIp, loginBlocked, recordLoginAttempt, requireRole } from '../src/lib/security.js'

test('role hierarchy gates viewers out of mutations', () => {
  assert.doesNotThrow(() => requireRole({ role: 'researcher' }, 'researcher'))
  assert.doesNotThrow(() => requireRole({ role: 'owner' }, 'admin'))
  assert.throws(() => requireRole({ role: 'viewer' }, 'researcher'), e => e.code === 'FORBIDDEN')
  assert.throws(() => requireRole(null, 'researcher'), e => e.code === 'FORBIDDEN')
  assert.throws(() => requireRole({ role: 'researcher' }, 'superuser'), /Invalid role/)
})

test('client IP prefers the first forwarded address', () => {
  assert.equal(getClientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }), '1.2.3.4')
  assert.equal(getClientIp({ headers: {} }), null)
})

test('login rate limit blocks after the threshold', async () => {
  const calls = []
  const mockSql = async (strings, ...values) => { calls.push(strings[0]); return strings[0].includes('count(*)') ? [{ n: 10 }] : [] }
  assert.equal(await loginBlocked(mockSql, 'a@b.co|x'), true)
  const openSql = async () => [{ n: 3 }]
  assert.equal(await loginBlocked(openSql, 'a@b.co|x'), false)
  await recordLoginAttempt(mockSql, 'a@b.co|x')
  assert.ok(calls.some(q => q.includes('INSERT INTO login_attempts')))
})
