// Auth guards — Phase 3 hardening.
// Dev fallback (aman@sallyip.com) must NEVER be reachable in production.

export function isProduction(env = process.env) {
  return String(env.NODE_ENV || env.VERCEL_ENV || '').toLowerCase() === 'production' ||
    String(env.SALLYIP_ENV || '').toLowerCase() === 'production';
}

export function assertNoDevFallback({ env = process.env, caller = 'resolveDevUser' } = {}) {
  if (isProduction(env)) {
    const error = new Error(
      `Security: dev authentication fallback (${caller}) is blocked in production.`
    );
    error.code = 'DEV_FALLBACK_BLOCKED';
    throw error;
  }
  return true;
}

export function requireSecureCookie({ env = process.env, secure } = {}) {
  // In production Secure is mandatory; HttpOnly + SameSite=Lax are set by sessionCookie().
  if (isProduction(env) && secure !== true) {
    const error = new Error('Security: Secure cookie required in production.');
    error.code = 'INSECURE_COOKIE_BLOCKED';
    throw error;
  }
  return true;
}

export function sessionCookieOptions({ env = process.env } = {}) {
  const prod = isProduction(env);
  return {
    httpOnly: true,
    secure: prod,
    sameSite: 'Lax',
    path: '/',
    maxAgeDays: 30,
  };
}
