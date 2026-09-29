import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateAntecedentBasis,
  validateClaimSpecificationSupport,
  validateLegalTerminology,
  validateUnsupportedAbsoluteStatements,
  validateFunctionalClaiming,
  validateClaimClassConsistency,
  validateClaimDependencyHierarchy,
  validateAbstractCompliance,
  validateSpecificationBreadth,
  evaluateTechnicalDisclosureCompleteness,
  runFullPatentDraftValidator,
  BAD_DRAFT_ATTORNEY_CORRECTIONS
} from '../src/lib/patent-drafting-validator.js'

test('1. validateAntecedentBasis catches missing antecedent introduction under § 112(b)', () => {
  const badClaims = `
1. A system for data processing, comprising:
a network interface;
wherein the verification engine validates data received from the network interface.
`
  const result = validateAntecedentBasis(badClaims)
  assert.equal(result.passed, false)
  assert.ok(result.issues.some(i => i.term.includes('verification engine')), 'Should flag "the verification engine" lacking "a verification engine"')
})

test('1b. validateAntecedentBasis passes when elements are properly introduced', () => {
  const goodClaims = `
1. A system for data processing, comprising:
a network interface; and
a verification engine operatively coupled to the network interface;
wherein the verification engine validates data received from the network interface.
`
  const result = validateAntecedentBasis(goodClaims)
  assert.equal(result.passed, true)
  assert.equal(result.issues.length, 0)
})

test('2. validateClaimSpecificationSupport flags limitations with no support in specification (§ 112(a))', () => {
  const claims = `
1. A computer-implemented system, comprising:
a generative model; and
a quantum annealing coprocessor configured to optimize model weights.
`
  const spec = `
System Architecture: A networked computer system includes a generative neural network running on conventional CPU hardware.
`
  const result = validateClaimSpecificationSupport(claims, spec)
  assert.equal(result.passed, false)
  assert.ok(result.missingLimitations.some(m => m.limitation.includes('quantum annealing coprocessor')))
})

test('3. validateLegalTerminology rejects fabricated terms like "definite authorship"', () => {
  const badText = `
The claim drafting module enforces definite authorship requirements across all generated claims.
`
  const result = validateLegalTerminology(badText)
  assert.equal(result.passed, false)
  assert.ok(result.issues.some(i => i.term === 'definite authorship'))
  assert.ok(result.issues[0].recommendation.includes('35 U.S.C. § 112(b)'))
})

test('3b. validateLegalTerminology flags statutory section mismatches', () => {
  const mismatchText = `
The draft satisfies definiteness under § 101 requirements.
`
  const result = validateLegalTerminology(mismatchText)
  assert.equal(result.passed, false)
  assert.ok(result.issues.some(i => i.type === 'STATUTORY_MISMATCH'))
})

test('4. validateUnsupportedAbsoluteStatements catches "guarantees 100%" and premature novelty conclusions', () => {
  const badProse = `
The system guarantees 100% security and the invention is novel because it independently verifies AI output.
`
  const result = validateUnsupportedAbsoluteStatements(badProse)
  assert.equal(result.passed, false)
  assert.equal(result.issues.length, 2)
  assert.ok(result.issues.some(i => i.message.includes('estoppel')))
  assert.ok(result.issues.some(i => i.message.includes('prior art')))
})

test('5. validateFunctionalClaiming flags result-oriented claims without algorithmic support', () => {
  const claims = `
1. A system comprising:
a verification engine configured to eliminate all legal research errors;
a processor configured to ensure patent compliance.
`
  const bareSpec = `
A system includes an AI model and a server.
`
  const result = validateFunctionalClaiming(claims, bareSpec)
  assert.equal(result.passed, false)
  assert.ok(result.issues.length >= 1)
  assert.ok(result.issues[0].recommendation.includes('Williamson v. Citrix'))
})

test('6. validateClaimClassConsistency verifies Method, System, and CRM coverage', () => {
  const methodOnly = `
1. A computer-implemented method for patent analysis, comprising:
receiving an input; and
verifying an assertion.
`
  const result = validateClaimClassConsistency(methodOnly)
  assert.equal(result.passed, false)
  assert.ok(result.missingStatutoryClasses.some(c => c.includes('SYSTEM')))
  assert.ok(result.missingStatutoryClasses.some(c => c.includes('CRM')))
})

test('7. validateClaimDependencyHierarchy catches forward and non-existent dependencies', () => {
  const badDeps = `
1. A system comprising an interface.
2. The system of claim 5, further comprising a cache.
3. The system of claim 1, further comprising a logger.
`
  const result = validateClaimDependencyHierarchy(badDeps)
  assert.equal(result.passed, false)
  assert.ok(result.issues.some(i => i.type === 'FORWARD_OR_SELF_DEPENDENCY'))
})

test('8. validateAbstractCompliance checks length and patent jargon', () => {
  const longAbstract = 'word '.repeat(160) + 'said system whereby comprising elements.'
  const result = validateAbstractCompliance(longAbstract, 'some spec')
  assert.equal(result.passed, false)
  assert.ok(result.issues.some(i => i.type === 'ABSTRACT_LENGTH_EXCEEDED'))
  assert.ok(result.issues.some(i => i.type === 'PATENT_JARGON_IN_ABSTRACT'))
})

test('9. validateSpecificationBreadth flags generic claims with thin disclosure', () => {
  const claims = '1. A system comprising a verification engine.'
  const spec = 'The system includes a verification engine once.'
  const result = validateSpecificationBreadth(claims, spec)
  assert.equal(result.passed, false)
  assert.ok(result.warnings.some(w => w.element === 'verification engine'))
})

test('10. evaluateTechnicalDisclosureCompleteness generates 7 targeted questions and practitioner offer', () => {
  const partialDisclosure = {
    plain_description: 'An AI that checks patents'
  }
  const result = evaluateTechnicalDisclosureCompleteness(partialDisclosure)
  assert.equal(result.isFullyComplete, false)
  assert.equal(result.targetedTechnicalQuestions.length, 7)
  assert.equal(
    result.practitionerOffer,
    'I can prepare a preliminary draft now, or ask 7 targeted technical questions first for a stronger application.'
  )
})

test('11. BAD_DRAFT_ATTORNEY_CORRECTIONS provides paired training dataset examples', () => {
  assert.ok(BAD_DRAFT_ATTORNEY_CORRECTIONS.length >= 5)
  for (const pair of BAD_DRAFT_ATTORNEY_CORRECTIONS) {
    assert.ok(pair.bad.length > 0)
    assert.ok(pair.attorney_correction.length > 0)
    assert.ok(pair.category.length > 0)
  }
})

test('12. runFullPatentDraftValidator runs complete 10-point test suite', () => {
  const fullDraft = {
    claims: `
1. A computer-implemented system for verified intellectual property drafting, comprising:
a user interface configured to receive IP-related input;
a generative neural-network language model configured to produce an initial draft;
an independent verification engine operatively coupled to receive the initial draft; and
an output-gating mechanism configured to control presentation of the initial draft.

2. The system of claim 1, further comprising a prior-art search module.

3. A computer-implemented method for verified patent drafting, comprising:
receiving IP-related input;
generating an initial draft with a generative neural-network language model; and
independently verifying the initial draft with an independent verification engine.

4. A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause the processor to perform operations comprising:
receiving IP-related input;
generating an initial draft with a generative neural-network language model; and
independently verifying the initial draft with an independent verification engine.
`,
    specification: `
Detailed Description of Embodiments:
System Architecture: A user interface receives input. A generative neural-network language model produces an initial draft.
An independent verification engine operates outside the model. An output-gating mechanism controls presentation.
The generative neural-network language model operates as an inference engine.
The independent verification engine includes deterministic regex parsers and API connectors to authoritative patent databases. The verification engine assigns verification statuses.
The output-gating mechanism applies a truth-table algorithm to approve, flag, or suppress content based on verification status. The output-gating mechanism intercepts unverified content.
A prior-art search module performs comparative analysis. A processor and a memory execute the instructions.
`,
    abstract: `
An AI-assisted platform includes a generative model producing an initial draft and an independent verification engine. The verification engine extracts assertions and validates each against authoritative databases. An output-gating mechanism approves, corrects, flags, or suppresses content before presentation.
`,
    disclosureFacts: {
      verification_architecture: true,
      claim_support: true,
      error_handling: true,
      data_flow: true,
      database_sources: true,
      alternative_embodiments: true,
      prior_art_distinction: true
    }
  }

  const report = runFullPatentDraftValidator(fullDraft)
  assert.equal(report.testsTotal, 10)
  assert.ok(report.overallScore >= 90, `Overall score should be high for compliant draft, got ${report.overallScore}`)
  assert.equal(report.isReadyForFiling, true)
})
