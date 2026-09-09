import { buildClaimTree, parsePatentClaims } from './patent-claim-service.js'

// Reusable Claim QA Engine. Stateless: raw claim text in, structured findings
// out. Consumed by the Patent Drafter, the Office Action Workspace amendment
// reviewer, and the standalone one-click audit. No DB, no network.
const INDEF = /\b(a|an)\s+([a-z][a-z0-9-]*(?:\s+(?!a\b|an\b|the\b|said\b)[a-z][a-z0-9-]*){0,3})/gi
const DEF = /\b(the|said)\s+([a-z][a-z0-9-]*(?:\s+(?!a\b|an\b|the\b|said\b)[a-z][a-z0-9-]*){0,3})/gi
const STOP_HEAD = new Set(['same', 'present', 'following', 'above', 'invention', 'embodiment', 'claim', 'method', 'system'])
const HEAD_ARTICLE = /^(a|an|the|said)\s+([a-z][a-z0-9-]*)/i
// Single head noun after an article: the unit antecedent-basis reasoning uses.
// "a sensor disposed in the housing" introduces "sensor"; "the sensor" refers it.
const RELATIVE = /\b(substantially|relatively|approximately|about|around|large|small|fast|slow|good|better|best|sufficient|effective|thin|thick|close to|near|far|high|low)\b/i
const MPF = /\bmeans\s+for\b|\bstep\s+for\b/i
const TRANSITIONAL = /\b(comprising|consisting of|consisting essentially of|including|having)\b/i

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const head = (phrase) => norm(phrase).split(' ').filter(w => !STOP_HEAD.has(w)).slice(-1)[0] || norm(phrase).split(' ').slice(-1)[0]

function headNounAfterArticle(segment) {
  const m = HEAD_ARTICLE.exec(String(segment || '').trim())
  if (!m || /^(claim|claims|same|present|invention)$/i.test(m[2])) return null
  return norm(m[2])
}

// Head-noun introductions and references per claim, in textual order.
// Dependency language ("The widget of claim 1") is skipped via the lookahead:
// a head noun followed by "of claim N" / "claim N" is a reference, not a term.
function introTerms(text) {
  const out = []
  const clean = String(text || '').replace(/^\s*\d+\s*[.\):]\s*/, '')
  const re = /\b(a|an)\s+([a-z][a-z0-9-]*)/gi
  let m
  while ((m = re.exec(clean))) {
    const after = clean.slice(m.index + m[0].length)
    if (/^\s+of\s+claims?\s+\d+/i.test(after)) continue
    out.push({ article: m[1].toLowerCase(), noun: norm(m[2]) })
  }
  return out
}

function refTerms(text) {
  const out = []
  const clean = String(text || '').replace(/^\s*\d+\s*[.\):]\s*/, '')
  const re = /\b(the|said)\s+([a-z][a-z0-9-]*)/gi
  let m
  while ((m = re.exec(clean))) {
    const after = clean.slice(m.index + m[0].length)
    if (/^\s+of\s+claims?\s+\d+/i.test(after)) continue
    if (/^(claim|claims|same|present|invention)$/i.test(m[2])) continue
    out.push({ article: m[1].toLowerCase(), noun: norm(m[2]) })
  }
  return out
}

function phrases(text, re) {
  const out = []
  const clean = String(text || '').replace(/^\s*\d+\s*[.\):]\s*/, '')
  let m
  re.lastIndex = 0
  while ((m = re.exec(clean))) {
    if (/^(claim|claims|same|present|invention)\b/i.test(m[2])) continue
    if (/\bclaims?\s+\d+/.test(m[0])) continue // dependency language, not an antecedent candidate
    out.push({ article: m[1].toLowerCase(), phrase: norm(m[2]), head: head(m[2]) })
  }
  return out
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}

function ancestors(claim, byNumber) {
  const seen = new Set(), out = []
  const walk = (c) => {
    for (const parent of c.depends_on || []) {
      if (seen.has(parent) || !byNumber.has(parent)) continue
      seen.add(parent)
      out.push(byNumber.get(parent))
      walk(byNumber.get(parent))
    }
  }
  walk(claim)
  return out
}

export function auditClaims(claimText, { specText = '' } = {}) {
  const claims = parsePatentClaims(claimText)
  const findings = []
  if (!claims.length) return { claims: [], findings: [{ severity: 'error', check: 'parse', claim_number: null, message: 'No numbered claims detected.' }], score: { errors: 1, warnings: 0 } }
  const byNumber = new Map(claims.map(c => [c.claim_number, c]))

  // 1. Numbering continuity.
  const numbers = claims.map(c => c.claim_number).sort((a, b) => a - b)
  if (numbers[0] !== 1) findings.push({ severity: 'error', check: 'numbering', claim_number: numbers[0], message: `Claim numbering starts at ${numbers[0]}, expected claim 1.` })
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) findings.push({ severity: 'error', check: 'numbering', claim_number: numbers[i], message: `Claim numbering gap between ${numbers[i - 1]} and ${numbers[i]}.` })
  }

  const introduced = new Map() // normalized phrase/head -> claim number (includes ancestors as we go)
  for (const claim of claims) {
    // 2. Dependency integrity.
    for (const parent of claim.depends_on) {
      if (!byNumber.has(parent)) findings.push({ severity: 'error', check: 'dependency', claim_number: claim.claim_number, message: `Depends on claim ${parent}, which does not exist in this set.` })
    }
    if (new RegExp(`\\bclaims?\\s+${claim.claim_number}\\b`, 'i').test(claim.claim_text) && !claim.depends_on.includes(claim.claim_number)) {
      // self-mention without parseable dependency (parser only keeps lower numbers)
      findings.push({ severity: 'warning', check: 'dependency', claim_number: claim.claim_number, message: `Mentions its own number; verify it does not improperly depend on itself.` })
    }
    if (claim.depends_on.length > 1) findings.push({ severity: 'warning', check: 'multiple-dependent', claim_number: claim.claim_number, message: `Depends on multiple claims (${claim.depends_on.join(', ')}): US multiple-dependent form requires alternative-only phrasing per §112(e) and incurs extra fees.` })
    if (claim.claim_type === 'independent' && !TRANSITIONAL.test(claim.claim_text)) findings.push({ severity: 'info', check: 'form', claim_number: claim.claim_number, message: 'Independent claim has no standard transitional phrase (comprising/including); confirm preamble/body structure.' })

    // 3. Antecedent basis on head nouns (own + inherited introductions).
    const scope = new Map(introduced)
    for (const anc of ancestors(claim, byNumber)) {
      for (const p of introTerms(anc.claim_text)) if (!scope.has(p.noun)) scope.set(p.noun, anc.claim_number)
    }
    for (const p of introTerms(claim.claim_text)) if (!scope.has(p.noun)) scope.set(p.noun, claim.claim_number)
    for (const d of refTerms(claim.claim_text)) {
      if (!scope.has(d.noun)) findings.push({ severity: 'error', check: 'antecedent', claim_number: claim.claim_number, message: `“${d.article} ${d.noun}” lacks antecedent basis — no “a/an ${d.noun}” in this claim or its parents.`, suggestion: `Introduce “a ${d.noun}” before first definite reference.` })
    }
    for (const [k, v] of scope) if (!introduced.has(k)) introduced.set(k, v)

    // 4. Means-plus-function + relative terminology.
    if (MPF.test(claim.claim_text)) findings.push({ severity: 'warning', check: 'means-plus-function', claim_number: claim.claim_number, message: '“means/step for” language invokes §112(f): corresponding structure must appear verbatim in the specification.' })
    const rel = claim.claim_text.match(RELATIVE)
    if (rel) findings.push({ severity: 'warning', check: 'indefiniteness', claim_number: claim.claim_number, message: `Relative term “${rel[0]}” risks §112(b) indefiniteness without an objective standard in the claim.` })

    // 5. Punctuation hygiene.
    if (!/[.;:]$/.test(claim.claim_text.trim())) findings.push({ severity: 'warning', check: 'punctuation', claim_number: claim.claim_number, message: 'Claim does not end with terminal punctuation.' })
    const opens = (claim.claim_text.match(/\(/g) || []).length, closes = (claim.claim_text.match(/\)/g) || []).length
    if (opens !== closes) findings.push({ severity: 'error', check: 'punctuation', claim_number: claim.claim_number, message: `Unbalanced parentheses (${opens} open, ${closes} close).` })
  }

  // 6. Terminology consistency across the set.
  const allPhrases = []
  for (const claim of claims) for (const p of phrases(claim.claim_text, INDEF)) allPhrases.push({ ...p, claim_number: claim.claim_number })
  const seenPairs = new Set()
  for (let i = 0; i < allPhrases.length; i++) for (let j = i + 1; j < allPhrases.length; j++) {
    const a = allPhrases[i], b = allPhrases[j]
    if (a.phrase === b.phrase || a.phrase.length < 12 || b.phrase.length < 12) continue
    const key = [a.phrase, b.phrase].sort().join('|')
    if (seenPairs.has(key)) continue
    seenPairs.add(key)
    const sameHead = a.head === b.head || levenshtein(a.head, b.head) <= 1
    if (sameHead && levenshtein(a.phrase, b.phrase) <= 2) findings.push({ severity: 'warning', check: 'terminology', claim_number: b.claim_number, message: `“${b.phrase}” (claim ${b.claim_number}) closely resembles “${a.phrase}” (claim ${a.claim_number}) — confirm intentional distinct terms, else unify.` })
  }

  // 7. Specification support (when spec text supplied).
  let support = null
  if (String(specText || '').trim().length > 100) {
    const paras = String(specText).split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 20)
    support = []
    for (const claim of claims) {
      const elements = claim.elements.length ? claim.elements : [claim.claim_text]
      for (const element of elements.slice(0, 12)) {
        const words = [...new Set(norm(element).split(' ').filter(w => w.length > 4))].slice(0, 10)
        if (!words.length) continue
        let best = -1, bestHits = 0
        paras.forEach((para, idx) => {
          const lower = para.toLowerCase()
          const hits = words.filter(w => lower.includes(w)).length
          if (hits > bestHits) { bestHits = hits; best = idx }
        })
        const ratio = bestHits / words.length
        if (ratio < 0.5) {
          support.push({ claim_number: claim.claim_number, element: element.slice(0, 140), supported: false, closest_paragraph: best })
          findings.push({ severity: 'warning', check: 'spec-support', claim_number: claim.claim_number, message: `“${element.slice(0, 90)}…” has weak verbatim support in the specification.`, suggestion: best >= 0 ? `Closest: paragraph ${best + 1}.` : 'No close paragraph found — add written-description support.' })
        } else support.push({ claim_number: claim.claim_number, element: element.slice(0, 140), supported: true, closest_paragraph: best })
      }
    }
  }

  const errors = findings.filter(f => f.severity === 'error').length
  return { claims: claims.map(c => ({ claim_number: c.claim_number, claim_type: c.claim_type, depends_on: c.depends_on })), tree: buildClaimTree(claims).map(c => c.claim_number), findings, support, score: { errors, warnings: findings.filter(f => f.severity === 'warning').length } }
}

// Amendment review: diff original vs amended, then run the full audit on the
// amended set. New noun phrases absent from the spec surface as new-matter risk.
export function auditAmendment(originalText, amendedText, { specText = '' } = {}) {
  const before = parsePatentClaims(originalText), after = parsePatentClaims(amendedText)
  const beforePhrases = new Set()
  for (const c of before) for (const p of phrases(c.claim_text, INDEF)) beforePhrases.add(p.phrase)
  const added = []
  for (const c of after) for (const p of phrases(c.claim_text, INDEF)) {
    if (!beforePhrases.has(p.phrase)) added.push({ ...p, claim_number: c.claim_number })
  }
  const result = auditClaims(amendedText, { specText })
  const specLower = String(specText || '').toLowerCase()
  for (const term of added) {
    if (specText && !specLower.includes(term.phrase) && !specLower.includes(term.head)) {
      result.findings.push({ severity: 'error', check: 'new-matter', claim_number: term.claim_number, message: `Added term “${term.phrase}” (claim ${term.claim_number}) has no specification support — new-matter risk under §132.` })
    }
  }
  const beforeDeps = new Map(before.map(c => [c.claim_number, (c.depends_on || []).join(',')]))
  for (const c of after) {
    if (beforeDeps.has(c.claim_number) && beforeDeps.get(c.claim_number) !== (c.depends_on || []).join(',')) {
      result.findings.push({ severity: 'warning', check: 'dependency-change', claim_number: c.claim_number, message: `Dependency changed vs original (was: ${beforeDeps.get(c.claim_number) || 'independent'}). Confirm scope intent and estoppel effect.` })
    }
  }
  result.added_terms = added.map(a => a.phrase)
  result.score = { errors: result.findings.filter(f => f.severity === 'error').length, warnings: result.findings.filter(f => f.severity === 'warning').length }
  return result
}
