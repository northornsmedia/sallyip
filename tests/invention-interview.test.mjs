import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeInterview, buildInterviewContract, detectSophistication, draftGuidanceFor } from '../src/lib/invention-interview.js'
import { guardAnswerCitations, retrieveVerifiedEvidence } from '../src/lib/verification-service.js'

const msg = (content) => ({ role: 'user', content })

test('broad draft request starts an interview, not a draft', () => {
  const a = analyzeInterview([msg('Draft a patent application for my new mouse tech.')])
  assert.equal(a.phase, 'interview')
  assert.ok(a.nextQuestions.length <= 3 && a.nextQuestions.length > 0)
  assert.equal(a.sophisticated, 'plain')
})

test('interview does not repeat established slots', () => {
  const a = analyzeInterview([msg('My invention is a mouse with an optical sensor array that tracks finger gestures. Ordinary mice need button clicks which is slow and painful. It works by detecting finger movements through infrared sensors, and I believe the gesture vocabulary is new versus ordinary mice.')])
  assert.ok(a.filled.what && a.filled.problem && a.filled.how)
  assert.ok(!a.nextQuestions.some(q => /in your own words/i.test(q)))
})

test('rich disclosure transitions to ready', () => {
  const a = analyzeInterview([msg('My invention is an ergonomic mouse with optical gesture sensors solving click fatigue in CAD work. It works by tracking finger micro-movements via an IR array and translating them to CAD commands, which is new versus button mice. Components: IR sensor, microcontroller, CAD plugin. Alternative: a trackpad version. I have sketches to upload.')])
  assert.equal(a.phase, 'ready')
})

test('interview caps at four turns then proceeds partial', () => {
  const many = [msg('mouse'), msg('ergonomic'), msg('sensors'), msg('CAD work')]
  const a = analyzeInterview(many)
  assert.equal(a.phase, 'ready_partial')
})

test('attorney language switches register', () => {
  assert.equal(detectSophistication([msg('Check § 112 antecedent basis in claim 3 over the prior art.')]), 'advanced')
  assert.equal(detectSophistication([msg('Draft a patent for my mouse tech')]), 'plain')
})

test('interview contract bans capability talk and jargon', () => {
  const a = analyzeInterview([msg('Draft a patent for my mouse')])
  const contract = buildInterviewContract(a)
  assert.match(contract, /NEVER respond with a description of Sally's capabilities/)
  assert.match(contract, /plain English/i)
})

test('draft guidance selector routes interview vs draft', () => {
  const interview = draftGuidanceFor([msg('Draft a patent for my mouse tech')], 'Draft a patent for my mouse tech')
  assert.match(interview, /INVENTION INTERVIEW MODE/)
  const ready = draftGuidanceFor([msg('My mouse uses optical gesture sensors solving click fatigue, new versus button mice, works via IR array.')], 'Now draft the claims')
  assert.ok(!ready.includes('INVENTION INTERVIEW MODE') || ready.includes('PATENT-DRAFT'))
  assert.equal(draftGuidanceFor([msg('What is FTO?')], 'What is FTO?'), '')
})

test('unsupported superlatives are flagged without citations', () => {
  const { answer, guard } = guardAnswerCitations('This design is clearly novel and non-obvious.', [{ title: 'A' }], {})
  assert.equal(guard.supported, true)
  assert.match(answer, /Language check/)
  assert.match(answer, /unverified assessment/)
})

test('supported superlatives with citations pass quietly', () => {
  const { answer } = guardAnswerCitations('As shown in [S1], the design is novel.', [{ title: 'A' }], {})
  assert.ok(!answer.includes('Language check'))
})

test('overlap threshold drops single-generic-word fallback hits', async () => {
  const junk = { content: 'valve draft of air through the chamber', title: 'Irrigation' }
  const mockSql = async (strings) => strings.join('?').includes('terms[0]') ? [] : [junk]
  const rows = await retrieveVerifiedEvidence(mockSql, 'u1', 'm1', 'draft patent application mouse technology', { minOverlap: 2 })
  assert.deepEqual(rows, [])
})

test('overlap threshold keeps genuinely relevant passages', async () => {
  const good = { content: 'patent application drafting for the mouse sensor technology', title: 'Doc' }
  const mockSql = async () => [good]
  const rows = await retrieveVerifiedEvidence(mockSql, 'u1', 'm1', 'draft patent application mouse technology', { minOverlap: 2 })
  assert.equal(rows.length, 1)
})

test('default zero threshold preserves legacy behaviour', async () => {
  const junk = { content: 'valve draft of air', title: 'Irrigation' }
  const mockSql = async () => [junk]
  const rows = await retrieveVerifiedEvidence(mockSql, 'u1', 'm1', 'draft patent', {})
  assert.equal(rows.length, 1)
})

test('an NDA request after patent history is not hijacked into interview', () => {
  const history = [{ role: 'user', content: 'Draft a patent application for my mouse tech with optical sensors solving click fatigue' }, { role: 'assistant', content: 'What problem does it solve?' }]
  const latest = 'Draft a mutual NDA between A Ltd and B Ltd as a Word document'
  assert.equal(draftGuidanceFor([...history, { role: 'user', content: latest }], latest), '')
})

test('generic follow-up inside a drafting thread keeps the interview', () => {
  const history = [{ role: 'user', content: 'Draft a patent application for my mouse tech' }]
  const out = draftGuidanceFor([...history, { role: 'user', content: 'It uses optical sensors' }], 'It uses optical sensors')
  assert.match(out, /INVENTION INTERVIEW MODE/)
})
