import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INPASS_JOURNAL_PROVIDER,
  JOURNAL_BASE_URL,
  USER_AGENT,
  fetchJournalIndex,
  isBlockedResponse,
  listJournalIssueUrls,
  parseJournalDate,
  parseJournalIndex,
  parseJournalIssueListing,
  storeJournalRecords,
  toProviderRecord,
} from '../src/lib/india-journal-service.js'

// Fixture mirrors the live index shape (verified 2026-09-10): table#Journal
// rows with POST forms carrying hidden FileName values. Synthetic data only.
const indexFixture = `<table id="Journal"><thead><tr><th>Sr. No.</th><th>Journal No.</th><th>Date of Publication</th><th>Date of Availability</th><th>Download</th></tr></thead><tbody>
<tr><td>1</td><td>36/2026</td><td>04/09/2026</td><td>04/09/2026</td><td>
<form action="/IPOJournal/Journal/ViewJournal" method="post"><input type="hidden" name="FileName" value="ipo-docs\\IPIndia_Docs\\PAT\\2026\\36_2026\\Official Journal (36-2026) 04.09.2026) 1st part.pdf" /><button type="submit">Part I</button></form>
<form action="/IPOJournal/Journal/ViewJournal" method="post"><input type="hidden" name="FileName" value="ipo-docs\\IPIndia_Docs\\PAT\\2026\\36_2026\\Official Journal (36-2026) 04.09.2026) Design.pdf" /><button type="submit">Part IV - Designs</button></form>
</td></tr>
<tr><td>2</td><td>35/2026</td><td>28/08/2026</td><td>28/08/2026</td><td>
<form action="/IPOJournal/Journal/ViewJournal" method="post"><input type="hidden" name="FileName" value="ipo-docs\\IPIndia_Docs\\PAT\\2026\\35_2026\\Official Journal (35-2026) 28.08.2026 1st docx.pdf" /><button type="submit">Part I</button></form>
</td></tr>
</tbody></table>`

test('parses Indian DD/MM/YYYY dates without US month/day swap', () => {
  assert.equal(parseJournalDate('04/09/2026'), '2026-09-04')
  assert.equal(parseJournalDate('28/08/2026'), '2026-08-28')
  assert.equal(parseJournalDate('2026-09-04'), '2026-09-04')
  assert.equal(parseJournalDate('nonsense'), null)
})

test('parses the journal index into issues with POST download parts', () => {
  const issues = parseJournalIndex(indexFixture)
  assert.equal(issues.length, 2)
  assert.equal(issues[0].journal_number, '36/2026')
  assert.equal(issues[0].publication_date, '2026-09-04')
  assert.equal(issues[0].parts.length, 2)
  assert.equal(issues[0].parts[0].label, 'Part I')
  assert.match(issues[0].parts[0].file_name, /36_2026/)
  assert.equal(issues[0].parts[0].method, 'POST')
  assert.match(issues[0].parts[0].action, /ViewJournal/)
  assert.equal(issues[1].journal_number, '35/2026')
})

test('lists issue URLs filtered to a date range scan', () => {
  const issues = parseJournalIndex(indexFixture)
  const all = listJournalIssueUrls(issues)
  assert.equal(all.length, 3)
  const ranged = listJournalIssueUrls(issues, {from: '2026-09-01', to: '2026-09-05'})
  assert.equal(ranged.length, 2)
  assert.ok(ranged.every((d) => d.journal_number === '36/2026'))
  assert.match(ranged[0].action, /^https?:\/\//)
  const partFiltered = listJournalIssueUrls(issues, {parts: ['Part IV - Designs']})
  assert.equal(partFiltered.length, 1)
  assert.equal(partFiltered[0].part_label, 'Part IV - Designs')
})

const tableIssueFixture = `<table><tr><th>Application No.</th><th>Title</th><th>Applicant</th></tr>
<tr><td>202411012345</td><td>Solar tracking apparatus</td><td>Example Solar Pvt Ltd</td></tr>
<tr><td>1234/DEL/2015</td><td>Seed coating composition</td><td>Example Agro Ltd</td></tr></table>`

test('parses an HTML issue table into journal entries', () => {
  const entries = parseJournalIssueListing(tableIssueFixture, {publication_date: '2026-09-04', journal_number: '36/2026', part_label: 'Part I'})
  assert.equal(entries.length, 2)
  assert.equal(entries[0].application_number, '202411012345')
  assert.equal(entries[0].title, 'Solar tracking apparatus')
  assert.equal(entries[0].applicant, 'Example Solar Pvt Ltd')
  assert.equal(entries[0].publication_date, '2026-09-04')
  assert.equal(entries[0].journal_number, '36/2026')
})

const textIssueFixture = `(21) Application No. 202411012345 (54) Title of the invention : SOLAR TRACKING APPARATUS (71) Name of Applicant : Example Solar Pvt Ltd
(21) Application No. 202411067890 (54) Title of the invention : WIDGET CALIBRATION SYSTEM (71) Name of Applicant : Example Widgets Ltd`

test('parses field-coded PDF-extract text into journal entries', () => {
  const entries = parseJournalIssueListing(textIssueFixture, {publication_date: '2026-09-04', journal_number: '36/2026'})
  assert.equal(entries.length, 2)
  assert.match(entries[0].application_number, /202411012345/)
  assert.match(entries[0].title || '', /SOLAR/i)
  assert.match(entries[0].applicant || '', /Solar/i)
})

test('maps entries through the canonicaliser with provider inpass_journal', () => {
  const row = toProviderRecord({application_number: '202411012345', publication_date: '2026-09-04', title: 'Solar tracking apparatus', applicant: 'Example Solar Pvt Ltd', journal_number: '36/2026', part_label: 'Part I'})
  assert.equal(row.provider, INPASS_JOURNAL_PROVIDER)
  assert.equal(row.provider, 'inpass_journal')
  assert.equal(row.country, 'IN')
  assert.equal(row.external_id, 'IN202411012345')
  assert.equal(row.normalized_number, 'IN202411012345')
  assert.equal(row.title, 'Solar tracking apparatus')
  assert.equal(row.publication_date, '2026-09-04')
  assert.deepEqual(row.assignees, ['Example Solar Pvt Ltd'])
  assert.equal(row.family_method, 'unresolved')
  assert.equal(row.raw.application_number, '202411012345')
})

test('upserts journal rows with the canonical conflict pattern', async () => {
  const seen = []
  const sql = async (parts, ...values) => {
    const text = parts.join('§')
    seen.push({text, values})
    if (text.includes('FROM matters')) return [{id: 'matter-1'}]
    return [{}]
  }
  const rows = [toProviderRecord({application_number: '202411012345', publication_date: '2026-09-04', title: 'Widget', applicant: 'Example Ltd'})]
  const result = await storeJournalRecords(sql, 'user-1', 'matter-1', rows)
  assert.equal(result.stored, 1)
  const insert = seen.find((q) => q.text.includes('provider_records'))
  assert.ok(insert)
  assert.match(insert.text, /ON CONFLICT\(user_id,provider,external_id\)/)
  assert.match(insert.text, /DO UPDATE SET/)
})

test('refuses to store without a matter and labels a missing matter', async () => {
  const sql = async () => []
  await assert.rejects(() => storeJournalRecords(sql, 'user-1', 'matter-1', [{external_id: 'IN1'}]), (e) => e.code === 'MATTER_NOT_FOUND')
  await assert.rejects(() => storeJournalRecords(sql, null, 'matter-1', []), (e) => e.code === 'INVALID_INPUT')
})

test('detects captcha and 403 responses as blocked automation', () => {
  assert.equal(isBlockedResponse(403, 'ok'), true)
  assert.equal(isBlockedResponse(200, 'please solve this captcha to continue'), true)
  assert.equal(isBlockedResponse(200, 'normal journal table'), false)
})

test('gentle index fetch sends an identifying User-Agent and stops on 403', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({url: String(url), options})
    return {ok: false, status: 403, text: async () => 'Forbidden'}
  }
  await assert.rejects(() => fetchJournalIndex({fetchImpl}), (e) => e.code === 'JOURNAL_BLOCKED')
  assert.match(calls[0].url, /IPOJournal/)
  assert.equal(calls[0].options.headers['User-Agent'], USER_AGENT)
  assert.match(calls[0].url, new RegExp(JOURNAL_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 20)))
})
