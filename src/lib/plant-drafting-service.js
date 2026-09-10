/**
 * SALLYIP PLANT PATENT DRAFTING SERVICE
 * Canonical Document #005: Plant Patent Application (35 U.S.C. §§ 161–164 / 37 C.F.R. §§ 1.161–1.167)
 *
 * Implements:
 * - Standard 10 USPTO Plant Patent sections
 * - Strictly single-claim generation (35 U.S.C. § 162; 37 C.F.R. § 1.164)
 * - Claim and botanical description support map (CLAIM_CONCEPT -> DESCRIPTION_FEATURE -> SOURCE -> STATUS)
 * - Change impact analysis for botanical edits
 * - Section assembly and provenance tracking
 */

export const USPTO_PLANT_SECTIONS = [
  { key: 'title', heading: 'Title of the Invention', order: 1 },
  { key: 'latin_name', heading: 'Latin Name of the Genus and Species', order: 2 },
  { key: 'variety_denomination', heading: 'Variety Denomination', order: 3 },
  { key: 'background_origin', heading: 'Background of the Invention', order: 4 },
  { key: 'asexual_reproduction', heading: 'Asexual Reproduction of the Plant', order: 5 },
  { key: 'summary', heading: 'Brief Summary of the Invention', order: 6 },
  { key: 'drawings_photos', heading: 'Brief Description of the Photographs', order: 7 },
  { key: 'botanical_description', heading: 'Detailed Botanical Description', order: 8 },
  { key: 'distinguishing_characteristics', heading: 'Distinguishing Characteristics and Comparison with Known Varieties', order: 9 },
  { key: 'claim', heading: 'Claim (35 U.S.C. § 162)', order: 10 },
]

/**
 * Format standard statutory single claim for US Plant Patent (35 U.S.C. § 162)
 */
export function formatPlantPatentClaim(facts = {}) {
  const cultivar = facts.cultivar_name || 'the new variety'
  const botanical = facts.botanical_name || 'plant'
  return `I claim:\n\nA new and distinct variety of ${botanical} plant named '${cultivar}', substantially as herein shown and described.`
}

/**
 * Build machine-readable Plant Patent Claim Support Map
 * Structure: CLAIM_CONCEPT -> DESCRIPTION_FEATURE -> USER/SOURCE SUPPORT -> STATUS
 */
export function buildPlantClaimSupportMap(facts = {}, sections = {}) {
  const map = []
  const botanicalText = String(sections.botanical_description || facts.botanical_description || '').toLowerCase()
  const distText = String(sections.distinguishing_characteristics || facts.distinctive_characteristics || '').toLowerCase()
  const asexualText = String(sections.asexual_reproduction || facts.asexual_reproduction || '').toLowerCase()

  // Concept 1: Distinct variety identity
  const hasDistinct = Boolean(facts.distinctive_characteristics && facts.distinctive_characteristics.length >= 15)
  map.push({
    claim_concept: 'Distinct variety identity',
    description_feature: facts.distinctive_characteristics ? 'Recited in Distinguishing Characteristics' : 'Missing morphological differentiation',
    user_source_support: facts.distinctive_characteristics ? 'USER_PROVIDED' : 'UNKNOWN',
    status: hasDistinct ? 'SUPPORTED' : 'UNSUPPORTED',
  })

  // Concept 2: Botanical genus and species
  const hasBotanical = Boolean(facts.botanical_name && facts.botanical_name.length >= 3)
  map.push({
    claim_concept: 'Botanical taxon (genus and species)',
    description_feature: facts.botanical_name || 'Not provided',
    user_source_support: facts.botanical_name ? 'USER_PROVIDED' : 'UNKNOWN',
    status: hasBotanical ? 'SUPPORTED' : 'UNSUPPORTED',
  })

  // Concept 3: Asexual reproduction & stability
  const hasAsexual = Boolean(facts.asexual_reproduction && facts.asexual_reproduction !== 'UNPROPAGATED' && facts.asexual_reproduction.length >= 10)
  map.push({
    claim_concept: 'Asexually reproduced true to type',
    description_feature: facts.asexual_reproduction ? 'Described in Asexual Reproduction section' : 'No asexual propagation confirmed',
    user_source_support: facts.asexual_reproduction ? 'USER_PROVIDED' : 'UNKNOWN',
    status: hasAsexual ? 'SUPPORTED' : 'UNSUPPORTED',
  })

  // Concept 4: Variety denomination
  const hasCultivar = Boolean(facts.cultivar_name && facts.cultivar_name.length > 0)
  map.push({
    claim_concept: 'Variety denomination',
    description_feature: facts.cultivar_name || 'Not provided',
    user_source_support: facts.cultivar_name ? 'USER_PROVIDED' : 'UNKNOWN',
    status: hasCultivar ? 'SUPPORTED' : 'UNSUPPORTED',
  })

  return {
    supportMap: map,
    hasUnsupportedLimitations: map.some((m) => m.status === 'UNSUPPORTED'),
    totalConcepts: map.length,
    supportedCount: map.filter((m) => m.status === 'SUPPORTED').length,
    unsupportedCount: map.filter((m) => m.status === 'UNSUPPORTED').length,
  }
}

/**
 * Change Impact Analysis:
 * When a user updates a botanical characteristic, identify affected sections
 * and preserve unaffected sections.
 */
export function analyzeBotanicalChangeImpact(oldFact = '', newFact = '', existingSections = {}) {
  const affectedSectionKeys = []
  const unaffectedSectionKeys = []

  const lowerOld = String(oldFact || '').toLowerCase()
  const lowerNew = String(newFact || '').toLowerCase()

  // If flower or foliage colour/morphology changes:
  if (
    /\b(colour\w*|color\w*|flower\w*|petal\w*|margin\w*|foliage\w*|leaf|leaves|bloom\w*|habit\w*)\b/i.test(lowerOld) ||
    /\b(colour\w*|color\w*|flower\w*|petal\w*|margin\w*|foliage\w*|leaf|leaves|bloom\w*|habit\w*)\b/i.test(lowerNew)
  ) {
    affectedSectionKeys.push(
      'summary',
      'botanical_description',
      'distinguishing_characteristics',
      'drawings_photos'
    )
  }

  // If asexual propagation changes:
  if (/\b(propagation|cuttings|grafting|budding|tissue culture|generations?)\b/i.test(lowerNew)) {
    affectedSectionKeys.push('asexual_reproduction', 'summary')
  }

  // If variety denomination changes:
  if (/\b(name|cultivar|variety|denomination)\b/i.test(lowerNew)) {
    affectedSectionKeys.push('title', 'variety_denomination', 'claim')
  }

  for (const sec of USPTO_PLANT_SECTIONS) {
    if (!affectedSectionKeys.includes(sec.key)) {
      unaffectedSectionKeys.push(sec.key)
    }
  }

  return {
    affectedSections: affectedSectionKeys,
    preservedSections: unaffectedSectionKeys,
    changeNotice: `Change impacts: ${affectedSectionKeys.join(', ')}. Unrelated sections preserved: ${unaffectedSectionKeys.join(', ')}.`,
  }
}

/**
 * Assemble complete Plant Patent Specification in standard USPTO filing order
 */
export function assemblePlantSpecification(facts = {}, sections = {}) {
  const cultivar = facts.cultivar_name || 'THE NEW VARIETY'
  const botanical = facts.botanical_name || 'PLANT'

  let doc = `# ${botanical.toUpperCase()} PLANT NAMED '${cultivar.toUpperCase()}'\n\n`
  doc += `**Filing Category:** Plant Patent Application under 35 U.S.C. § 161\n`
  doc += `**Jurisdiction:** United States Patent and Trademark Office (USPTO)\n\n---\n\n`

  for (const sec of USPTO_PLANT_SECTIONS) {
    let content = sections[sec.key] || ''
    if (!content) {
      if (sec.key === 'title') content = `${botanical} Plant Named '${cultivar}'`
      else if (sec.key === 'latin_name') content = facts.botanical_name || '[Genus and species not provided]'
      else if (sec.key === 'variety_denomination') content = `'${facts.cultivar_name || 'Working Designation'}'`
      else if (sec.key === 'claim') content = formatPlantPatentClaim(facts)
      else if (sec.key === 'asexual_reproduction') content = facts.asexual_reproduction || ''
      else if (sec.key === 'distinguishing_characteristics') content = facts.distinctive_characteristics || ''
      else if (sec.key === 'background_origin') content = facts.origin_details || facts.parentage || ''
    }

    if (content.trim()) {
      doc += `## ${sec.heading.toUpperCase()}\n\n${content.trim()}\n\n---\n\n`
    }
  }

  return doc.trim()
}
