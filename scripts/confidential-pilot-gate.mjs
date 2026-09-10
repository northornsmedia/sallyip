#!/usr/bin/env node
// Confidential pilot gate — machine-readable. Fails closed unless ALL conditions hold.
// Output: CONFIDENTIAL_PILOT_ALLOWED or CONFIDENTIAL_PILOT_BLOCKED + JSON reasons.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const reasons = [];
const pass = [];
const check = (name, ok, detail = '') => { (ok ? pass : reasons).push(`${name}${detail ? ` — ${detail}` : ''}`); };

// 1. Approved confidential chat provider (explicit config, never auto-approved).
{
  const approved = process.env.SALLYIP_APPROVE_GEMINI_CONFIDENTIAL === '1';
  const primary = (process.env.SALLYIP_PRIMARY_MODEL || 'gemini-3.7-flash').trim();
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env[process.env.SALLYIP_PRIMARY_KEY || ''] || process.env.OPENROUTER_API_KEY);
  const free = /:free$/i.test(primary);
  check('approved-confidential-chat', approved && primary && hasKey && !free, approved ? `primary=${primary} free=${free} key=${hasKey}` : 'SALLYIP_APPROVE_GEMINI_CONFIDENTIAL!=1 or free primary');
}
// 2. Approved confidential embedding path (non-free + key).
{
  const model = (process.env.SALLYIP_EMBEDDING_MODEL || 'liquid/lfm-2.5-embedding-350m:free').trim();
  const free = /:free$/i.test(model);
  const hasKey = !!process.env.OPENROUTER_EMBEDDING_API_KEY;
  check('approved-confidential-embedding', !free && hasKey, `model=${model}`);
}
// 3. No free-model confidential fallback (code gate present).
{
  let ok = false;
  try {
    const a = fs.readFileSync(new URL('../src/lib/sally-orchestrator.js', import.meta.url), 'utf8');
    const b = fs.readFileSync(new URL('../src/lib/provider-policy.js', import.meta.url), 'utf8');
    ok = a.includes('assertChatAllowed') && a.includes('enforcedPipeline') && b.includes('CONFIDENTIAL_PROVIDER_UNAVAILABLE');
  } catch {}
  check('no-free-confidential-fallback', ok, ok ? '' : 'policy gate missing');
}
// 4/5. RLS applied + least-privilege role (live read-only proof; owner/bypass fails).
{
  let ok = false, detail = 'no live evidence';
  try {
    const { neon } = await import('@neondatabase/serverless');
    if (!process.env.DATABASE_URL) { detail = 'DATABASE_URL absent'; }
    else {
      const sql = neon(process.env.DATABASE_URL);
      const [flags] = await sql`SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`;
      const rls = await sql`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity`;
      const roles = await sql`SELECT rolname FROM pg_roles WHERE rolname IN ('sally_app','sally_readonly')`;
      const names = (roles || []).map((r) => r.rolname);
      const appUrl = !!process.env.DATABASE_URL_APP;
      ok = flags?.rolbypassrls === false && (rls?.[0]?.n || 0) > 0 && names.includes('sally_app') && appUrl;
      detail = `bypass=${flags?.rolbypassrls} rls=${rls?.[0]?.n} roles=${names.join(',')} appUrl=${appUrl}`;
    }
  } catch (e) { detail = String(e?.message || e).slice(0, 120); }
  check('rls-applied-and-verified', ok, detail);
  check('least-privilege-app-role', ok, detail);
}
// 6. Cross-tenant integration (requires staging proof artifact; unit-only is insufficient).
{
  const staged = process.env.RLS_STAGING_VERIFIED === '1';
  check('cross-tenant-integration', staged, staged ? '' : 'no staging sally_app adversarial proof');
}
// 7. All ingestion routes file-safe.
{
  let ok = false;
  try {
    const n = fs.readFileSync(new URL('../src/lib/document-ingestion-local.js', import.meta.url), 'utf8');
    const p = fs.readFileSync(new URL('../api/ingest-document.py', import.meta.url), 'utf8');
    ok = n.includes('validateUpload') && p.includes('BLOCKED_TYPE');
  } catch {}
  check('ingestion-file-safe', ok, ok ? '' : 'ingestion wiring missing');
}
// 8. Production auth tests pass.
{
  let ok = false;
  try {
    execSync('node --test tests/security/auth-hardening.test.mjs', { stdio: 'pipe' });
    ok = true;
  } catch {}
  check('production-auth-tests', ok, ok ? '' : 'auth-hardening tests fail');
}
// 9. Audit coverage threshold (100% of security-relevant handlers).
{
  let ok = false, detail = '';
  try {
    const dir = new URL('../api/_handlers/', import.meta.url);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
    const audited = files.filter((f) => fs.readFileSync(new URL(`../api/_handlers/${f}`, import.meta.url), 'utf8').includes('logSecurityEvent'));
    // Security-relevant set for this gate:
    const relevant = ['auth.js', 'matters.js', 'generated-files.js', 'workflows.js', 'embeddings.js', 'rerank.js', 'artifacts.js', 'contracts.js', 'playbooks.js', 'sources.js', 'conversations.js'];
    const missing = relevant.filter((f) => !audited.includes(f));
    ok = missing.length === 0;
    detail = ok ? `${audited.length}/${files.length} audited` : `missing: ${missing.join(',')}`;
  } catch (e) { detail = String(e?.message || e).slice(0, 120); }
  check('audit-coverage', ok, detail);
}
// 10. Production build passes.
{
  let ok = false;
  try {
    execSync('npm run build --silent', { stdio: 'pipe' });
    ok = true;
  } catch {}
  check('production-build', ok, ok ? '' : 'vite build fails');
}

if (!reasons.length) {
  console.log('CONFIDENTIAL_PILOT_ALLOWED');
  console.log(JSON.stringify({ verdict: 'ALLOWED', passed: pass }, null, 2));
} else {
  console.log('CONFIDENTIAL_PILOT_BLOCKED');
  console.log(JSON.stringify({ verdict: 'BLOCKED', passed: pass, blocked: reasons }, null, 2));
  process.exit(1);
}
