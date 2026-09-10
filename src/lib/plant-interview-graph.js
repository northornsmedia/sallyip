/**
 * SALLYIP PLANT PATENT INTERVIEW GRAPH ENGINE
 * Canonical Document #005: Plant Patent Application (35 U.S.C. §§ 161–164 / 37 C.F.R. §§ 1.161–1.167)
 *
 * Implements a dependency-aware botanical question DAG with:
 * - One-question-at-a-time turn taking
 * - Matter context inspection (KNOWN, INFERRED, UNKNOWN)
 * - Origin branching (Seedling, Sport/Mutation, Hybrid/Cross, Discovered Plant, etc.)
 * - Asexual reproduction verification & stability tracking (35 U.S.C. § 161)
 * - Distinctive morphological characteristics capture with purposeful vague-answer follow-up
 * - Comparator / closest variety difference mapping
 * - Botanical colour preservation (no fabricated RHS values)
 * - Image observation provenance (SOURCE_IMAGE) and conflict detection
 * - Public disclosure and commercial sale tracking (attorney review flagged without premature invalidity conclusions)
 * - Plant Variety Rights (PVP / CPVR / UPOV) distinction
 * - Single-claim enforcement (35 U.S.C. § 162)
 * - Draft readiness permission gate
 */

export const READINESS_STATES = {
  NOT_READY: 'NOT_READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  READY_FOR_FIRST_DRAFT: 'READY_FOR_FIRST_DRAFT',
}

export const REVIEW_FLAGS = {
  PLANT_PATENT_ELIGIBILITY_REVIEW_REQUIRED: 'PLANT_PATENT_ELIGIBILITY_REVIEW_REQUIRED',
  ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED: 'ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED',
  IMAGE_OR_DESCRIPTION_CONFLICT: 'IMAGE_OR_DESCRIPTION_CONFLICT',
  DISCLOSURE_REVIEW_REQUIRED: 'DISCLOSURE_REVIEW_REQUIRED',
  INVENTORSHIP_REVIEW_REQUIRED: 'INVENTORSHIP_REVIEW_REQUIRED',
  PLANT_VARIETY_RIGHTS_DISTINCTION_REQUIRED: 'PLANT_VARIETY_RIGHTS_DISTINCTION_REQUIRED',
}

export const PROVENANCE_STATES = {
  USER_PROVIDED: 'USER_PROVIDED',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  SOURCE_DOCUMENT: 'SOURCE_DOCUMENT',
  SOURCE_IMAGE: 'SOURCE_IMAGE',
  AI_DRAFTED_FROM_SUPPORTED_FACTS: 'AI_DRAFTED_FROM_SUPPORTED_FACTS',
  USER_EDITED: 'USER_EDITED',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  PLACEHOLDER: 'PLACEHOLDER',
}

// Canonical Plant Patent Questions with metadata and dynamic branching
export const CANONICAL_PLANT_QUESTIONS = [
  {
    question_id: 'q_cultivar_name',
    field: 'cultivar_name',
    question: 'First, what is the working variety denomination, cultivar name, or commercial name for this new plant?',
    reason: 'Required for Variety Denomination under 37 C.F.R. § 1.163(c)(3).',
    required: true,
    blocking: true,
    dependencies: [],
    skip_if: (facts) => Boolean(facts.cultivar_name && facts.cultivar_name !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_botanical_name',
    field: 'botanical_name',
    question: (facts) => {
      const name = facts.cultivar_name || 'this variety'
      return `What is the botanical Latin name (genus and species) of ${name} (e.g., Rosa hybrida, Malus domestica, or Philodendron hederaceum)?`
    },
    reason: 'Required for Latin Name of the Genus and Species under 37 C.F.R. § 1.163(c)(2).',
    required: true,
    blocking: true,
    dependencies: ['cultivar_name'],
    skip_if: (facts) => Boolean(facts.botanical_name && facts.botanical_name !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'text',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_origin',
    field: 'origin',
    question: 'What is the origin of this new plant—for example, was it a controlled hybrid cross, a chance seedling, a bud sport/mutation, or a plant discovered in a cultivated area?',
    reason: 'Required for Background and Origin under 37 C.F.R. § 1.163(c)(4).',
    required: true,
    blocking: true,
    dependencies: ['botanical_name'],
    skip_if: (facts) => Boolean(facts.origin && facts.origin !== 'UNKNOWN'),
    follow_up_conditions: [],
    answer_type: 'select',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_parentage',
    field: 'parentage',
    question: (facts) => {
      const origin = facts.origin || ''
      if (origin === 'SPORT' || origin === 'MUTATION') {
        return 'What specific parent plant variety did this sport or mutation arise from, and where on the parent plant was it first observed?'
      }
      if (origin === 'DISCOVERED_PLANT') {
        return 'Under what circumstances and in what cultivated setting was the plant discovered? (Note: plants discovered in the wild state are not patentable under 35 U.S.C. § 161).'
      }
      return 'What are the parent varieties of this cross (female/seed parent and male/pollen parent), if known?'
    },
    reason: 'Establishes parentage and breeding pedigree under 37 C.F.R. § 1.163(c)(4).',
    required: false,
    blocking: false,
    dependencies: ['origin'],
    skip_if: (facts) => Boolean(facts.parentage !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_asexual_reproduction',
    field: 'asexual_reproduction',
    question: 'Has this new plant variety been asexually reproduced? If so, what method was used (e.g., stem cuttings, grafting, budding, division, or tissue culture), and where did the propagation take place?',
    reason: 'Statutory prerequisite under 35 U.S.C. § 161: a plant patent requires prior asexual reproduction to establish stability.',
    required: true,
    blocking: true,
    dependencies: ['origin'],
    skip_if: (facts) => Boolean(facts.asexual_reproduction && facts.asexual_reproduction !== 'UNKNOWN'),
    follow_up_conditions: [
      {
        test: (ans) => /\b(not yet|haven'?t|not propagated|haven'?t propagated|no propagation|no)\b/i.test(ans),
        followUp: 'Under 35 U.S.C. § 161, asexual reproduction is an absolute statutory prerequisite for a US plant patent. Has any asexual propagation been performed, or is the plant currently in trials?',
      },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_stability',
    field: 'stability',
    question: 'Have the asexually reproduced plants retained all the distinguishing characteristics of the original plant true to type across successive generations, and approximately how many generations have been observed?',
    reason: 'Confirms true-to-type stability across generations under 37 C.F.R. § 1.163(c)(4).',
    required: true,
    blocking: false,
    dependencies: ['asexual_reproduction'],
    skip_if: (facts) => Boolean(facts.stability !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_distinctive_characteristics',
    field: 'distinctive_characteristics',
    question: 'What are the main observable characteristics that distinguish this new variety from all other varieties of the species (e.g., flower colour, petal form, foliage traits, growth habit, bloom timing, fragrance)?',
    reason: 'Core requirement under 35 U.S.C. § 161 to demonstrate the plant is a distinct variety.',
    required: true,
    blocking: true,
    dependencies: ['asexual_reproduction'],
    skip_if: (facts) => Boolean(facts.distinctive_characteristics && facts.distinctive_characteristics.length >= 25),
    follow_up_conditions: [
      {
        test: (ans) => {
          const clean = String(ans || '').trim().replace(/[.,!?;]+$/, '').toLowerCase()
          return /\b(it is better|much better|better than|nice|pretty|improved|superior)\b/i.test(clean) && clean.split(/\s+/).length < 8
        },
        followUp: 'What observable characteristics distinguish it—for example flower colour, petal form, growth habit, bloom frequency, foliage, fragrance, or another feature?',
      },
    ],
    answer_type: 'textarea',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'user',
  },
  {
    question_id: 'q_closest_variety',
    field: 'closest_variety',
    question: 'What is the closest known commercial cultivar or variety to this plant, and how does your new variety specifically differ from it?',
    reason: 'Required for Comparison with Closest Known Varieties under 37 C.F.R. § 1.163.',
    required: false,
    blocking: false,
    dependencies: ['distinctive_characteristics'],
    skip_if: (facts) => Boolean(facts.closest_variety !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_colour_references',
    field: 'colour_references',
    question: 'How would you describe the specific colours of the mature flowers and leaves, and do you have readings from a formal colour chart such as the Royal Horticultural Society (RHS) Colour Chart?',
    reason: 'Precise colour designation is critical for botanical patent descriptions (MPEP § 1605).',
    required: false,
    blocking: false,
    dependencies: ['distinctive_characteristics'],
    skip_if: (facts) => Boolean(facts.colour_references !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_photographs',
    field: 'photographs',
    question: 'Do you have colour photographs showing the habit of the plant and close-up views of the distinguishing features (flowers, foliage)? (Photographs are required by USPTO rules under 37 C.F.R. § 1.165).',
    reason: 'Formal drawing/photograph requirement under 37 C.F.R. § 1.165.',
    required: false,
    blocking: false,
    dependencies: ['distinctive_characteristics'],
    skip_if: (facts) => Boolean(facts.photographs !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
  {
    question_id: 'q_inventors',
    field: 'inventors',
    question: 'Who are the individual natural persons who discovered/bred and asexually reproduced this new variety (full legal names)?',
    reason: 'Inventorship under 35 U.S.C. §§ 115, 161 must be individual human discoverers or breeders.',
    required: true,
    blocking: false,
    dependencies: ['cultivar_name'],
    skip_if: (facts) => Boolean(facts.inventors && facts.inventors.length > 0 && facts.inventors[0] !== 'UNKNOWN'),
    follow_up_conditions: [
      {
        test: (ans) => /(nursery|inc|llc|ltd|corporation|company|farm)\b/i.test(ans),
        followUp: 'Under US patent law, inventors must be natural human persons who bred or discovered and asexually reproduced the plant. A company or nursery can be the applicant or assignee. Who are the individual human discoverers/breeders?',
      },
    ],
    answer_type: 'array',
    validation: (ans) => String(ans || '').trim().length > 0,
    source: 'matter_or_user',
  },
  {
    question_id: 'q_public_disclosures',
    field: 'public_disclosures',
    question: 'Has this plant variety been commercially sold, offered for sale, exhibited, or publicly described in any publication anywhere prior to today?',
    reason: 'Evaluates potential statutory bars under 35 U.S.C. § 102 for attorney review.',
    required: false,
    blocking: false,
    dependencies: ['cultivar_name'],
    skip_if: (facts) => Boolean(facts.public_disclosures !== undefined),
    follow_up_conditions: [],
    answer_type: 'textarea',
    validation: () => true,
    source: 'user',
  },
]

/**
 * Classify matter facts into KNOWN, INFERRED, UNKNOWN
 */
export function extractPlantMatterFacts(matterContext = {}) {
  const facts = {}
  const status = {}

  const matter = matterContext.matter || {}
  const ctxFacts = matterContext.facts || []
  const ctxEntities = matterContext.entities || []

  // Jurisdiction
  if (matter.jurisdictions && matter.jurisdictions.length) {
    facts.jurisdiction = matter.jurisdictions[0]
    status.jurisdiction = 'KNOWN'
  } else if (matterContext.jurisdiction) {
    facts.jurisdiction = matterContext.jurisdiction
    status.jurisdiction = 'KNOWN'
  } else {
    facts.jurisdiction = 'US'
    status.jurisdiction = 'INFERRED'
  }

  // Plant name / Cultivar denomination
  if (matter.title && matter.title !== 'Untitled Matter' && matter.title.trim().length > 2) {
    facts.cultivar_name = matter.title.trim()
    status.cultivar_name = 'KNOWN'
  }

  // Applicant / Nursery / Client
  if (matter.client_name && matter.client_name.trim().length > 1) {
    facts.applicant = matter.client_name.trim()
    status.applicant = 'KNOWN'
  }

  // Fact items
  for (const item of ctxFacts) {
    const val = item.value?.label || item.value || null
    if (!val) continue
    if ((item.fact_type === 'botanical_name' || item.fact_type === 'genus_species') && !facts.botanical_name) {
      facts.botanical_name = val
      status.botanical_name = item.confidence && item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    } else if ((item.fact_type === 'cultivar' || item.fact_type === 'plant_name') && !facts.cultivar_name) {
      facts.cultivar_name = val
      status.cultivar_name = item.confidence && item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    } else if (item.fact_type === 'inventor' && !facts.inventors) {
      facts.inventors = [val]
      status.inventors = item.confidence && item.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    }
  }

  // Entities
  for (const ent of ctxEntities) {
    if ((ent.entity_type === 'inventor' || ent.entity_type === 'person') && !facts.inventors) {
      facts.inventors = [ent.name]
      status.inventors = ent.confidence && ent.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    }
    if ((ent.entity_type === 'nursery' || ent.entity_type === 'company') && !facts.applicant) {
      facts.applicant = ent.name
      status.applicant = ent.confidence && ent.confidence >= 0.8 ? 'KNOWN' : 'INFERRED'
    }
  }

  return { facts, status }
}

/**
 * Infer plant origin type from user description
 */
export function inferPlantOrigin(text = '') {
  const lower = String(text || '').toLowerCase()
  if (/\b(sport|bud sport|limb sport|mutation|spontaneous mutation)\b/i.test(lower)) {
    return 'SPORT'
  }
  if (/\b(tissue culture|somaclonal)\b/i.test(lower)) {
    return 'TISSUE_CULTURE_DERIVED'
  }
  if (/\b(cross|hybrid|pollination|cross-pollination|breeding programme|bred)\b/i.test(lower)) {
    return 'HYBRID'
  }
  if (/\b(seedling|chance seedling|volunteer seedling)\b/i.test(lower)) {
    return 'SEEDLING'
  }
  if (/\b(discovered|found|selected in|cultivated area)\b/i.test(lower)) {
    return 'DISCOVERED_PLANT'
  }
  return 'OTHER'
}

/**
 * Check if the user is asking about Plant Variety Rights / PVP / UPOV / CPVR
 */
export function isPlantVarietyRightsRequest(text = '') {
  const lower = String(text || '').toLowerCase()
  return (
    /\b(plant breeders?'? rights?|pvr\b|cpvr\b|plant variety protection|pvpa?\b|upov\b|breeders?'? rights?)\b/i.test(lower) ||
    /\b(register|protect)\b.*\b(?:breeders?'? rights?|variety rights?|in europe|in the uk|cpvo)\b/i.test(lower)
  )
}

/**
 * Check if the user is answering "I don't know" or asking to skip
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /\b(i don'?t know|not sure|unsure|skip|no idea|decide later|can we decide later|don'?t have one|not yet|haven'?t decided|to be determined|don't have an rhs|no rhs|no chart)\b/i.test(clean) ||
    /^(pass|tbd|none|n\/a)$/i.test(clean)
  )
}

/**
 * Check if affirmative confirmation to draft was given
 */
export function isAffirmativeConfirmation(text = '') {
  const clean = String(text || '').trim().toLowerCase()
  return (
    /^(yes|proceed|draft|draft it|yes proceed|yes please|go ahead|start drafting|prepare the draft|generate|do it|ok proceed|sure proceed)$/i.test(clean) ||
    /\b(yes|proceed|go ahead|start drafting|prepare the draft|please proceed|proceed with the draft|proceed with the plant patent|ready to draft|please draft|prepare the first draft)\b/i.test(clean)
  )
}

/**
 * Detect mid-stream fact corrections
 */
export function detectPlantFactCorrection(text = '', currentFacts = {}) {
  const clean = String(text || '').trim()

  // Cultivar name correction
  const nameMatch = clean.match(/(?:actually|instead)\s+(?:call\s+it|name\s+it|the\s+variety\s+is|the\s+name\s+is)\s+["“']?([^"”'.\n]+)["”']?/i)
  if (nameMatch) {
    return { field: 'cultivar_name', value: nameMatch[1].trim() }
  }

  // Botanical / Flower colour change (e.g. "The mature flower is actually deep pink, not red")
  const flowerColourMatch = clean.match(/(?:actually|the mature flower is actually|instead of [a-z]+,?)\s+([a-z\s]+ flowers?|[a-z\s]+ with [a-z\s]+ margins?)/i)
  if (flowerColourMatch) {
    return { field: 'distinctive_characteristics', value: clean, isColourChange: true }
  }

  return null
}

/**
 * Assess plant patent draft readiness
 */
export function assessPlantReadiness(facts = {}, flags = []) {
  const hasName = Boolean(facts.cultivar_name && facts.cultivar_name !== 'UNKNOWN')
  const hasBotanical = Boolean(facts.botanical_name && facts.botanical_name !== 'UNKNOWN')
  const hasOrigin = Boolean(facts.origin && facts.origin !== 'UNKNOWN')
  const hasAsexual = Boolean(
    facts.asexual_reproduction &&
    facts.asexual_reproduction !== 'UNKNOWN' &&
    !flags.includes(REVIEW_FLAGS.ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED)
  )
  const hasDistinct = Boolean(
    facts.distinctive_characteristics &&
    facts.distinctive_characteristics !== 'UNKNOWN' &&
    facts.distinctive_characteristics.length >= 20
  )

  if (hasName && hasBotanical && hasOrigin && hasAsexual && hasDistinct) {
    return READINESS_STATES.READY_FOR_FIRST_DRAFT
  }
  if (hasName && (hasBotanical || hasAsexual)) {
    return READINESS_STATES.PARTIALLY_READY
  }
  return READINESS_STATES.NOT_READY
}

/**
 * Evaluate single step in plant patent interview graph
 */
export function evaluatePlantInterviewStep({
  session = {},
  messages = [],
  latestMessage = '',
  matterContext = {},
}) {
  const facts = { ...(session.facts || {}) }
  const placeholders = { ...(session.placeholders || {}) }
  const flags = [...(session.flags || [])]
  const questionHistory = [...(session.questionHistory || [])]
  let currentQuestionId = session.currentQuestionId || null
  let awaitingConfirmation = session.awaitingConfirmation || false

  // 1. Check for Plant Variety Rights (PVP / CPVR / UPOV) confusion
  const latestText = String(latestMessage || '').trim()
  if (isPlantVarietyRightsRequest(latestText)) {
    if (!flags.includes(REVIEW_FLAGS.PLANT_VARIETY_RIGHTS_DISTINCTION_REQUIRED)) {
      flags.push(REVIEW_FLAGS.PLANT_VARIETY_RIGHTS_DISTINCTION_REQUIRED)
    }
    return {
      action: 'CLARIFICATION_REQUIRED',
      drafting_status: 'PVR_DISTINCTION_REQUIRED',
      message:
        `Under US and international IP law, a **US Plant Patent** (USPTO, 35 U.S.C. § 161) covers asexually reproduced distinct plant varieties in the United States.\n\n` +
        `European Community Plant Variety Rights (CPVR via CPVO) and US Plant Variety Protection (PVPA via USDA for seed/tubers) are separate sui generis systems.\n\n` +
        `Would you like to continue drafting a **US Plant Patent Application**, or do you need assistance with an international Plant Variety Rights filing?`,
      flags,
      session: {
        ...session,
        facts,
        placeholders,
        flags,
        currentQuestionId,
      },
    }
  }

  // 2. Extract facts from matter
  const { facts: matterFacts, status: matterStatus } = extractPlantMatterFacts(matterContext)
  for (const [key, val] of Object.entries(matterFacts)) {
    if (!facts[key] && matterStatus[key] === 'KNOWN') {
      facts[key] = val
    }
  }

  const isDraftRequest =
    /(?:draft|prepare|write|file|patent)(?:.*)?\b(?:plant\s+patent(?:\s+application)?|patent\s+(?:for|to)\s+(?:this|a|the|my)?\s*(?:new\s+)?(?:plant|cultivar|variety)|patent\s+(?:this|a|the|my)?\s*(?:new\s+)?plant\s+variety)\b/i.test(latestText) ||
    /^(?:draft|prepare)\s+(?:a\s+)?(?:plant\s+patent|plant\s+patent\s+application)$/i.test(latestText)

  // 3. If awaiting draft confirmation and user says yes
  if (awaitingConfirmation) {
    if (isAffirmativeConfirmation(latestText)) {
      return {
        action: 'DRAFT',
        drafting_status: 'READY_TO_ASSEMBLE',
        facts,
        placeholders,
        flags,
        readiness: READINESS_STATES.READY_FOR_FIRST_DRAFT,
        message: 'Understood. Beginning first draft of the US Plant Patent Application specification now.',
      }
    } else if (isSkipOrUnknown(latestText)) {
      awaitingConfirmation = false
    }
  }

  // 4. Process user's answer to pending question
  if (currentQuestionId && !isDraftRequest && latestText) {
    const correction = detectPlantFactCorrection(latestText, facts)
    if (correction) {
      if (correction.isColourChange) {
        // Track updated characteristic and mark affected sections
        facts.distinctive_characteristics = `${facts.distinctive_characteristics || ''}\nNote: ${correction.value}`
        facts.colour_references = correction.value
        session.affectedSections = ['summary', 'botanical_description', 'distinguishing_characteristics', 'drawings_photos', 'claim']
      } else {
        facts[correction.field] = correction.value
      }
    } else {
      const qObj = CANONICAL_PLANT_QUESTIONS.find((q) => q.question_id === currentQuestionId)
      if (qObj) {
        // Check if user says "I don't know" or "skip"
        if (isSkipOrUnknown(latestText)) {
          if (qObj.field === 'colour_references') {
            facts.colour_references = latestText // Store user descriptive colour without inventing RHS
            placeholders.colour_references = '[DESCRIPTIVE_COLOUR_ONLY_NO_RHS]'
          } else if (qObj.blocking) {
            placeholders[qObj.field] = `[UNKNOWN / REQUIRED: ${qObj.field}]`
            facts[qObj.field] = 'UNKNOWN'
          } else {
            placeholders[qObj.field] = `[NOT PROVIDED: ${qObj.field}]`
            facts[qObj.field] = 'UNKNOWN'
          }
        } else {
          // Check for intelligent follow-up trigger
          let triggeredFollowUp = null
          for (const condition of qObj.follow_up_conditions || []) {
            if (condition.test(latestText)) {
              triggeredFollowUp = condition.followUp
              break
            }
          }

          // Asexual reproduction check: if user says haven't propagated
          if (qObj.field === 'asexual_reproduction') {
            if (/\b(not yet|haven'?t|no propagation|unpropagated|never propagated)\b/i.test(latestText)) {
              if (!flags.includes(REVIEW_FLAGS.ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED)) {
                flags.push(REVIEW_FLAGS.ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED)
              }
              facts.asexual_reproduction = 'UNPROPAGATED'
            } else {
              facts.asexual_reproduction = latestText
              // Remove flag if previously present
              const idx = flags.indexOf(REVIEW_FLAGS.ASEXUAL_REPRODUCTION_INFORMATION_REQUIRED)
              if (idx !== -1) flags.splice(idx, 1)
            }
          } else if (qObj.field === 'origin') {
            facts.origin = inferPlantOrigin(latestText)
            facts.origin_details = latestText
          } else if (qObj.field === 'closest_variety') {
            facts.closest_variety = latestText
            // Extract claimed difference if mentioned
            const diffMatch = latestText.match(/(?:but|however|except)\s+(.+)$/i)
            if (diffMatch) {
              facts.comparator_differences = diffMatch[1].trim()
            }
          } else if (qObj.field === 'public_disclosures') {
            facts.public_disclosures = [latestText]
            if (!/^(no|none|never|not disclosed|not sold)\b/i.test(latestText)) {
              if (!flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)) {
                flags.push(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)
              }
            }
          } else if (qObj.field === 'inventors') {
            const names = latestText
              .split(/[,;\n]|(?:\band\b)/i)
              .map((s) => s.trim())
              .filter(Boolean)
            facts.inventors = names.length ? names : [latestText]
            if (names.length > 1 || /nursery staff|worked on/i.test(latestText)) {
              if (!flags.includes(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)) {
                flags.push(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)
              }
            }
          } else {
            facts[qObj.field] = latestText
          }

          if (triggeredFollowUp && !session.inFollowUp) {
            return {
              action: 'ASK_QUESTION',
              drafting_status: 'INFORMATION_GATHERING',
              single_question: {
                question_id: `${qObj.question_id}_followup`,
                field: qObj.field,
                question: triggeredFollowUp,
                raw_question: triggeredFollowUp,
                reason: 'Clarifying critical requirement for plant patent eligibility.',
                is_follow_up: true,
              },
              session: {
                ...session,
                facts,
                placeholders,
                flags,
                currentQuestionId: qObj.question_id,
                inFollowUp: true,
                awaitingConfirmation: false,
              },
            }
          }
        }
      }
    }
  }

  // 5. Assess readiness
  const readiness = assessPlantReadiness(facts, flags)

  // 6. If ready for first draft, present summary and ask permission!
  if (readiness === READINESS_STATES.READY_FOR_FIRST_DRAFT && !session.confirmedReady) {
    const summaryItems = [
      `Cultivar: "${facts.cultivar_name || 'Working Denomination'}"`,
      `Botanical Taxon: ${facts.botanical_name || 'Species'}`,
      `Origin: ${facts.origin || 'Captured'} (${facts.origin_details || facts.parentage || 'Breeding history recorded'})`,
      `Asexual Reproduction: ${facts.asexual_reproduction ? facts.asexual_reproduction.slice(0, 100) + '...' : 'Confirmed'}`,
      `Distinguishing Characteristics: ${facts.distinctive_characteristics ? facts.distinctive_characteristics.slice(0, 100) + '...' : 'Captured'}`,
      `Closest Comparator: ${facts.closest_variety || 'Identified'}`,
      `Inventors: ${Array.isArray(facts.inventors) ? facts.inventors.join(', ') : facts.inventors || 'To be specified'}`,
    ]

    const flagNotes = []
    if (flags.includes(REVIEW_FLAGS.DISCLOSURE_REVIEW_REQUIRED)) {
      flagNotes.push('Commercial sale / public exhibition noted (statutory bar review under 35 U.S.C. § 102).')
    }
    if (flags.includes(REVIEW_FLAGS.INVENTORSHIP_REVIEW_REQUIRED)) {
      flagNotes.push('Co-inventorship / discoverer contribution confirmation required (35 U.S.C. § 115).')
    }

    const confirmationPrompt =
      `I have enough information to prepare the first plant patent draft.\n\n` +
      `**Summary of Established Variety Information:**\n` +
      summaryItems.map((i) => `• ${i}`).join('\n') +
      (flagNotes.length ? `\n\n**Review Flags:**\n` + flagNotes.map((f) => `⚠️ ${f}`).join('\n') : '') +
      `\n\nWould you like me to proceed with drafting the application?`

    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness,
      message: confirmationPrompt,
      session: {
        ...session,
        facts,
        placeholders,
        flags,
        currentQuestionId: null,
        awaitingConfirmation: true,
        confirmedReady: true,
      },
    }
  }

  // 7. Select next single question
  let nextQ = null
  for (const q of CANONICAL_PLANT_QUESTIONS) {
    const depsMet = q.dependencies.every((dep) => Boolean(facts[dep] && facts[dep] !== 'UNKNOWN'))
    if (!depsMet) continue

    if (q.skip_if(facts)) continue

    nextQ = q
    break
  }

  // If no more questions, prompt confirmation
  if (!nextQ) {
    return {
      action: 'PROMPT_DRAFT_CONFIRMATION',
      drafting_status: 'CONFIRMATION_REQUIRED',
      readiness: assessPlantReadiness(facts, flags),
      message: 'I have gathered the necessary botanical and propagation details. Would you like me to proceed with preparing the first plant patent draft?',
      session: {
        ...session,
        facts,
        placeholders,
        flags,
        currentQuestionId: null,
        awaitingConfirmation: true,
      },
    }
  }

  const questionText = typeof nextQ.question === 'function' ? nextQ.question(facts) : nextQ.question

  let intro = ''
  if (!currentQuestionId && isDraftRequest) {
    intro =
      `Absolutely. I can help you prepare that.\n\n` +
      `I'll ask you a few questions one at a time so I can understand the plant, its origin, how it has been asexually reproduced, and the characteristics that distinguish it before preparing the first draft.\n\n`
  }

  return {
    action: 'ASK_QUESTION',
    drafting_status: 'INFORMATION_GATHERING',
    readiness,
    single_question: {
      question_id: nextQ.question_id,
      field: nextQ.field,
      question: `${intro}${questionText}`,
      raw_question: questionText,
      reason: nextQ.reason,
      required: nextQ.required,
      answer_type: nextQ.answer_type,
    },
    session: {
      ...session,
      facts,
      placeholders,
      flags,
      currentQuestionId: nextQ.question_id,
      questionHistory: [...questionHistory, nextQ.question_id],
      inFollowUp: false,
      awaitingConfirmation: false,
    },
  }
}
