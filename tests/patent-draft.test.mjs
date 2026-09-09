import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDraftScaffold, detectAttorneyPersona, detectFilingPosture, extractDraftFeatures, screenSection101 } from '../src/lib/patent-draft-service.js'

test('attorney impersonation requests are detected', () => {
  assert.equal(detectAttorneyPersona('Act as a registered US Patent Attorney and draft'), true)
  assert.equal(detectAttorneyPersona('Draft a patent specification scaffold'), false)
})

test('provisional cited under §111(a) is corrected to §111(b)', () => {
  const { posture, corrections } = detectFilingPosture('draft a complete US patent application specification under 35 U.S.C. § 111 ready for USPTO provisional filing')
  assert.equal(posture, 'provisional')
  assert.ok(corrections.some(c => c.includes('§ 111(b)')))
})

test('software subject matter triggers the §101 screen', () => {
  assert.match(screenSection101('threshold Shamir secret sharing over ephemeral WebRTC data channels'), /Alice\/Mayo/)
  assert.equal(screenSection101('A forged steel piston with cooling bores'), null)
})

test('scaffold contains all seven sections plus checklist and gaps', () => {
  const content = buildDraftScaffold({ title: 'Test', posture: 'provisional', corrections: ['c1'], attorneyPersona: true, section101: 'screen', features: ['A widget', 'A gadget'], gaps: ['g1'] })
  for (const h of ['## 1. Title', '## 2. Field', '## 3. Background', '## 4. Summary', '## 5. Detailed', '## 6. Claim', '## 7. Abstract', '## Filing checklist', '## Inventor gaps']) assert.ok(content.includes(h), h)
  assert.match(content, /declines that persona/)
  assert.match(content, /Claim 1 \(independent method\)/)
})

test('feature extraction skips fragments', () => {
  const feats = extractDraftFeatures('A system for key recovery. It uses Shamir sharing. Ok.')
  assert.ok(feats.length >= 1 && feats.every(f => f.length > 24))
})
