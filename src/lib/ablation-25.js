// SallyIP ablation-25 helpers (pure-local, no DB, no model calls).
// Extends the frozen ablation (src/lib/ablation.js, scripts/ablation-bench.mjs)
// WITHOUT modifying them: new metric + validation helpers for the
// benchmarks/ablation-25.json extension set (>=19 new SYNTHETIC fabrications).

export const ABLATION25_TYPES = [
  'fake statutes',
  'fake cases',
  'fake MPEP sections',
  'altered quotations',
  'valid-citation/wrong-proposition',
  'irrelevant authority',
  'outdated authority',
  'contradictory authority',
  'fabricated patent numbers',
  'false family relationships',
  'unsupported priority dates',
  'fake trademark decisions',
  'unsupported copyright propositions',
]

// Frozen 6 referenced by id only (answers live in scripts/ablation-bench.mjs).
export const ABLATION25_FROZEN_REFS = [
  'SYN-GOOD-101',
  'SYN-GOOD-102',
  'SYN-FAB-112G',
  'SYN-FAB-CASE',
  'SYN-QUOTE-103',
  'SYN-QUOTE-111',
]

export function validateAblation25Case(c) {
  const errors = []
  if (!c || typeof c !== 'object') return { ok: false, errors: ['not an object'] }
  if (!c.id || typeof c.id !== 'string') errors.push('missing id')
  if (!ABLATION25_TYPES.includes(c.type)) errors.push(`bad type: ${c.type}`)
  if (c.synthetic !== true) errors.push('must be marked synthetic:true')
  const text = c.fabricated_answer ?? c.answer ?? c.prompt
  if (!text || String(text).trim().length < 10) errors.push('missing fabricated answer text or generation prompt')
  if (!c.ground_truth || String(c.ground_truth).trim().length < 10) errors.push('missing ground-truth note')
  const sub = c.substance || {}
  if (sub.must_contain !== undefined && !Array.isArray(sub.must_contain)) errors.push('substance.must_contain must be array')
  if (sub.must_contain_any !== undefined && !Array.isArray(sub.must_contain_any)) errors.push('substance.must_contain_any must be array')
  return { ok: errors.length === 0, errors }
}

export function validateAblation25Set(json) {
  const errors = []
  const cases = json?.cases ?? []
  if (!Array.isArray(cases) || cases.length < 19) errors.push(`need >=19 new cases, got ${cases.length}`)
  const seen = new Set()
  for (const c of cases) {
    if (seen.has(c.id)) errors.push(`duplicate id ${c.id}`)
    seen.add(c.id)
    const v = validateAblation25Case(c)
    if (!v.ok) errors.push(`${c?.id ?? '?'}: ${v.errors.join('; ')}`)
    // Frozen ids must not be duplicated into the new set.
    if (ABLATION25_FROZEN_REFS.includes(c.id)) errors.push(`duplicates frozen fixture ${c.id}`)
  }
  const covered = new Set(cases.map((c) => c.type))
  for (const t of ABLATION25_TYPES) {
    if (!covered.has(t)) errors.push(`type uncovered: ${t}`)
  }
  return { ok: errors.length === 0, errors, newCount: cases.length, coveredTypes: [...covered] }
}

const div = (num, den) => (den > 0 ? num / den : null)
const round3 = (x) => (x === null || x === undefined ? null : Math.round(x * 1000) / 1000)

// Pure metric arithmetic over already-graded layer outcomes.
// fab: array of { flaggedE, flaggedA.., entailFail, citations, entailFails, executed }
// good: array of { flaggedE, executed }
export function computeAblation25Metrics({ fab = [], good = [] } = {}) {
  const fabTotal = fab.length
  const goodTotal = good.length
  const fabFlagged = fab.filter((r) => r.flaggedE).length
  const goodFlagged = good.filter((r) => r.flaggedE).length
  const entailFailFab = fab.filter((r) => r.entailFail).length
  const totalCitations = [...fab, ...good].reduce((n, r) => n + (r.citations || 0), 0)
  const totalEntailFails = [...fab, ...good].reduce((n, r) => n + (r.entailFails || 0), 0)
  const executed = [...fab, ...good].filter((r) => r.executed !== false).length
  const total = fabTotal + goodTotal

  const fdr = div(fabFlagged, fabTotal) // Fabrication Detection Rate (recall on fab)
  const fpr = div(goodFlagged, goodTotal) // False Positive Rate
  const precisionDen = fabFlagged + goodFlagged
  const safeRefusalPrecision = precisionDen > 0 ? div(fabFlagged, precisionDen) : null
  const preservation = div(goodTotal - goodFlagged, goodTotal) // Useful Answer Preservation
  const upr = div(entailFailFab, fabTotal) // Unsupported Proposition Rate (entailment leg)
  const citationEntailment = totalCitations > 0 ? div(totalCitations - totalEntailFails, totalCitations) : null
  const completion = div(executed, total) // Execution Completion

  return {
    n_fab: fabTotal,
    n_good: goodTotal,
    fabrication_detection_rate: round3(fdr),
    false_positive_rate: round3(fpr),
    safe_refusal_precision: round3(safeRefusalPrecision),
    useful_answer_preservation: round3(preservation),
    unsupported_proposition_rate: round3(upr),
    citation_entailment: round3(citationEntailment),
    execution_completion: round3(completion),
    counts: { fab_flagged: fabFlagged, good_flagged: goodFlagged, entail_fail_fab: entailFailFab, total_citations: totalCitations, total_entail_fails: totalEntailFails, executed, total },
  }
}

export function perTypeDetection(results) {
  const byType = new Map()
  for (const r of results) {
    if (!byType.has(r.type)) byType.set(r.type, { type: r.type, total: 0, flagged: 0 })
    const e = byType.get(r.type)
    e.total++
    if (r.flaggedE) e.flagged++
  }
  return [...byType.values()]
    .map((e) => ({ ...e, rate: e.total ? Math.round((e.flagged / e.total) * 1000) / 1000 : null }))
    .sort((a, b) => a.type.localeCompare(b.type))
}
