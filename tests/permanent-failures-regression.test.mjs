import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finalizeVerifiedAnswer, cleanAndVerifyQuote } from '../src/lib/verification-service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const failureDatasetPath = path.resolve(__dirname, '../benchmarks/v1.0/failures_27_unverified_quotes.json')

test('permanent failure regression suite: 24 tracked v1.0 quotation failures are eliminated', () => {
  assert.ok(fs.existsSync(failureDatasetPath), 'v1.0 failure dataset must exist')
  const data = JSON.parse(fs.readFileSync(failureDatasetPath, 'utf8'))
  const cases = data.cases || []

  assert.ok(cases.length > 0, 'Must contain tracked failure cases')

  // Multi-source benchmark evidence suite representing statutory authority
  const standardEvidence = [
    {
      source_id: 's-101',
      passage_id: 'p-101',
      title: '35 U.S.C. § 101 Inventions Patentable',
      citation: '35 U.S.C. 101',
      jurisdiction: 'us',
      authority_tier: 1,
      locator: '35 U.S.C. § 101',
      content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.'
    },
    {
      source_id: 's-111',
      passage_id: 'p-111',
      title: '35 U.S.C. § 111 Application',
      citation: '35 U.S.C. 111',
      jurisdiction: 'us',
      authority_tier: 1,
      locator: '35 U.S.C. § 111',
      content: 'An application for patent shall be made, or authorized to be made, by the inventor, except as otherwise provided in this title, in writing to the Director.'
    },
    {
      source_id: 's-112',
      passage_id: 'p-112',
      title: '35 U.S.C. § 112 Specification',
      citation: '35 U.S.C. 112',
      jurisdiction: 'us',
      authority_tier: 1,
      locator: '35 U.S.C. § 112',
      content: 'The specification shall contain a written description of the invention, and of the manner and process of making and using it, in such full, clear, concise, and exact terms as to enable any person skilled in the art to which it pertains, or with which it is most nearly connected, to make and use the same...'
    },
    {
      source_id: 's-102',
      passage_id: 'p-102',
      title: '35 U.S.C. § 102 Conditions for patentability; novelty',
      citation: '35 U.S.C. 102',
      jurisdiction: 'us',
      authority_tier: 1,
      locator: '35 U.S.C. § 102',
      content: 'A person shall be entitled to a patent unless the claimed invention was patented, described in a printed publication, or in public use, on sale, or otherwise available to the public before the effective filing date of the claimed invention.'
    },
    {
      source_id: 's-103',
      passage_id: 'p-103',
      title: '35 U.S.C. § 103 Conditions for patentability; non-obvious subject matter',
      citation: '35 U.S.C. 103',
      jurisdiction: 'us',
      authority_tier: 1,
      locator: '35 U.S.C. § 103',
      content: 'A patent for a claimed invention may not be obtained, notwithstanding that the claimed invention is not identically disclosed as set forth in section 102, if the differences between the claimed invention and the prior art are such that the claimed invention as a whole would have been obvious before the effective filing date of the claimed invention to a person having ordinary skill in the art to which the claimed invention pertains.'
    },
    {
      source_id: 's-mpep2106',
      passage_id: 'p-mpep2106',
      title: 'MPEP § 2106 Patent Subject Matter Eligibility',
      citation: 'MPEP 2106',
      jurisdiction: 'us',
      authority_tier: 2,
      locator: 'MPEP § 2106',
      content: 'Step 2A Prong One evaluates whether the claim recites a judicial exception (i.e., an abstract idea, a law of nature, or a natural phenomenon). Judicial exceptions are abstract ideas, laws of nature, and natural phenomena.'
    }
  ]

  let exactMatches = 0
  let paraphrasedReplaced = 0

  for (const c of cases) {
    const rawAnswer = c.answer || ''
    const finalized = finalizeVerifiedAnswer(rawAnswer, standardEvidence, { requires_primary_sources: true }, { highRisk: true })

    // 1. Check quotation integrity: NO remaining quotation in finalized.answer may be unverified
    const quotesInFinal = []
    const rx = /"([^"\n]{8,600})"/g
    let m
    while ((m = rx.exec(finalized.answer)) !== null) {
      quotesInFinal.push(m[1])
    }

    for (const q of quotesInFinal) {
      const check = cleanAndVerifyQuote(q, standardEvidence)
      assert.equal(
        check.status,
        'exact',
        `Case ${c.key}: Any quotation presented to the user must be an exact verbatim match in the evidence passage. Found unverified quote: "${q}"`
      )
      exactMatches++
    }

    // 2. Zero dangling citations
    assert.equal(
      finalized.guard.dangling.length,
      0,
      `Case ${c.key} must have zero dangling citations`
    )

    // 3. Count if unverified quotes were safely converted to paraphrase
    const missing = finalized.guard.quotes.filter(q => q.status !== 'exact')
    paraphrasedReplaced += missing.length
  }

  assert.ok(exactMatches > 0 || paraphrasedReplaced > 0)
})

test('cleanAndVerifyQuote correctly resolves bracketed case differences like [W]hoever', () => {
  const passages = [{
    content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter...'
  }]

  const result = cleanAndVerifyQuote('[W]hoever invents or discovers', passages)
  assert.equal(result.status, 'exact')
  assert.equal(result.quote, 'Whoever invents or discovers')
})

test('finalizeVerifiedAnswer moves trailing citations outside quotes', () => {
  const passages = [{
    source_id: 's-1',
    passage_id: 'p-1',
    title: 'Statute',
    citation: '35 U.S.C. 101',
    jurisdiction: 'us',
    authority_tier: 1,
    locator: '§ 101',
    content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter...'
  }]

  const raw = 'The law says "Whoever invents or discovers [S1]."'
  const result = finalizeVerifiedAnswer(raw, passages, { requires_primary_sources: true })

  // Citation should be outside quotes, and quote verified exact
  assert.ok(result.answer.includes('"Whoever invents or discovers" [S1].'))
  assert.equal(result.guard.dangling.length, 0)
  assert.equal(result.guard.valid.length, 1)
})
