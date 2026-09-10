const normalize = (s) => String(s || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// Canonical pre-clean for a model-claimed verbatim quote. Recognises standard
// legal quoting conventions WITHOUT weakening verbatimness (every remaining
// word must still match the source):
//  - trailing/embedded retrieval labels the extractor swept inside the span
//    (e.g. `"...requirements of this title [S1]."` — failures_27 s101-07)
//  - markdown emphasis inside quotes (e.g. `"process, machine, **manufacture**..."`)
//  - bracketed single-letter alterations for grammar/case (`[W]hoever`,
//    `[P]atentability`, `[i]ntegration` — failures_27 s101-04/s103-06/s103-10,
//    mpep-2106-04). Shared with verification-service so the record/verify API
//    and the answer guard grade the same span identically.
export function cleanQuoteText(quote) {
  let raw = String(quote || '').trim()
  raw = raw.replace(/\s*\[S\d+\]\.?/g, '').trim()
  raw = raw.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim()
  return raw.replace(/\[([A-Za-z])\]/g, '$1')
}

export function flipFirstLetter(word) {
  const s = String(word || '')
  if (!s) return s
  return (s.charAt(0).toUpperCase() === s.charAt(0) ? s.charAt(0).toLowerCase() : s.charAt(0).toUpperCase()) + s.slice(1)
}

export function verifyQuote(passageContent, quote) {
  const q = cleanQuoteText(quote)
  if (q.length < 8) throw new Error('Quote must be at least 8 characters for verification')
  const content = String(passageContent || '')
  if (content.includes(q)) return 'exact'
  const alt = flipFirstLetter(q)
  if (alt !== q && content.includes(alt)) return 'exact'
  const nContent = normalize(content), nQuote = normalize(q)
  if (nQuote.length >= 8 && nContent.includes(nQuote)) return 'fuzzy'
  return 'missing'
}

export async function recordAnswerCitations(sql, userId, { matter_id = null, conversation_id = null, agent_run_id = null, citations = [] } = {}) {
  if (!Array.isArray(citations) || !citations.length) throw new Error('At least one citation is required')
  if (citations.length > 50) throw new Error('Too many citations in one batch')
  if (matter_id) {
    const [m] = await sql`SELECT id FROM matters WHERE id=${matter_id} AND user_id=${userId}`
    if (!m) throw new Error('Matter not found')
  }
  const ids = [...new Set(citations.map(c => c.passage_id).filter(Boolean))]
  const rows = ids.length ? await sql`SELECT sp.id, sp.content FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id = ANY(${ids}::uuid[]) AND s.user_id=${userId}` : []
  const byId = new Map(rows.map(r => [r.id, r.content]))
  const results = []
  for (const c of citations) {
    const claim = String(c.claim_text || '').slice(0, 2000)
    const quote = String(c.quote || '').slice(0, 4000)
    if (!claim.trim()) throw new Error('Each citation needs claim_text')
    const content = byId.get(c.passage_id)
    const match = content === undefined ? 'missing' : verifyQuote(content, quote)
    const [row] = await sql`INSERT INTO answer_citations(user_id, matter_id, conversation_id, agent_run_id, claim_text, passage_id, quote, match_status) VALUES(${userId}, ${matter_id}, ${conversation_id}, ${agent_run_id}, ${claim}, ${content === undefined ? null : c.passage_id}, ${quote}, ${match}) RETURNING id, match_status`
    results.push({ id: row.id, passage_id: c.passage_id, match_status: row.match_status, known_passage: content !== undefined })
  }
  return {
    citations: results,
    stats: {
      exact: results.filter(r => r.match_status === 'exact').length,
      fuzzy: results.filter(r => r.match_status === 'fuzzy').length,
      missing: results.filter(r => r.match_status === 'missing').length,
    },
  }
}

export async function listAnswerCitations(sql, userId, { conversation_id = null, agent_run_id = null, matter_id = null } = {}) {
  let rows
  if (agent_run_id) rows = await sql`SELECT ac.*, left(sp.content, 300) passage_preview, s.title source_title, s.citation FROM answer_citations ac LEFT JOIN source_passages sp ON sp.id=ac.passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE ac.user_id=${userId} AND ac.agent_run_id=${agent_run_id} ORDER BY ac.created_at`
  else if (conversation_id) rows = await sql`SELECT ac.*, left(sp.content, 300) passage_preview, s.title source_title, s.citation FROM answer_citations ac LEFT JOIN source_passages sp ON sp.id=ac.passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE ac.user_id=${userId} AND ac.conversation_id=${conversation_id} ORDER BY ac.created_at DESC LIMIT 200`
  else if (matter_id) rows = await sql`SELECT ac.*, left(sp.content, 300) passage_preview, s.title source_title, s.citation FROM answer_citations ac LEFT JOIN source_passages sp ON sp.id=ac.passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE ac.user_id=${userId} AND ac.matter_id=${matter_id} ORDER BY ac.created_at DESC LIMIT 200`
  else throw new Error('Filter by agent_run_id, conversation_id, or matter_id')
  return { citations: rows }
}
