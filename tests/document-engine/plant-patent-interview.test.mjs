import test from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluatePlantInterviewStep,
  extractPlantMatterFacts,
  inferPlantOrigin,
  isPlantVarietyRightsRequest,
  isSkipOrUnknown,
  isAffirmativeConfirmation,
  detectPlantFactCorrection,
  assessPlantReadiness,
  READINESS_STATES,
  REVIEW_FLAGS,
  PROVENANCE_STATES,
} from '../../src/lib/plant-interview-graph.js'

import {
  routeConversationalIntent,
} from '../../src/lib/document-engine-router.js'

import {
  resolveDocumentFamily,
  loadDocumentProfile,
} from '../../src/lib/document-engine.js'

import {
  formatPlantPatentClaim,
  buildPlantClaimSupportMap,
  analyzeBotanicalChangeImpact,
  assemblePlantSpecification,
} from '../../src/lib/plant-drafting-service.js'

import {
  assertChatAllowed,
} from '../../src/lib/provider-policy.js'

// ============================================================
// 1. ROUTING & INTENT DISAMBIGUATION
// ============================================================
test('routing: recognizes natural plant patent drafting requests', () => {
  const phrases = [
    'draft a plant patent application',
    'prepare a plant patent',
    'prepare a US plant patent application',
    'patent this new plant variety',
    'draft a patent for this new plant',
    'prepare a plant patent for this cultivar',
    'help me file a plant patent',
    'plant patent application',
  ]

  for (const phrase of phrases) {
    const family = resolveDocumentFamily(phrase)
    assert.equal(
      family,
      'plant-patent-application',
      `Expected "${phrase}" to resolve to plant-patent-application, got "${family}"`
    )
  }
})

test('routing: does NOT route trademarks, PVR, or utility patents to plant patent', () => {
  // Trademarks: "Protect the name of this plant variety"
  assert.notEqual(resolveDocumentFamily('Protect the name of this plant variety'), 'plant-patent-application')
  // Utility patent: "Draft a utility patent for a genetic engineering method"
  assert.equal(resolveDocumentFamily('Draft a utility patent for a genetic engineering method'), 'utility-patent-application')
})

// ============================================================
// 2. ONE QUESTION AT A TIME & INTERVIEW-FIRST
// ============================================================
test('interview-first: "Draft a plant patent application" asks ONE question, does NOT draft', async () => {
  const result = await routeConversationalIntent('Draft a plant patent application.', {})
  assert.equal(result.action, 'ASK_QUESTION', 'Must ask a question first, never draft immediately')
  assert.equal(result.drafting_status, 'INFORMATION_GATHERING')
  assert.ok(result.questions, 'Questions array must be present')
  assert.equal(result.questions.length, 1, 'Must ask strictly ONE question at a time')
  assert.match(result.question.question, /cultivar|variety denomination|name/i)
})

test('interview turn-taking: answering question advances to next single question', () => {
  // Step 1: Initial request
  const step1 = evaluatePlantInterviewStep({
    session: {},
    latestMessage: 'Draft a plant patent application',
  })
  assert.equal(step1.action, 'ASK_QUESTION')
  assert.equal(step1.single_question.field, 'cultivar_name')

  // Step 2: User provides cultivar name
  const step2 = evaluatePlantInterviewStep({
    session: step1.session,
    latestMessage: 'Autumn Velvet',
  })
  assert.equal(step2.action, 'ASK_QUESTION')
  assert.equal(step2.session.facts.cultivar_name, 'Autumn Velvet')
  assert.equal(step2.single_question.field, 'botanical_name')

  // Step 3: User provides botanical name
  const step3 = evaluatePlantInterviewStep({
    session: step2.session,
    latestMessage: 'Rosa hybrida',
  })
  assert.equal(step3.action, 'ASK_QUESTION')
  assert.equal(step3.session.facts.botanical_name, 'Rosa hybrida')
  assert.equal(step3.single_question.field, 'origin')
})

// ============================================================
// 3. MATTER CONTEXT FIRST
// ============================================================
test('matter context: skips asking for facts already known from matter', async () => {
  const matterContext = {
    matter: {
      title: 'Emerald Tower',
      client_name: 'Monrovia Nursery Co.',
      jurisdictions: ['US'],
    },
    facts: [
      { fact_type: 'botanical_name', value: 'Thuja occidentalis', confidence: 0.95 },
      { fact_type: 'inventor', value: 'Robert Green', confidence: 0.9 },
    ],
  }

  const { facts, status } = extractPlantMatterFacts(matterContext)
  assert.equal(status.cultivar_name, 'KNOWN')
  assert.equal(status.botanical_name, 'KNOWN')
  assert.equal(status.inventors, 'KNOWN')
  assert.equal(status.applicant, 'KNOWN')

  // Router evaluation
  const res = await routeConversationalIntent('Draft a plant patent application for this matter.', matterContext)
  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.questions.length, 1)
  // Should NOT ask cultivar name, botanical name, or inventors
  assert.notEqual(res.question.field, 'cultivar_name')
  assert.notEqual(res.question.field, 'botanical_name')
  assert.notEqual(res.question.field, 'inventors')
  // Should proceed to origin
  assert.equal(res.question.field, 'origin')
})

// ============================================================
// 4. ORIGIN BRANCHING & PARENTAGE
// ============================================================
test('origin branching: sport/mutation origin asks about source plant', () => {
  const session = {
    facts: {
      cultivar_name: 'Golden Glow',
      botanical_name: 'Prunus persica',
    },
    currentQuestionId: 'q_origin',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: 'It was a bud sport on a peach tree',
  })

  assert.equal(res.session.facts.origin, 'SPORT')
  assert.equal(res.single_question.field, 'parentage')
  assert.match(res.single_question.raw_question, /sport or mutation arise from/i)
})

test('origin branching: hybrid origin asks about male and female parents', () => {
  const session = {
    facts: {
      cultivar_name: 'Sapphire Night',
      botanical_name: 'Clematis hybrida',
    },
    currentQuestionId: 'q_origin',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: 'Controlled cross pollination hybrid',
  })

  assert.equal(res.session.facts.origin, 'HYBRID')
  assert.equal(res.single_question.field, 'parentage')
  assert.match(res.single_question.raw_question, /female\/seed parent and male\/pollen parent/i)
})

// ============================================================
// 5. ASEXUAL REPRODUCTION & STATUTORY PRE-REQUISITE (35 U.S.C. § 161)
// ============================================================
test('asexual reproduction: captures method and advances to stability', () => {
  const session = {
    facts: {
      cultivar_name: 'Velvet Queen',
      botanical_name: 'Rosa hybrida',
      origin: 'HYBRID',
      parentage: 'Female parent Rosa floribunda x Male parent Rosa rugosa',
    },
    currentQuestionId: 'q_asexual_reproduction',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: 'This new rose was propagated from softwood stem cuttings in our Tyler, Texas nursery.',
  })

  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.session.facts.asexual_reproduction, 'This new rose was propagated from softwood stem cuttings in our Tyler, Texas nursery.')
  assert.equal(res.single_question.field, 'stability')
  assert.ok(!res.session.flags.includes(REVIEW_FLAGS.ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED))
})

test('no asexual reproduction data: user says "haven\'t propagated yet" -> flags review & blocks drafting', () => {
  const session = {
    facts: {
      cultivar_name: 'New Wonder',
      botanical_name: 'Echinacea purpurea',
      origin: 'SEEDLING',
    },
    currentQuestionId: 'q_asexual_reproduction',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: "We haven't propagated it yet.",
  })

  assert.ok(res.session.flags.includes(REVIEW_FLAGS.ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED))
  assert.equal(res.session.facts.asexual_reproduction, 'UNPROPAGATED')

  // Check readiness: MUST NOT be ready for draft!
  const readiness = assessPlantReadiness(res.session.facts, res.session.flags)
  assert.notEqual(readiness, READINESS_STATES.READY_FOR_FIRST_DRAFT)
})

// ============================================================
// 6. VAGUE DISTINCTIVENESS FOLLOW-UP
// ============================================================
test('vague distinctiveness: "It\'s much better than other roses" triggers purposeful follow-up', () => {
  const session = {
    facts: {
      cultivar_name: 'Pink Dream',
      botanical_name: 'Rosa hybrida',
      origin: 'HYBRID',
      asexual_reproduction: 'Propagated by stem cuttings.',
    },
    currentQuestionId: 'q_distinctive_characteristics',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: "It's much better than other roses.",
  })

  assert.equal(res.action, 'ASK_QUESTION')
  assert.equal(res.single_question.is_follow_up, true)
  assert.match(res.single_question.question, /flower colour, petal form, growth habit/i)
})

// ============================================================
// 7. COMPARATOR & CLOSEST KNOWN VARIETY
// ============================================================
test('comparator: captures closest variety and stated differences without fabricating', () => {
  const session = {
    facts: {
      cultivar_name: 'Giant Ruby',
      botanical_name: 'Begonia x tuberhybrida',
      origin: 'HYBRID',
      asexual_reproduction: 'Propagated by tubers and cuttings.',
      distinctive_characteristics: 'Extremely large double crimson flowers measuring 18 cm across.',
    },
    currentQuestionId: 'q_closest_variety',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: "It looks similar to cultivar 'Nonstop Red' but has 30% larger double flowers and darker bronze foliage.",
  })

  assert.ok(res.session.facts.closest_variety.includes('Nonstop Red'))
  assert.match(res.session.facts.comparator_differences, /larger double flowers and darker bronze foliage/i)
})

// ============================================================
// 8. COLOUR INFORMATION & NO FABRICATED RHS VALUES
// ============================================================
test('colour: user gives descriptive colour without RHS -> stores descriptive, no invented RHS', () => {
  const session = {
    facts: {
      cultivar_name: 'Purple Mist',
      botanical_name: 'Lavandula angustifolia',
      origin: 'SEEDLING',
      asexual_reproduction: 'Propagated by cuttings.',
      distinctive_characteristics: 'Vibrant violet flower spikes with compact habit.',
    },
    currentQuestionId: 'q_colour_references',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: "The petals are purple, but I don't have an RHS colour chart reading.",
  })

  assert.equal(res.session.facts.colour_references, "The petals are purple, but I don't have an RHS colour chart reading.")
  assert.equal(res.session.placeholders.colour_references, '[DESCRIPTIVE_COLOUR_ONLY_NO_RHS]')
  // Ensure no invented RHS numbers like "RHS 83A" are generated
  assert.ok(!JSON.stringify(res.session.facts).includes('RHS 83'))
})

// ============================================================
// 9. PUBLIC SALE & DISCLOSURE FLAGS
// ============================================================
test('public sale: captures event and flags review without concluding patent rights lost', () => {
  const session = {
    facts: {
      cultivar_name: 'Sun Gold',
      botanical_name: 'Rosa hybrida',
      origin: 'HYBRID',
      asexual_reproduction: 'Propagated by budding.',
      distinctive_characteristics: 'Bright golden blooms.',
    },
    currentQuestionId: 'q_public_disclosures',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: 'We started commercially selling the plant four months ago at garden expos.',
  })

  assert.ok(res.session.flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED))
  assert.ok(Array.isArray(res.session.facts.public_disclosures))
  // Must NOT conclude invalidity or rights lost
  const str = JSON.stringify(res)
  assert.ok(!str.includes('patent rights lost'))
  assert.ok(!str.includes('patent is invalid'))
})

// ============================================================
// 10. PLANT VARIETY RIGHTS (PVP / CPVR / UPOV) DISTINCTION
// ============================================================
test('pvr distinction: European breeders\' rights request triggers clarification and distinction', async () => {
  const res = await routeConversationalIntent('I want to register plant breeders\' rights in Europe.', {})
  assert.equal(res.action, 'CLARIFICATION_REQUIRED')
  assert.match(res.message, /US Plant Patent.*USPTO.*European Community Plant Variety Rights/s)
  assert.ok(res.flags.includes(REVIEW_FLAGS.PLANT_VARIETY_RIGHTS_DISTINCTION_REQUIRED))
})

// ============================================================
// 11. SINGLE CLAIM & CLAIM SUPPORT MAP (35 U.S.C. § 162)
// ============================================================
test('claims: generates strictly a single claim tied to the described plant', () => {
  const facts = {
    cultivar_name: 'Autumn Velvet',
    botanical_name: 'Rosa hybrida',
    distinctive_characteristics: 'Deep crimson petals with continuous repeat bloom.',
    asexual_reproduction: 'Propagated by stem cuttings across 4 generations.',
  }

  const claim = formatPlantPatentClaim(facts)
  assert.match(claim, /^I claim:\s+A new and distinct variety of Rosa hybrida plant named 'Autumn Velvet'/i)
  // Ensure NO multiple or dependent claims
  assert.ok(!claim.includes('Claim 2'))
  assert.ok(!claim.includes('dependent on claim'))

  // Support Map
  const support = buildPlantClaimSupportMap(facts, {})
  assert.equal(support.totalConcepts, 4)
  assert.equal(support.hasUnsupportedLimitations, false)
})

// ============================================================
// 12. DRAFT READINESS PERMISSION GATE
// ============================================================
test('draft readiness: summarizes plant facts, flags, and asks affirmative confirmation before drafting', () => {
  const session = {
    facts: {
      cultivar_name: 'Autumn Velvet',
      botanical_name: 'Rosa hybrida',
      origin: 'HYBRID',
      origin_details: 'Cross between Red Radiance and Peace',
      asexual_reproduction: 'Propagated by stem cuttings across 4 generations true to type.',
      distinctive_characteristics: 'Deep crimson petals with continuous repeat bloom and damask fragrance.',
      closest_variety: 'Peace',
      inventors: ['Arthur Bell'],
    },
    currentQuestionId: 'q_public_disclosures',
  }

  const res = evaluatePlantInterviewStep({
    session,
    latestMessage: 'No commercial sales or public disclosures prior to today.',
  })

  assert.equal(res.action, 'PROMPT_DRAFT_CONFIRMATION')
  assert.equal(res.readiness, READINESS_STATES.READY_FOR_FIRST_DRAFT)
  assert.match(res.message, /I have enough information to prepare the first plant patent draft/i)
  assert.match(res.message, /Would you like me to proceed/i)
  assert.match(res.message, /Autumn Velvet/)

  // Affirmative confirmation starts drafting
  const draftRes = evaluatePlantInterviewStep({
    session: res.session,
    latestMessage: 'Yes, please proceed with the draft.',
  })
  assert.equal(draftRes.action, 'DRAFT')
  assert.equal(draftRes.drafting_status, 'READY_TO_ASSEMBLE')
})

// ============================================================
// 13. CHANGE IMPACT ANALYSIS & EDIT PRESERVATION
// ============================================================
test('change impact: flower colour modification identifies affected sections and preserves others', () => {
  const impact = analyzeBotanicalChangeImpact(
    'white flowers',
    'cream flowers with pink margins',
    {}
  )

  assert.ok(impact.affectedSections.includes('botanical_description'))
  assert.ok(impact.affectedSections.includes('distinguishing_characteristics'))
  assert.ok(impact.affectedSections.includes('summary'))
  // Unaffected sections like asexual reproduction should be preserved
  assert.ok(impact.preservedSections.includes('asexual_reproduction'))
  assert.ok(impact.preservedSections.includes('background_origin'))
})

test('edit preservation: assembly preserves existing user-edited sections', () => {
  const facts = {
    cultivar_name: 'Autumn Velvet',
    botanical_name: 'Rosa hybrida',
  }
  const userSections = {
    botanical_description: 'User bespoke botanical description with specific petal count: 45 petals per corolla.',
  }

  const fullDoc = assemblePlantSpecification(facts, userSections)
  assert.match(fullDoc, /45 petals per corolla/)
})

// ============================================================
// 14. FACTUAL DISCIPLINE (NO INVENTED FACTS)
// ============================================================
test('factual discipline: does not invent botanical facts, parentage, dates, or measurements', () => {
  const step = evaluatePlantInterviewStep({
    session: {
      facts: {
        cultivar_name: 'Mystery Shrub',
      },
      currentQuestionId: 'q_botanical_name',
    },
    latestMessage: 'Hibiscus syriacus',
  })

  const f = step.session.facts
  assert.equal(f.parentage, undefined, 'Must not invent parentage')
  assert.equal(f.origin, undefined, 'Must not invent origin')
  assert.equal(f.asexual_reproduction, undefined, 'Must not invent reproduction')
  assert.equal(f.colour_references, undefined, 'Must not invent colour chart values')
  assert.equal(f.measurements, undefined, 'Must not invent dimensions')
  assert.equal(f.disease_resistance, undefined, 'Must not invent disease resistance')
  assert.equal(f.inventors, undefined, 'Must not invent inventors')
})

// ============================================================
// 15. SECURITY FAIL-CLOSED
// ============================================================
test('security: confidential plant breeding data fails closed and blocks free unapproved models', () => {
  assert.throws(
    () => {
      assertChatAllowed({
        engines: [{ slug: 'fish-audio/s2.1-pro-free:free', name: 'Free TTS', key: 'OPENROUTER_SPEECH_API_KEY' }],
        mode: 'CONFIDENTIAL_IP',
        env: process.env,
      })
    },
    (err) => err.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE' || /fail-closed/i.test(err.message)
  )
})
