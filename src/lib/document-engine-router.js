import { loadCatalogue, loadDocumentProfile, resolveDocumentFamily, buildDocumentOutline, generatePreDraftQuestions, assembleDocument } from './document-engine.js'
import { resolveJurisdiction } from './jurisdiction-registry.js'
import { evaluatePatentInterviewStep } from './patent-interview-graph.js'
import { evaluateDesignPatentInterviewStep } from './design-patent-interview-graph.js'
import { assembleDesignPatentSpecification } from './design-patent-drafting-service.js'
import { evaluateProvisionalInterviewStep } from './provisional-patent-interview-graph.js'
import { evaluatePlantInterviewStep, isPlantVarietyRightsRequest } from './plant-interview-graph.js'
import { assemblePlantSpecification } from './plant-drafting-service.js'
import { evaluatePctInterviewStep, isNationalPhaseRequest, isGlobalPatentMisconception } from './pct-interview-graph.js'
import { assemblePctSpecification } from './pct-drafting-service.js'
import { evaluateNationalPhaseInterviewStep, isNoPriorPctRequest } from './national-phase-interview-graph.js'
import { assembleNationalPhaseFiling } from './national-phase-drafting-service.js'
import { evaluateEpInterviewStep, isEpRegionalPhaseFromPctRequest } from './european-patent-interview-graph.js'
import { assembleEpSpecification } from './european-patent-drafting-service.js'
import { evaluatePatentAbstractInterviewStep } from './patent-abstract-interview-graph.js'
import { evaluatePatentSpecificationInterviewStep } from './patent-specification-interview-graph.js'
import { assemblePatentSpecification } from './patent-specification-drafting-service.js'
import { evaluateInventionDisclosureInterviewStep } from './invention-disclosure-interview-graph.js'
import { assembleInventionDisclosure } from './invention-disclosure-service.js'
import { evaluatePatentNoveltyInterviewStep } from './patent-novelty-opinion-interview-graph.js'
import { evaluatePatentabilityInterviewStep } from './patentability-assessment-interview-graph.js'
import { evaluateFtoInterviewStep } from './freedom-to-operate-interview-graph.js'
import { assembleFtoOpinion, createFtoScope } from './fto-opinion-service.js'
import { evaluatePatentInvalidityInterviewStep } from './patent-invalidity-interview-graph.js'
import { evaluatePatentLandscapeInterviewStep } from './patent-landscape-interview-graph.js'
import { evaluatePriorArtSearchInterviewStep } from './prior-art-search-interview-graph.js'
import { evaluateClaimChartInterviewStep, isInfringementQuestion, isSupportQuestion } from './patent-claim-chart-interview-graph.js'
import { isFtoBlockingQuestion as isLandscapeFtoBlockingQuestion, isPatentabilityFromWhitespace as isLandscapePatentabilityQuestion } from './patent-landscape-interview-graph.js'
import { evaluateDrawingInstructionsStep, isActualDrawingGenerationRequest } from './patent-drawings-interview-graph.js'
import { isFormalDesignDrawingRequest, isPatentDrawingInstructionRequest, assembleDrawingInstructionPackage } from './patent-drawings-model.js'

export async function routeConversationalIntent(userInput, matterContext = {}) {
  // Disambiguate users asking for national phase without a prior PCT application
  if (isNoPriorPctRequest(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'pct-international-patent-application',
      message:
        `A **National Phase Patent Application** requires an existing, filed PCT International Application under PCT Articles 22 or 39(1).\n\n` +
        `Because you have not yet filed a PCT application, the proper starting point is either filing an initial **PCT International Patent Application** (to establish an international priority date across 157+ contracting states) or an initial national patent application (such as a US Provisional or Utility application).\n\n` +
        `Would you like to start by drafting a **PCT International Application**, or explore an initial priority application?`,
      flags: ['NO_PRIOR_PCT_CLARIFIED'],
      suggestions: ['Draft a PCT International Application', 'Draft a Provisional Patent Application', 'Explain Patent Filing Strategy']
    }
  }

  // Disambiguate National Phase entry from PCT initial international filing
  if (isNationalPhaseRequest(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'pct-international-patent-application',
      message:
        `Under the Patent Cooperation Treaty, **entering the National or Regional Phase** (governed by PCT Articles 22 and 39) is a distinct procedure from preparing and filing the initial PCT International Application.\n\n` +
        `National phase entry involves submitting translations, paying individual national patent office fees, and appointing local registered patent attorneys in each designated country (e.g., European Patent Office for Europe, USPTO for the United States).\n\n` +
        `This workflow specializes in drafting the **PCT International Patent Application** establishing your international filing date. Would you like assistance with international PCT drafting, or national phase tracking?`,
      flags: ['NATIONAL_PHASE_DISTINCTION_REQUIRED'],
      suggestions: ['Draft a PCT International Application', 'National Phase Entry Deadlines']
    }
  }

  // Disambiguate EP Regional Phase from PCT requests before generic EP profile resolution
  if (isEpRegionalPhaseFromPctRequest(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'national-phase-patent-application',
      jurisdiction: 'EPO',
      message:
        `Under the European Patent Convention and the Patent Cooperation Treaty, **entering the European regional phase from an existing PCT application** (governed by PCT Articles 22/39(1) and Rule 159 EPC) is legally distinct from preparing a direct, first-instance European patent application (filed under EPC Article 75).\n\n` +
        `Because you already have a filed PCT international application, your filing is conducted as an **EPO Regional Phase Entry** (Form 1001, Rule 161/162 EPC communication, and claims fee settlement).\n\n` +
        `I am routing you to SallyIP's **National Phase Patent Application** workflow with the target jurisdiction set to **Europe (EPO)**. Would you like to proceed?`,
      flags: ['DIRECT_EP_VS_PCT_CLARIFIED'],
      suggestions: ['Enter European Regional Phase (EPO)', 'Draft a Direct European Patent Application']
    }
  }

  // Disambiguate Global / Worldwide Patent Misconception
  if (isGlobalPatentMisconception(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'pct-international-patent-application',
      message:
        `A PCT international patent application **does not grant a worldwide patent** or an automatically enforceable global patent.\n\n` +
        `There is no single international patent that covers the entire world. The PCT provides a unified procedure for filing a single application in one language, establishing an international filing date across 157+ Contracting States, followed by an International Search Report (ISR) and Written Opinion.\n\n` +
        `To obtain enforceable patent rights, you must later enter the **National or Regional Phase** (typically at 30 or 31 months from the priority date) in each specific country or region (e.g., US at the USPTO, Europe at the EPO, Japan at the JPO), where national patent examiners evaluate and grant individual national patents.\n\n` +
        `Would you like to proceed with preparing your PCT International Application?`,
      flags: ['GLOBAL_PATENT_MISCONCEPTION_CLARIFIED'],
      suggestions: ['Draft a PCT International Application', 'Explain PCT vs National Phase']
    }
  }

  // Disambiguate Plant Variety Rights / PVR requests before generic profile resolution
  if (isPlantVarietyRightsRequest(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'plant-patent-application',
      message:
        `Under US and international IP law, a **US Plant Patent** (USPTO, 35 U.S.C. Â§ 161) covers asexually reproduced distinct plant varieties in the United States.\n\n` +
        `European Community Plant Variety Rights (CPVR via CPVO) and US Plant Variety Protection (PVPA via USDA for seed/tubers) are separate sui generis systems.\n\n` +
        `Would you like to continue drafting a **US Plant Patent Application**, or do you need assistance with an international Plant Variety Rights filing?`,
      flags: ['PLANT_VARIETY_RIGHTS_DISTINCTION_REQUIRED'],
      suggestions: ['Draft a US Plant Patent Application', 'Plant Variety Protection (PVP / CPVR) Guidance']
    }
  }

  // Document #012 guard: formal ornamental design-figure requests belong to the Design Patent workflow.
  if (isFormalDesignDrawingRequest(userInput)) {
    const designProfile = await loadDocumentProfile('design-patent-application')
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'design-patent-application',
      profile: designProfile,
      message: 'This looks like a formal ornamental design-figure request. I am routing it to the Design Patent Application workflow rather than utility Patent Drawings Instructions.',
      flags: ['DESIGN_PATENT_DRAWING_ROUTE'],
      suggestions: ['Draft a Design Patent Application', 'Prepare Patent Drawing Instructions']
    }
  }

  // Document #012 guard: actual rendering is separate from instructions.
  if (isActualDrawingGenerationRequest(userInput) && !isPatentDrawingInstructionRequest(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'patent-drawings-instructions',
      message: 'Actual patent-drawing rendering is a separate stage from drawing instructions. I can prepare the instruction package first; human/approved rendering and drawing review must follow.',
      flags: ['ACTUAL_IMAGE_GENERATION_SEPARATE'],
      suggestions: ['Prepare Patent Drawing Instructions', 'Draft the Patent Specification']
    }
  }
  // Document #017 guard: opposition/revocation/reexamination filings are contentious-procedure work, never auto-drafted here.
  if (/\b(opposition|revocation|reexamination|re-examination|ipr|pgr)\b.*\b(filing|file|draft|prepare|petition|request)\b|\b(prepare|draft|file)\b.*\b(opposition|revocation|reexamination|re-examination|ipr|pgr)\b/i.test(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'patent-invalidity-opinion',
      message: 'Drafting opposition, revocation, or reexamination filings is a separate contentious procedure outside this invalidity-assessment workflow. I can prepare the evidence-linked invalidity assessment first and hand its claims, grounds, evidence, and verification state to that filing workflow. Would you like to start with the invalidity assessment?',
      flags: ['CONTENTIOUS_FILING_SEPARATE'],
      suggestions: ['Prepare a Patent Invalidity Opinion', 'Draft the Patent Specification']
    }
  }

  // Document #018 session guard: blocking/patentability questions asked inside an active landscape hand off without verdicts.
  const landscapeSession = matterContext.draftSession || matterContext.session || {}
  const landscapeActive = landscapeSession.documentId === 'patent-landscape-report' || Boolean(landscapeSession.facts?.technology_scope)
  const forcedLandscapeFamily = landscapeActive && (isLandscapeFtoBlockingQuestion(userInput) || isLandscapePatentabilityQuestion(userInput)) ? 'patent-landscape-report' : null
  // Document #020 guards: infringement questions belong to the infringement workflow (#021 when it exists);
  // specification-support questions reuse the canonical chart infrastructure in support mode.
  if (isInfringementQuestion(userInput)) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'patent-infringement-analysis',
      message: 'Whether a product infringes a claim is an infringement determination for the infringement workflow (Document #021 will extend the canonical claim-chart infrastructure for this). I can build the underlying evidence-only Patent Claim Chart now as its input, without deciding infringement. Would you like me to start that chart?',
      flags: ['INFRINGEMENT_DETERMINATION_SEPARATE'],
      suggestions: ['Create a Patent Claim Chart', 'Draft a Patent Specification']
    }
  }
  if (isSupportQuestion(userInput)) {
    const supportProfile = await loadDocumentProfile('patent-claim-chart')
    return {
      action: 'CLARIFICATION_REQUIRED',
      document_family: 'patent-claim-chart',
      profile: supportProfile,
      message: 'Specification support is mapped with the same canonical claim-chart infrastructure: each limitation maps to specification passages, figures, and embodiments with a support status, without automatically deciding section 112 or added-matter conclusions. Shall I start that support chart?',
      flags: ['SUPPORT_CHART_MODE'],
      chart_purpose: 'CLAIM_SUPPORT_REVIEW',
      suggestions: ['Create a Patent Claim Chart', 'Draft a Patent Specification']
    }
  }

  const documentFamily = forcedLandscapeFamily || resolveDocumentFamily(userInput)
  const detectedJurisdiction = resolveJurisdiction(userInput)
  const profile = documentFamily ? await loadDocumentProfile(documentFamily) : null

  if (!profile) {
    return {
      action: 'CLARIFICATION_REQUIRED',
      message: `I can help draft ${documentFamily || 'legal documents'}. Could you clarify what type of document you need?`,
      suggestions: ['NDA', 'Patent Application', 'Plant Patent Application', 'Share Purchase Agreement', 'Employment Agreement', 'Privacy Policy', 'Software Licence']
    }
  }

  // Canonical Document #016: evidence-gated Freedom-to-Operate Opinion.
  if (profile.slug === 'freedom-to-operate-opinion') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateFtoInterviewStep({
      session,
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'DRAFT_DOCUMENT') {
      const scope = createFtoScope({
        product_name: interviewResult.facts.product_name,
        product_version: interviewResult.facts.product_version,
        jurisdictions: Array.isArray(interviewResult.facts.jurisdiction) ? interviewResult.facts.jurisdiction : [interviewResult.facts.jurisdiction],
        commercial_activities: interviewResult.facts.commercial_activities,
        search_scope: interviewResult.facts.search_scope || 'TARGET_JURISDICTION_DATABASES',
        known_patents: interviewResult.facts.known_patents || [],
      })
      const ftoDoc = assembleFtoOpinion(scope, interviewResult.facts.risk_items || [], {
        zero_results: Boolean(interviewResult.facts.zero_results),
      })
      return {
        action: 'DRAFT_DOCUMENT',
        document_family: 'freedom-to-operate-opinion',
        profile,
        content: ftoDoc.content || String(ftoDoc),
        assembled_document: ftoDoc,
        facts: interviewResult.facts,
        flags: interviewResult.flags,
      }
    }

    return {
      ...interviewResult,
      document_family: 'freedom-to-operate-opinion',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }

  // Canonical Document #014: evidence-gated Patentability Assessment.
  if (profile.slug === 'patentability-assessment') {
    const interviewResult = evaluatePatentabilityInterviewStep({
      session: matterContext.draftSession || matterContext.session || {},
      latestMessage: userInput,
      matterContext
    })
    return {
      ...interviewResult,
      document_family: 'patentability-assessment',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }

  // Canonical Document #020: Patent Claim Chart.
  if (profile.slug === 'patent-claim-chart') {
    const interviewResult = evaluateClaimChartInterviewStep({
      session: matterContext.draftSession || matterContext.session || {},
      latestMessage: userInput,
      matterContext
    })
    if (interviewResult.action === 'DRAFT') {
      return {
        action: 'DRAFT',
        document_family: 'patent-claim-chart',
        profile,
        draft_plan: interviewResult.draft_plan,
        jurisdiction: interviewResult.facts?.jurisdiction_context || 'UNDECIDED',
        session: interviewResult.session,
        facts: interviewResult.facts,
        readiness: interviewResult.readiness,
      }
    }
    if (interviewResult.action === 'PROMPT_ANALYSIS_CONFIRMATION') {
      return {
        action: 'PROMPT_ANALYSIS_CONFIRMATION',
        document_family: 'patent-claim-chart',
        profile,
        message: interviewResult.message,
        pre_analysis_summary: interviewResult.pre_chart_summary,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.facts || {},
      }
    }
    return {
      ...interviewResult,
      document_family: 'patent-claim-chart',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }
  // Canonical Document #019: Patent Prior-Art Search Report.
  if (profile.slug === 'patent-prior-art-search-report') {
    const interviewResult = evaluatePriorArtSearchInterviewStep({
      session: matterContext.draftSession || matterContext.session || {},
      latestMessage: userInput,
      matterContext
    })
    if (interviewResult.action === 'DRAFT') {
      return {
        action: 'DRAFT',
        document_family: 'patent-prior-art-search-report',
        profile,
        draft_plan: interviewResult.draft_plan,
        jurisdiction: interviewResult.facts?.jurisdiction_context || 'UNDECIDED',
        session: interviewResult.session,
        facts: interviewResult.facts,
        readiness: interviewResult.readiness,
      }
    }
    if (interviewResult.action === 'PROMPT_ANALYSIS_CONFIRMATION') {
      return {
        action: 'PROMPT_ANALYSIS_CONFIRMATION',
        document_family: 'patent-prior-art-search-report',
        profile,
        message: interviewResult.message,
        pre_analysis_summary: interviewResult.pre_analysis_summary,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.facts || {},
      }
    }
    return {
      ...interviewResult,
      document_family: 'patent-prior-art-search-report',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }
  // Canonical Document #018: Patent Landscape Report.
  if (profile.slug === 'patent-landscape-report') {
    const interviewResult = evaluatePatentLandscapeInterviewStep({
      session: matterContext.draftSession || matterContext.session || {},
      latestMessage: userInput,
      matterContext
    })
    if (interviewResult.action === 'DRAFT') {
      return {
        action: 'DRAFT',
        document_family: 'patent-landscape-report',
        profile,
        draft_plan: interviewResult.draft_plan,
        jurisdiction: 'MULTI_JURISDICTION',
        session: interviewResult.session,
        facts: interviewResult.facts,
        readiness: interviewResult.readiness,
      }
    }
    if (interviewResult.action === 'PROMPT_ANALYSIS_CONFIRMATION') {
      return {
        action: 'PROMPT_ANALYSIS_CONFIRMATION',
        document_family: 'patent-landscape-report',
        profile,
        message: interviewResult.message,
        pre_analysis_summary: interviewResult.pre_analysis_summary,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.facts || {},
      }
    }
    return {
      ...interviewResult,
      document_family: 'patent-landscape-report',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }
  // Canonical Document #017: evidence-gated Patent Invalidity Opinion.
  if (profile.slug === 'patent-invalidity-opinion') {
    const interviewResult = evaluatePatentInvalidityInterviewStep({
      session: matterContext.draftSession || matterContext.session || {},
      latestMessage: userInput,
      matterContext
    })
    if (interviewResult.action === 'DRAFT') {
      return {
        action: 'DRAFT',
        document_family: 'patent-invalidity-opinion',
        profile,
        draft_plan: interviewResult.draft_plan,
        jurisdiction: interviewResult.facts?.jurisdiction || 'UNDECIDED',
        session: interviewResult.session,
        facts: interviewResult.facts,
        readiness: interviewResult.readiness,
      }
    }
    if (interviewResult.action === 'PROMPT_ANALYSIS_CONFIRMATION') {
      return {
        action: 'PROMPT_ANALYSIS_CONFIRMATION',
        document_family: 'patent-invalidity-opinion',
        profile,
        message: interviewResult.message,
        pre_analysis_summary: interviewResult.pre_analysis_summary,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.facts || {},
      }
    }
    return {
      ...interviewResult,
      document_family: 'patent-invalidity-opinion',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }
  // Canonical Document #015: evidence-gated Patent Novelty Opinion.
  if (profile.slug === 'patent-novelty-opinion') {
    const interviewResult = evaluatePatentNoveltyInterviewStep({
      session: matterContext.draftSession || matterContext.session || {},
      latestMessage: userInput,
      matterContext
    })
    return {
      ...interviewResult,
      document_family: 'patent-novelty-opinion',
      profile,
      question: interviewResult.single_question,
      questions: interviewResult.single_question ? [interviewResult.single_question] : [],
      known_facts: interviewResult.facts || interviewResult.session?.facts || {}
    }
  }

  // Canonical Document #012: Patent Drawings Instructions interview graph.
  if (profile.slug === 'patent-drawings-instructions') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateDrawingInstructionsStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: interviewResult.document_family || 'patent-drawings-instructions',
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const instruction_package = interviewResult.instruction_package || assembleDrawingInstructionPackage({
        matter: { title: interviewResult.facts?.invention_title },
        facts: interviewResult.facts,
        figures: interviewResult.figure_plan || [],
        numeralRegistry: interviewResult.numeral_registry || [],
        claimFigureMap: interviewResult.claim_map || [],
        specificationFigureMap: interviewResult.specification_map || [],
        gaps: interviewResult.gaps || [],
        numeralConflicts: (interviewResult.conflicts || []).filter((conflict) => /NUMERAL|UNDEFINED|ORPHAN/.test(conflict.code || '')),
        terminologyConflicts: (interviewResult.conflicts || []).filter((conflict) => (conflict.code || '') === 'TERM_CONFLICT'),
        jurisdictionContext: interviewResult.jurisdiction || 'UNDECIDED',
        workflowMode: interviewResult.facts?.workflow_mode || 'NEW_DRAWING_INSTRUCTIONS',
      })
      const draftPlan = {
        content: instruction_package,
        profile: profile.slug,
        sections: profile.sections?.length || 9,
        jurisdiction: interviewResult.jurisdiction || 'UNDECIDED',
        status: 'READY_TO_ASSEMBLE',
        figure_plan: interviewResult.figure_plan || [],
        numeral_registry: interviewResult.numeral_registry || [],
      }
      return {
        action: 'DRAFT',
        document_family: 'patent-drawings-instructions',
        profile,
        draft_plan: draftPlan,
        jurisdiction: interviewResult.jurisdiction || 'UNDECIDED',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'patent-drawings-instructions',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-drawings-instructions',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: interviewResult.session?.facts?.jurisdiction_context || 'UNDECIDED'
    }
  }
  // Canonical Document #005: Plant Patent Application interview graph
  if (profile.slug === 'plant-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluatePlantInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'plant-patent-application',
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const draftContent = assemblePlantSpecification(interviewResult.facts, session.sections || {})
      const draftPlan = {
        content: draftContent,
        profile: profile.slug,
        sections: profile.sections?.length || 10,
        jurisdiction: 'US',
        status: 'READY_TO_ASSEMBLE'
      }
      return {
        action: 'DRAFT',
        document_family: 'plant-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'US',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'plant-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'plant-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'US'
    }
  }

  // Canonical Document #006: PCT International Patent Application interview graph
  if (profile.slug === 'pct-international-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluatePctInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'pct-international-patent-application',
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const draftContent = assemblePctSpecification(interviewResult.facts, session.sections || {})
      const draftPlan = {
        content: draftContent,
        profile: profile.slug,
        sections: profile.sections?.length || 10,
        jurisdiction: 'PCT',
        status: 'READY_TO_ASSEMBLE'
      }
      return {
        action: 'DRAFT',
        document_family: 'pct-international-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'PCT',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'pct-international-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'pct-international-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'PCT'
    }
  }

  // Canonical Document #007: National Phase Patent Application interview graph
  if (profile.slug === 'national-phase-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateNationalPhaseInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'national-phase-patent-application',
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session,
        jurisdiction: interviewResult.jurisdiction
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const draftFiling = assembleNationalPhaseFiling({
        facts: interviewResult.facts,
        jurisdiction: interviewResult.jurisdiction || 'US',
        claims: interviewResult.facts.proposed_national_claims || interviewResult.facts.claims,
        amendments: interviewResult.facts.proposed_amendments,
        differenceReport: interviewResult.facts.difference_report,
        existingSections: session.sections || {}
      })
      const draftPlan = {
        content: draftFiling.adaptedSpecification,
        profile: profile.slug,
        sections: profile.sections?.length || 8,
        jurisdiction: interviewResult.jurisdiction || 'US',
        status: 'READY_TO_ASSEMBLE',
        filing_package: draftFiling
      }
      return {
        action: 'DRAFT',
        document_family: 'national-phase-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: interviewResult.jurisdiction || 'US',
        session: interviewResult.session,
        facts: interviewResult.facts,
        child_workflows: interviewResult.child_workflows || {}
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'national-phase-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || [],
        jurisdiction: interviewResult.jurisdiction
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'national-phase-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: interviewResult.jurisdiction || 'UNKNOWN',
      child_workflows: interviewResult.child_workflows || {}
    }
  }

  // Canonical Document #008: European Patent Application interview graph
  if (profile.slug === 'european-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateEpInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: interviewResult.document_family || 'european-patent-application',
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session,
        jurisdiction: interviewResult.jurisdiction || 'EP'
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const draftFiling = assembleEpSpecification(interviewResult.facts, session.sections || {})
      const draftPlan = {
        content: draftFiling.specification,
        profile: profile.slug,
        sections: profile.sections?.length || 8,
        jurisdiction: 'EP',
        status: 'READY_TO_ASSEMBLE',
        claims: draftFiling.claims,
        claimSupportMap: draftFiling.claimSupportMap
      }
      return {
        action: 'DRAFT',
        document_family: 'european-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'EP',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'european-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || [],
        jurisdiction: 'EP'
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'european-patent-application',
      profile,
      question: interviewResult.single_question,
      single_question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'EP'
    }
  }

  // Canonical Document #011: Patent Abstract interview graph
  if (profile.slug === 'patent-abstract') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluatePatentAbstractInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext,
      attachments: matterContext.attachments || []
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: interviewResult.document_family,
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const abstractDraft = interviewResult.draft || {}
      const jurisdiction = abstractDraft.jurisdiction
        || interviewResult.session?.facts?.jurisdiction_context
        || detectedJurisdiction
        || 'UNDECIDED'
      const draftPlan = {
        content: abstractDraft.abstractText || '',
        profile: profile.slug,
        sections: profile.sections?.length || 4,
        jurisdiction,
        status: 'READY_TO_ASSEMBLE',
        abstract: abstractDraft
      }
      return {
        action: 'DRAFT',
        document_family: 'patent-abstract',
        profile,
        draft_plan: draftPlan,
        jurisdiction,
        session: interviewResult.session,
        facts: interviewResult.facts || interviewResult.session?.facts || {}
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'patent-abstract',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || [],
        jurisdiction: interviewResult.session?.facts?.jurisdiction_context || detectedJurisdiction || 'UNDECIDED'
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-abstract',
      profile,
      question: interviewResult.single_question,
      single_question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: interviewResult.session?.facts?.jurisdiction_context || detectedJurisdiction || 'UNDECIDED'
    }
  }

// Canonical Document #013: Invention Disclosure Form interview graph
  if (profile.slug === 'invention-disclosure-form') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateInventionDisclosureInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext,
      attachments: matterContext.attachments || []
    })

    if (interviewResult.action === 'DRAFT') {
      const disclosureDoc = assembleInventionDisclosure(interviewResult.facts, session.sections || {}, session.locks || {})
      const draftPlan = {
        content: disclosureDoc.specification,
        profile: profile.slug,
        sections: 30,
        jurisdiction: 'MULTI_JURISDICTION',
        status: 'READY_TO_ASSEMBLE',
        factGraph: disclosureDoc.factGraph
      }
      return {
        action: 'DRAFT',
        document_family: 'invention-disclosure-form',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'MULTI_JURISDICTION',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'invention-disclosure-form',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || [],
        jurisdiction: 'MULTI_JURISDICTION'
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'invention-disclosure-form',
      profile,
      question: interviewResult.single_question,
      single_question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      message: interviewResult.message,
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'MULTI_JURISDICTION'
    }
  }

  // Canonical Document #009: Patent Specification interview graph
  if (profile.slug === 'patent-specification') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluatePatentSpecificationInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext,
      attachments: matterContext.attachments || []
    })

    if (interviewResult.action === 'CLARIFICATION_REQUIRED') {
      return {
        action: 'CLARIFICATION_REQUIRED',
        document_family: 'patent-specification',
        profile,
        message: interviewResult.message,
        flags: interviewResult.flags || [],
        session: interviewResult.session
      }
    }

    if (interviewResult.action === 'DRAFT') {
      const specDraft = assemblePatentSpecification(interviewResult.facts, session.sections || {}, session.locks || {})
      const draftPlan = {
        content: specDraft.specification,
        profile: profile.slug,
        sections: profile.sections?.length || 11,
        jurisdiction: interviewResult.jurisdiction || 'UNDECIDED',
        status: 'READY_TO_ASSEMBLE',
        claimSupportMap: specDraft.claimSupportMap,
        terminologyModel: specDraft.terminologyModel,
        figureRegistry: specDraft.figureRegistry,
        basisMap: specDraft.basisMap
      }
      return {
        action: 'DRAFT',
        document_family: 'patent-specification',
        profile,
        draft_plan: draftPlan,
        jurisdiction: interviewResult.jurisdiction || 'UNDECIDED',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'patent-specification',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || [],
        jurisdiction: interviewResult.session?.facts?.jurisdiction_context || 'UNDECIDED'
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'patent-specification',
      profile,
      question: interviewResult.single_question,
      single_question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      message: interviewResult.message,
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: interviewResult.session?.facts?.jurisdiction_context || 'UNDECIDED'
    }
  }

  // Canonical Document #001: Utility Patent Application interview graph
  if (profile.slug === 'utility-patent-application' || profile.slug === 'patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluatePatentInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'DRAFT') {
      const draftPlan = assembleDocument(profile, interviewResult.facts, detectedJurisdiction || 'US')
      return {
        action: 'DRAFT',
        document_family: 'utility-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'US',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'utility-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'utility-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'US'
    }
  }

  // Canonical Document #004: Design Patent Application interview graph
  if (profile.slug === 'design-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateDesignPatentInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'DRAFT') {
      const draftContent = assembleDesignPatentSpecification(interviewResult.facts, session.sections || {})
      const draftPlan = {
        content: draftContent.content,
        sections: draftContent.sections,
        profile: profile.slug,
        sections_count: profile.sections?.length || 6,
        jurisdiction: 'US',
        status: 'READY_TO_ASSEMBLE',
        claim: draftContent.sections.claim,
        cfr_references: draftContent.cfr_references,
      }
      return {
        action: 'DRAFT',
        document_family: 'design-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'US',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'design-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'design-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'US'
    }
  }

  // Canonical Document #003: Non-Provisional Patent Application interview graph
  // Uses the same patent interview graph as utility-patent-application but with explicit
  // non-provisional filing path tracking, provisional conversion, and new matter awareness
  if (profile.slug === 'non-provisional-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluatePatentInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'DRAFT') {
      const draftPlan = assembleDocument(profile, interviewResult.facts, detectedJurisdiction || 'US')
      return {
        action: 'DRAFT',
        document_family: 'non-provisional-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'US',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'non-provisional-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'non-provisional-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'US'
    }
  }

  // Canonical Document #002: Provisional Patent Application interview graph
  if (profile.slug === 'provisional-patent-application') {
    const session = matterContext.draftSession || matterContext.session || {}
    const interviewResult = evaluateProvisionalInterviewStep({
      session,
      messages: matterContext.messages || [],
      latestMessage: userInput,
      matterContext
    })

    if (interviewResult.action === 'DRAFT') {
      const draftPlan = assembleDocument(profile, interviewResult.facts, detectedJurisdiction || 'US')
      return {
        action: 'DRAFT',
        document_family: 'provisional-patent-application',
        profile,
        draft_plan: draftPlan,
        jurisdiction: 'US',
        session: interviewResult.session,
        facts: interviewResult.facts
      }
    }

    if (interviewResult.action === 'PROMPT_DRAFT_CONFIRMATION') {
      return {
        action: 'PROMPT_DRAFT_CONFIRMATION',
        document_family: 'provisional-patent-application',
        profile,
        message: interviewResult.message,
        readiness: interviewResult.readiness,
        session: interviewResult.session,
        facts: interviewResult.session?.facts || {},
        flags: interviewResult.session?.flags || []
      }
    }

    return {
      action: 'ASK_QUESTION',
      document_family: 'provisional-patent-application',
      profile,
      question: interviewResult.single_question,
      questions: [interviewResult.single_question], // Strictly ONE question at a time
      drafting_status: interviewResult.drafting_status,
      readiness: interviewResult.readiness,
      session: interviewResult.session,
      known_facts: interviewResult.session?.facts || {},
      jurisdiction: 'US'
    }
  }

  const preDraftQuestions = await generatePreDraftQuestions(profile, matterContext)
  const requiredQuestions = preDraftQuestions.filter(q => q.required)
  const answeredQuestions = detectAnswersFromMatter(matterContext, profile)
  const remainingQuestions = requiredQuestions.filter(q => !answeredQuestions[q.input_field_id])

  if (remainingQuestions.length > 0) {
    return {
      action: 'ASK_QUESTIONS',
      document_family: documentFamily,
      profile,
      questions: remainingQuestions.slice(0, 1),
      known_facts: answeredQuestions,
      jurisdiction: detectedJurisdiction || matterContext.jurisdiction?.['0'] || null
    }
  }

  const draftPlan = assembleDocument(profile, answeredQuestions, detectedJurisdiction || 'US')
  return {
    action: 'DRAFT',
    document_family: documentFamily,
    profile,
    draft_plan: draftPlan,
    jurisdiction: detectedJurisdiction || matterContext.jurisdiction?.['0'] || 'US'
  }
}

function detectAnswersFromMatter(matterContext, profile) {
  const answers = {}
  if (!matterContext || !matterContext.matter) return answers

  const matter = matterContext.matter
  const facts = matterContext.facts || []
  const entities = matterContext.entities || []

  if (matter.client_name) answers.party_a = matter.client_name
  if (matter.jurisdictions && matter.jurisdictions.length) answers.governing_law = matter.jurisdictions['0']

  for (const fact of facts) {
    const factMap = {
      'counterparty': 'party_b',
      'jurisdiction': 'governing_law',
      'purpose': 'purpose',
      'effective_date': 'effective_date'
    }
    if (factMap[fact.fact_type]) {
      answers[factMap[fact.fact_type]] = fact.value?.label || fact.value || null
    }
  }

  for (const entity of entities) {
    if (entity.entity_type === 'party' && !answers.party_b) {
      answers.party_b = entity.name
    }
  }

  return answers
}

export function buildDocumentSearchResults(query, catalogue) {
  const results = []
  const lowerQuery = query.toLowerCase().trim()

  for (const [slug, profile] of catalogue.profiles) {
    const nameMatch = profile.name.toLowerCase().includes(lowerQuery)
    const aliasMatch = (profile.aliases || []).some(a => a.toLowerCase().includes(lowerQuery))
    const descriptionMatch = (profile.description || '').toLowerCase().includes(lowerQuery)
    const slugMatch = slug.includes(lowerQuery.replace(/\s/g, '-'))

    if (nameMatch || aliasMatch || descriptionMatch || slugMatch) {
      results.push({
        slug: profile.slug,
        name: profile.name,
        category: profile.category,
        subcategory: profile.subcategory,
        match_type: nameMatch ? 'exact' : aliasMatch ? 'alias' : 'partial',
        aliases: profile.aliases || []
      })
    }
  }

  results.sort((a, b) => (b.match_type === 'exact' ? 1 : 0) - (a.match_type === 'exact' ? 1 : 0))
  return results.slice(0, 10)
}

export function buildDocumentTree(catalogue) {
  const tree = {}
  const categories = catalogue.categories || []

  for (const category of categories) {
    tree[category.id] = {
      name: category.name,
      icon: category.icon,
      subcategories: {}
    }
    for (const subcategoryId of category.subcategories || []) {
      const subcategory = catalogue.subcategories?.find(s => s.id === subcategoryId)
      if (!subcategory) continue
      tree[category.id].subcategories[subcategoryId] = {
        name: subcategory.name,
        document_families: {}
      }
      for (const familyId of subcategory.document_families || []) {
        const family = catalogue.document_families?.find(f => f.id === familyId)
        if (!family) continue
        tree[category.id].subcategories[subcategoryId].document_families[familyId] = {
          name: family.name,
          document_types: {}
        }
        for (const typeId of family.document_types || []) {
          const type = catalogue.types?.find(t => t.id === typeId)
          if (type) {
            tree[category.id].subcategories[subcategoryId].document_families[familyId].document_types[typeId] = type
          }
        }
      }
    }
  }
  return tree
}

export async function validateDocumentRequest(request) {
  const errors = []
  if (!request.document_family) errors.push('document_family is required')
  if (!request.action) errors.push('action is required')
  if (request.action === 'DRAFT' && !request.profile) errors.push('profile is required for drafting')
  if (request.jurisdiction && !resolveJurisdiction(request.jurisdiction)) errors.push('invalid jurisdiction')
  return { valid: errors.length === 0, errors }
}










