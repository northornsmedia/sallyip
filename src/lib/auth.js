import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
export const COOKIE = 'sally_session'
export const DAYS = 7
const JWT_SECRET = process.env.JWT_SECRET || process.env.SALLYIP_JWT_SECRET || 'sallyip-jwt-7day-secure-token-secret-key-2026'

function base64UrlEncode(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  return Buffer.from(str).toString('base64url')
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8')
}

export function signJwt(payload, expiresInSeconds = DAYS * 86400) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: payload.iat || now,
    exp: payload.exp || (now + expiresInSeconds)
  }
  const headerB64 = base64UrlEncode(header)
  const payloadB64 = base64UrlEncode(fullPayload)
  const dataToSign = `${headerB64}.${payloadB64}`
  const signature = createHmac('sha256', JWT_SECRET).update(dataToSign).digest('base64url')
  return `${dataToSign}.${signature}`
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signature] = parts
  const dataToSign = `${headerB64}.${payloadB64}`
  const expectedSig = createHmac('sha256', JWT_SECRET).update(dataToSign).digest('base64url')
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null // Expired
    }
    return payload
  } catch {
    return null
  }
}

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

export function extractToken(authSource) {
  if (!authSource) return null
  if (typeof authSource === 'object') {
    const headers = authSource.headers || authSource
    const auth = headers?.authorization || headers?.Authorization
    if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice(7).trim()
    }
    const cookie = headers?.cookie || headers?.Cookie
    if (cookie) {
      const parsed = parseCookies(cookie)
      if (parsed[COOKIE]) return parsed[COOKIE]
    }
    return null
  }
  if (typeof authSource === 'string') {
    if (authSource.startsWith('Bearer ')) {
      return authSource.slice(7).trim()
    }
    if (authSource.includes(`${COOKIE}=`)) {
      const parsed = parseCookies(authSource)
      if (parsed[COOKIE]) return parsed[COOKIE]
    }
    return authSource.trim()
  }
  return null
}

export async function createSession(sql, userId, userProfile = null) {
  let user = userProfile
  if (!user && sql) {
    try {
      const [u] = await sql`SELECT id, email, full_name, initials, role FROM users WHERE id=${userId} LIMIT 1`
      user = u
    } catch {}
  }
  const token = signJwt({
    sub: userId,
    email: user?.email || '',
    name: user?.full_name || '',
    initials: user?.initials || '',
    role: user?.role || 'researcher'
  }, DAYS * 86400)

  const expires = new Date(Date.now() + DAYS * 86400000)
  if (sql) {
    try {
      await sql`INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash(token)}, ${expires.toISOString()}) ON CONFLICT (token_hash) DO NOTHING`
    } catch (e) {
      console.warn('[auth] session insert warning:', e.message)
    }
  }
  return token
}

export async function getSessionUser(sql, authSource) {
  const token = extractToken(authSource)
  if (!token) return null

  // 1. Verify JWT signature & expiration
  const jwt = verifyJwt(token)
  if (jwt && jwt.sub) {
    if (sql) {
      try {
        const [user] = await sql`SELECT u.id, u.email, u.full_name, u.initials, u.role FROM users u WHERE u.id=${jwt.sub} LIMIT 1`
        if (user) return user
      } catch (err) {
        console.warn('[auth] getSessionUser SQL lookup failed:', err.message)
      }
    } else {
      return { id: jwt.sub, email: jwt.email, full_name: jwt.name, initials: jwt.initials, role: jwt.role }
    }
  }

  // 2. Legacy / database fallback token
  if (sql) {
    try {
      const [user] = await sql`SELECT u.id, u.email, u.full_name, u.initials, u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>now() LIMIT 1`
      return user || null
    } catch (err) {
      console.warn('[auth] getSessionUser session fallback lookup failed:', err.message)
    }
  }

  return null
}

export async function destroySession(sql, authSource) {
  const token = extractToken(authSource)
  if (token && sql) {
    try {
      await sql`DELETE FROM auth_sessions WHERE token_hash=${tokenHash(token)}`
    } catch {}
  }
}
