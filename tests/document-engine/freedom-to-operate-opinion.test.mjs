import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateFtoInterviewStep,
  extractFtoMatterContext,
  isPatentabilityMisconception,
  isAffirmativeConfirmation,
  isSkipOrUnknown,
  assessFtoReadiness,
  FTO_REVIEW_FLAGS,
  FTO_OUTCOMES,
  FTO_READINESS,
} from '../../src/lib/freedom-to-operate-interview-graph.js'

import {
  createFtoScope,
  decomposeProductFeatures,
  detectProductSourceConflict,
  resolvePatentFamiliesAndTerritories,
  verifyLegalStatus,
  mapProductToClaimLimitations,
  detectAnalysisContradictions,
  evaluateDesignAround,
  assembleFtoOpinion,
  createFtoVersion,
  LEGAL_STATUSES,
  PROVENANCE_STATES,
} from '../../src/lib/fto-opinion-service.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import { assertChatAllowed } from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING & CANONICAL PROFILE
// ============================================================
test('routing: recognizes natural FTO requests', () => {
  const ftoPhrases = [
    'prepare an FTO',
    'freedom to operate',
    'can we launch this product?',
    'can we sell this product?',
    'are there patents blocking this?',
    'check third-party patent risk',
    'FTO search',
    'clear this product for launch',
    'do these patents cover our product?',
    'analyse blocking patents',
    'analyze blocking patents',
    'check patent clearance',
    'assess infringement risk before launch',
  ]

  for (const phrase of ftoPhrases) {
    const slug = resolveDocumentFamily(phrase)
    assert.equal(slug, 'freedom-to-operate-opinion', `Expected "${phrase}" to route to freedom-to-operate-opinion`)
  }
})

test('routing: does NOT misroute patentability, novelty, invalidity, or landscape requests', () => {
  assert.equal(resolveDocumentFamily('is my invention patentable?'), 'patentability-assessment')
  assert.equal(resolveDocumentFamily('is Claim 1 novel?'), 'patent-novelty-opinion')
  assert.equal(resolveDocumentFamily('find prior art against our patent'), 'patent-prior-art-search-report')
})

test('profile: loads canonical Freedom-to-Operate Opinion profile', async () => {
  const profile = await loadDocumentProfile('freedom-to-operate-opinion')
  assert.ok(profile)
  assert.equal(profile.id, 'freedom-to-operate-opinion')
  assert.equal(profile.document_number, '016')
  assert.equal(profile.family, 'PATENT_ANALYSIS')
  assert.equal(profile.risk_level, 'VERY_HIGH')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.sections.length, 25)
})

// ============================================================
// 2. TESTS 100 TO 109 — INTAKE, CONTEXT, TERRITORIALITY & STATUS
// ============================================================
test('Test 100: "Can we sell our product?" does not answer clearance; asks ONE material question (jurisdiction/product)', () => {
  const step = evaluateFtoInterviewStep({
    session: {},
    latestMessage: 'Can we sell our product?',
  })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.ok(!step.message.toLowerCase().includes('safe to launch'))
  assert.ok(!step.message.toLowerCase().includes('you have freedom to operate'))
  assert.equal(step.single_question.field, 'jurisdiction')
})

test('Test 101: "Our invention is novel, so we have FTO, right?" clarifies novelty does not equal FTO and routes to territory inquiry', () => {
  const step = evaluateFtoInterviewStep({
    session: {},
    latestMessage: 'Our invention is novel, so we have FTO, right?',
  })
  assert.equal(step.action, 'CLARIFICATION_REQUIRED')
  assert.ok(step.message.includes('A finding that your invention is novel or patentable does **not** establish freedom to operate'))
  assert.ok(step.session.flags.includes(FTO_REVIEW_FLAGS.PATENTABILITY_VS_FTO_CLARIFIED))
})

test('Test 102: Matter already containing Product v3, US launch, spec, known patents skips asking for them', () => {
  const matterContext = {
    matter: {
      product_name: 'Industrial Ultrasonic Transducer',
      product_version: 'v3.0',
      jurisdictions: ['US'],
      features: ['Piezoelectric crystal array', 'Dynamic impedance tuning'],
      known_patents: ['US9876543B2'],
    },
  }
  const extracted = extractFtoMatterContext(matterContext)
  assert.equal(extracted.status.product_name, 'KNOWN')
  assert.equal(extracted.status.product_version, 'KNOWN')
  assert.equal(extracted.status.jurisdiction, 'KNOWN')
  assert.equal(extracted.status.product_features, 'KNOWN')
  assert.equal(extracted.status.known_patents, 'KNOWN')

  const step = evaluateFtoInterviewStep({
    session: {},
    latestMessage: 'Run the FTO.',
    matterContext,
  })
  assert.notEqual(step.single_question?.field, 'product_name')
  assert.notEqual(step.single_question?.field, 'jurisdiction')
})

test('Test 103: Matter with multiple product versions (v2 and v3) flags PRODUCT_VERSION_CONFIRMATION_REQUIRED', () => {
  const matterContext = {
    matter: {
      product_name: 'Spectrometer',
      available_versions: ['v2.0', 'v3.0'],
      jurisdictions: ['US'],
    },
  }
  const step = evaluateFtoInterviewStep({
    session: {},
    latestMessage: 'Run the FTO.',
    matterContext,
  })
  assert.equal(step.action, 'CONFIRMATION_REQUIRED')
  assert.ok(step.session.flags.includes(FTO_REVIEW_FLAGS.PRODUCT_VERSION_CONFIRMATION_REQUIRED))
  assert.equal(step.single_question.field, 'product_version')
})

test('Test 104: Fully described product without market specified prompts for jurisdiction before conclusion', () => {
  const matterContext = {
    matter: {
      product_name: 'Wearable Sensor Band',
      product_version: 'v1.0',
      features: ['Optical heart rate sensor', 'BLE transceiver'],
    },
  }
  const step = evaluateFtoInterviewStep({
    session: {},
    latestMessage: 'Prepare the FTO.',
    matterContext,
  })
  assert.equal(step.action, 'ASK_QUESTION')
  assert.equal(step.single_question.field, 'jurisdiction')
})

test('Test 105: US analysis does not infer or state worldwide freedom to operate', () => {
  const scope = createFtoScope({ product_name: 'Widget', product_version: 'v1.0', jurisdiction: 'US' })
  const doc = assembleFtoOpinion(scope, [], { zero_results: false })
  assert.ok(!doc.content.toLowerCase().includes('worldwide clearance granted'))
  assert.ok(!doc.content.toLowerCase().includes('global clearance'))
  assert.ok(doc.content.includes('Territorial rights only; does not provide global or worldwide freedom to operate'))
})

test('Test 106: Search finding relevant WO publication resolves target national members and does not treat WO as worldwide blocking patent', () => {
  const resolved = resolvePatentFamiliesAndTerritories(
    [{ publication_number: 'WO2021098765A1', family_id: 'fam-wo-1' }],
    ['US', 'EP']
  )
  assert.equal(resolved[0].is_wo_publication, true)
  assert.equal(resolved[0].enforceable_right, false)
  assert.ok(resolved[0].target_members.some((m) => m.jurisdiction === 'US'))
  assert.ok(resolved[0].target_members.some((m) => m.jurisdiction === 'EP'))
})

test('Test 107: Potentially relevant patent appearing old does not infer expiry from age alone; flags TERM_RESEARCH_REQUIRED', () => {
  const status = verifyLegalStatus({
    publication_number: 'US5432100A',
    inferred_expired_by_age: true,
    verified_status: false,
  })
  assert.equal(status.flag, FTO_REVIEW_FLAGS.TERM_RESEARCH_REQUIRED)
  assert.equal(status.status_category, LEGAL_STATUSES.STATUS_UNCERTAIN)
})

test('Test 108: Source A says active while Source B says lapsed triggers STATUS_CONFLICT_REQUIRES_REVIEW', () => {
  const status = verifyLegalStatus({
    publication_number: 'US7654321B2',
    sources: [
      { database: 'Database A', status: 'ACTIVE' },
      { database: 'Database B', status: 'LAPSED' },
    ],
  })
  assert.equal(status.flag, FTO_REVIEW_FLAGS.STATUS_CONFLICT_REQUIRES_REVIEW)
  assert.equal(status.status_category, LEGAL_STATUSES.STATUS_UNCERTAIN)
})

test('Test 109: Pending application with broad claims flags PENDING_CLAIM_RISK and does not treat current claims as final', () => {
  const status = verifyLegalStatus({
    publication_number: 'US20230123456A1',
    is_application: true,
    status: 'PENDING',
  })
  assert.equal(status.flag, FTO_REVIEW_FLAGS.PENDING_CLAIM_RISK)
  assert.equal(status.status_category, LEGAL_STATUSES.PENDING)
})

// ============================================================
// 3. TESTS 110 TO 118 — CLAIM MAPPING & ALL-LIMITATIONS DISCIPLINE
// ============================================================
test('Test 110: Patent abstract strongly resembles product but claims do not map -> not classified as blocking patent', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A hydraulic actuator comprising high-pressure fluid valve.' },
    ['wearable fitness tracker with optical sensor'],
    { abstract_matches: true, claims_do_not_map: true }
  )
  assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE)
})

test('Test 111: Patent title appears unrelated but claims map to product -> not dismissed based on title', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A system comprising an optical sensor and processor.', title: 'Apparatus for Industrial Observation' },
    ['optical sensor', 'processor'],
    {}
  )
  assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.MATERIAL_CLAIM_MAPPING_IDENTIFIED)
})

test('Test 112: All-Limitations Rule: Claim requires A+B+C+D, product has A+B+C -> D is NOT_MAPPED, conclusion is PARTIAL_MAPPING_ONLY', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'An apparatus comprising element A, element B, and element C, and element D.' },
    ['element A', 'element B', 'element C']
  )
  assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.PARTIAL_MAPPING_ONLY)
  assert.equal(mapping.unmappedCount, 1)
  const dMapping = mapping.mappings.find((m) => m.limitation_text.includes('element D'))
  assert.equal(dMapping.mapping_status, 'missing')
})

test('Test 113: Relational limitation: Sensor coupled to processor such that processor controls X in response to Y marks AMBIGUOUS without relationship evidence', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A sensor coupled to a processor such that the processor controls X in response to Y.' },
    ['sensor component', 'processor component']
  )
  assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.CLAIM_CONSTRUCTION_REVIEW_REQUIRED))
  assert.ok(mapping.mappings.some((m) => m.mapping_status === 'ambiguous'))
})

test('Test 114: Functional limitation: Processor configured to calculate Z is NOT mapped where product evidence only shows general processor', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A processor configured to calculate Z.' },
    ['quad-core application processor']
  )
  assert.equal(mapping.unmappedCount, 1)
  assert.ok(mapping.mappings.some((m) => m.mapping_status === 'missing'))
})

test('Test 115: Method claim requiring steps by specific actor is NOT mapped merely because product has capability', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A method comprising calibrating sensor by an authorized technician.' },
    ['sensor calibration routine capability'],
    { is_method_claim: true, actor_specified: true, product_performs_step: false }
  )
  assert.equal(mapping.unmappedCount, 1)
})

test('Test 116: Distributed cloud system (client in US, server abroad) captures distributed facts and flags MULTI_ACTOR_REVIEW_REQUIRED', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A method comprising client user interaction and remote server processing.' },
    ['client app deployed in US', 'backend server hosted in Frankfurt'],
    { is_distributed_cloud: true }
  )
  assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.MULTI_ACTOR_REVIEW_REQUIRED))
})

test('Test 117: Numerical range: Claim requires 10 to 20 mm, product is 30 mm -> OUTSIDE_RANGE and NOT_MAPPED', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A structural bracket having a thickness of 10 to 20 mm.' },
    ['bracket thickness of 30 mm']
  )
  assert.equal(mapping.unmappedCount, 1)
  const numMapping = mapping.mappings.find((m) => m.limitation_text.includes('10 to 20 mm'))
  assert.equal(numMapping.mapping_status, 'missing')
  assert.ok(numMapping.note.includes('outside claimed range'))
})

test('Test 118: Equivalents / non-literal risk: Distinct from literal mapping; flags EQUIVALENTS_REVIEW_REQUIRED', () => {
  const mapping = mapProductToClaimLimitations(
    { claim_number: 1, claim_text: 'A helical coil spring.' },
    ['hydraulic damper cylinder'],
    { evaluate_equivalents: true }
  )
  assert.ok(mapping.flags.includes(FTO_REVIEW_FLAGS.EQUIVALENTS_REVIEW_REQUIRED))
})

// ============================================================
// 4. TESTS 119 TO 128 — NPL, INVALIDITY, DESIGN AROUND, CONTRADICTION & SECURITY
// ============================================================
test('Test 119: Search finding academic paper does not classify paper as a blocking patent', () => {
  const res = mapProductToClaimLimitations(
    { is_npl: true, claim_text: 'Academic paper: Neural network level sensing, IEEE 2021.' },
    ['neural network level sensing']
  )
  assert.equal(res.is_patent_right, false)
  assert.equal(res.claim_conclusion, 'NON_PATENT_LITERATURE_NOT_BLOCKING')
})

test('Test 120: Invalidity evidence against third-party patent retains FTO mapping separately and offers Invalidity handoff', () => {
  const doc = assembleFtoOpinion(createFtoScope(), [], {})
  assert.ok(doc.content.includes('INVALIDITY ISSUES IDENTIFIED SEPARATELY'))
  assert.ok(doc.content.includes('does not automatically eliminate FTO risk'))
})

test('Test 121: Design-around analysis identifies affected limitations without promising non-infringement', () => {
  const da = evaluateDesignAround('capacitive touch sensor', {})
  assert.ok(da.proposed_change.includes('Removal or modification of "capacitive touch sensor"'))
  assert.ok(da.caveat.includes('does not automatically guarantee non-infringement'))
})

test('Test 122: Product v4 changing processing architecture flags FTO_ASSESSMENT_STALE for affected mappings', () => {
  assert.equal(FTO_REVIEW_FLAGS.FTO_ASSESSMENT_STALE, 'FTO_ASSESSMENT_STALE')
})

test('Test 123: New relevant granted patent added after opinion flags NEW_RIGHT_REVIEW_REQUIRED', () => {
  assert.equal(FTO_REVIEW_FLAGS.NEW_RIGHT_REVIEW_REQUIRED, 'NEW_RIGHT_REVIEW_REQUIRED')
})

test('Test 124: Search returning zero results yields NO_POTENTIALLY_RELEVANT_RIGHT_IDENTIFIED_WITHIN_SEARCH_SCOPE, not "FULL FTO CONFIRMED"', () => {
  const doc = assembleFtoOpinion(createFtoScope(), [], { zero_results: true })
  assert.equal(doc.overall_conclusion, FTO_OUTCOMES.NO_MATERIAL_MAPPING_IDENTIFIED_WITHIN_SCOPE)
  assert.ok(doc.content.includes('NO POTENTIALLY RELEVANT RIGHT IDENTIFIED WITHIN SEARCH SCOPE'))
  assert.ok(!doc.content.toLowerCase().includes('full fto confirmed'))
})

test('Test 125: Unverified patent number flags REFERENCE_VERIFICATION_FAILED and rejects reference', () => {
  const status = verifyLegalStatus({
    publication_number: 'US999999999B2',
    verified_existence: false,
  })
  assert.equal(status.flag, FTO_REVIEW_FLAGS.REFERENCE_VERIFICATION_FAILED)
  assert.equal(status.status_category, LEGAL_STATUSES.STATUS_UNCERTAIN)
})

test('Test 126: Unverified claim text flags CLAIM_VERIFICATION_FAILED and refuses mapping', () => {
  const mapping = mapProductToClaimLimitations({
    claim_number: 7,
    verified_claim_text: false,
  })
  assert.equal(mapping.flag, FTO_REVIEW_FLAGS.CLAIM_VERIFICATION_FAILED)
  assert.equal(mapping.claim_conclusion, FTO_OUTCOMES.RESEARCH_REQUIRED)
})

test('Test 127: Claim chart showing missing limitation while summary claims all mapped flags ANALYSIS_CONTRADICTION', () => {
  const chart = {
    claim_number: 1,
    mappings: [
      { ordinal: 1, mapping_status: 'mapped' },
      { ordinal: 2, mapping_status: 'missing' },
    ],
  }
  const contradiction = detectAnalysisContradictions([chart], 'Executive Summary: All limitations are mapped to the product.')
  assert.equal(contradiction.hasContradiction, true)
  assert.equal(contradiction.flag, FTO_REVIEW_FLAGS.ANALYSIS_CONTRADICTION)
})

test('Test 128: Confidential unreleased product FTO fails closed under CONFIDENTIAL_PILOT_BLOCKED against unapproved free model', () => {
  const confidentialMatter = {
    matter: {
      id: 'matter-fto-confidential-016',
      confidential: true,
      unreleased_product: true,
    },
  }

  assert.throws(
    () => {
      assertChatAllowed({
        provider: 'free_tier_provider',
        model: 'free-chat-model',
        matterContext: confidentialMatter,
      })
    },
    /Confidentiality fail-closed|CONFIDENTIAL_PILOT_BLOCKED|CONFIDENTIAL_IP/
  )
})
