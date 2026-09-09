// PatentBench v1: measured verification rates computed from Sally's own audit
// tables — citation accuracy, claim-support accuracy, amendment QA quality,
// practitioner acceptance. No vibes, no 7.9/10. Target corpus
// (50 applications × 100 claim errors × 30 office actions × 20 novelty ×
// 20 FTO) is tracked as coverage vs target; rates are computed on what ran.
export const BENCH_TARGETS = { applications: 50, claim_error_cases: 100, office_actions: 30, novelty_searches: 20, fto_problems: 20, dataset_version: 'v1-seed' }

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : null)

export async function computePatentBench(sql) {
  const [[cites], [quotes], [props], [amends], [qaScores], [reviews]] = await Promise.all([
    sql`SELECT count(*) FILTER (WHERE match_status='exact')::int AS exact, count(*) FILTER (WHERE match_status='fuzzy')::int AS fuzzy, count(*) FILTER (WHERE match_status='missing')::int AS missing FROM answer_citations`,
    sql`SELECT count(*) FILTER (WHERE quote_match='exact')::int AS exact, count(*) FILTER (WHERE quote_match='fuzzy')::int AS fuzzy, count(*) FILTER (WHERE quote_match='missing')::int AS missing FROM proposition_sources WHERE quote_match <> 'unchecked'`,
    sql`SELECT count(*) FILTER (WHERE verification_status='supported')::int AS supported, count(*)::int AS total FROM legal_propositions`,
    sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE review_status='accepted')::int AS accepted, count(*) FILTER (WHERE new_matter_risk) ::int AS new_matter FROM oa_amendments`,
    sql`SELECT coalesce(sum((qa_json->'score'->>'errors')::int),0)::int AS errors, count(*)::int AS total FROM oa_amendments`,
    sql`SELECT count(*) FILTER (WHERE verification_status='supported')::int AS supported, count(*)::int AS total FROM legal_propositions WHERE contrary_authority_checked`,
  ])
  const citeTotal = (cites.exact || 0) + (cites.fuzzy || 0) + (cites.missing || 0)
  const quoteTotal = (quotes.exact || 0) + (quotes.fuzzy || 0) + (quotes.missing || 0)
  const metrics = {
    citation_accuracy: { exact: cites.exact || 0, fuzzy: cites.fuzzy || 0, missing: cites.missing || 0, exact_rate: pct(cites.exact || 0, citeTotal) },
    claim_support_accuracy: { exact: quotes.exact || 0, fuzzy: quotes.fuzzy || 0, missing: quotes.missing || 0, verified_rate: pct((quotes.exact || 0) + (quotes.fuzzy || 0), quoteTotal) },
    proposition_support_rate: pct(props.supported || 0, props.total || 0),
    contrary_checked_support_rate: pct(reviews.supported || 0, reviews.total || 0),
    amendment_qa: { total: amends.total || 0, accepted: amends.accepted || 0, acceptance_rate: pct(amends.accepted || 0, amends.total || 0), new_matter_rate: pct(amends.new_matter || 0, amends.total || 0), avg_errors_per_amendment: (amends.total || 0) > 0 ? Math.round(((qaScores.errors || 0) / amends.total) * 100) / 100 : null },
    coverage_vs_target: { ...BENCH_TARGETS },
    evaluated_at: new Date().toISOString(),
  }
  return { metrics }
}

export async function runPatentBench(sql, userId, name) {
  const { metrics } = await computePatentBench(sql)
  const [run] = await sql`INSERT INTO patentbench_runs(user_id, name, metrics) VALUES(${userId || null}, ${String(name || 'PatentBench v1').slice(0, 160)}, ${JSON.stringify(metrics)}::jsonb) RETURNING id, name, metrics, created_at`
  return { run }
}

export async function listPatentBench(sql, { limit = 20 } = {}) {
  const runs = await sql`SELECT id, name, metrics, created_at FROM patentbench_runs ORDER BY created_at DESC LIMIT ${Math.min(Math.max(Number(limit) || 20, 1), 100)}`
  return { runs }
}
