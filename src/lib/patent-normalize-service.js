// Canonical patent normalisation engine: every connected office speaks a
// different identifier dialect. This module parses publication numbers into
// {country, number, kind}, normalises dates, and groups records into families
// by shared priority data (heuristic — NOT INPADOC; method always recorded).
export function parsePublicationNumber(raw) {
  const text = String(raw || '').replace(/[\s.,/-]+/g, '').toUpperCase()
  const m = text.match(/^([A-Z]{2})0*(\d{4,})([A-Z]\d?)?$/)
  if (!m) return null
  return { country: m[1], number: m[2], kind: m[3] || null }
}

export function normalizedNumber(parsed) {
  if (!parsed) return null
  return `${parsed.country}${parsed.number}${parsed.kind || ''}`
}

export function normalizeDate(value) {
  if (!value) return null
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10)
  const s = String(value).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[1]}-${m[2]}`
  m = s.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i)
  if (m) {
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' }
    return `${m[3]}-${months[m[2].toLowerCase()]}-${String(m[1]).padStart(2, '0')}`
  }
  return null
}

const normNum = (v) => String(v || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()

// Group normalised records into families. Priority-data first (shared
// priority number = same family); fallback is same number stem across
// different offices (e.g. PCT national phases sharing digits). Every family
// records HOW it was resolved so consumers never mistake it for INPADOC.
export function groupIntoFamilies(records) {
  const families = new Map()
  const solo = []
  // Exact duplicates (same normalized number, e.g. harvested twice) collapse.
  const deduped = []
  const seenNumbers = new Set()
  for (const record of records) {
    const key = record.normalized_number || record.external_id
    if (key && seenNumbers.has(key)) continue
    if (key) seenNumbers.add(key)
    deduped.push(record)
  }
  for (const record of deduped) {
    const prios = (record.priority_numbers || []).map(normNum).filter(Boolean)
    let key = null, method = 'unresolved'
    if (prios.length) {
      key = 'pri:' + [...prios].sort()[0]
      method = 'shared-priority'
    } else if (record.pub_number || record.normalized_number) {
      const stem = normNum(record.pub_number || record.normalized_number).replace(/^[A-Z]{2}/, '').replace(/[A-Z]\d?$/, '')
      const siblings = deduped.filter(r => r !== record && normNum(r.pub_number || r.normalized_number).replace(/^[A-Z]{2}/, '').replace(/[A-Z]\d?$/, '') === stem)
      // Same number stem = same application lineage (pub/grant stages, or
      // national phases sharing PCT digits). Cross-country stem matches are
      // coincidental more often, but merging aids recall and the false-merge
      // metric watches precision; method is always recorded.
      if (stem.length >= 6 && siblings.length) {
        key = 'stem:' + stem
        method = 'same-number-stem'
      }
    }
    if (!key) { solo.push({ ...record, family_key: null, family_method: 'unresolved' }); continue }
    if (!families.has(key)) families.set(key, { family_key: key, family_method: method, members: [] })
    families.get(key).members.push(record)
  }
  for (const single of solo) {
    const key = 'solo:' + (single.normalized_number || single.external_id || Math.random().toString(36).slice(2))
    families.set(key, { family_key: key, family_method: 'unresolved', members: [single] })
  }
  return [...families.values()].map(f => ({ ...f, members: f.members.map(m => ({ ...m, family_key: f.family_key, family_method: f.family_method })) }))
}

function parseCountry(record) {
  const parsed = record.normalized_number ? parsePublicationNumber(record.normalized_number) : null
  return parsed?.country || record.country || null
}

// Map one provider result (as produced by official-search-service adapters)
// into a canonical record row. Unknown shapes pass through with raw kept.
export function canonicalizeResult(provider, result, providerVersion = 'v1') {
  const externalId = result.external_id ?? result.publication_number ?? result.application_number ?? null
  const parsed = externalId ? parsePublicationNumber(externalId) : null
  const prios = []
  const raw = result.raw_metadata || {}
  const candidates = [raw.priorityNumber, raw.priority_number, raw.priority, result.priority_number, ...(Array.isArray(raw.priorities) ? raw.priorities : [])]
  for (const c of candidates) {
    if (!c) continue
    const p = parsePublicationNumber(c) || (typeof c === 'object' ? parsePublicationNumber(c.number || c.docNumber) : null)
    if (p) prios.push(normalizedNumber(p))
  }
  const rawInventors = Array.isArray(result.inventors) ? result.inventors : Array.isArray(raw.inventors) ? raw.inventors : []
  const rawAssignees = Array.isArray(result.assignees) ? result.assignees : Array.isArray(raw.assignees) ? raw.assignees : []
  return {
    provider,
    provider_version: providerVersion,
    external_id: externalId,
    country: parsed?.country || result.country || result.jurisdiction || null,
    pub_number: externalId,
    kind: parsed?.kind || result.kind || null,
    normalized_number: normalizedNumber(parsed),
    title: result.title || null,
    publication_date: normalizeDate(result.patent_date || result.publication_date || raw.publicationDate || raw.publication_date),
    filing_date: normalizeDate(result.filing_date || raw.filingDate || raw.filing_date),
    priority_date: normalizeDate(result.priority_date || raw.priorityDate || raw.priority_date),
    priority_numbers: [...new Set(prios)],
    inventors: rawInventors.slice(0, 20).map(String),
    assignees: rawAssignees.slice(0, 20).map(String),
    legal_status: result.status || null,
    official_url: result.official_url || null,
    raw,
  }
}
