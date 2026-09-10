// India's weekly Patent & Design Journal feed (InPASS has no official API).
//
// Verified 2026-09-10 against the live index page:
//   GET https://search.ipindia.gov.in/IPOJournal/Journal/Patent -> 200, no
//   captcha/403, HTML table#Journal with rows:
//     Sr.No | Journal No. (e.g. 36/2026) | Date of Publication (DD/MM/YYYY)
//     | Date of Availability | Download cell with one POST <form> per part:
//     <form action="/IPOJournal/Journal/ViewJournal" method="post">
//       <input type="hidden" name="FileName" value="ipo-docs\IPIndia_Docs\PAT\..." />
//       <button>Part I|II|III|IV - Designs</button>
//     </form>
// Downloads are POSTs to ViewJournal, NOT direct GET links. Individual
// application entries live inside the Part PDFs (no per-application HTML or
// XML on the listing pages), so this module parses (a) the index into issue
// descriptors and (b) extracted issue text / HTML tables into entries
// {application_number, publication_date, title, applicant}.
//
// Politeness contract: sequential requests only, 2s+ gaps, identifying
// User-Agent. On captcha/403 STOP and report JOURNAL_BLOCKED (never
// circumvent).
import {canonicalizeResult} from './patent-normalize-service.js'

export const INPASS_JOURNAL_PROVIDER = 'inpass_journal'
export const INPASS_JOURNAL_VERSION = 'v1'
export const JOURNAL_BASE_URL = 'https://search.ipindia.gov.in/IPOJournal/Journal/Patent'
export const JOURNAL_VIEW_URL = 'https://search.ipindia.gov.in/IPOJournal/Journal/ViewJournal'
export const USER_AGENT = 'SallyIP/1.0 (Indian Patent Journal research feed)'
export const MIN_FETCH_GAP_MS = 2000

const stripTags = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

// Index dates are Indian DD/MM/YYYY. NOTE: patent-normalize-service
// normalizeDate() reads slashes as MM/DD/YYYY (US order), so journal dates
// get their own parser here to avoid month/day swaps.
export function parseJournalDate(value) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i)
  if (m) {
    const months = {january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'}
    return `${m[3]}-${months[m[2].toLowerCase()]}-${String(m[1]).padStart(2, '0')}`
  }
  return null
}

function resolveUrl(maybeRelative, base) {
  try {
    return new URL(maybeRelative, base).toString()
  } catch {
    return String(maybeRelative || '')
  }
}

// Pure: parse the journal index HTML into issue descriptors.
// Each issue keeps its POST download parts (ViewJournal requires POST with
// FileName; there are no direct GET PDF links on the listing page).
export function parseJournalIndex(html, baseUrl = JOURNAL_BASE_URL) {
  const source = String(html ?? '')
  const rows = [...source.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1])
  const issues = []
  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1])
    if (cells.length < 5) continue
    const journalNumber = stripTags(cells[1])
    if (!/^\d{1,3}\/\d{4}$/.test(journalNumber)) continue
    const publicationDate = parseJournalDate(stripTags(cells[2]))
    const availabilityDate = parseJournalDate(stripTags(cells[3]))
    const downloadCell = cells[4] || ''
    const parts = []
    const formRe = /<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/gi
    let fm
    while ((fm = formRe.exec(downloadCell))) {
      const action = fm[1] || '/IPOJournal/Journal/ViewJournal'
      const inner = fm[2] || ''
      const fileMatch =
        inner.match(/name="FileName"[^>]*value="([^"]*)"/i) ||
        inner.match(/value="([^"]*)"[^>]*name="FileName"/i)
      const label = stripTags(inner) || 'Part'
      if (fileMatch) {
        parts.push({
          label,
          file_name: fileMatch[1],
          action: resolveUrl(action, baseUrl),
          method: 'POST',
        })
      }
    }
    // Future-proof fallback: direct GET links if the site ever exposes them.
    const anchorRe = /<a[^>]*href="([^"]+\.(?:pdf|xml)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    let am
    while ((am = anchorRe.exec(downloadCell))) {
      parts.push({
        label: stripTags(am[2]) || 'Download',
        file_name: null,
        action: resolveUrl(am[1], baseUrl),
        method: 'GET',
      })
    }
    issues.push({journal_number: journalNumber, publication_date: publicationDate, availability_date: availabilityDate, parts})
  }
  return issues
}

// Pure: filter parsed issues to a date range and flatten to one descriptor
// per downloadable part. `from`/`to` accept ISO or DD/MM/YYYY.
export function listJournalIssueUrls(issues, {from = null, to = null, parts = null, baseUrl = JOURNAL_BASE_URL} = {}) {
  const list = Array.isArray(issues) ? issues : []
  const fromIso = from ? parseJournalDate(from) || String(from) : null
  const toIso = to ? parseJournalDate(to) || String(to) : null
  const wanted = parts ? new Set(parts.map((p) => String(p).toLowerCase())) : null
  const out = []
  for (const issue of list) {
    const pub = issue?.publication_date || null
    if (fromIso && pub && pub < fromIso) continue
    if (toIso && pub && pub > toIso) continue
    for (const part of issue?.parts || []) {
      if (wanted && !wanted.has(String(part?.label || '').toLowerCase())) continue
      out.push({
        journal_number: issue.journal_number,
        publication_date: pub,
        part_label: part.label,
        file_name: part.file_name || null,
        action: part.action ? resolveUrl(part.action, baseUrl) : resolveUrl(JOURNAL_VIEW_URL, baseUrl),
        method: part.method || (part.file_name ? 'POST' : 'GET'),
      })
    }
  }
  return out
}

const APP_NO_PATTERNS = [
  /\b\d{3,5}\s*\/\s*[A-Z]{2,4}\s*\/\s*\d{4}\b/i, // 1234/DEL/2015, 4567/MUMNP/2012
  /\b20\d{2}\s*\d{6,8}\b/, // 202411012345 (modern 10-12 digit filings: YYYY + serial)
  /\bIN\s*\d{6,}\b/i,
]

const hasAppNumber = (text) => APP_NO_PATTERNS.some((re) => re.test(String(text || '')))

function cleanField(value) {
  const s = stripTags(value)
  return s ? s.slice(0, 500) : null
}

// Pure: parse one issue's listing into entries.
// Handles (1) HTML tables with [application_no, title, applicant] columns and
// (2) plain text extracted from a Part PDF with (21)/(54)/(71) or
// "Application No."/"Title"/"Applicant" labels. Whatever the listing exposes,
// entries always come out as {application_number, publication_date, title,
// applicant, journal_number, part_label, file_name, issue_url}.
export function parseJournalIssueListing(input, context = {}) {
  const source = String(input ?? '')
  if (!source.trim()) return []
  const base = {
    publication_date: context.publication_date || null,
    journal_number: context.journal_number || null,
    part_label: context.part_label || null,
    file_name: context.file_name || null,
    issue_url: context.issue_url || context.issueUrl || null,
  }
  // Path 1: HTML table rows (highest fidelity when columns exist).
  const tableEntries = []
  for (const row of source.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...String(row[1]).matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]))
    if (cells.length < 2 || !hasAppNumber(cells[0])) continue
    if (/^(sr\.?\s*no|sl\.?\s*no|application no\.?|appln)/i.test(cells[0])) continue
    tableEntries.push({
      application_number: cells[0],
      publication_date: base.publication_date,
      title: cleanField(cells[1]),
      applicant: cells[2] ? cleanField(cells[2]) : null,
      ...base,
    })
  }
  if (tableEntries.length) return tableEntries
  // Path 2: field-coded text blocks (PDF extract). Split ahead of each new
  // application marker, then pull title/applicant from the same block.
  const text = source
    .replace(/<\s*br[^>]*>/gi, '\n')
    .replace(/<\s*\/(p|div|tr|h\d)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+/g, ' ')
  const blocks = text
    .split(/(?=(?:\(21\)|Application\s*No\.?|Appln\.?\s*No\.?)\s*[:\-]?\s*)/gi)
    .map((b) => b.trim())
    .filter((b) => hasAppNumber(b))
  return blocks.map((block) => {
    const appMatch =
      block.match(/(?:\(21\)|Application\s*No\.?|Appln\.?\s*No\.?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9/\s.-]{5,30})/i) ||
      block.match(APP_NO_PATTERNS[0]) ||
      block.match(APP_NO_PATTERNS[1])
    const titleMatch =
      block.match(/(?:\(54\)|Title(?:\s+of\s+(?:the\s+)?invention)?)\s*[:\-]?\s*(.+?)(?=(?:\(71\)|\(57\)|Applicant|Abstract|$))/is) ||
      null
    const applicantMatch =
      block.match(/(?:\(71\)|Name\s+of\s+Applicant|Applicant(?:\(s\))?)\s*[:\-]?\s*(.+?)(?=(?:\(72\)|Inventor|Address|$))/is) ||
      null
    const clip = (s) => (s ? String(s).replace(/\s+/g, ' ').trim().slice(0, 500) || null : null)
    return {
      application_number: clip(appMatch?.[1] || appMatch?.[0]),
      publication_date: base.publication_date,
      title: clip(titleMatch?.[1]),
      applicant: clip(applicantMatch?.[1]),
      ...base,
    }
  }).filter((e) => e.application_number)
}

const BLOCKED_BODY_PATTERNS = [/captcha/i, /cf-challenge/i, /cloudflare/i, /access denied/i, /verify you are (a )?human/i, /please verify/i, /unusual traffic/i, /are you a robot/i]

export function isBlockedBody(bodyText) {
  const s = String(bodyText || '')
  return BLOCKED_BODY_PATTERNS.some((re) => re.test(s))
}

export function isBlockedResponse(status, bodyText = '') {
  if (Number(status) === 401 || Number(status) === 403) return true
  return isBlockedBody(bodyText)
}

function blockedError(status, hint = '') {
  const error = new Error(
    `IPO Journal blocked automation (status ${status || 'unknown'})${hint ? `: ${hint}` : ''}. STOP: do not circumvent captcha/access controls.`,
  )
  error.code = 'JOURNAL_BLOCKED'
  error.status = status ?? null
  return error
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Gentle single GET of the index page with an identifying User-Agent.
// Throws JOURNAL_BLOCKED on captcha/403 instead of retrying around it.
export async function fetchJournalIndex({fetchImpl = fetch} = {}) {
  const response = await fetchImpl(JOURNAL_BASE_URL, {headers: {'User-Agent': USER_AGENT, Accept: 'text/html'}})
  const body = await response.text().catch(() => '')
  if (!response.ok) {
    if (isBlockedResponse(response.status, body)) throw blockedError(response.status)
    if (response.status === 429) {
      const error = new Error('IPO Journal rate-limited this client (429). Back off; keep 2s+ gaps and sequential requests.')
      error.code = 'JOURNAL_RATE_LIMITED'
      throw error
    }
    const error = new Error(`IPO Journal index fetch failed (${response.status})`)
    error.code = 'JOURNAL_FETCH_FAILED'
    throw error
  }
  if (isBlockedBody(body)) throw blockedError(response.status)
  return body
}

// Gentle single POST for one journal part PDF. Call sequentially with 2s+
// gaps (see fetchJournalPartsSequential); never parallelise.
export async function fetchJournalPart(fileName, {fetchImpl = fetch} = {}) {
  if (!fileName || !String(fileName).trim()) throw Object.assign(new Error('A journal FileName is required'), {code: 'INVALID_INPUT'})
  const body = new URLSearchParams({FileName: String(fileName)})
  const response = await fetchImpl(JOURNAL_VIEW_URL, {
    method: 'POST',
    headers: {'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/pdf,*/*'},
    body: body.toString(),
  })
  const sniff = response.headers?.get ? response.headers.get('content-type') || '' : ''
  if (!response.ok) {
    let text = ''
    try {
      text = await response.clone().text()
    } catch {
      text = ''
    }
    if (isBlockedResponse(response.status, text)) throw blockedError(response.status)
    const error = new Error(`IPO Journal part fetch failed (${response.status})`)
    error.code = 'JOURNAL_FETCH_FAILED'
    throw error
  }
  if (/text\/html/i.test(sniff)) {
    let text = ''
    try {
      text = await response.clone().text()
    } catch {
      text = ''
    }
    if (isBlockedBody(text)) throw blockedError(response.status)
  }
  return response
}

// Sequential part downloader with enforced 2s+ gaps. Stops at the first
// JOURNAL_BLOCKED signal (no retries around access controls).
export async function fetchJournalPartsSequential(descriptors, {fetchImpl = fetch, delayMs = 2500, onPart} = {}) {
  const gap = Math.max(MIN_FETCH_GAP_MS, Number(delayMs) || MIN_FETCH_GAP_MS)
  const list = Array.isArray(descriptors) ? descriptors : []
  const results = []
  for (let i = 0; i < list.length; i++) {
    if (i > 0) await sleep(gap)
    const d = list[i]
    const response = d?.method === 'GET' && !d?.file_name
      ? await fetchImpl(d.action, {headers: {'User-Agent': USER_AGENT}})
      : await fetchJournalPart(d?.file_name, {fetchImpl})
    if (typeof onPart === 'function') await onPart(d, response, i)
    results.push({descriptor: d, response})
  }
  return results
}

// Pure: map one journal entry through the canonical normaliser into a
// provider_records-shaped row with provider='inpass_journal'.
// Indian application numbers often carry no country prefix, so a bare
// digit stem is stamped IN... for a stable external_id; the human-readable
// original stays in raw.
export function toProviderRecord(entry = {}) {
  const rawApp = String(entry.application_number || '').trim()
  const compact = rawApp.replace(/[\s/.,-]+/g, '').toUpperCase()
  const externalId = compact ? (/^[A-Z]{2}/.test(compact) ? compact : `IN${compact}`) : null
  const applicant = entry.applicant ?? entry.applicants ?? null
  const assignees = Array.isArray(applicant) ? applicant.filter(Boolean).map(String) : applicant ? [String(applicant)] : []
  const result = {
    external_id: externalId,
    application_number: externalId,
    publication_number: externalId,
    title: entry.title || null,
    publication_date: entry.publication_date || null,
    country: 'IN',
    jurisdiction: 'IN',
    assignees,
    official_url: entry.issue_url || entry.pdf_url || JOURNAL_BASE_URL,
    raw_metadata: {
      source: 'IPO Journal (search.ipindia.gov.in)',
      provider: INPASS_JOURNAL_PROVIDER,
      application_number: rawApp || null,
      applicant: applicant || null,
      journal_number: entry.journal_number || null,
      part_label: entry.part_label || null,
      file_name: entry.file_name || null,
      issue_url: entry.issue_url || null,
    },
  }
  const canon = canonicalizeResult(INPASS_JOURNAL_PROVIDER, result, INPASS_JOURNAL_VERSION)
  return {...canon, provider_version: INPASS_JOURNAL_VERSION, country: canon.country || 'IN', family_key: null, family_method: 'unresolved'}
}

// Canonical ingest for journal rows: same upsert pattern as
// official-search-persistence.js (never duplicates per user/provider/id).
export async function storeJournalRecords(sql, userId, matterId, rows = []) {
  if (!userId) throw Object.assign(new Error('userId is required'), {code: 'INVALID_INPUT'})
  if (!matterId) throw Object.assign(new Error('matterId is required'), {code: 'INVALID_INPUT'})
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && r.external_id)
  if (!list.length) return {stored: 0}
  const [matter] = await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`
  if (!matter) throw Object.assign(new Error('Matter not found'), {code: 'MATTER_NOT_FOUND'})
  let stored = 0
  for (const member of list) {
    await sql`INSERT INTO provider_records(user_id,matter_id,provider,provider_version,external_id,country,pub_number,kind,normalized_number,title,publication_date,filing_date,priority_date,priority_numbers,family_key,family_method,inventors,assignees,legal_status,entity_id,raw) VALUES(${userId},${matter.id},${INPASS_JOURNAL_PROVIDER},${member.provider_version || INPASS_JOURNAL_VERSION},${member.external_id},${member.country},${member.pub_number},${member.kind},${member.normalized_number},${member.title},${member.publication_date},${member.filing_date},${member.priority_date},${JSON.stringify(member.priority_numbers || [])}::jsonb,${member.family_key},${member.family_method},${JSON.stringify(member.inventors || [])}::jsonb,${JSON.stringify(member.assignees || [])}::jsonb,${member.legal_status},${member.entity_id || null},${JSON.stringify(member.raw || {})}::jsonb) ON CONFLICT(user_id,provider,external_id) DO UPDATE SET title=excluded.title,publication_date=excluded.publication_date,family_key=excluded.family_key,family_method=excluded.family_method,retrieved_at=now()`
    stored += 1
  }
  return {stored}
}
