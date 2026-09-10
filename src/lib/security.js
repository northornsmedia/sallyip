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

export async function logSecurityEvent(sql, { userId = null, event_type, req = null, metadata = {}, organization_id = null, matter_id = null, action = null, resource = null, result = null, request_id = null, severity = 'info' } = {}) {
  if (!event_type) throw new Error('event_type is required')
  const redacted = redactConfidential(metadata);
  const row = {
    event_id: `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor: userId,
    organization: organization_id,
    matter: matter_id,
    action: action || event_type,
    resource,
    result: result || 'ok',
    request_id,
    severity,
  };
  try {
    await sql`INSERT INTO security_events(user_id, event_type, ip, user_agent, metadata) VALUES(${userId}, ${String(event_type).slice(0, 80)}, ${req ? getClientIp(req) : null}, ${req ? String(req.headers?.['user-agent'] || '').slice(0, 300) : null}, ${JSON.stringify({ ...row, metadata: redacted })}::jsonb)`
    return { ok: true, ...row };
  } catch (writeError) {
    // Phase 4: failure must be observable — fallback sink + throw a typed error the caller can count.
    try { console.error('[security-audit-fallback]', JSON.stringify({ ...row, event_type, writeError: String(writeError?.message || writeError) })); } catch {}
    const error = new Error('Security audit write failed');
    error.code = 'AUDIT_WRITE_FAILED';
    error.event = row;
    throw error;
  }
}

const CONFIDENTIAL_KEYS = ['content', 'document', 'disclosure', 'draft', 'invention', 'contract_text', 'evidence_text', 'client_message', 'prompt', 'passage'];

export function redactConfidential(obj = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(out)) {
    if (CONFIDENTIAL_KEYS.some((k) => key.toLowerCase().includes(k))) out[key] = '[REDACTED]';
    else if (typeof out[key] === 'string' && out[key].length > 2000) out[key] = String(out[key]).slice(0, 2000) + '…[TRUNCATED]';
    else if (out[key] && typeof out[key] === 'object') out[key] = redactConfidential(out[key]);
  }
  return out;
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
