/**
 * SALLYIP DESIGN PATENT DRAFTING SERVICE
 * Canonical Document #004: Design Patent Application (35 U.S.C. § 171; 37 C.F.R. § 1.152)
 *
 * Assembles the formal specification sections required for a US design patent application.
 * Sections: Title, Cross-Reference, Federally Sponsored Research, Description of Figures,
 * Claim, Description of the Design.
 */

export const USPTO_DESIGN_SECTIONS = [
  { id: 'title', heading: 'TITLE', order: 1, required: true, cfr: '37 C.F.R. § 1.152(a)' },
  { id: 'cross_references', heading: 'CROSS-REFERENCE TO RELATED APPLICATIONS', order: 2, required: false, cfr: '37 C.F.R. § 1.77(b)(2)' },
  { id: 'federally_sponsored_research', heading: 'STATEMENT REGARDING FEDERALLY SPONSORED RESEARCH OR DEVELOPMENT', order: 3, required: false, cfr: '37 C.F.R. § 1.77(b)(3)' },
  { id: 'figure_descriptions', heading: 'DESCRIPTION OF THE FIGURES', order: 4, required: true, cfr: '37 C.F.R. § 1.152(b)' },
  { id: 'claim', heading: 'CLAIM', order: 5, required: true, cfr: '35 U.S.C. § 171; 37 C.F.R. § 1.153' },
  { id: 'design_description', heading: 'DESCRIPTION OF THE DESIGN', order: 6, required: false, cfr: '37 C.F.R. § 1.152(c)' },
]

export function assembleDesignPatentSpecification(facts = {}, sections = {}) {
  const title = String(facts.design_title || facts.title || 'TITLE TO BE ASSIGNED')
  const articleName = String(facts.article_name || 'ARTICLE TO BE NAMED')
  const inventors = Array.isArray(facts.inventors) ? facts.inventors : [facts.inventors || '']
  const applicant = String(facts.applicant || '')
  const designType = String(facts.design_type || 'PHYSICAL_PRODUCT')
  const claimedPortion = String(facts.claimed_portion || 'ENTIRE_ARTICLE')
  const ornamentalFeatures = String(facts.ornamental_features || '')
  const figureDescription = String(facts.figure_description || '')
  const availableViews = Array.isArray(facts.available_views) ? facts.available_views : []
  const lineTreatment = String(facts.line_treatment || 'SOLID_CLAIMED_BROKEN_UNCLAIMED')
  const unclaimedFeatures = String(facts.unclaimed_features || '')
  const designDescription = String(facts.design_description || '')
  const colourSignificance = String(facts.colour_significance || 'NOT_APPLICABLE')
  const transparency = facts.transparency_translucency || false
  const multipleEmbodiments = facts.multiple_embodiments || false
  const embodimentsDetail = String(facts.embodiments_detail || '')
  const guiDetails = String(facts.gui_details || '')
  const publicDisclosures = facts.public_disclosures || []
  const priorityClaims = Array.isArray(facts.priority_claims) ? facts.priority_claims : []
  const functionalityReview = facts.functionality_check || false

  const sections_output = {}

  // TITLE
  sections_output.title = `${title}\n`

  // CROSS-REFERENCES
  if (priorityClaims.length > 0) {
    sections_output.cross_references = priorityClaims.map(p =>
      `The following application claims priority to: ${p}`).join('\n') + '\n'
  } else {
    sections_output.cross_references = 'None.\n'
  }

  // FEDERALLY SPONSORED RESEARCH
  sections_output.federally_sponsored_research = 'None.\n'

  // DESCRIPTION OF THE FIGURES
  const viewsList = availableViews.length > 0 ? availableViews.join(', ') : 'Perspective, Front, Rear'
  const figureDesc = figureDescription || `FIG. 1 is a perspective view of the ${articleName} showing the ornamental design. FIG. 2 is a front view of the ${articleName}. Additional views as available.`
  sections_output.figure_descriptions = `${figureDesc}\n` +
    `The drawings show the ${articleName} from the following views: ${viewsList}.\n` +
    (lineTreatment === 'SOLID_CLAIMED_BROKEN_UNCLAIMED' ?
      `Solid lines in the drawings represent the claimed portions of the design. Broken lines represent unclaimed environmental portions.\n` : '') +
    (colourSignificance === 'CLAIMED' ? `Colour is claimed as a feature of the design.\n` : '') +
    (transparency ? `Transparent/translucent portions are shown by alternating long and short parallel lines.\n` : '')

  // CLAIM
  const claimText = generateDesignClaim(facts)
  sections_output.claim = claimText

  // DESCRIPTION OF THE DESIGN
  const descText = generateDesignDescription(facts)
  sections_output.design_description = descText

  return {
    content: formatDesignSpecification(sections_output, title),
    sections: sections_output,
    profile: 'design-patent-application',
    jurisdiction: 'US',
    authority: 'USPTO',
    status: 'READY_TO_ASSEMBLE',
    cfr_references: [
      '35 U.S.C. § 171',
      '35 U.S.C. § 172',
      '35 U.S.C. § 173',
      '37 C.F.R. § 1.152',
      '37 C.F.R. § 1.153',
      '37 C.F.R. § 1.77',
      'MPEP Chapter 1500',
    ],
  }
}

export function generateDesignClaim(facts = {}) {
  const articleName = String(facts.article_name || 'ARTICLE')
  const designType = String(facts.design_type || 'PHYSICAL_PRODUCT')
  const claimedPortion = String(facts.claimed_portion || 'ENTIRE_ARTICLE')
  const ornamentalFeatures = String(facts.ornamental_features || '')
  const guiDetails = String(facts.gui_details || '')
  const designDescription = String(facts.design_description || '')

  if (designType === 'GUI') {
    const displayArticle = facts.gui_display_article || articleName
    return `The ornamental design for a graphical user interface displayed on a ${displayArticle}, as shown and described.`
  }

  if (designType === 'ICON') {
    return `The ornamental design for an icon, as shown and described.`
  }

  if (designType === 'SURFACE_ORNAMENTATION') {
    const articleType = designDescription.toLowerCase().includes('furniture') ? 'furniture' :
      designDescription.toLowerCase().includes('container') ? 'container' : articleName
    return `The ornamental design for the surface ornamentation of an ${articleType}, as shown and described.`
  }

  if (designType === 'PACKAGING') {
    return `The ornamental design for the packaging of an ${articleName}, as shown and described.`
  }

  if (claimedPortion === 'PORTION_OF_ARTICLE') {
    return `The ornamental design for a portion of the ${articleName}, as shown and described.`
  }

  return `The ornamental design for an ${articleName}, as shown and described.`
}

export function generateDesignDescription(facts = {}) {
  const articleName = String(facts.article_name || 'ARTICLE')
  const designTitle = String(facts.design_title || 'TITLE')
  const ornamentalFeatures = String(facts.ornamental_features || '')
  const designDescription = String(facts.design_description || '')
  const claimedPortion = String(facts.claimed_portion || 'ENTIRE_ARTICLE')
  const lineTreatment = String(facts.line_treatment || 'SOLID_CLAIMED_BROKEN_UNCLAIMED')
  const unclaimedFeatures = String(facts.unclaimed_features || '')
  const colourSignificance = String(facts.colour_significance || 'NOT_APPLICABLE')
  const transparency = facts.transparency_translucency || false
  const multipleEmbodiments = facts.multiple_embodiments || false
  const embodimentsDetail = String(facts.embodiments_detail || '')
  const guiDetails = String(facts.gui_details || '')
  const functionalityCheck = facts.functionality_check || false

  const lines = []

  lines.push(`This design relates to the ornamental design of a ${articleName}, as shown and described.`)
  lines.push('')

  if (claimedPortion === 'PORTION_OF_ARTICLE') {
    lines.push(`The claimed design pertains to a portion of the ${articleName}. The unclaimed portions are shown with broken lines in the accompanying drawings.`)
    if (unclaimedFeatures) {
      lines.push(`Unclaimed environmental features shown with broken lines include: ${unclaimedFeatures}.`)
    }
    lines.push('')
  }

  if (ornamentalFeatures) {
    lines.push(`The ornamental features of the design are as follows: ${ornamentalFeatures}.`)
  }

  if (designDescription) {
    lines.push(`Overall design concept: ${designDescription}.`)
  }

  if (functionalityCheck) {
    lines.push(`The design is purely ornamental and does not include functional features. Any functional aspects of the ${articleName} are not claimed under this design patent.`)
  }

  if (colourSignificance === 'CLAIMED') {
    lines.push(`Colour is claimed as a feature of the design and forms part of the claimed ornamental design.`)
  }

  if (transparency) {
    lines.push(`Transparent and translucent portions are represented in the drawings by alternating long and short parallel lines.`)
  }

  if (multipleEmbodiments && embodimentsDetail) {
    lines.push(`Multiple embodiments are disclosed. The distinguishing features include: ${embodimentsDetail}.`)
  }

  if (guiDetails) {
    lines.push(`GUI-specific details: ${guiDetails}.`)
  }

  if (lineTreatment === 'SOLID_CLAIMED_BROKEN_UNCLAIMED') {
    lines.push(`In the drawings, solid lines represent the claimed portions of the design, and broken lines represent unclaimed portions.`)
  }

  return lines.join('\n') + '\n'
}

export function formatDesignSpecification(sections, title) {
  const parts = []
  parts.push(`DESIGN PATENT APPLICATION\n`)
  parts.push(`TITLE: ${title}\n`)
  parts.push(`\n`)

  for (const section of USPTO_DESIGN_SECTIONS) {
    const content = sections[section.id] || ''
    if (content && content.trim() !== '') {
      parts.push(`\n${section.heading}\n`)
      parts.push(`${content}\n`)
    }
  }

  return parts.join('')
}

export function screenSubjectMatter101(facts = {}) {
  const desc = String(facts.design_description || facts.ornamental_features || '').toLowerCase()
  if (/functional|function|operational|technical|mechanical|works by|configured to|adaptive|structural|load-bearing|movable|adjustable|convert|transform|process|method|algorithm|software/i.test(desc)) {
    return {
      isSubjectMatter101Risk: true,
      reason: 'Description may contain functional features that are not properly distinguished from ornamental design. Review required under 35 U.S.C. § 101.',
      suggested_action: 'Clarify that only ornamental appearance is claimed. Functional features are excluded from the design patent claim.',
    }
  }
  return { isSubjectMatter101Risk: false, reason: null, suggested_action: null }
}

export function detectDrawingInconsistency(facts = {}) {
  const views = Array.isArray(facts.available_views) ? facts.available_views : []
  const figureDescription = String(facts.figure_description || '')
  if (views.length === 0 && !figureDescription) return { hasInconsistency: true, reason: 'No drawing views or figure descriptions provided.' }
  if (figureDescription && views.length > 0 && figureDescription.toLowerCase().includes('perspective') && !views.includes('PERSPECTIVE')) {
    return { hasInconsistency: true, reason: 'Figure description mentions perspective view but PERSPECTIVE is not listed in available views.' }
  }
  return { hasInconsistency: false, reason: null }
}

export function validateDesignClaimBoundary(facts = {}) {
  const claimedPortion = String(facts.claimed_portion || '')
  const lineTreatment = String(facts.line_treatment || '')
  const unclaimedFeatures = String(facts.unclaimed_features || '')
  if (claimedPortion === 'PORTION_OF_ARTICLE' && lineTreatment !== 'SOLID_CLAIMED_BROKEN_UNCLAIMED') {
    return { valid: false, reason: 'Partial design requires clear line treatment distinction between claimed and unclaimed portions.' }
  }
  if (claimedPortion === 'PORTION_OF_ARTICLE' && !unclaimedFeatures) {
    return { valid: false, reason: 'Partial design requires identification of unclaimed/environmental features.' }
  }
  return { valid: true, reason: null }
}