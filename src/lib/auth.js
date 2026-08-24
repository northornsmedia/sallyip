import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const COOKIE = 'sally_session'
const DAYS = 30

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${Buffer.from(derived).toString('hex')}`
}

export async function verifyPassword(password, stored = '') {
  const [, salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex) return false
  const actual = Buffer.from(await scrypt(password, salt, 64))
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export const tokenHash = token => createHash('sha256').update(token).digest('hex')
export const parseCookies = header => Object.fromEntries((header || '').split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(v => v.length === 2))
export const sessionCookie = (token, secure = true) => `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}${secure ? '; Secure' : ''}`
export const clearSessionCookie = secure => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`

export async function createSession(sql, userId) {
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + DAYS * 86400000)
  await sql`INSERT INTO auth_sessions (user_id,token_hash,expires_at) VALUES (${userId},${tokenHash(token)},${expires.toISOString()})`
  return token
}

export async function getSessionUser(sql, cookieHeader) {
  const token = parseCookies(cookieHeader)[COOKIE]
  if (!token) return null
  const [user] = await sql`SELECT u.id,u.email,u.full_name,u.initials,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>now() LIMIT 1`
  return user || null
}

export async function destroySession(sql, cookieHeader) {
  const token = parseCookies(cookieHeader)[COOKIE]
  if (token) await sql`DELETE FROM auth_sessions WHERE token_hash=${tokenHash(token)}`
}

