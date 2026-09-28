// SallyIP Client Authentication & 7-Day JWT Cache Layer

export const JWT_KEY = 'sallyip_jwt'
export const USER_KEY = 'sallyip_user'
export const EXPIRY_KEY = 'sallyip_auth_expires_at'
export const REMEMBERED_EMAIL_KEY = 'sallyip_remembered_email'
export const LEGACY_USER_KEY = 'sallyip-user'
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Persist user and JWT in cache with 7 days expiration
 */
export function saveAuthSession({ user, token, expiresAt }) {
  if (!user) return null
  const expTime = expiresAt ? new Date(expiresAt).getTime() : (Date.now() + SEVEN_DAYS_MS)

  try {
    if (token) {
      localStorage.setItem(JWT_KEY, token)
    }
    localStorage.setItem(EXPIRY_KEY, String(expTime))
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user))
  } catch (err) {
    console.warn('[client-auth] localStorage write failed:', err)
  }

  return { user, token, expiresAt: expTime }
}

/**
 * Get stored authentication session if valid and within 7 days
 */
export function getStoredAuth() {
  try {
    const token = localStorage.getItem(JWT_KEY)
    const expStr = localStorage.getItem(EXPIRY_KEY)
    const userStr = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY)

    if (!userStr) return null

    const expiry = Number(expStr)
    // If expired (> 7 days), purge cache
    if (expStr && !isNaN(expiry) && Date.now() >= expiry) {
      clearAuthSession()
      return null
    }

    const user = JSON.parse(userStr)
    if (!user || !user.email) {
      clearAuthSession()
      return null
    }

    return { token: token || null, user, expiresAt: expiry || (Date.now() + SEVEN_DAYS_MS) }
  } catch {
    clearAuthSession()
    return null
  }
}

/**
 * Check if the user is currently authenticated with a valid session
 */
export function isAuthenticated() {
  const auth = getStoredAuth()
  return Boolean(auth && auth.user && auth.user.email)
}

/**
 * Clear cached session and tokens
 */
export function clearAuthSession() {
  try {
    localStorage.removeItem(JWT_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    localStorage.removeItem(LEGACY_USER_KEY)
    localStorage.removeItem('sally_exhibition_auth')
    sessionStorage.removeItem('sally_exhibition_auth')
  } catch {}
}

/**
 * Save remembered email for login convenience
 */
export function saveRememberedEmail(email) {
  try {
    if (email && typeof email === 'string') {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase())
    }
  } catch {}
}

/**
 * Get remembered email
 */
export function getRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * Clear remembered email
 */
export function clearRememberedEmail() {
  try {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  } catch {}
}

/**
 * Returns Authorization header with JWT if present
 */
export function getAuthHeaders(customHeaders = {}) {
  const auth = getStoredAuth()
  const headers = { ...customHeaders }
  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`
  }
  return headers
}

/**
 * Authenticated fetch helper attaching Bearer token and credentials
 */
export async function authFetch(url, options = {}) {
  const headers = getAuthHeaders(options.headers || {})
  const opts = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  }
  return fetch(url, opts)
}

/**
 * Verify session against server /api/auth
 */
export async function verifySessionWithServer() {
  const stored = getStoredAuth()
  try {
    const res = await authFetch('/api/auth')
    if (res.ok) {
      const data = await res.json()
      if (data?.user) {
        saveAuthSession({
          user: data.user,
          token: data.token || stored?.token || null,
          expiresAt: data.expires_at || stored?.expiresAt,
        })
        return { ok: true, user: data.user, token: data.token || stored?.token }
      }
    }
    if (res.status === 401) {
      clearAuthSession()
      return { ok: false, error: 'Unauthorized' }
    }
  } catch (err) {
    // If server unreachable but local cache not expired, allow offline grace
    if (stored && stored.user) {
      return { ok: true, user: stored.user, token: stored.token, offline: true }
    }
  }
  return { ok: false, error: 'Session invalid' }
}
