/**
 * SALLYIP PCT INTERNATIONAL PATENT APPLICATION DRAFTING SERVICE
 *
 * Implements canonical 10-section WIPO PCT specification drafting,
 * multi-category international claim set generation, machine-readable
 * claim support mapping (PCT Rule 6), and change impact analysis.
 */

export const WIPO_PCT_SECTIONS = [
  { key: 'title', heading: 'Title of Invention', rule: 'PCT Rule 4.3' },
  { key: 'technical_field', heading: 'Technical Field', rule: 'PCT Rule 5.1(a)(i)' },
  { key: 'background_art', heading: 'Background Art', rule: 'PCT Rule 5.1(a)(ii)' },
  { key: 'summary_of_invention', heading: 'Disclosure of Invention', rule: 'PCT Rule 5.1(a)(iii)' },
  { key: 'brief_description_drawings', heading: 'Brief Description of the Drawings', rule: 'PCT Rule 5.1(a)(iv)' },
  { key: 'detailed_description', heading: 'Modes for Carrying Out the Invention', rule: 'PCT Rule 5.1(a)(v)' },
  { key: 'examples', heading: 'Examples', rule: 'PCT Rule 5.1(a)(v)' },
  { key: 'industrial_applicability', heading: 'Industrial Applicability', rule: 'PCT Rule 5.1(a)(vi)' },
  { key: 'claims', heading: 'Claims', rule: 'PCT Rule 6' },
  { key: 'abstract', heading: 'Abstract', rule: 'PCT Rule 8' },
]

/**
 * Format multi-category claims maintaining international flexibility
 */
export function formatPctClaims(facts = {}) {
  const title = facts.title || 'the disclosed technology'
  const features = facts.technical_features || 'one or more configured operations'
  const summary = facts.problem_solution || ''

  return (
    `1. A computer-implemented method for ${title.toLowerCase()}, comprising:\n` +
    `   receiving an input data stream;\n` +
    `   processing the input data stream in accordance with ${features};\n` +
    `   generating an output representation based on said processing; and\n` +
    `   transmitting the output representation to a target destination.\n\n` +
    `2. The method of claim 1, wherein processing the input data stream comprises filtering spurious signals to address ${summary || 'noise artifacts'}.\n\n` +
    `3. The method of claim 1 or 2, further comprising executing a feedback control loop across successive processing cycles.\n\n` +
    `4. A system configured for ${title.toLowerCase()}, comprising:\n` +
    `   one or more processors; and\n` +
    `   a non-transitory memory storing instructions that, when executed by the one or more processors, cause the system to perform operations comprising the method of any one of claims 1 to 3.\n\n` +
    `5. A non-transitory computer-readable medium comprising instructions that, when executed by one or more processors, cause the one or more processors to perform the method of any one of claims 1 to 3.`
  )
}

/**
 * Build machine-readable claim support map under PCT Rule 6
 */
export function buildPctClaimSupportMap(claimsText = '', specText = '') {
  const supportMap = []
  const claims = claimsText.split(/\n(?=\d+\.)/).filter(Boolean)
  const specLower = specText.toLowerCase()

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i].trim()
    const match = claim.match(/^(\d+)\.\s*(.+)$/s)
    if (!match) continue

    const claimNum = match[1]
    const body = match[2]
    const limitations = body
      .split(/;\s*|,\s*wherein\s+|,\s*further comprising\s+|,\s*and\s+/i)
      .map((l) => l.trim().replace(/[.;]+$/, ''))
      .filter((l) => l.length > 5)

    const limitationEntries = limitations.map((lim) => {
      // Check if words in limitation appear in specification
      const keywords = lim.toLowerCase().split(/\s+/).filter((w) => w.length > 4 && !/^(method|system|comprising|wherein|having|further)$/.test(w))
      const foundCount = keywords.filter((kw) => specLower.includes(kw)).length
      let status = 'UNSUPPORTED'

      if (keywords.length === 0 || foundCount === keywords.length) {
        status = 'SUPPORTED'
      } else if (foundCount > 0) {
        status = 'PARTIALLY_SUPPORTED'
      }

      return {
        limitation: lim,
        supporting_disclosure: status === 'SUPPORTED' ? 'Detailed Description / Modes for Carrying Out the Invention' : 'Not identified in specification',
        source: status === 'SUPPORTED' ? 'SOURCE_EXTRACTED' : 'PLACEHOLDER',
        status,
      }
    })

    supportMap.push({
      claim_number: parseInt(claimNum, 10),
      limitations: limitationEntries,
      overall_status: limitationEntries.every((l) => l.status === 'SUPPORTED') ? 'SUPPORTED' : 'PARTIALLY_SUPPORTED',
    })
  }

  return supportMap
}

/**
 * Change Impact Analysis for PCT Application
 */
export function analyzePctChangeImpact(oldFact = '', newFact = '') {
  const affectedSections = []
  const preservedSections = []

  const lowerOld = String(oldFact || '').toLowerCase()
  const lowerNew = String(newFact || '').toLowerCase()

  // Priority changes (e.g., claiming two provisionals instead of one)
  if (/\b(priority|provisional|earlier\s+application|filing\s+date)\b/i.test(lowerOld) || /\b(priority|provisional|earlier\s+application|filing\s+date)\b/i.test(lowerNew)) {
    affectedSections.push('background_art', 'summary_of_invention')
  }

  // Applicant or Inventor changes
  if (/\b(applicant|inventor|assignee|nationality|residence)\b/i.test(lowerOld) || /\b(applicant|inventor|assignee|nationality|residence)\b/i.test(lowerNew)) {
    // Bibliographic metadata only; specification sections untouched
  }

  // Technical features / components changes
  if (/\b(lidar|camera|sensor|processor|component|algorithm|step)\b/i.test(lowerOld) || /\b(lidar|camera|sensor|processor|component|algorithm|step)\b/i.test(lowerNew)) {
    affectedSections.push('summary_of_invention', 'detailed_description', 'claims', 'abstract')
  }

  // Claim edits (excluding "claim priority")
  const isClaimEdit = (text) => /\b(patent\s+claims?|claims?\s+\d+|independent\s+claim|dependent\s+claim|revise\s+claim|edit\s+claim)\b/i.test(text) || (/\bclaims?\b/i.test(text) && !/\b(?:claim|claims|claiming)\s+priority\b/i.test(text))
  if (isClaimEdit(lowerOld) || isClaimEdit(lowerNew)) {
    affectedSections.push('claims')
  }

  for (const sec of WIPO_PCT_SECTIONS) {
    if (!affectedSections.includes(sec.key)) {
      preservedSections.push(sec.key)
    }
  }

  return {
    affectedSections,
    preservedSections,
    changeNotice: `Change impacts: ${affectedSections.length ? affectedSections.join(', ') : 'Bibliographic/metadata only'}. Preserved sections: ${preservedSections.join(', ')}.`,
  }
}

/**
 * Assemble complete PCT Application Specification in standard WIPO filing order
 */
export function assemblePctSpecification(facts = {}, sections = {}) {
  const title = (facts.title || 'INTERNATIONAL PATENT APPLICATION').toUpperCase()

  let doc = `# ${title}\n\n`
  doc += `**Filing Type:** International Patent Application under the Patent Cooperation Treaty (PCT)\n`
  doc += `**Governing Treaty & Authority:** WIPO / Patent Cooperation Treaty (PCT, 1970)\n`
  doc += `**International Phase:** Application Establishing International Filing Date\n\n`

  if (facts.priorities && facts.priorities.length > 0) {
    doc += `### CROSS-REFERENCE TO RELATED APPLICATIONS\n\n`
    for (const pri of facts.priorities) {
      doc += `This international application claims the benefit of and priority under PCT Article 8 to earlier application ${pri.country_or_office || 'US'} ${pri.application_number || '[Application Number]'}, filed on ${pri.filing_date || '[Filing Date]'}.\n\n`
    }
    doc += `---\n\n`
  }

  for (const sec of WIPO_PCT_SECTIONS) {
    let content = sections[sec.key] || ''
    if (!content) {
      if (sec.key === 'title') {
        content = facts.title || 'TITLE OF THE INVENTION'
      } else if (sec.key === 'technical_field') {
        content = `The present invention relates generally to ${facts.technical_field || 'information processing systems'}, and more particularly to methods, systems, and computer-readable media for implementing the same.`
      } else if (sec.key === 'background_art') {
        content = facts.problem_solution || 'Existing approaches suffer from significant computational inefficiencies, lack of scalability, and vulnerability to noise.'
      } else if (sec.key === 'summary_of_invention') {
        content = `In accordance with an aspect of the present disclosure, an international patent application is provided directed to ${facts.title || 'the disclosed invention'}. The solution overcomes the shortcomings of the prior art by ${facts.technical_features || 'executing coordinated technical operations'}.`
      } else if (sec.key === 'brief_description_drawings') {
        content = facts.drawings_description || 'FIG. 1 is a schematic block diagram illustrating an exemplary system architecture according to one embodiment of the present invention.\nFIG. 2 is a flowchart illustrating a method according to one embodiment of the present invention.'
      } else if (sec.key === 'detailed_description') {
        content = `Detailed embodiments of the present invention are disclosed herein; however, it is to be understood that the disclosed embodiments are merely exemplary of the invention, which may be embodied in various forms.\n\n${facts.technical_features || 'The system includes one or more processors and interconnected functional units configured to execute the operations described herein.'}`
      } else if (sec.key === 'industrial_applicability') {
        content = `The methods, systems, and computer-readable media described herein possess clear industrial applicability and may be manufactured, deployed, and utilized in commercial data processing, industrial automation, and enterprise computing environments.`
      } else if (sec.key === 'claims') {
        content = formatPctClaims(facts)
      } else if (sec.key === 'abstract') {
        content = `A method, system, and computer-readable medium are provided for ${facts.title || 'the disclosed invention'}. ${facts.problem_solution || 'The disclosure addresses technical limitations through specialized processing operations.'}`
      }
    }

    if (content.trim()) {
      doc += `## ${sec.heading.toUpperCase()}\n\n${content.trim()}\n\n---\n\n`
    }
  }

  return doc.trim()
}
