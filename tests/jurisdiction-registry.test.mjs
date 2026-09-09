import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveJurisdiction } from '../src/lib/jurisdiction-registry.js'

test('common words do not resolve to countries', () => {
  assert.equal(resolveJurisdiction('Draft a mutual NDA between A Ltd and B Ltd as a Word document'), null)
  assert.equal(resolveJurisdiction('Tell us about novelty'), null)
  assert.equal(resolveJurisdiction('File it in the office tomorrow'), null)
})

test('uppercase codes and real names still resolve', () => {
  assert.equal(resolveJurisdiction('Run FTO in the US')?.code, 'US')
  assert.equal(resolveJurisdiction('Clearance in IN for SaaS')?.code, 'IN')
  assert.equal(resolveJurisdiction('File in India')?.code, 'IN')
  assert.equal(resolveJurisdiction('Prosecution in Germany')?.code, 'DE')
  assert.equal(resolveJurisdiction('UK patent search')?.code, 'GB')
})
