const countBy = (rows, key) => {
  const out = {}
  for (const row of rows) {
    const k = String(row[key] ?? 'unknown')
    out[k] = (out[k] || 0) + Number(row.n || 0)
  }
  return out
}

const rate = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : null)

export async function computeEvalMetrics(sql) {
  const [citations, propositionQuotes, propositions, sources, clauses, runs] = await Promise.all([
    sql`SELECT match_status, count(*)::int AS n FROM answer_citations GROUP BY match_status`,
    sql`SELECT quote_match, count(*)::int AS n FROM proposition_sources GROUP BY quote_match`,
    sql`SELECT verification_status, count(*)::int AS n FROM legal_propositions GROUP BY verification_status`,
    sql`SELECT CASE WHEN verified_at IS NULL THEN 'unverified' ELSE 'verified' END AS state, count(*)::int AS n FROM legal_sources GROUP BY 1`,
    sql`SELECT risk_level, count(*)::int AS n FROM legal_contract_clauses GROUP BY risk_level`,
    sql`SELECT status, count(*)::int AS n FROM legal_workflow_runs GROUP BY status`,
  ])
  const citationBy = countBy(citations, 'match_status')
  const citationTotal = Object.values(citationBy).reduce((a, b) => a + b, 0)
  const quoteBy = countBy(propositionQuotes, 'quote_match')
  const propBy = countBy(propositions, 'verification_status')
  const propTotal = Object.values(propBy).reduce((a, b) => a + b, 0)
  const sourceBy = countBy(sources, 'state')
  const sourceTotal = (sourceBy.verified || 0) + (sourceBy.unverified || 0)

  const metrics = {
    citations: { ...citationBy, total: citationTotal, exact_rate: rate(citationBy.exact || 0, citationTotal), unsupported_rate: rate(citationBy.missing || 0, citationTotal) },
    proposition_quotes: quoteBy,
    propositions: { ...propBy, total: propTotal, supported_rate: rate(propBy.supported || 0, propTotal) },
    sources: { ...sourceBy, total: sourceTotal, verified_rate: rate(sourceBy.verified || 0, sourceTotal) },
    contract_clauses: countBy(clauses, 'risk_level'),
    workflow_runs: countBy(runs, 'status'),
  }
  const gaps = []
  if (citationTotal > 0 && (citationBy.missing || 0) > 0) gaps.push(`${citationBy.missing} answer citation(s) quote text that was not found in the cited passage`)
  if ((quoteBy.missing || 0) > 0) gaps.push(`${quoteBy.missing} proposition source(s) rejected for quote mismatch`)
  if (sourceTotal > 0 && rate(sourceBy.verified || 0, sourceTotal) < 50) gaps.push(`only ${rate(sourceBy.verified || 0, sourceTotal)}% of sources are verified`)
  return { metrics, gaps, evaluated_at: new Date().toISOString() }
}

export async function runEval(sql, userId, name) {
  const result = await computeEvalMetrics(sql)
  const [run] = await sql`INSERT INTO eval_runs(user_id, name, metrics) VALUES(${userId || null}, ${String(name || 'quality snapshot').slice(0, 160)}, ${JSON.stringify(result)}::jsonb) RETURNING id, name, metrics, created_at`
  return { run }
}

export async function listEvalRuns(sql, { limit = 20 } = {}) {
  const runs = await sql`SELECT id, name, metrics, created_at FROM eval_runs ORDER BY created_at DESC LIMIT ${Math.min(Math.max(Number(limit) || 20, 1), 100)}`
  return { runs }
}
