const RED = [/unlimited[\s\S]{0,30}liability|liability[\s\S]{0,30}unlimited/i, /unlimited indemn/i, /perpetual[\s\S]{0,40}irrevocable/i, /irrevocable[\s\S]{0,40}perpetual/i, /waiv[\w]* moral rights/i, /sole discretion/i]
const AMBER = [/indemnif/i, /liquidated damages/i, /non-?compete/i, /exclusiv/i, /auto-?renew/i, /without notice/i, /penalt/i, /unilateral/i, /termination for convenience/i]

export function flagClause(heading, body) {
  const text = `${heading}\n${body}`
  if (RED.some(r => r.test(text))) return { risk_level: 'red', note: 'High-risk language — requires lawyer review.' }
  if (AMBER.some(r => r.test(text))) return { risk_level: 'amber', note: 'Non-standard or negotiable — check playbook position.' }
  return { risk_level: 'green', note: null }
}

export function splitClauses(content) {
  const parts = String(content || '').split(/^##\s+/m).map(s => s.trim()).filter(Boolean)
  if (!parts.length) return [{ ordinal: 1, heading: 'Agreement', body: String(content || '').slice(0, 8000) }]
  const hasTitle = !/^##\s/.test(String(content || '').trim()) && parts.length > 1
  const body = hasTitle ? parts.slice(1) : parts
  return body.map((block, i) => {
    const lines = block.split('\n')
    return { ordinal: i + 1, heading: lines[0].slice(0, 160), body: block.slice(0, 8000) }
  })
}

export function fillTemplate(template, variables = {}) {
  let out = String(template.body_template || '')
  const missing = []
  for (const key of (template.variables || [])) {
    const v = variables[key]
    if (v === undefined || String(v).trim() === '') missing.push(key)
    else out = out.split(`{{${key}}}`).join(String(v))
  }
  if (/\{\{\w+\}\}/.test(out)) {
    const rest = [...new Set([...out.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
    missing.push(...rest.filter(k => !missing.includes(k)))
  }
  if (missing.length) throw new Error('Missing template variables: ' + missing.join(', '))
  return out
}

export async function listTemplates(sql) {
  const templates = await sql`SELECT slug, title, contract_type, jurisdiction, variables FROM legal_contract_templates ORDER BY contract_type, title`
  return { templates }
}

async function contractForUser(sql, userId, contractId) {
  const [c] = await sql`SELECT * FROM legal_contracts WHERE id=${contractId} AND user_id=${userId}`
  if (!c) throw new Error('Contract not found')
  return c
}

export async function getContract(sql, userId, contractId) {
  const contract = await contractForUser(sql, userId, contractId)
  const versions = await sql`SELECT version, created_at FROM legal_contract_versions WHERE contract_id=${contract.id} ORDER BY version DESC LIMIT 20`
  const clauses = await sql`SELECT ordinal, heading, risk_level, note FROM legal_contract_clauses WHERE contract_id=${contract.id} AND version=${contract.active_version} ORDER BY ordinal`
  const [active] = await sql`SELECT content FROM legal_contract_versions WHERE contract_id=${contract.id} AND version=${contract.active_version}`
  return { contract, versions, clauses, content: active?.content || '' }
}

export async function createContract(sql, userId, body) {
  const [template] = body.template_slug ? await sql`SELECT * FROM legal_contract_templates WHERE slug=${body.template_slug}` : [null]
  if (body.template_slug && !template) throw new Error('Template not found')
  if (body.matter_id) {
    const [m] = await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`
    if (!m) throw new Error('Matter not found')
  }
  const title = String(body.title || template?.title || 'Contract').slice(0, 200)
  const contractType = body.contract_type || template?.contract_type || 'general'
  const content = template ? fillTemplate(template, body.variables || {}) : String(body.content || '').trim()
  if (content.length < 20) throw new Error('Contract content is required')
  const [contract] = await sql`INSERT INTO legal_contracts(user_id, matter_id, template_id, title, contract_type, jurisdiction, status) VALUES(${userId}, ${body.matter_id || null}, ${template?.id || null}, ${title}, ${contractType}, ${body.jurisdiction || template?.jurisdiction || null}, 'draft') RETURNING *`
  await sql`INSERT INTO legal_contract_versions(contract_id, version, content, metadata, created_by) VALUES(${contract.id}, 1, ${content}, ${JSON.stringify({ template: template?.slug || null })}::jsonb, ${userId})`
  return getContract(sql, userId, contract.id)
}

export async function reviewContract(sql, userId, contractId) {
  const contract = await contractForUser(sql, userId, contractId)
  const [active] = await sql`SELECT content FROM legal_contract_versions WHERE contract_id=${contract.id} AND version=${contract.active_version}`
  const clauses = splitClauses(active?.content || '')
  await sql`DELETE FROM legal_contract_clauses WHERE contract_id=${contract.id} AND version=${contract.active_version}`
  for (const c of clauses) {
    const flag = flagClause(c.heading, c.body)
    await sql`INSERT INTO legal_contract_clauses(contract_id, version, ordinal, heading, body, risk_level, note) VALUES(${contract.id}, ${contract.active_version}, ${c.ordinal}, ${c.heading}, ${c.body}, ${flag.risk_level}, ${flag.note})`
  }
  await sql`UPDATE legal_contracts SET status='review', updated_at=now() WHERE id=${contract.id}`
  return getContract(sql, userId, contract.id)
}

export async function updateContract(sql, userId, contractId, body) {
  const contract = await contractForUser(sql, userId, contractId)
  const content = String(body.content || '').trim()
  if (content.length < 20) throw new Error('Contract content is required')
  const next = contract.active_version + 1
  await sql`INSERT INTO legal_contract_versions(contract_id, version, content, metadata, created_by) VALUES(${contract.id}, ${next}, ${content}, ${JSON.stringify({ revised: true })}::jsonb, ${userId})`
  await sql`UPDATE legal_contracts SET active_version=${next}, title=${String(body.title || contract.title).slice(0, 200)}, status=${body.status || contract.status}, updated_at=now() WHERE id=${contract.id}`
  return getContract(sql, userId, contract.id)
}
