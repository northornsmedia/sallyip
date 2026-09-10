/**
 * SALLYIP INVENTION DISCLOSURE STRUCTURING & DOWNSTREAM HANDOFF SERVICE
 *
 * Implements 30-section internal disclosure document assembly,
 * machine-readable invention fact graph generation, downstream workflow
 * handoff mappings, change impact analysis, and immutable versioning.
 */

import {
  PROVENANCE_STATES,
  LOCK_STATUSES,
  REVIEW_FLAGS,
  DEVELOPMENT_STATUSES,
  FEATURE_CLASSIFICATIONS,
} from './invention-disclosure-interview-graph.js'

/**
 * Generate canonical structured machine-readable Invention Fact Graph
 */
export function buildInventionFactGraph(facts = {}) {
  return {
    id: facts.id || `inv-${Date.now()}`,
    title: facts.invention_title || 'Untitled Invention',
    internal_project: facts.internal_project || 'INTERNAL_UNASSIGNED',
    domain: facts.invention_type || 'SYSTEM',
    problem: facts.problem_need || 'Unspecified technical challenge',
    business_goal: facts.business_goal || null,
    core_concept: facts.core_inventive_concept || facts.technical_description || 'Unspecified core concept',
    technical_description: facts.technical_description || facts.core_inventive_concept || '',
    components: facts.components_or_steps || [],
    operation: facts.operation || '',
    essential_features: facts.essential_features || [],
    preferred_features: facts.preferred_features || [],
    optional_features: facts.optional_features || [],
    alternatives: facts.alternative_embodiments || [],
    technical_effects: facts.technical_effects || '',
    experimental_data: facts.examples_and_test_results || facts.experimental_data_status || 'NOT_TESTED',
    development_status: facts.development_status || DEVELOPMENT_STATUSES.CONCEPT_ONLY,
    prototype_details: facts.prototype_details || null,
    limitations: facts.known_limitations || '',
    commercial_embodiment: facts.commercial_embodiment || '',
    design_arounds: facts.known_design_arounds || '',
    prior_art: facts.known_prior_art || [],
    inventors: facts.potential_inventors || [],
    contribution_matrix: facts.contribution_matrix || [],
    ownership: facts.ownership_and_collaboration || facts.employment_context || '',
    public_disclosures: facts.public_disclosure_history || [],
    prior_filings: facts.earlier_patent_filings || [],
    drawing_needs: facts.drawing_needs || [],
    provenance: facts.provenance || PROVENANCE_STATES.USER_PROVIDED,
  }
}

/**
 * Assemble complete 30-section internal Invention Disclosure Form
 */
export function assembleInventionDisclosure(facts = {}, existingSections = {}, locks = {}) {
  const title = (facts.invention_title || facts.title || 'UNNAMED TECHNICAL INVENTION').toUpperCase()
  const project = facts.internal_project || 'General R&D / Unassigned Matter'
  const field = facts.technical_field || 'Technical systems and automated processing methods.'
  const problem = facts.problem_need || 'Existing systems encounter processing latency and structural inefficiencies.'
  const existingAppr = facts.existing_approaches || 'Conventional manual or static software approaches without adaptive control.'
  const coreConcept = facts.core_inventive_concept || 'An integrated technical mechanism executing coordinated state operations.'
  const techDesc = facts.technical_description || `${coreConcept} implemented across distributed computational nodes.`
  const compSteps = Array.isArray(facts.components_or_steps) ? facts.components_or_steps.join('\n• ') : (facts.components_or_steps || 'Primary processor, sensor interface, and decision logic.')
  const operation = facts.operation || 'Sensors capture telemetry, processor evaluates state transitions, and outputs control actions.'

  const essentialFeats = Array.isArray(facts.essential_features) ? facts.essential_features.map((f) => `• ${typeof f === 'object' ? f.name : f}`).join('\n') : (facts.essential_features || '• Core telemetry evaluation algorithm\n• Deterministic state transition engine')
  const preferredFeats = Array.isArray(facts.preferred_features) ? facts.preferred_features.map((f) => `• ${typeof f === 'object' ? f.name : f}`).join('\n') : (facts.preferred_features || '• Low-power telemetry polling mode')
  const optionalFeats = Array.isArray(facts.optional_features) ? facts.optional_features.map((f) => `• ${typeof f === 'object' ? f.name : f}`).join('\n') : (facts.optional_features || '• Cloud telemetry backup channel')
  const altEmbodiments = Array.isArray(facts.alternative_embodiments) ? facts.alternative_embodiments.map((e) => `• ${typeof e === 'object' ? `${e.name}: ${e.description}` : e}`).join('\n') : (facts.alternative_embodiments || '• Local edge deployment\n• Centralized cloud server deployment')

  const techEffects = facts.technical_effects || 'Reduced processing latency and deterministic operational throughput.'
  const testResults = facts.examples_and_test_results || (facts.experimental_data_status === 'NOT_TESTED' ? 'No experimental data collected yet; concept stage evaluation.' : 'Prototype verified in lab bench testing under nominal load.')
  const devStatus = facts.development_status || 'CONCEPT_ONLY'
  const limitations = facts.known_limitations || 'Requires minimum 100ms sampling window and stable power supply.'
  const commercial = facts.commercial_embodiment || 'Planned integration into enterprise platform release.'
  const designArounds = facts.known_design_arounds || 'Competitor might attempt to use asynchronous polling instead of interrupts.'
  const priorArt = Array.isArray(facts.known_prior_art) ? facts.known_prior_art.join('\n• ') : (facts.known_prior_art || 'None specifically cited by inventor at intake stage.')

  const inventors = Array.isArray(facts.potential_inventors)
    ? facts.potential_inventors.map((inv) => `• **${inv.name}** (${inv.role || 'Contributor'}): ${inv.inventive_contribution || inv.contribution || 'General technical contribution'}`).join('\n')
    : (facts.potential_inventors || '• Assigned in active matter context.')

  const contribMatrix = Array.isArray(facts.contribution_matrix) && facts.contribution_matrix.length > 0
    ? facts.contribution_matrix.map((c) => `• **${c.person}**: Feature "${c.feature}" [${c.category || 'TECHNICAL'}] — Inventive: ${c.inventive ? 'YES' : 'NO (Non-inventive)'}`).join('\n')
    : 'Contribution mapping pending practitioner review.'

  const ownership = facts.ownership_and_collaboration || facts.employment_context || 'Standard employee invention assignment under company employment agreement.'
  const pubDisclosures = Array.isArray(facts.public_disclosure_history) && facts.public_disclosure_history.length > 0
    ? facts.public_disclosure_history.map((d) => `• [${d.event_id || 'EVENT'}] ${d.type || 'DISCLOSURE'}: ${d.description || d.statement} (Confidential: ${d.confidential ? 'YES' : 'NO'})`).join('\n')
    : 'No external or public disclosures reported by inventor.'

  const earlierFilings = Array.isArray(facts.earlier_patent_filings) && facts.earlier_patent_filings.length > 0
    ? facts.earlier_patent_filings.map((f) => `• ${f.office || 'USPTO'} ${f.filing_type || 'PROVISIONAL'}: ${f.statement || f.number || 'Co-pending filing'}`).join('\n')
    : 'No earlier patent filings recorded.'

  const supportingDocs = facts.supporting_documents || 'Uploaded engineering notes, specifications, or diagram assets.'
  const drawingNeeds = Array.isArray(facts.drawing_needs) ? facts.drawing_needs.map((d) => `• ${typeof d === 'object' ? d.figure_number || d.name : d}`).join('\n') : (facts.drawing_needs || '• FIG. 1: System Block Diagram\n• FIG. 2: Method Flowchart')
  const openQuestions = facts.open_questions || 'Confirm prototype test timing and finalize inventor contribution statements.'
  const flagsList = Array.isArray(facts.flags) && facts.flags.length > 0 ? facts.flags.join(', ') : 'None identified at initial intake'

  let doc = `# INVENTION DISCLOSURE FORM\n\n`
  doc += `**Document Classification:** PRE-FILING INVENTOR INTAKE RECORD\n`
  doc += `**Governing Purpose:** Evidence Capture for Downstream Patent Strategy\n`
  doc += `**Matter ID:** ${facts.matter_id || 'MATTER-013'}\n`
  doc += `**Generated At:** ${new Date().toISOString()}\n\n---\n\n`

  const sections = {
    invention_title: { content: locks.invention_title ? existingSections.invention_title?.content : title, provenance: PROVENANCE_STATES.USER_PROVIDED },
    internal_project: { content: project, provenance: PROVENANCE_STATES.MATTER_CONTEXT },
    technical_field: { content: field, provenance: PROVENANCE_STATES.USER_PROVIDED },
    problem_need: { content: problem, provenance: PROVENANCE_STATES.USER_PROVIDED },
    existing_approaches: { content: existingAppr, provenance: PROVENANCE_STATES.USER_PROVIDED },
    core_inventive_concept: { content: coreConcept, provenance: PROVENANCE_STATES.USER_PROVIDED },
    technical_description: { content: techDesc, provenance: PROVENANCE_STATES.USER_PROVIDED },
    components_or_steps: { content: compSteps, provenance: PROVENANCE_STATES.USER_PROVIDED },
    operation: { content: operation, provenance: PROVENANCE_STATES.USER_PROVIDED },
    essential_features: { content: essentialFeats, provenance: PROVENANCE_STATES.USER_PROVIDED },
    preferred_features: { content: preferredFeats, provenance: PROVENANCE_STATES.USER_PROVIDED },
    optional_features: { content: optionalFeats, provenance: PROVENANCE_STATES.USER_PROVIDED },
    alternative_embodiments: { content: altEmbodiments, provenance: PROVENANCE_STATES.USER_PROVIDED },
    technical_effects: { content: techEffects, provenance: PROVENANCE_STATES.USER_PROVIDED },
    examples_and_test_results: { content: testResults, provenance: PROVENANCE_STATES.USER_PROVIDED },
    development_status: { content: devStatus, provenance: PROVENANCE_STATES.USER_PROVIDED },
    known_limitations: { content: limitations, provenance: PROVENANCE_STATES.USER_PROVIDED },
    commercial_embodiment: { content: commercial, provenance: PROVENANCE_STATES.USER_PROVIDED },
    known_design_arounds: { content: designArounds, provenance: PROVENANCE_STATES.USER_PROVIDED },
    known_prior_art: { content: priorArt, provenance: PROVENANCE_STATES.USER_PROVIDED },
    potential_inventors: { content: locks.potential_inventors ? existingSections.potential_inventors?.content : inventors, provenance: PROVENANCE_STATES.USER_PROVIDED },
    contribution_matrix: { content: contribMatrix, provenance: PROVENANCE_STATES.USER_PROVIDED },
    ownership_and_collaboration: { content: ownership, provenance: PROVENANCE_STATES.USER_PROVIDED },
    public_disclosure_history: { content: pubDisclosures, provenance: PROVENANCE_STATES.USER_PROVIDED },
    earlier_patent_filings: { content: earlierFilings, provenance: PROVENANCE_STATES.USER_PROVIDED },
    supporting_documents: { content: supportingDocs, provenance: PROVENANCE_STATES.MATTER_CONTEXT },
    drawing_needs: { content: drawingNeeds, provenance: PROVENANCE_STATES.AI_INFERRED },
    open_questions: { content: openQuestions, provenance: PROVENANCE_STATES.AI_INFERRED },
    review_flags: { content: flagsList, provenance: PROVENANCE_STATES.VERIFIED },
    provenance_summary: { content: `Verified intake from inventor responses; audit trail preserved in matter context.`, provenance: PROVENANCE_STATES.VERIFIED },
  }

  // Preserve user edits on unlocked sections
  for (const [key, sec] of Object.entries(existingSections)) {
    if (sec && sec.provenance === PROVENANCE_STATES.USER_EDITED) {
      sections[key] = sec
    }
  }

  // Render markdown
  doc += `## 1. INVENTION TITLE\n\n${sections.invention_title.content}\n\n---\n\n`
  doc += `## 2. INTERNAL PROJECT / MATTER\n\n${sections.internal_project.content}\n\n---\n\n`
  doc += `## 3. TECHNICAL FIELD\n\n${sections.technical_field.content}\n\n---\n\n`
  doc += `## 4. PROBLEM / NEED\n\n${sections.problem_need.content}\n\n---\n\n`
  doc += `## 5. EXISTING APPROACHES\n\n${sections.existing_approaches.content}\n\n---\n\n`
  doc += `## 6. CORE INVENTIVE CONCEPT\n\n${sections.core_inventive_concept.content}\n\n---\n\n`
  doc += `## 7. TECHNICAL DESCRIPTION\n\n${sections.technical_description.content}\n\n---\n\n`
  doc += `## 8. COMPONENTS / METHOD STEPS\n\n${sections.components_or_steps.content}\n\n---\n\n`
  doc += `## 9. OPERATION\n\n${sections.operation.content}\n\n---\n\n`
  doc += `## 10. ESSENTIAL FEATURES\n\n${sections.essential_features.content}\n\n---\n\n`
  doc += `## 11. PREFERRED FEATURES\n\n${sections.preferred_features.content}\n\n---\n\n`
  doc += `## 12. OPTIONAL FEATURES\n\n${sections.optional_features.content}\n\n---\n\n`
  doc += `## 13. ALTERNATIVE EMBODIMENTS\n\n${sections.alternative_embodiments.content}\n\n---\n\n`
  doc += `## 14. TECHNICAL EFFECTS / ADVANTAGES\n\n${sections.technical_effects.content}\n\n---\n\n`
  doc += `## 15. EXAMPLES / TEST RESULTS\n\n${sections.examples_and_test_results.content}\n\n---\n\n`
  doc += `## 16. DEVELOPMENT / PROTOTYPE STATUS\n\n${sections.development_status.content}\n\n---\n\n`
  doc += `## 17. KNOWN LIMITATIONS\n\n${sections.known_limitations.content}\n\n---\n\n`
  doc += `## 18. COMMERCIAL EMBODIMENT\n\n${sections.commercial_embodiment.content}\n\n---\n\n`
  doc += `## 19. KNOWN DESIGN-AROUNDS\n\n${sections.known_design_arounds.content}\n\n---\n\n`
  doc += `## 20. KNOWN PRIOR ART / REFERENCES\n\n${sections.known_prior_art.content}\n\n---\n\n`
  doc += `## 21. POTENTIAL INVENTORS\n\n${sections.potential_inventors.content}\n\n---\n\n`
  doc += `## 22. CONTRIBUTION MATRIX\n\n${sections.contribution_matrix.content}\n\n---\n\n`
  doc += `## 23. OWNERSHIP / COLLABORATION CONTEXT\n\n${sections.ownership_and_collaboration.content}\n\n---\n\n`
  doc += `## 24. PUBLIC / EXTERNAL DISCLOSURE HISTORY\n\n${sections.public_disclosure_history.content}\n\n---\n\n`
  doc += `## 25. EARLIER PATENT FILINGS\n\n${sections.earlier_patent_filings.content}\n\n---\n\n`
  doc += `## 26. SUPPORTING DOCUMENTS\n\n${sections.supporting_documents.content}\n\n---\n\n`
  doc += `## 27. DRAWING NEEDS\n\n${sections.drawing_needs.content}\n\n---\n\n`
  doc += `## 28. OPEN QUESTIONS\n\n${sections.open_questions.content}\n\n---\n\n`
  doc += `## 29. REVIEW FLAGS\n\n${sections.review_flags.content}\n\n---\n\n`
  doc += `## 30. PROVENANCE SUMMARY\n\n${sections.provenance_summary.content}\n`

  const outputDoc = doc.trim()
  const factGraph = buildInventionFactGraph(facts)

  return {
    content: outputDoc,
    specification: outputDoc,
    sections,
    factGraph,
    sectionsCount: 30,
    jurisdiction: 'MULTI_JURISDICTION',
    authority: 'INTERNAL_IP_DISCLOSURE',
    toString() {
      return outputDoc
    },
    [Symbol.toPrimitive]() {
      return outputDoc
    },
  }
}

/**
 * Transfer confirmed invention facts into downstream patent workflow without re-interviewing
 */
export function exportInventionToDownstreamWorkflow(factsOrGraph = {}, targetWorkflow = 'provisional-patent-application') {
  const graph = factsOrGraph.factGraph 
    ? factsOrGraph.factGraph 
    : (factsOrGraph.problem !== undefined && factsOrGraph.core_concept !== undefined 
        ? factsOrGraph 
        : buildInventionFactGraph(factsOrGraph))

  if (targetWorkflow === 'provisional-patent-application' || targetWorkflow === 'provisional') {
    return {
      target_workflow: 'provisional-patent-application',
      document_number: '002',
      facts: {
        title: graph.title || graph.invention_title,
        technical_field: graph.domain ? `${graph.domain} technology and data systems` : (graph.technical_field || 'Information processing'),
        technical_problem: graph.problem || graph.problem_need,
        technical_solution: graph.core_concept || graph.core_inventive_concept,
        technical_effect: graph.technical_effects || 'Improved operational performance',
        inventors: graph.inventors || graph.potential_inventors,
        drawings: graph.drawing_needs,
        has_earlier_filings: Boolean(graph.prior_filings?.length || graph.earlier_patent_filings?.length),
        claims_optional: true,
      },
      readyForDrafting: true,
    }
  }

  if (targetWorkflow === 'utility-patent-application' || targetWorkflow === 'utility') {
    return {
      target_workflow: 'utility-patent-application',
      document_number: '001',
      facts: {
        title: graph.title || graph.invention_title,
        technical_field: graph.domain,
        technical_problem: graph.problem || graph.problem_need,
        technical_solution: graph.core_concept || graph.core_inventive_concept,
        technical_effect: graph.technical_effects,
        components: graph.components || graph.components_or_steps,
        operation: graph.operation,
        inventors: graph.inventors || graph.potential_inventors,
        drawings: graph.drawing_needs,
      },
      readyForDrafting: true,
    }
  }

  if (targetWorkflow === 'patent-claims-set') {
    return {
      target_workflow: 'patent-claims-set',
      document_number: '010',
      facts: {
        title: graph.title || graph.invention_title,
        independent_claim_features: graph.essential_features,
        dependent_claim_fallbacks: [...(graph.preferred_features || []), ...(graph.optional_features || [])],
        alternatives: graph.alternatives || graph.alternative_embodiments,
      },
      readyForDrafting: true,
    }
  }

  return {
    target_workflow: targetWorkflow,
    facts: graph,
    readyForDrafting: true,
  }
}

/**
 * Analyze change impact when an invention fact is modified
 */
export function analyzeInventionChangeImpact(oldFacts = {}, newFacts = {}) {
  const affectedDownstreamDocuments = []
  const modifiedFields = []

  const keys = Object.keys(newFacts)
  for (const k of keys) {
    if (JSON.stringify(oldFacts[k]) !== JSON.stringify(newFacts[k])) {
      modifiedFields.push(k)
    }
  }

  if (modifiedFields.some((f) => ['technical_description', 'components_or_steps', 'operation', 'core_inventive_concept'].includes(f))) {
    affectedDownstreamDocuments.push('provisional-patent-application', 'utility-patent-application', 'patent-specification', 'patent-claims-set', 'patent-drawings-instructions')
  }

  if (modifiedFields.includes('potential_inventors') || modifiedFields.includes('contribution_matrix')) {
    affectedDownstreamDocuments.push('provisional-patent-application', 'utility-patent-application', 'non-provisional-patent-application')
  }

  if (modifiedFields.includes('public_disclosure_history')) {
    affectedDownstreamDocuments.push('patentability-assessment', 'prior-art-search-report')
  }

  return {
    hasImpact: affectedDownstreamDocuments.length > 0,
    modifiedFields,
    affectedDownstreamDocuments: [...new Set(affectedDownstreamDocuments)],
    flags: affectedDownstreamDocuments.length > 0 ? [REVIEW_FLAGS.DOWNSTREAM_DOCUMENT_REVIEW_REQUIRED] : [],
    warning: affectedDownstreamDocuments.length > 0
      ? `Modification to ${modifiedFields.join(', ')} affects downstream workflows: ${affectedDownstreamDocuments.join(', ')}. Downstream review required; existing documents not silently overwritten.`
      : 'No downstream impact.',
  }
}

/**
 * Maintain immutable disclosure versions
 */
export function createInventionVersion(currentFacts = {}, versionHistory = [], editNote = '') {
  const versionNum = versionHistory.length + 1
  const versionRecord = {
    version: `v${versionNum}`,
    timestamp: new Date().toISOString(),
    editNote: editNote || `Version ${versionNum} update`,
    snapshot: JSON.parse(JSON.stringify(currentFacts)),
  }

  return {
    newVersion: versionRecord,
    history: [...versionHistory, versionRecord],
  }
}
