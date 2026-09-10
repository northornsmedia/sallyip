// SallyIP ablation helpers (pure-local, no DB, no model calls).
// Used by scripts/ablation-bench.mjs to answer "how much reliability comes
// from SallyIP vs the base model" by running the SAME synthetic answers
// through ablated configurations A-E.
import { verifyQuote } from './citation-service.js'
import { guardAnswerCitations } from './verification-service.js'
import { checkEntailment } from './entailment-service.js'

// Fixed 8-item subset: 5 from scripts/stanford-bench-dataset.mjs,
// 3 from benchmarks/adversarial-v1.mjs. Referenced by id only — the
// datasets themselves are never modified.
export const ABLATION_ITEM_IDS = [
  'stat-101',
  'stat-102a',
  'stat-103',
  'stat-111',
  'app-grace',
  'adv-112g',
  'adv-fake-case',
  'adv-fake-patent',
]

// Fixed passage fixture. Every string below already exists verbatim in the
// repo (provenance noted); nothing is fetched at bench time.
export const FIXTURE_PASSAGES = [
  {
    // tests/permanent-failures-regression.test.mjs standardEvidence s-101
    // (also eval_scorecard_sample_25.md, tests/answer-guard.test.mjs).
    source_id: 'abl-101', passage_id: 'abl-p-101', title: '35 U.S.C. § 101 Inventions Patentable',
    citation: '35 U.S.C. 101', jurisdiction: 'US', authority_tier: 1, locator: '35 U.S.C. § 101',
    content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.',
  },
  {
    // tests/permanent-failures-regression.test.mjs standardEvidence s-102.
    source_id: 'abl-102', passage_id: 'abl-p-102', title: '35 U.S.C. § 102 Conditions for patentability; novelty',
    citation: '35 U.S.C. 102', jurisdiction: 'US', authority_tier: 1, locator: '35 U.S.C. § 102',
    content: 'A person shall be entitled to a patent unless the claimed invention was patented, described in a printed publication, or in public use, on sale, or otherwise available to the public before the effective filing date of the claimed invention.',
  },
  {
    // tests/permanent-failures-regression.test.mjs standardEvidence s-103.
    source_id: 'abl-103', passage_id: 'abl-p-103', title: '35 U.S.C. § 103 Conditions for patentability; non-obvious subject matter',
    citation: '35 U.S.C. 103', jurisdiction: 'US', authority_tier: 1, locator: '35 U.S.C. § 103',
    content: 'A patent for a claimed invention may not be obtained, notwithstanding that the claimed invention is not identically disclosed as set forth in section 102, if the differences between the claimed invention and the prior art are such that the claimed invention as a whole would have been obvious before the effective filing date of the claimed invention to a person having ordinary skill in the art to which the claimed invention pertains.',
  },
  {
    // tests/permanent-failures-regression.test.mjs standardEvidence s-111.
    source_id: 'abl-111', passage_id: 'abl-p-111', title: '35 U.S.C. § 111 Application',
    citation: '35 U.S.C. 111', jurisdiction: 'US', authority_tier: 1, locator: '35 U.S.C. § 111',
    content: 'An application for patent shall be made, or authorized to be made, by the inventor, except as otherwise provided in this title, in writing to the Director.',
  },
  {
    // tests/entailment.test.mjs:22 (statutory paraphrase used as a repo fixture).
    source_id: 'abl-111b', passage_id: 'abl-p-111b', title: '35 U.S.C. § 111(b) provisional rule',
    citation: '35 U.S.C. 111', jurisdiction: 'US', authority_tier: 1, locator: '35 U.S.C. § 111(b)',
    content: 'A claim shall not be required in a provisional application under § 111(b).',
  },
]

const norm = (s) => String(s || '').toLowerCase()

// Config A: strip citation apparatus ([S#] markers + quotation characters)
// but KEEP the inner words, so must_contain grading measures base-model
// substance independent of citation wrapping.
export function stripCitationApparatus(text) {
  return String(text || '')
    .replace(/\s*\[S\d+\]/g, '')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Config A grading: mechanical must_contain / must_contain_any check,
// mirroring scripts/stanford-bench-run.mjs grade().
export function gradeSubstance(text, item) {
  const hay = norm(text)
  const hasAll = (item.must_contain || []).every((p) => hay.includes(norm(p)))
  const hasAny = !(item.must_contain_any || []).length
    || (item.must_contain_any || []).some((p) => hay.includes(norm(p)))
  return { hasAll, hasAny, pass: hasAll && hasAny }
}

// Quoted spans of evidentiary length (mirrors the 8..600 window used by
// finalizeVerifiedAnswer's quote audit).
export function extractQuotedSpans(text) {
  return [...String(text || '').matchAll(/["“]([^"”\n]{8,600})["”]/g)].map((m) => m[1])
}

// Config B: with fixed evidence attached, would the answer's citations
// exist? Pure label arithmetic — no verification yet.
export function citationPresence(answer, evidenceCount) {
  const cited = [...new Set([...String(answer || '').matchAll(/\[S(\d+)\]/g)].map((m) => Number(m[1])))]
    .sort((a, b) => a - b)
  const valid = cited.filter((n) => n >= 1 && n <= evidenceCount)
  const dangling = cited.filter((n) => !(n >= 1 && n <= evidenceCount))
  return { cited, valid, dangling, zeroValid: cited.length > 0 && valid.length === 0 }
}

// Config D: verify each quoted span against the fixed passages; best
// status wins (exact > fuzzy > missing), mirroring stanford-bench-run.
export function auditQuotesLocal(spans, passages) {
  return (spans || []).map((quote) => {
    let best = 'missing'
    for (const p of passages) {
      try {
        const v = verifyQuote(p.content, quote)
        if (v === 'exact') { best = 'exact'; break }
        if (v === 'fuzzy') best = 'fuzzy'
      } catch { /* short quote: stays missing */ }
    }
    return { quote: String(quote).slice(0, 80), status: best }
  })
}

// Config E (entailment leg): does each cited sentence's proposition follow
// from the passage its label points at? Strict fails only: the layers that
// catch single-word corruptions (D) and partial support stay separate.
export function checkCitedEntailment(answer, evidence) {
  const sentences = String(answer || '').split(/(?<=[.!?])\s+/)
  const perCitation = []
  for (const sentence of sentences) {
    const labels = [...sentence.matchAll(/\[S(\d+)\]/g)].map((m) => Number(m[1]))
    if (!labels.length) continue
    const idx = labels[0]
    const passage = evidence[idx - 1]
    if (!passage) {
      perCitation.push({ sentence: sentence.slice(0, 80), label: idx, verdict: 'DANGLING_LABEL' })
      continue
    }
    const proposition = sentence.replace(/\[S\d+\]/g, '').trim()
    const r = checkEntailment(proposition, passage.content)
    perCitation.push({ sentence: proposition.slice(0, 80), label: idx, verdict: r.verdict, score: r.score })
  }
  const failCount = perCitation.filter((c) => c.verdict === 'DOES_NOT_SUPPORT' || c.verdict === 'CONTRADICTS' || c.verdict === 'DANGLING_LABEL').length
  return { perCitation, failCount }
}

// Run one answer through all five ablated configurations.
export function simulateAblation(answer, item, evidence = FIXTURE_PASSAGES) {
  const stripped = stripCitationApparatus(answer)
  const substance = gradeSubstance(stripped, item)
  const presence = citationPresence(answer, evidence.length)
  // Config C: deliberately evidence-starved guard — demonstrates the
  // fail-closed dangling removal (and its cost: good citations go too).
  const guardEmpty = guardAnswerCitations(answer, [], { requires_primary_sources: true })
  const spans = extractQuotedSpans(answer)
  const quotes = auditQuotesLocal(spans, evidence)
  const missingQuotes = quotes.filter((q) => q.status === 'missing').length
  // Config E: full local pipeline — guard WITH evidence + quotes + entailment.
  const guardFull = guardAnswerCitations(answer, evidence, { requires_primary_sources: true })
  const entailment = checkCitedEntailment(answer, evidence)
  const supported = substance.pass
    && guardFull.guard.dangling.length === 0
    && presence.valid.length > 0
    && missingQuotes === 0
    && entailment.failCount === 0
  return {
    A: { stripped, ...substance },
    B: { ...presence, evidence_count: evidence.length },
    C: { answer: guardEmpty.answer, guard: guardEmpty.guard },
    D: { spans: spans.map((s) => s.slice(0, 80)), quotes, missing: missingQuotes },
    E: { guard: guardFull.guard, entailment, substancePass: substance.pass, supported, verdict: supported ? 'SUPPORTED' : 'FLAGGED' },
  }
}
