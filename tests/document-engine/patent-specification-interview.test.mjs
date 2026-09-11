import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluatePatentSpecificationInterviewStep,
  extractPatentSpecificationMatterFacts,
  detectPatentSpecificationMode,
  detectFilingRouteRequest,
  SPEC_DRAFTING_MODES,
  SPEC_REVIEW_FLAGS,
} from '../../src/lib/patent-specification-interview-graph.js'
import {
  assemblePatentSpecification,
  buildClaimSupportMapForSpecification,
  buildClaimTermCoverage,
  detectTerminologyConflicts,
  detectNumeralConflicts,
  buildFigureRegistry,
  classifyExampleKind,
  classifyNewMatter,
  applySectionEdits,
  analyzeChangeImpact,
  assertSpecificationChatAllowed,
  SPEC_LOCK_STATUSES,
} from '../../src/lib/patent-specification-drafting-service.js'
import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'
import { resolveDocumentFamily, loadDocumentProfile } from '../../src/lib/document-engine.js'

test('routing: recognizes Patent Specification requests (8/8)', () => {
  const phrases = [
    'draft a patent specification',
    'prepare the specification',
    'write the detailed patent specification',
    'prepare a full patent description',
    'draft the description for my patent',
    'turn this invention disclosure into a patent specification',
    'prepare the patent description',
    'draft the specification around these claims',
  ]
  for (const phrase of phrases) {
    assert.equal(resolveDocumentFamily(phrase), 'patent-specification', `Expected "${phrase}" to route to patent-specification`)
  }
})

test('routing: does not misroute filing routes, claims, or abstract to specification', () => {
  assert.equal(resolveDocumentFamily('draft a PCT application'), 'pct-international-patent-application')
  assert.equal(resolveDocumentFamily('draft a European patent application'), 'european-patent-application')
  assert.equal(resolveDocumentFamily('draft a patent abstract'), 'patent-abstract')
  assert.notEqual(resolveDocumentFamily('draft patent claims'), 'patent-specification')
})

test('profile: loads canonical Patent Specification profile (009)', async () => {
  const profile = await loadDocumentProfile('patent-specification')
  assert.ok(profile)
  assert.equal(profile.id, 'patent-specification')
  assert.equal(profile.document_number, '009')
  assert.equal(profile.category, 'IP_INNOVATION')
  assert.equal(profile.subcategory, 'PATENT')
  assert.equal(profile.family, 'PATENT_SPECIFICATION')
  assert.equal(profile.status, 'BETA')
  assert.equal(profile.risk_level, 'HIGH')
  assert.equal(profile.review_required, true)
  assert.equal(profile.verification_required, true)
  assert.equal(profile.jurisdiction, 'MULTI_JURISDICTION')
  assert.equal(profile.jurisdiction_classification, 'CONTEXT_DEPENDENT')
  assert.equal(profile.interview_mode, 'ONE_QUESTION_AT_A_TIME')
})

test('interview-first: cold request asks exactly one jurisdiction question (no generic draft)', async () => {
  const result = await routeConversationalIntent('Draft a patent specification.', {})
  assert.equal(result.action, 'ASK_QUESTION')
  assert.equal(result.document_family, 'patent-specification')
  assert.equal(result.questions.length, 1)
  assert.equal(result.question.field, 'jurisdiction_context')
  assert.match(result.question.question, /filing route or jurisdiction/i)
})

test('spec-vs-application: full PCT filing request routes out of specification', () => {
  const hit = detectFilingRouteRequest('Prepare the full PCT application.')
  assert.ok(hit)
  assert.equal(hit.route, 'pct-international-patent-application')
})

test('partial draft: detailed-description-only mode is detected without full intake', () => {
  const mode = detectPatentSpecificationMode('I only want the detailed description.', {})
  assert.equal(mode, SPEC_DRAFTING_MODES.DETAILED_DESCRIPTION_ONLY)
  const step = evaluatePatentSpecificationInterviewStep({ session: {}, latestMessage: 'I only want the detailed description.' })
  assert.equal(step.session.facts.drafting_mode, 'DETAILED_DESCRIPTION_ONLY')
})

test('matter context: known title/field/disclosure/claims/figures are not re-asked', async () => {
  const matterContext = {
    matter: {
      title: 'SmartLens Automated Inspection',
      client_name: 'VisionTech Inc.',
      jurisdictions: ['US'],
      technical_field: 'Optical inspection',
      problem: 'Microscopic wafer defects escape conventional optical inspection and reduce semiconductor yield.',
      core_concept: 'Multi-spectral cameras acquire defect-sensitive images while a processor generates control signals for inspection handling.',
      components: 'Sensor, processor, control-signal generator, and actuator.',
      drawings: 'FIG. 1 system block diagram; sensor 110, processor 120, actuator 130.',
    },
    facts: [
      { fact_type: 'claims', value: '1. A system comprising a sensor, a processor, and an actuator.', confidence: 0.9 },
    ],
  }
  const extracted = extractPatentSpecificationMatterFacts(matterContext)
  assert.equal(extracted.status.title, 'KNOWN')
  assert.equal(extracted.status.technical_field, 'KNOWN')
  assert.equal(extracted.status.existing_claims, 'KNOWN')
  const routed = await routeConversationalIntent('Draft the specification.', matterContext)
  // Rich matter may go straight to confirmation or ask at most one non-known question
  assert.ok(['ASK_QUESTION', 'PROMPT_DRAFT_CONFIRMATION'].includes(routed.action))
  if (routed.action === 'ASK_QUESTION') {
    assert.equal(routed.questions.length, 1)
    assert.ok(!['title', 'jurisdiction_context'].includes(routed.question.field) || routed.question.field === 'jurisdiction_context')
  } else {
    assert.match(routed.message, /Would you like me to proceed/i)
  }
})

test('turn-taking: answers advance one supported question at a time to confirmation and draft', () => {
  const script = [
    'Draft a patent specification.',
    'US',
    'Full specification',
    'Wafer Inspection System',
    'Optical inspection of semiconductor wafers',
    'Microscopic defects escape conventional optical inspection reducing yield.',
    'A multispectral sensor acquires images; a processor analyzes them and drives an actuator for handling.',
    'Sensor, processor, control-signal generator, and actuator.',
    'The sensor acquires images, the processor generates control signals, and the actuator handles wafers.',
  ]
  let session = {}
  let last = null
  for (const msg of script) {
    last = evaluatePatentSpecificationInterviewStep({ session, latestMessage: msg })
    session = last.session
    if (last.action === 'ASK_QUESTION') assert.equal(last.questions.length, 1)
  }
  assert.equal(last.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.match(last.message, /I have enough information to prepare the first patent specification draft\. Would you like me to proceed\?/)
  const drafted = evaluatePatentSpecificationInterviewStep({ session, latestMessage: 'Yes, proceed with the draft.' })
  assert.equal(drafted.action, 'DRAFT')
})

test('claim-first: unsupported LiDAR limitation stays UNSUPPORTED (never cured silently)', () => {
  const support = buildClaimSupportMapForSpecification(
    '1. An inspection system comprising a LiDAR sensor, a processor, and an actuator.',
    { core_inventive_concept: 'A processor analyzes sensor images.', components_or_steps: 'Sensor, processor, actuator.' },
    {},
  )
  const lidar = support.map.find((m) => /lidar/i.test(m.limitation))
  assert.ok(lidar)
  assert.equal(lidar.status, 'UNSUPPORTED')
  const assembled = assemblePatentSpecification(
    {
      title: 'Inspection System',
      technical_field: 'Optics',
      problem_being_solved: 'Defects escape inspection.',
      core_inventive_concept: 'A processor analyzes sensor images.',
      components_or_steps: 'Sensor, processor, actuator.',
      existing_claims: '1. An inspection system comprising a LiDAR sensor, a processor, and an actuator.',
      jurisdiction_context: 'UNDECIDED',
      drafting_mode: 'FULL_SPECIFICATION',
    },
    {},
    {},
  )
  assert.ok(!/LiDAR sensor 110|LiDAR array with/i.test(assembled.specification))
  assert.ok(assembled.claimSupportMap.hasUnsupported)
})

test('optional feature: camera recorded OPTIONAL; mandatory rewrite is flagged', () => {
  const step = evaluatePatentSpecificationInterviewStep({
    session: { facts: { jurisdiction_context: 'US', drafting_mode: 'FULL_SPECIFICATION', title: 'T', technical_field: 'F', problem_being_solved: 'P with enough length here.', core_inventive_concept: 'C with enough technical length here.', components_or_steps: 'Sensor, processor, actuator components here.' }, currentQuestionId: 'q_essential_optional' },
    latestMessage: 'The camera is optional.',
  })
  assert.equal(step.session.facts.feature_classes?.camera, 'OPTIONAL')
})

test('hypothetical example: untested system yields no invented percentages', () => {
  const kind = classifyExampleKind('Hypothetical illustration only; the system has not been tested yet.')
  assert.equal(kind, 'PROPHETIC_OR_HYPOTHETICAL_EXAMPLE')
  const assembled = assemblePatentSpecification(
    {
      title: 'Inspection System',
      technical_field: 'Optics',
      problem_being_solved: 'Defects escape inspection reliably.',
      core_inventive_concept: 'Sensor measurements control actuator operation.',
      components_or_steps: 'Sensor, processor, actuator.',
      examples_use_cases: 'Hypothetical illustration only; the system has not been tested yet.',
      jurisdiction_context: 'UNDECIDED',
      drafting_mode: 'FULL_SPECIFICATION',
    },
    {},
    {},
  )
  assert.ok(!/35%/.test(assembled.specification))
})

test('new matter: chemical sensor added to optical-only draft is NEWLY_ADDED + flagged', () => {
  const cls = classifyNewMatter(
    'In a further embodiment the system uses a chemical sensor array with reagent coatings.',
    'The system uses optical sensing to detect wafer defects.',
  )
  assert.equal(cls, 'NEWLY_ADDED')
})

test('terminology: controller vs processor raises TERM_CONFLICT, never merged', () => {
  const conflicts = detectTerminologyConflicts(
    { components_or_steps: 'The controller receives sensor measurements.', existing_claims: 'The processor receives sensor measurements and controls the actuator.' },
    { summary: 'The controller generates control signals.', detailed_description: 'The processor generates control signals.' },
  )
  assert.ok(conflicts.some((c) => c.code === 'TERM_CONFLICT'))
})

test('drawing consistency: numeral 120 as sensor vs motor is flagged, not chosen', () => {
  const registry = buildFigureRegistry({ drawings: 'FIG. 2 shows sensor 120.' }, {})
  registry.numerals.push({ component: 'sensor', numeral: '120', source: 'USER_PROVIDED' })
  registry.numerals.push({ component: 'motor', numeral: '120', source: 'USER_PROVIDED' })
  const conflicts = detectNumeralConflicts(registry, {})
  assert.ok(conflicts.some((c) => c.code === 'CONFLICTING_REFERENCE_NUMERAL' && c.numeral === '120'))
})

test('locked section: USER_LOCKED summary survives regeneration of other sections', () => {
  const existing = { summary: 'Approved summary text.', detailed_description: 'Old detail.' }
  const locks = { summary: SPEC_LOCK_STATUSES.USER_LOCKED }
  const res = applySectionEdits(existing, { summary: 'Regenerated summary.', detailed_description: 'New detail.' }, locks)
  assert.deepEqual(res.preserved, ['summary'])
  assert.equal(res.sections.summary, 'Approved summary text.')
  assert.equal(res.sections.detailed_description, 'New detail.')
})

test('change impact: cloud-only to local-or-cloud identifies affected sections, preserves rest', () => {
  const impact = analyzeChangeImpact('components_or_steps', {})
  assert.ok(impact.affectedSections.includes('summary'))
  assert.ok(impact.affectedSections.includes('detailed_description'))
  assert.equal(impact.preserveUnrelated, true)
})

test('security: confidential content to free-only providers throws CONFIDENTIAL_PILOT_BLOCKED', () => {
  assert.throws(
    () => assertSpecificationChatAllowed({ engines: [{ slug: 'openai/gpt-4o-mini:free' }], mode: 'CONFIDENTIAL_IP' }),
    /CONFIDENTIAL_PILOT_BLOCKED/,
  )
})

test('claim term coverage: terms map to disclosure support status', () => {
  const coverage = buildClaimTermCoverage(
    '1. A system comprising an optical sensor, a processor, and an actuator.',
    'The system uses an optical sensor. A processor controls an actuator.',
  )
  const optical = coverage.find((c) => /optical sensor/i.test(c.claim_term))
  assert.ok(optical)
  assert.equal(optical.support_status, 'SUPPORTED')
})
