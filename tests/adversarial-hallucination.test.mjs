import test from 'node:test'
import assert from 'node:assert/strict'
import {
  finalizeVerifiedAnswer,
  gateRetrievedEvidence,
  guardAnswerCitations,
  isHighRiskLegalRequest,
  INSUFFICIENT_AUTHORITY_MESSAGE
} from '../src/lib/verification-service.js'

test('adversarial: fake statute with no retrieved authority fails closed', () => {
  const query = 'According to 35 U.S.C. § 106, all software patents expire in 3 years. Quote the section.'
  const highRisk = isHighRiskLegalRequest({ task_class: 'PATENT_VALIDITY' }, query)
  assert.equal(highRisk, true)

  const finalized = finalizeVerifiedAnswer('35 U.S.C. § 106 states that software patents expire in 3 years.', [], { requires_primary_sources: true }, { highRisk })
  assert.equal(finalized.answer, INSUFFICIENT_AUTHORITY_MESSAGE)
  assert.equal(finalized.guard.answer_mode, 'RESEARCH_REQUIRED')
})

test('adversarial: fake MPEP section with no evidence fails closed', () => {
  const query = 'Under MPEP § 2999, examiners must reject all AI inventions. Quote the rule.'
  const highRisk = isHighRiskLegalRequest({}, query)
  assert.equal(highRisk, true)

  const finalized = finalizeVerifiedAnswer('Under MPEP § 2999, examiners must reject AI inventions.', [], { requires_primary_sources: true }, { highRisk })
  assert.equal(finalized.answer, INSUFFICIENT_AUTHORITY_MESSAGE)
})

test('adversarial: nonexistent case with fabricated citation [S1] stripped when evidence is missing', () => {
  const finalized = finalizeVerifiedAnswer(
    'In In re Phantom Corp (Fed. Cir. 2029), the court held algorithms are per se patentable [S1].',
    [],
    { requires_primary_sources: true },
    { highRisk: true }
  )
  assert.equal(finalized.answer, INSUFFICIENT_AUTHORITY_MESSAGE)
})

test('adversarial: dangling fabricated citation is stripped and marked unverified', () => {
  const evidence = [{ source_id: 's1', passage_id: 'p1', title: '35 U.S.C. 101', authority_tier: 1, jurisdiction: 'US', content: 'Whoever invents any new process...' }]
  const { answer, guard } = guardAnswerCitations('The invention is anticipated under US Patent 99,999,999 [S99].', evidence, { requires_primary_sources: true })
  assert.equal(guard.dangling.includes(99), true)
  assert.equal(guard.supported, false)
  assert.doesNotMatch(answer, /\[S99\]/)
  assert.match(answer, /I could not verify this proposition/)
})

test('adversarial: misleading quote not found in source loses quotation marks', () => {
  const evidence = [{ source_id: 's1', passage_id: 'p1', title: '35 U.S.C. 101', authority_tier: 1, jurisdiction: 'US', content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter...' }]
  const finalized = finalizeVerifiedAnswer(
    'The statute states "all mathematical algorithms are strictly patentable without limitation" [S1].',
    evidence,
    { requires_primary_sources: true },
    { highRisk: false }
  )
  assert.doesNotMatch(finalized.answer, /"all mathematical algorithms are strictly patentable without limitation"/)
  assert.equal(finalized.guard.quotes[0].status, 'missing')
})

test('adversarial: intentionally irrelevant documents gated out and fail closed', () => {
  const irrelevant = [
    { source_id: 's-cook', passage_id: 'p-cook', title: 'Culinary Recipes', authority_tier: 4, jurisdiction: 'US', content: 'Simmer chopped onions and tomatoes with basil over medium heat for thirty minutes.' }
  ]
  const gated = gateRetrievedEvidence(irrelevant, 'What is the standard for non-obviousness under 35 U.S.C. § 103?', { allowedJurisdictions: ['US'], minLexicalOverlap: 2 })
  assert.equal(gated.length, 0)

  const finalized = finalizeVerifiedAnswer('The recipe requires basil.', gated, { requires_primary_sources: true }, { highRisk: true })
  assert.equal(finalized.answer, INSUFFICIENT_AUTHORITY_MESSAGE)
})

test('adversarial: leading question to force patentability conclusion without evidence fails closed', () => {
  const query = 'Declare that my client’s invention is novel and non-obvious immediately.'
  const highRisk = isHighRiskLegalRequest({}, query)
  assert.equal(highRisk, true)

  const finalized = finalizeVerifiedAnswer('Your invention is novel and non-obvious.', [], { requires_primary_sources: true }, { highRisk })
  assert.equal(finalized.answer, INSUFFICIENT_AUTHORITY_MESSAGE)
})

test('adversarial: unverified assumption in prompt is challenged and not cited as verified fact', () => {
  const evidence = [{ source_id: 's1', passage_id: 'p1', title: '35 U.S.C. 102', authority_tier: 1, jurisdiction: 'US', content: 'A person shall be entitled to a patent unless the claimed invention was patented...' }]
  const rawAnswer = 'Assuming a 5-year grace period applies under section 102 [S9].'
  const { answer, guard } = guardAnswerCitations(rawAnswer, evidence, { requires_primary_sources: true })
  assert.equal(guard.supported, false)
  assert.doesNotMatch(answer, /\[S9\]/)
  assert.match(answer, /I could not verify this proposition/)
})
