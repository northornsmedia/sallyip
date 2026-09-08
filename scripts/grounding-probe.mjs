// Grounding probe: fixed prompts against a live server to compare engine
// configurations before/after the big-model swap. Results persist to eval_runs.
//
// Usage (PowerShell):
//   $env:BASE_URL='http://localhost:5173'; $env:PROBE_EMAIL='you@x.co'; $env:PROBE_PASSWORD='...'; $env:PROBE_MATTER_ID='<uuid>'
//   node --env-file=.env.local scripts/grounding-probe.mjs
const BASE = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')

const PROBES = [
  { key: 'cited_summary', prompt: 'Summarise the key facts of this matter. Cite every material claim with pinpoint labels like [S1], [S2].' },
  { key: 'risks', prompt: 'What are the main risks visible in the matter documents? Cite each risk claim as [S1], [S2], and say what is missing.' },
  { key: 'general_control', prompt: 'What is the capital of France? Answer in one sentence.' },
  { key: 'unanswerable', prompt: 'Quote the exact passage that states the authorised signatory for this matter.' },
]

const email = process.env.PROBE_EMAIL, password = process.env.PROBE_PASSWORD, matterId = process.env.PROBE_MATTER_ID
if (!email || !password || !matterId) throw new Error('Set PROBE_EMAIL, PROBE_PASSWORD and PROBE_MATTER_ID')

let cookie = ''
const api = async (path, body) => {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${data?.error?.message || ''}`)
  return data
}

await api('/api/auth', { action: 'login', email, password })
const results = []
for (const probe of PROBES) {
  const started = Date.now()
  try {
    const data = await api('/api/chat', { messages: [{ role: 'user', content: probe.prompt }], matter_id: matterId })
    const guard = data.sally_meta?.citation_guard || {}
    results.push({ key: probe.key, ok: true, ms: Date.now() - started, cited: guard.cited || [], dangling: guard.dangling || [], supported: guard.supported ?? null, chars: (data.choices?.[0]?.message?.content || '').length })
  } catch (error) {
    results.push({ key: probe.key, ok: false, error: String(error.message).slice(0, 120) })
  }
  console.log(JSON.stringify(results.at(-1)))
}

// Persist aggregate next to eval_runs snapshots (same DB the server uses).
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const [me] = await sql`SELECT id FROM users WHERE email=${email.toLowerCase()}`
const ok = results.filter(r => r.ok)
const metrics = {
  probe: {
    prompts: results.length, answered: ok.length,
    supported_answers: ok.filter(r => r.supported).length,
    total_dangling: ok.reduce((n, r) => n + (r.dangling?.length || 0), 0),
    total_cited: ok.reduce((n, r) => n + (r.cited?.length || 0), 0),
    avg_latency_ms: ok.length ? Math.round(ok.reduce((n, r) => n + r.ms, 0) / ok.length) : null,
    primary_model: process.env.SALLYIP_PRIMARY_MODEL || 'default-fleet',
    results,
  },
}
const [run] = await sql`INSERT INTO eval_runs(user_id, name, metrics) VALUES(${me?.id || null}, ${'grounding probe ' + new Date().toISOString().slice(0, 10)}, ${JSON.stringify(metrics)}::jsonb) RETURNING id`
console.log('PROBE_RUN:' + run.id)
