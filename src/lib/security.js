const ROLE_RANK = { viewer: 0, researcher: 1, admin: 2, owner: 3 }

export function roleRank(role) {
  return ROLE_RANK[role] ?? -1
}

export function requireRole(user, minRole = 'researcher') {
  const need = ROLE_RANK[minRole]
  if (need === undefined) throw new Error('Invalid role requirement')
  if (!user || roleRank(user.role) < need) {
    const error = new Error(`Requires ${minRole} role or higher`)
    error.code = 'FORBIDDEN'
    throw error
  }
}

export const requireEditor = (user) => requireRole(user, 'researcher')

export function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim().slice(0, 80)
  return String(req?.socket?.remoteAddress || req?.headers?.['x-real-ip'] || '').slice(0, 80) || null
}

export async function logSecurityEvent(sql, { userId = null, event_type, req = null, metadata = {} } = {}) {
  if (!event_type) throw new Error('event_type is required')
  try {
    await sql`INSERT INTO security_events(user_id, event_type, ip, user_agent, metadata) VALUES(${userId}, ${String(event_type).slice(0, 80)}, ${req ? getClientIp(req) : null}, ${req ? String(req.headers?.['user-agent'] || '').slice(0, 300) : null}, ${JSON.stringify(metadata)}::jsonb)`
  } catch {
    // Audit must never break the request path.
  }
}

export async function recordLoginAttempt(sql, identifier) {
  const id = String(identifier || '').toLowerCase().slice(0, 160)
  if (!id) return
  await sql`INSERT INTO login_attempts(identifier) VALUES(${id})`
  await sql`DELETE FROM login_attempts WHERE attempted_at < now() - interval '30 minutes'`
}

export async function loginBlocked(sql, identifier, { max = 10, windowMinutes = 10 } = {}) {
  const id = String(identifier || '').toLowerCase().slice(0, 160)
  if (!id) return false
  const [row] = await sql`SELECT count(*)::int AS n FROM login_attempts WHERE identifier=${id} AND attempted_at > now() - (${windowMinutes} || ' minutes')::interval`
  return (row?.n || 0) >= max
}
