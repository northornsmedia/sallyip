import test from 'node:test'
import assert from 'node:assert/strict'
import {
  screenSubjectMatter101,
  verifyClaimSupport112,
  assembleFullSpecification,
  USPTO_SECTIONS
} from '../src/lib/patent-drafting-service.js'

test('screenSubjectMatter101 correctly identifies Alice abstract risks for crypto and software', () => {
  const disclosure = 'A system for decentralized cryptographic key recovery using Shamir threshold polynomial calculations across ephemeral WebRTC data channels.'
  const result = screenSubjectMatter101(disclosure)
  assert.ok(result.riskScore > 20, 'Risk score should be elevated for algorithmic and mathematical concepts')
  assert.ok(result.risks.length > 0, 'Should detect mathematical/algorithmic risks')
  assert.ok(result.recommendations.length > 0, 'Should provide actionable drafting recommendations')
  assert.ok(result.aliceProngAnalysis.step2A_prong1.includes('Abstract concept'), 'Prong 1 should flag mathematical/cryptographic concept')
})

test('screenSubjectMatter101 recognizes mechanical/physical disclosures as low risk', () => {
  const mechanical = 'An internal combustion engine piston assembly having dual cooling bores and forged steel crown.'
  const result = screenSubjectMatter101(mechanical)
  assert.equal(result.riskLevel, 'green')
  assert.equal(result.risks.length, 0)
})

test('verifyClaimSupport112 detects antecedent basis violations under § 112(b)', () => {
  const claimsText = `1. An apparatus for data transmission, comprising:
  a transceiver configured to transmit packets;
  wherein the pressure sensor measures hydraulic pressure during transmission.`
  const specText = 'An apparatus for data transmission includes a transceiver and a pressure sensor.'
  const check = verifyClaimSupport112(claimsText, specText)
  
  const antecedentErrors = check.issues.filter(i => i.type === 'antecedent_basis')
  assert.ok(antecedentErrors.length >= 1, 'Should flag "the pressure sensor" introduced without preceding "a pressure sensor"')
  assert.ok(antecedentErrors.some(e => e.term.includes('pressure sensor')))
})

test('verifyClaimSupport112 detects claim limitations missing from Detailed Description under § 112(a)', () => {
  const claimsText = `1. A system, comprising:
  a quantum cryptographic processor;
  a memory buffer connected to said quantum cryptographic processor.`
  const specText = 'A conventional server system with a memory buffer.'
  const check = verifyClaimSupport112(claimsText, specText)

  const gaps = check.issues.filter(i => i.type === 'enablement_gap')
  assert.ok(gaps.length >= 1, 'Should flag quantum cryptographic processor as missing written description support in spec')
})

test('assembleFullSpecification orders all 7 USPTO sections correctly', () => {
  const draft = {
    title: 'Distributed Key Recovery',
    filing_type: 'provisional_111b'
  }
  const sections = [
    { section_key: 'title_field', heading: 'Title & Field of the Invention', content: 'Field of invention details.' },
    { section_key: 'background', heading: 'Background & Technical Problem', content: 'Background details.' },
    { section_key: 'summary', heading: 'Brief Summary of the Invention', content: 'Summary details.' },
    { section_key: 'drawings', heading: 'Brief Description of the Drawings', content: 'FIG. 1 shows architecture.' },
    { section_key: 'detailed_description', heading: 'Detailed Description of Embodiments', content: 'Embodiments details.' },
    { section_key: 'claims', heading: 'Claims (35 U.S.C. § 112)', content: '1. A method comprising...' },
    { section_key: 'abstract', heading: 'Abstract', content: 'A short abstract.' }
  ]

  const doc = assembleFullSpecification(draft, sections)
  assert.ok(doc.includes('DISTRIBUTED KEY RECOVERY'))
  assert.ok(doc.includes('35 U.S.C. § 111(b)'))
  assert.ok(doc.indexOf('FIELD OF THE INVENTION') < doc.indexOf('BACKGROUND'))
  assert.ok(doc.indexOf('BACKGROUND') < doc.indexOf('BRIEF SUMMARY'))
  assert.ok(doc.indexOf('BRIEF SUMMARY') < doc.indexOf('BRIEF DESCRIPTION OF THE DRAWINGS'))
  assert.ok(doc.indexOf('BRIEF DESCRIPTION OF THE DRAWINGS') < doc.indexOf('DETAILED DESCRIPTION'))
  assert.ok(doc.indexOf('DETAILED DESCRIPTION') < doc.indexOf('CLAIMS'))
  assert.ok(doc.indexOf('CLAIMS') < doc.indexOf('ABSTRACT'))
})
