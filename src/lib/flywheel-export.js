const MAX_ROWS = 5000

export async function exportGroundingPairs(sql, userId, { limit = 1000 } = {}) {
  const rows = await sql`
    SELECT p.proposition AS claim, ps.support_type AS verdict, ps.quote, ps.quote_match AS match,
           left(sp.content, 2000) AS evidence, s.title AS source_title, s.authority_tier
    FROM proposition_sources ps
    JOIN legal_propositions p ON p.id = ps.proposition_id
    JOIN source_passages sp ON sp.id = ps.passage_id
    JOIN legal_sources s ON s.id = sp.source_id
    WHERE p.user_id = ${userId} AND ps.quote_match IN ('exact', 'fuzzy')
    ORDER BY p.created_at DESC
    LIMIT ${Math.min(Math.max(Number(limit) || 1000, 1), MAX_ROWS)}`
  return rows.map(r => JSON.stringify({ claim: r.claim, evidence: r.evidence, verdict: r.verdict, quote: r.quote, match: r.match, source_title: r.source_title, authority_tier: r.authority_tier })).join('\n')
}

export async function exportRiskPairs(sql, userId, { limit = 1000 } = {}) {
  const rows = await sql`
    SELECT c.heading, left(c.body, 2000) AS body, c.risk_level, c.note, k.contract_type
    FROM legal_contract_clauses c
    JOIN legal_contracts k ON k.id = c.contract_id
    WHERE k.user_id = ${userId}
    ORDER BY k.updated_at DESC
    LIMIT ${Math.min(Math.max(Number(limit) || 1000, 1), MAX_ROWS)}`
  return rows.map(r => JSON.stringify({ heading: r.heading, body: r.body, risk_level: r.risk_level, note: r.note, contract_type: r.contract_type })).join('\n')
}

export async function flywheelCounts(sql, userId) {
  const [g] = await sql`SELECT count(*)::int AS n FROM proposition_sources ps JOIN legal_propositions p ON p.id = ps.proposition_id WHERE p.user_id = ${userId} AND ps.quote_match IN ('exact', 'fuzzy')`
  const [r] = await sql`SELECT count(*)::int AS n FROM legal_contract_clauses c JOIN legal_contracts k ON k.id = c.contract_id WHERE k.user_id = ${userId}`
  return { grounding_pairs: g?.n || 0, risk_pairs: r?.n || 0 }
}
