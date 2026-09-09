import { auditAmendment } from './claim-qa-service.js'

// Office Action Workspace service. Parses pasted OA text into candidate
// rejections, maps them to claims, and reviews proposed amendments through
// the shared Claim QA Engine before anything is accepted.
const STATUTE = /35\s*U\.?\s*S\.?\s*C\.?\s*§?\s*1\s*(0[123]|12)|§\s*1\s*(0[123]|12)\b/gi
const CLAIM_REF = /\bclaims?\s+((?:\d+\s*(?:[,–-]|and|or)?\s*)+)/gi
const USPN = /\bUS\s?(\d{7,8})\s?([A-Z]\d?)?\b/g

function expandNumbers(text) {
  const out = new Set()
  for (const part of String(text || '').split(/,|\band\b|\bor\b/)) {
    const range = part.match(/(\d+)\s*[–-]\s*(\d+)/)
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])]
      for (let n = Math.min(a, b); n <= Math.max(a, b) && n <= Math.min(a, b) + 60; n++) out.add(n)
    } else {
      const single = part.match(/\d+/)
      if (single) out.add(Number(single[0]))
    }
  }
  return [...out].sort((a, b) => a - b).slice(0, 60)
}

export function detectRejectionType(block) {
  const text = String(block || '')
  if (/\b35\s*U\.?\s*S\.?\s*C\.?\s*§?\s*101\b|§\s*101\b|subject matter|abstract idea|Alice|Mayo/i.test(text)) return '101'
  if (/\b35\s*U\.?\s*S\.?\s*C\.?\s*§?\s*103\b|§\s*103\b|obvious/i.test(text)) return '103'
  if (/\b35\s*U\.?\s*S\.?\s*C\.?\s*§?\s*102\b|§\s*102\b|anticipat/i.test(text)) return '102'
  if (/\b35\s*U\.?\s*S\.?\s*C\.?\s*§?\s*112\b|§\s*112\b|indefinite|written description|enablement|antecedent/i.test(text)) return '112'
  return 'other'
}

// Split OA text into candidate rejection blocks. Heuristic and labelled as
// such: every candidate requires practitioner confirmation.
export function parseOaRejections(oaText) {
  const text = String(oaText || '')
  if (text.trim().length < 40) return []
  const blocks = text.split(/\n\s*\n|(?=^ *(?:rejection|objection|claim rejections?|35 U\.?\s*S\.?\s*C)\b)/gim).map(b => b.trim()).filter(b => b.length > 30)
  const candidates = []
  for (const block of blocks.slice(0, 40)) {
    const hasStatute = STATUTE.test(block)
    STATUTE.lastIndex = 0
    const hasRejectionWord = /\breject|objection\b/i.test(block)
    if (!hasStatute && !hasRejectionWord) continue
    const type = detectRejectionType(block)
    const claimSets = [...block.matchAll(CLAIM_REF)].map(m => m[1])
    const claims = [...new Set(claimSets.flatMap(expandNumbers))].slice(0, 60)
    const references = [...new Set([...block.matchAll(USPN)].map(m => `US${m[1]}${m[2] || ''}`))].slice(0, 12)
    candidates.push({ rejection_type: type, claim_numbers: claims, references_json: references.map(r => ({ patent_number: r })), examiner_excerpt: block.slice(0, 1200) })
  }
  if (!candidates.length) {
    candidates.push({ rejection_type: detectRejectionType(text) === 'other' ? 'other' : detectRejectionType(text), claim_numbers: [], references_json: [], examiner_excerpt: text.slice(0, 1200) })
  }
  return candidates
}

async function actionForUser(sql, userId, actionId) {
  const [action] = await sql`SELECT * FROM office_actions WHERE id=${actionId} AND user_id=${userId}`
  if (!action) throw new Error('Office action not found')
  return action
}

export async function listOfficeActions(sql, userId, matterId) {
  const actions = await sql`SELECT a.*, (SELECT count(*)::int FROM oa_rejections r WHERE r.action_id=a.id) AS rejection_count, (SELECT count(*)::int FROM oa_amendments m WHERE m.action_id=a.id) AS amendment_count FROM office_actions a WHERE a.user_id=${userId} AND (${matterId}::uuid IS NULL OR a.matter_id=${matterId}) ORDER BY a.updated_at DESC LIMIT 100`
  return { actions }
}

export async function getOfficeAction(sql, userId, actionId) {
  const action = await actionForUser(sql, userId, actionId)
  const rejections = await sql`SELECT * FROM oa_rejections WHERE action_id=${action.id} ORDER BY created_at`
  const amendments = await sql`SELECT * FROM oa_amendments WHERE action_id=${action.id} ORDER BY created_at`
  return { action, rejections, amendments }
}

export async function createOfficeAction(sql, userId, body) {
  if (body.matter_id) {
    const [matter] = await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`
    if (!matter) throw new Error('Matter not found')
  }
  const title = String(body.title || 'Office action').slice(0, 200)
  const [action] = await sql`INSERT INTO office_actions(user_id, matter_id, patent_entity_id, title, oa_type, mailing_date) VALUES(${userId}, ${body.matter_id || null}, ${body.patent_entity_id || null}, ${title}, ${['non-final', 'final', 'advisory', 'restriction', 'other'].includes(body.oa_type) ? body.oa_type : 'non-final'}, ${/^\d{4}-\d{2}-\d{2}$/.test(String(body.mailing_date || '')) ? body.mailing_date : null}) RETURNING *`
  const candidates = parseOaRejections(body.oa_text || '')
  for (const candidate of candidates) {
    await sql`INSERT INTO oa_rejections(action_id, rejection_type, claim_numbers, references_json, examiner_excerpt) VALUES(${action.id}, ${candidate.rejection_type}, ${candidate.claim_numbers}, ${JSON.stringify(candidate.references_json)}::jsonb, ${candidate.examiner_excerpt})`
  }
  return getOfficeAction(sql, userId, action.id)
}

// Proposed amendment runs through the Claim QA Engine immediately; nothing is
// accepted without review. Original text resolves from matter claims when the
// patent entity is known, else the caller supplies it.
export async function proposeAmendment(sql, userId, body) {
  const action = await actionForUser(sql, userId, body.action_id)
  const amended = String(body.amended_text || '').trim()
  if (amended.length < 20) throw new Error('Amended claim text is required')
  let original = String(body.original_text || '').trim()
  if (!original && body.claim_number) {
    const [row] = await sql`SELECT pc.claim_text FROM patent_claims pc JOIN ip_entities e ON e.id=pc.patent_entity_id WHERE pc.user_id=${userId} AND pc.claim_number=${body.claim_number} ORDER BY pc.created_at DESC LIMIT 1`
    if (row) original = row.claim_text
  }
  if (!original) throw new Error('Original claim text is required (or a parsed claim number from this matter)')
  let specText = ''
  if (action.matter_id) {
    const passages = await sql`SELECT sp.content FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE s.user_id=${userId} AND s.matter_id=${action.matter_id} ORDER BY s.created_at LIMIT 60`
    specText = passages.map(p => p.content).join('\n\n').slice(0, 60000)
  }
  const qa = auditAmendment(original, amended, { specText })
  const [amendment] = await sql`INSERT INTO oa_amendments(action_id, rejection_id, claim_number, original_text, amended_text, strategy, qa_json, new_matter_risk) VALUES(${action.id}, ${body.rejection_id || null}, ${body.claim_number || null}, ${original.slice(0, 8000)}, ${amended.slice(0, 8000)}, ${['broad', 'moderate', 'conservative'].includes(body.strategy) ? body.strategy : 'moderate'}, ${JSON.stringify({ score: qa.score, findings: qa.findings.slice(0, 40), added_terms: qa.added_terms || [] })}::jsonb, ${qa.findings.some(f => f.check === 'new-matter')}) RETURNING *`
  await sql`UPDATE office_actions SET status='in_review', updated_at=now() WHERE id=${action.id}`
  return { amendment, qa: { score: qa.score, findings: qa.findings } }
}

export async function reviewAmendment(sql, userId, body) {
  const action = await actionForUser(sql, userId, body.action_id)
  const [amendment] = await sql`SELECT * FROM oa_amendments WHERE id=${body.amendment_id} AND action_id=${action.id}`
  if (!amendment) throw new Error('Amendment not found')
  if (!['accepted', 'rejected'].includes(body.review_status)) throw new Error('Invalid review status')
  await sql`UPDATE oa_amendments SET review_status=${body.review_status} WHERE id=${amendment.id}`
  if (body.review_status === 'accepted') {
    await sql`UPDATE oa_rejections SET status='addressed' WHERE id=${amendment.rejection_id}`
  }
  return getOfficeAction(sql, userId, action.id)
}
