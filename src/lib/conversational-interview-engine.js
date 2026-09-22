/**
 * SALLYIP CONVERSATIONAL LEGAL DOCUMENT INTERVIEW ENGINE
 * Reusable ChatGPT-style one-question-at-a-time drafting interview system.
 * 
 * Enforces:
 * 1. Matter-aware & source-aware fact resolution before asking.
 * 2. Strict ONE-QUESTION-AT-A-TIME turn-taking (Acknowledge -> Context -> Ask -> WAIT).
 * 3. Multi-fact voluntary extraction from user answers.
 * 4. User corrections with audit trail preservation.
 * 5. Skip / "I don't know" handling without circular loops.
 * 6. Format validation and helpful re-prompting.
 * 7. Source conflict detection (SOURCE_USER_CONFLICT).
 * 8. Hard gate: USER_REQUESTED_DRAFT != SYSTEM_READY_TO_DRAFT.
 * 9. Substantive drafting blocked until underlying source disclosure is available.
 * 10. Zero technical, bibliographic, fee, or formality fabrication.
 */

export const FACT_STATUSES = {
  KNOWN: 'KNOWN',
  USER_ASSERTED: 'USER_ASSERTED',
  SOURCE_VERIFIED: 'SOURCE_VERIFIED',
  INFERRED_REVIEW_REQUIRED: 'INFERRED_REVIEW_REQUIRED',
  UNKNOWN: 'UNKNOWN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
};

export const SOURCE_TYPES = {
  USER: 'USER',
  MATTER_CONTEXT: 'MATTER_CONTEXT',
  UPLOADED_DOCUMENT: 'UPLOADED_DOCUMENT',
  OFFICIAL_SOURCE: 'OFFICIAL_SOURCE',
  VERIFIED_DATABASE: 'VERIFIED_DATABASE',
  PRIOR_SALLY_WORKFLOW: 'PRIOR_SALLY_WORKFLOW',
  EXTERNAL_RESEARCH: 'EXTERNAL_RESEARCH',
  MODEL_INFERENCE: 'MODEL_INFERENCE',
};

export const QUESTION_STATES = {
  INTERVIEW_NOT_STARTED: 'INTERVIEW_NOT_STARTED',
  INTERVIEW_IN_PROGRESS: 'INTERVIEW_IN_PROGRESS',
  WAITING_FOR_USER: 'WAITING_FOR_USER',
  ANSWER_RECEIVED: 'ANSWER_RECEIVED',
  ANSWER_VALIDATING: 'ANSWER_VALIDATING',
  ANSWER_RECORDED: 'ANSWER_RECORDED',
  SOURCE_LOOKUP_PENDING: 'SOURCE_LOOKUP_PENDING',
  SOURCE_VERIFICATION_PENDING: 'SOURCE_VERIFICATION_PENDING',
  NEXT_QUESTION_PENDING: 'NEXT_QUESTION_PENDING',
  MINIMUM_FACTS_INCOMPLETE: 'MINIMUM_FACTS_INCOMPLETE',
  SOURCE_GATES_INCOMPLETE: 'SOURCE_GATES_INCOMPLETE',
  LEGAL_GATES_INCOMPLETE: 'LEGAL_GATES_INCOMPLETE',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  READY_TO_DRAFT: 'READY_TO_DRAFT',
  DRAFTING: 'DRAFTING',
  DRAFT_COMPLETE: 'DRAFT_COMPLETE',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
};

/**
 * Normalizes jurisdiction codes for patent and legal filings.
 */
export function normalizeJurisdiction(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return 'UNKNOWN';
  // Strip PCT number formats first to ensure a receiving office (e.g. PCT/US...) is NEVER treated as target jurisdiction
  const textNoPct = raw.replace(/\bPCT\/[A-Z]{2}\d{4}\/\d{4,7}\b/gi, '')
                       .replace(/\bPCT\s*[\/\-]?\s*[A-Z]{2}\s*\d{4}\s*[\/\-]?\s*\d{4,7}\b/gi, '').trim();
  if (!textNoPct) return 'UNKNOWN';

  // Specific explicit jurisdiction names & statutory citations (case-insensitive)
  if (/\b(?:USPTO|UNITED STATES|35\s*U\.?S\.?C\.?\s*§?\s*371|US NATIONAL STAGE|US NATIONAL PHASE)\b/i.test(textNoPct)) return 'US';
  if (/\b(?:EPO|EUROPEAN PATENT OFFICE|RULE 159(?:\s*EPC)?|EP REGIONAL PHASE|EP NATIONAL PHASE)\b/i.test(textNoPct)) return 'EPO';
  if (/\b(?:UKIPO|UNITED KINGDOM|GREAT BRITAIN)\b/i.test(textNoPct)) return 'UK';
  if (/\b(?:INDIA|INDIAN PATENT OFFICE|IPINDIA)\b/i.test(textNoPct)) return 'IN';
  if (/\b(?:CANADA|CIPO|CANADIAN PATENT OFFICE)\b/i.test(textNoPct)) return 'CA';
  if (/\b(?:AUSTRALIA|IP AUSTRALIA)\b/i.test(textNoPct)) return 'AU';
  if (/\b(?:JAPAN|JPO)\b/i.test(textNoPct)) return 'JP';
  if (/\b(?:CHINA|CNIPA)\b/i.test(textNoPct)) return 'CN';

  // Standalone or bounded 2-letter codes:
  // MUST NOT match common English words like preposition "in" or pronoun "us" in sentences/titles
  if (/^(?:US|USA)$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*US\b/i.test(textNoPct)) return 'US';
  if (/^(?:EP|EPO)$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*EP\b/i.test(textNoPct)) return 'EPO';
  if (/^(?:UK|GB)$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*(?:UK|GB)\b/i.test(textNoPct)) return 'UK';
  if (/^IN$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*IN\b/i.test(textNoPct)) return 'IN';
  if (/^CA$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*CA\b/i.test(textNoPct)) return 'CA';
  if (/^AU$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*AU\b/i.test(textNoPct)) return 'AU';
  if (/^JP$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*JP\b/i.test(textNoPct)) return 'JP';
  if (/^CN$/i.test(textNoPct) || /\b(?:target(?: office)?|entering)\s*(?:is|:)?\s*CN\b/i.test(textNoPct)) return 'CN';

  return 'UNKNOWN';
}

/**
 * Format human-readable office label
 */
export function getOfficeDisplayName(code = '') {
  const c = normalizeJurisdiction(code);
  switch (c) {
    case 'US': return 'United States Patent and Trademark Office (USPTO)';
    case 'EPO': return 'European Patent Office (EPO)';
    case 'UK': return 'United Kingdom Intellectual Property Office (UKIPO)';
    case 'IN': return 'Indian Patent Office (IPO)';
    case 'CA': return 'Canadian Intellectual Property Office (CIPO)';
    case 'AU': return 'IP Australia';
    case 'JP': return 'Japan Patent Office (JPO)';
    case 'CN': return 'China National Intellectual Property Administration (CNIPA)';
    default: return code;
  }
}

/**
 * Dynamic office terminology and statutory pathways for national/regional phase entries.
 * Adapts across USPTO, EPO, UKIPO, India, Canada, Australia, Japan, China, etc.
 */
export function getOfficeFilingTerminology(jurisdictionCode = '') {
  const code = normalizeJurisdiction(jurisdictionCode);
  switch (code) {
    case 'US':
      return {
        officeCode: 'US',
        officeName: 'United States Patent and Trademark Office (USPTO)',
        routeLabel: 'U.S. national-stage route under 35 U.S.C. § 371 rather than treating the filing as a § 111(a) application',
        filingPhrase: 'U.S. national-stage application',
        stageLabel: 'U.S. national stage',
        amendmentBasis: 'preliminary amendment under 37 CFR 1.121',
        statutoryDeadline: '30 months from earliest priority date pursuant to 37 CFR 1.495(a) and PCT Article 22/39(1)',
        statutoryAuthority: '35 U.S.C. § 371 / 37 CFR §§ 1.495—“1.497'
      };
    case 'EPO':
      return {
        officeCode: 'EPO',
        officeName: 'European Patent Office (EPO)',
        routeLabel: 'European regional-phase entry route under Rule 159 EPC',
        filingPhrase: 'European regional-phase application',
        stageLabel: 'European regional phase',
        amendmentBasis: 'amendments under Rule 159(1)(b) EPC / Article 19/34 PCT',
        statutoryDeadline: '31 months from earliest priority date pursuant to Rule 159(1) EPC',
        statutoryAuthority: 'Rule 159 EPC / Articles 153 & 78 EPC'
      };
    case 'UK':
      return {
        officeCode: 'UK',
        officeName: 'United Kingdom Intellectual Property Office (UKIPO)',
        routeLabel: 'UK national-phase route under Section 89A Patents Act 1977',
        filingPhrase: 'UK national-phase application',
        stageLabel: 'UK national phase',
        amendmentBasis: 'preliminary amendment under UK Patents Rules',
        statutoryDeadline: '31 months from earliest priority date pursuant to Section 89A Patents Act 1977',
        statutoryAuthority: 'Section 89A Patents Act 1977'
      };
    case 'IN':
      return {
        officeCode: 'IN',
        officeName: 'Indian Patent Office (IPO)',
        routeLabel: 'Indian national-phase route under Section 138 of the Indian Patents Act',
        filingPhrase: 'Indian national-phase application',
        stageLabel: 'Indian national phase',
        amendmentBasis: 'national-phase amendments under Section 57/59 of the Indian Patents Act',
        statutoryDeadline: '31 months from earliest priority date pursuant to Rule 20 of Indian Patent Rules',
        statutoryAuthority: 'Section 138 Indian Patents Act 1970'
      };
    case 'CA':
      return {
        officeCode: 'CA',
        officeName: 'Canadian Intellectual Property Office (CIPO)',
        routeLabel: 'Canadian national-phase route under Section 58 of the Patent Rules',
        filingPhrase: 'Canadian national-phase application',
        stageLabel: 'Canadian national phase',
        amendmentBasis: 'preliminary amendment under Canadian Patent Rules',
        statutoryDeadline: '30 months (or 42 months with late fee) from earliest priority date',
        statutoryAuthority: 'Section 58 Canadian Patent Rules'
      };
    case 'AU':
      return {
        officeCode: 'AU',
        officeName: 'IP Australia',
        routeLabel: 'Australian national-phase route under Section 89 of the Patents Act 1990',
        filingPhrase: 'Australian national-phase application',
        stageLabel: 'Australian national phase',
        amendmentBasis: 'preliminary amendment under Regulation 8.3 of Patents Regulations',
        statutoryDeadline: '31 months from earliest priority date pursuant to Regulation 8.3',
        statutoryAuthority: 'Section 89 Australian Patents Act 1990'
      };
    case 'JP':
      return {
        officeCode: 'JP',
        officeName: 'Japan Patent Office (JPO)',
        routeLabel: 'Japanese national-phase route under Article 184ter of the Japan Patent Act',
        filingPhrase: 'Japanese national-phase application',
        stageLabel: 'Japanese national phase',
        amendmentBasis: 'preliminary amendment under Article 184septies of Japan Patent Act',
        statutoryDeadline: '30 months from earliest priority date pursuant to Article 184ter',
        statutoryAuthority: 'Article 184ter Japan Patent Act'
      };
    case 'CN':
      return {
        officeCode: 'CN',
        officeName: 'China National Intellectual Property Administration (CNIPA)',
        routeLabel: 'Chinese national-phase route under Article 103 of the Patent Law Implementing Regulations',
        filingPhrase: 'Chinese national-phase application',
        stageLabel: 'Chinese national phase',
        amendmentBasis: 'preliminary amendment under Article 106 of Patent Law Implementing Regulations',
        statutoryDeadline: '30 months (or 32 months with surcharge) from earliest priority date',
        statutoryAuthority: 'Article 103 CNIPA Patent Law Implementing Regulations'
      };
    default:
      return {
        officeCode: code || 'UNKNOWN',
        officeName: code ? `${code} Designated Patent Office` : 'Designated Patent Office',
        routeLabel: `national-phase entry route before the designated office under PCT Article 22/39(1)`,
        filingPhrase: `${code || 'national'}-phase application`,
        stageLabel: `${code || 'designated'} national phase`,
        amendmentBasis: 'preliminary amendment under local patent rules',
        statutoryDeadline: 'statutory deadline under PCT Article 22/39(1)',
        statutoryAuthority: 'PCT Articles 22/39(1) / Local Patent Law'
      };
  }
}

/**
 * Canonical Document Profiles for the Interview Engine.
 */
export const DOCUMENT_INTERVIEW_PROFILES = {
  'national-phase-patent-application': {
    document_id: 'national-phase-patent-application',
    document_number: '007',
    name: 'National Phase Patent Application',
    statutoryBasis: 'PCT Articles 22/39(1) / 35 U.S.C. § 371 / Rule 159 EPC',
    welcomeMessage: 'I can prepare the National Phase Patent Application based on the existing PCT application and the requirements of the target national or regional office.',
    questions: [
      {
        question_id: 'pct_number',
        field: 'pct_number',
        label: 'PCT International Application Number',
        question: 'Please provide the PCT International Application Number.',
        required: true,
        blocking: true,
        source_first: false,
        validation: (val) => {
          const s = String(val || '').trim().replace(/\s+/g, '').toUpperCase();
          const regex = /^PCT\/[A-Z]{2}\d{4}\/\d{4,7}$/i;
          if (!regex.test(s)) {
            return {
              valid: false,
              message: "That doesn't appear to be a PCT international application number.\n\nPlease provide the number in a format such as PCT/US2023/012345."
            };
          }
          return { valid: true, sanitized: s };
        },
        acknowledge: (val) => `✓ Recorded: PCT International Application Number: ${val}.`
      },
      {
        question_id: 'target_jurisdiction',
        field: 'target_jurisdiction',
        label: 'Target Office',
        question: 'What is the target national or regional office for this national-phase entry?',
        dependencies: ['pct_number'],
        required: true,
        blocking: true,
        source_first: false,
        contextNote: (facts) => {
          const jur = facts.target_jurisdiction?.value;
          const term = getOfficeFilingTerminology(jur);
          return term.routeLabel ? `For this matter, Sally will use the ${term.routeLabel}.` : null;
        },
        validation: (val) => {
          const jur = normalizeJurisdiction(val);
          if (jur === 'UNKNOWN' || !jur) {
            return {
              valid: false,
              message: 'Please specify a target patent office (for example: USPTO, EPO, UKIPO, India, Canada, or Australia).'
            };
          }
          return { valid: true, sanitized: jur };
        },
        acknowledge: (val) => `✓ Recorded: Target Office — ${getOfficeDisplayName(val)}.`
      },
      {
        question_id: 'title',
        field: 'title',
        label: 'Title of Invention',
        question: 'What is the title of the invention?',
        dependencies: ['target_jurisdiction'],
        required: true,
        blocking: true,
        source_first: true,
        retrieval_strategy: 'PCT_RECORD',
        validation: (val) => {
          const s = String(val || '').trim();
          if (s.length < 2) return { valid: false, message: 'Please provide the title of the invention.' };
          return { valid: true, sanitized: s };
        },
        acknowledge: (val) => `✓ Recorded: Title of Invention — ${val}.`
      },
      {
        question_id: 'inventors',
        field: 'inventors',
        label: 'Inventor(s)',
        question: (facts) => {
          const jur = facts.target_jurisdiction?.value;
          const term = getOfficeFilingTerminology(jur);
          return `Next, please provide the inventor name(s) exactly as they should appear in the ${term.filingPhrase}.`;
        },
        dependencies: ['title'],
        required: true,
        blocking: true,
        source_first: true,
        retrieval_strategy: 'PCT_RECORD',
        validation: (val) => {
          const s = String(val || '').trim();
          if (s.length < 2) return { valid: false, message: 'Please provide the inventor name(s).' };
          return { valid: true, sanitized: s };
        },
        acknowledge: (val) => `✓ Recorded: Inventor — ${val}.`
      },
      {
        question_id: 'applicants',
        field: 'applicants',
        label: 'Applicant',
        question: (facts) => {
          const jur = facts.target_jurisdiction?.value;
          const term = getOfficeFilingTerminology(jur);
          return `Who is the applicant for the ${term.filingPhrase}?`;
        },
        dependencies: ['inventors'],
        required: true,
        blocking: true,
        source_first: true,
        retrieval_strategy: 'PCT_RECORD',
        validation: (val) => {
          const s = String(val || '').trim();
          if (s.length < 2) return { valid: false, message: 'Please provide the applicant name.' };
          return { valid: true, sanitized: s };
        },
        acknowledge: (val) => `✓ Recorded: Applicant — ${val}.`
      },
      {
        question_id: 'wo_number',
        field: 'wo_number',
        label: 'International Publication / Disclosure',
        question: (facts) => {
          const jur = facts?.target_jurisdiction?.value;
          const term = getOfficeFilingTerminology(jur);
          const pkgName = jur && jur !== 'US' ? `${term.filingPhrase} package` : 'national-stage package';
          return `To prepare the ${pkgName} without introducing unsupported subject matter, I need the underlying international application/publication.\n\nPlease provide the WO publication number (e.g. WO 2023/135791) or upload the published PCT application.`;
        },
        dependencies: ['applicants'],
        required: true,
        blocking: true,
        source_first: true,
        retrieval_strategy: 'PCT_PUBLICATION',
        validation: (val) => {
          const clean = String(val || '').trim();
          const match = clean.match(/\bWO\s*(20\d{2}[\/\-]\d{4,7}(?:\s*[A-Z][0-9]?)?)\b/i);
          if (match) return { valid: true, sanitized: match[0].toUpperCase().replace(/\s+/g, ' ') };
          return { valid: true, sanitized: clean };
        },
        acknowledge: (val) => `✓ Recorded: International Publication — ${val}.`
      },
      {
        question_id: 'operative_claims_basis',
        field: 'operative_claims_basis',
        label: 'Operative Claim Set / Amendments',
        question: (facts) => {
          const jur = facts?.target_jurisdiction?.value;
          const term = getOfficeFilingTerminology(jur);
          const amendPhrase = jur === 'EPO' ? 'file amendments under Rule 159(1)(b) EPC / Article 19/34 PCT' : 'prepare a preliminary amendment';
          return `Would you like to enter the ${term.stageLabel} using the claims as published, or do you want to ${amendPhrase}?`;
        },
        dependencies: ['wo_number'],
        required: true,
        blocking: true,
        source_first: false,
        validation: (val) => {
          const s = String(val || '').trim();
          if (/as published|as filed|no amendments?|without amendments?|art(?:icle)?\s*21/i.test(s)) {
            return { valid: true, sanitized: 'PCT Claims as Published (Article 21 PCT)' };
          }
          if (/amendment|preliminary amendment|art(?:icle)?\s*19|art(?:icle)?\s*34/i.test(s)) {
            return { valid: true, sanitized: 'Preliminary Amendment / Amended Claims' };
          }
          return { valid: true, sanitized: s };
        },
        acknowledge: (val) => `✓ Recorded: Operative Claim Basis — ${val}.`
      }
    ],
    readinessCheck: (facts) => {
      const hasPct = Boolean(facts.pct_number?.value && facts.pct_number.value !== 'UNKNOWN');
      const hasJur = Boolean(facts.target_jurisdiction?.value && facts.target_jurisdiction.value !== 'UNKNOWN');
      const hasTitle = Boolean(facts.title?.value && facts.title.value !== 'UNKNOWN');
      const hasInventors = Boolean(facts.inventors?.value && facts.inventors.value !== 'UNKNOWN');
      const hasApplicants = Boolean(facts.applicants?.value && facts.applicants.value !== 'UNKNOWN');
      const hasDisclosure = Boolean((facts.wo_number?.value && facts.wo_number.value !== 'UNKNOWN') || facts.pct_disclosure?.value);
      const hasClaimsBasis = Boolean(facts.operative_claims_basis?.value);

      return hasPct && hasJur && hasTitle && hasInventors && hasApplicants && hasDisclosure && hasClaimsBasis;
    }
  }
};

/**
 * Creates an empty, isolated interview session for a document.
 */
export function createInterviewSession(documentId, matterContext = {}, sessionId = null) {
  const session = {
    sessionId: sessionId || `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    documentId,
    state: QUESTION_STATES.INTERVIEW_NOT_STARTED,
    facts: {},
    askedQuestionIds: [],
    lastAskedQuestionId: null,
    auditTrail: [],
    conflicts: [],
    userRequestedDraft: false,
    readyToDraft: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (matterContext && typeof matterContext === 'object') {
    const matter = matterContext.matter || matterContext;
    if (matter.pct_number || matter.pct_application_number) {
      setFactInSession(session, 'pct_number', matter.pct_number || matter.pct_application_number, {
        sourceType: SOURCE_TYPES.MATTER_CONTEXT,
        status: FACT_STATUSES.KNOWN
      });
    }
    if (matter.target_jurisdiction || matter.jurisdiction) {
      setFactInSession(session, 'target_jurisdiction', normalizeJurisdiction(matter.target_jurisdiction || matter.jurisdiction), {
        sourceType: SOURCE_TYPES.MATTER_CONTEXT,
        status: FACT_STATUSES.KNOWN
      });
    }
    if (matter.title) {
      setFactInSession(session, 'title', matter.title, {
        sourceType: SOURCE_TYPES.MATTER_CONTEXT,
        status: FACT_STATUSES.KNOWN
      });
    }
    if (matter.inventor_names || matter.inventors) {
      const inv = Array.isArray(matter.inventor_names || matter.inventors)
        ? (matter.inventor_names || matter.inventors).join(', ')
        : String(matter.inventor_names || matter.inventors);
      setFactInSession(session, 'inventors', inv, {
        sourceType: SOURCE_TYPES.MATTER_CONTEXT,
        status: FACT_STATUSES.KNOWN
      });
    }
    if (matter.applicant_name || matter.applicant || matter.client_name) {
      setFactInSession(session, 'applicants', matter.applicant_name || matter.applicant || matter.client_name, {
        sourceType: SOURCE_TYPES.MATTER_CONTEXT,
        status: FACT_STATUSES.KNOWN
      });
    }
  }

  return session;
}

/**
 * Sets a fact in the session with provenance and audit trail.
 */
export function setFactInSession(session, field, value, options = {}) {
  const existing = session.facts[field];
  const oldValue = existing ? existing.value : null;

  if (oldValue !== null && oldValue !== value) {
    session.auditTrail.push({
      field,
      oldValue,
      newValue: value,
      reason: options.reason || 'VALUE_UPDATED',
      timestamp: new Date().toISOString()
    });
  }

  session.facts[field] = {
    fact_id: `fact_${field}_${Date.now()}`,
    field,
    value,
    status: options.status || FACT_STATUSES.USER_ASSERTED,
    source_type: options.sourceType || SOURCE_TYPES.USER,
    verification_status: options.verificationStatus || 'UNVERIFIED',
    captured_at: existing ? existing.captured_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confidence: options.confidence || 1.0,
    metadata: options.metadata || {}
  };

  session.updatedAt = new Date().toISOString();
  return session.facts[field];
}

/**
 * Checks if a string contains commands to force draft early.
 */
export function isForceDraftCommand(text = '') {
  const clean = String(text || '').trim().toLowerCase();
  return /\b(draft it|draft now|just draft|draft everything|start drafting|finalize (?:and )?draft|proceed with drafting|generate (?:the )?draft|write (?:the )?draft|go ahead and draft|do it now)\b/i.test(clean);
}

/**
 * Checks if user is expressing skip or lack of knowledge.
 */
export function isSkipOrUnknown(text = '') {
  const clean = String(text || '').trim().toLowerCase();
  return /^(skip|i don'?t know|don'?t know|not sure|unknown|find it|can you check\??|leave blank|pass|idk)$/i.test(clean) ||
         /\b(skip this|don't know|not sure yet|unknown at this stage)\b/i.test(clean);
}

/**
 * Checks if user text indicates a correction of a previous fact.
 */
export function detectCorrection(text = '', session = {}) {
  const clean = String(text || '').trim();

  const fieldCorrectionMatch = clean.match(/(?:actually|correction|change|no,?)\s+(?:the\s+)?(applicant|inventor|title|office|pct number)\s+is\s+(.*)/i);
  if (fieldCorrectionMatch) {
    return {
      isCorrection: true,
      rawTarget: fieldCorrectionMatch[1].trim(),
      remainder: fieldCorrectionMatch[2].replace(/\.+$/, '').trim()
    };
  }

  const prefixMatch = clean.match(/^(?:actually|correction|change that to|instead of that|no it is|no it['’]?s|use)\s+(.*)/i);
  if (prefixMatch) {
    let remainder = prefixMatch[1].replace(/^(?:the\s+)?(?:applicant|inventor|title|office|pct number)\s+is\s+/i, '').replace(/\.+$/, '').trim();
    return {
      isCorrection: true,
      rawTarget: clean,
      remainder
    };
  }
  return { isCorrection: false };
}

/**
 * Multi-fact parser: extracts any explicitly stated facts voluntarily provided by user in a single turn.
 * Avoids picking up unrelated chat noise.
 */
export function parseVoluntaryFacts(text = '', expectedQuestionId = null, docProfile = null) {
  const clean = String(text || '').trim();
  const facts = {};

  // 1. PCT number
  const pctMatch = clean.match(/\bPCT\/[A-Z]{2}\d{4}\/\d{4,7}\b/i) ||
                   clean.match(/\bPCT\s*[\/\-]?\s*[A-Z]{2}\s*\d{4}\s*[\/\-]?\s*\d{4,7}\b/i);
  if (pctMatch) {
    facts.pct_number = pctMatch[0].replace(/\s+/g, '').toUpperCase();
  }

  // 2. Target Office (strip PCT number first so receiving office isn't confused with target office)
  const textNoPct = clean.replace(/\bPCT\/[A-Z]{2}\d{4}\/\d{4,7}\b/gi, '')
                         .replace(/\bPCT\s*[\/\-]?\s*[A-Z]{2}\s*\d{4}\s*[\/\-]?\s*\d{4,7}\b/gi, '');

  if (/\b(uspto|united states(?:\s+patent)?|35 u\.?s\.?c\.?\s*§?\s*371|us national stage|us national phase)\b/i.test(textNoPct) ||
      /\b(?:target(?: office| jurisdiction)?\s*(?:is|:)?\s*us\b|entering\s+(?:the\s+)?(?:us|united states)\b)/i.test(textNoPct)) {
    facts.target_jurisdiction = 'US';
  } else if (/\b(epo|european patent office|rule 159(?:\s*epc)?|ep regional phase|ep national phase)\b/i.test(textNoPct) ||
             /\b(?:target(?: office| jurisdiction)?\s*(?:is|:)?\s*epo\b|entering\s+(?:the\s+)?(?:epo|europe|ep)\b)/i.test(textNoPct)) {
    facts.target_jurisdiction = 'EPO';
  } else if (/\b(uk|ukipo|united kingdom|great britain)\b/i.test(textNoPct)) {
    facts.target_jurisdiction = 'UK';
  } else if (/\b(india|indian patent office|ipindia)\b/i.test(textNoPct)) {
    facts.target_jurisdiction = 'IN';
  } else if (/\b(canada|canadian patent office|cipo)\b/i.test(textNoPct)) {
    facts.target_jurisdiction = 'CA';
  } else if (/\b(australia|ip\s*australia)\b/i.test(textNoPct)) {
    facts.target_jurisdiction = 'AU';
  } else if (expectedQuestionId === 'target_jurisdiction') {
    const directJur = normalizeJurisdiction(textNoPct);
    if (directJur !== 'UNKNOWN') facts.target_jurisdiction = directJur;
  }

  // 3. Title extraction
  const titleMarker = clean.match(/(?:title(?: of the invention)?|called|named|invention(?:\s+is)?)\s*[:\-]?\s*["“']?([^"”'\n\.\;]{2,80})["”']?/i);
  if (titleMarker && !/^(this|the|my|our|an?)\s+invention$/i.test(titleMarker[1].trim())) {
    let titleVal = titleMarker[1].replace(/^(?:is|are)\s+/i, '').replace(/\.+$/, '').trim();
    titleVal = titleVal.split(/,\s*(?=(?:inventor|applicant|title|office|pct number|wo\b|priority|filing))/i)[0].trim();
    facts.title = titleVal;
  } else if (expectedQuestionId === 'title') {
    const firstClause = clean.split(/[.\n;]/)[0].replace(/^(?:the\s+)?title\s+(?:is\s+)?/i, '').replace(/\.+$/, '').trim();
    if (firstClause && !isForceDraftCommand(firstClause) && firstClause.length >= 2) {
      facts.title = firstClause;
    }
  }

  // 4. Inventor extraction
  const inventorMatch = clean.match(/(?:inventor(?:s)?|invented by|author)\s*(?:is|are)?\s*[:\-]?\s*["“']?([A-Za-z\s\.\,\&]{2,60})["”']?(?:\s+and\s+applicant|\.|\;|$)/i);
  if (inventorMatch) {
    facts.inventors = inventorMatch[1].replace(/\s+and\s+applicant.*/i, '').replace(/\.+$/, '').trim();
  } else if (expectedQuestionId === 'inventors') {
    const firstClause = clean.split(/[.\n;]/)[0].replace(/^(?:the\s+)?inventors?\s+(?:is|are\s+)?/i, '').replace(/\.+$/, '').trim();
    if (firstClause && !isForceDraftCommand(firstClause) && firstClause.length >= 2) {
      facts.inventors = firstClause;
    }
  }

  // 5. Applicant extraction
  const applicantMatch = clean.match(/(?:applicant(?:s)?|client|company)\s*(?:is|are)?\s*[:\-]?\s*["“']?([A-Za-z0-9\s\.\,\&'-]{2,60})["”']?(?:\s+and\s+address|\.|\;|$)/i);
  if (applicantMatch) {
    facts.applicants = applicantMatch[1].replace(/\s+and\s+address.*/i, '').replace(/\.+$/, '').trim();
  } else if (expectedQuestionId === 'applicants') {
    const firstClause = clean.split(/[.\n;]/)[0].replace(/^(?:the\s+)?applicants?\s+(?:is|are\s+)?/i, '').replace(/\.+$/, '').trim();
    if (firstClause && !isForceDraftCommand(firstClause) && firstClause.length >= 2) {
      facts.applicants = firstClause;
    }
  }

  // 6. WO Publication Number
  const woMatch = clean.match(/\bWO\s*(20\d{2}[\/\-]?\d{4,7}(?:\s*[A-Z][0-9]?)?)\b/i);
  if (woMatch) {
    facts.wo_number = woMatch[0].toUpperCase().replace(/\s+/g, ' ');
  }

  // 7. Operative claims / amendments posture
  if (/\b(as published|as filed|art(?:icle)?\.?\s*21|no amendments?|without amendments?)\b/i.test(clean)) {
    facts.operative_claims_basis = 'PCT Claims as Published (Article 21 PCT)';
  } else if (/\b(preliminary amendment|amended claims|art(?:icle)?\.?\s*19|art(?:icle)?\.?\s*34)\b/i.test(clean)) {
    facts.operative_claims_basis = 'Preliminary Amendment / Amended Claims';
  }

  return facts;
}

/**
 * Selects the next single best question from the DAG.
 * Returns null if all required questions are resolved.
 */
export function selectNextQuestion(session, docProfile) {
  if (!docProfile || !Array.isArray(docProfile.questions)) return null;

  for (const q of docProfile.questions) {
    const fact = session.facts[q.field];
    const isResolved = fact && fact.value !== undefined && fact.value !== null && fact.value !== 'UNKNOWN' && fact.status !== FACT_STATUSES.UNKNOWN;

    if (isResolved) continue;

    // Check dependencies
    if (Array.isArray(q.dependencies) && q.dependencies.length > 0) {
      const depsMet = q.dependencies.every(depField => {
        const depFact = session.facts[depField];
        return depFact && depFact.value && depFact.value !== 'UNKNOWN' && depFact.status !== FACT_STATUSES.UNKNOWN;
      });
      if (!depsMet) continue;
    }

    // Check dynamic condition if any
    if (typeof q.condition === 'function' && !q.condition(session.facts)) {
      continue;
    }

    return q;
  }

  return null;
}

/**
 * Attempts authoritative source retrieval if source records are available.
 */
export function attemptSourceRetrieval(session, sourceRecords = {}) {
  if (!sourceRecords || typeof sourceRecords !== 'object') return false;

  let retrievedAny = false;
  const mappings = [
    { field: 'title', srcKey: 'title' },
    { field: 'inventors', srcKey: 'inventors' },
    { field: 'applicants', srcKey: 'applicants' },
    { field: 'wo_number', srcKey: 'wo_number' },
    { field: 'international_filing_date', srcKey: 'international_filing_date' },
    { field: 'priority_date', srcKey: 'priority_date' },
  ];

  for (const map of mappings) {
    const val = sourceRecords[map.srcKey];
    if (val && !session.facts[map.field]) {
      const formatted = Array.isArray(val) ? val.map(v => typeof v === 'object' ? v.name : v).join(', ') : val;
      setFactInSession(session, map.field, formatted, {
        sourceType: SOURCE_TYPES.OFFICIAL_SOURCE,
        status: FACT_STATUSES.SOURCE_VERIFIED,
        verificationStatus: 'VERIFIED'
      });
      retrievedAny = true;
    }
  }

  return retrievedAny;
}

/**
 * Core turn processor for the Conversational Interview Engine.
 */
export function processInterviewTurn({
  session,
  userMessage = '',
  documentId = 'national-phase-patent-application',
  matterContext = {},
  sourceRecords = {}
}) {
  const profile = DOCUMENT_INTERVIEW_PROFILES[documentId];
  if (!profile) {
    throw new Error(`Unrecognized document interview profile: "${documentId}"`);
  }

  const cleanText = String(userMessage || '').trim();
  const isFirstTurn = !session.lastAskedQuestionId && session.askedQuestionIds.length === 0;

  // 1. Check for premature draft command
  const userWantsDraft = isForceDraftCommand(cleanText);
  if (userWantsDraft) {
    session.userRequestedDraft = true;
  }

  // 2. Handle First Turn Initial Greeting / Document Request
  if (isFirstTurn) {
    session.state = QUESTION_STATES.INTERVIEW_IN_PROGRESS;
    
    // Check if user voluntarily provided any facts in the opening message
    const initialFacts = parseVoluntaryFacts(cleanText, null, profile);
    for (const [f, v] of Object.entries(initialFacts)) {
      setFactInSession(session, f, v, { sourceType: SOURCE_TYPES.USER, status: FACT_STATUSES.USER_ASSERTED });
    }

    if (session.facts.pct_number) {
      attemptSourceRetrieval(session, sourceRecords);
    }

    const ready = profile.readinessCheck(session.facts);
    if (ready) {
      session.state = QUESTION_STATES.READY_TO_DRAFT;
      session.readyToDraft = true;
      return {
        session,
        readyToDraft: true,
        responseMarkdown: `I have all required verified details to prepare the **${profile.name}**.\n\nWould you like me to prepare the draft now?`,
        nextQuestion: null
      };
    }

    const nextQ = selectNextQuestion(session, profile);
    session.lastAskedQuestionId = nextQ ? nextQ.question_id : null;
    if (nextQ) session.askedQuestionIds.push(nextQ.question_id);

    const questionPrompt = typeof nextQ?.question === 'function' ? nextQ.question(session.facts) : nextQ?.question;
    const responseMarkdown = `${profile.welcomeMessage}\n\n${questionPrompt}`;

    return {
      session,
      readyToDraft: false,
      responseMarkdown,
      nextQuestion: nextQ
    };
  }

  // 3. Subsequent Turn: Answering the last asked question
  // 3pre. A bare force-draft command ("Just draft it now.") carries no answer facts:
  // it must NEVER be bound as the current answer. Fall through to readiness-gate handling.
  const bareDraftPreview = parseVoluntaryFacts(cleanText, session.lastAskedQuestionId, profile);
  const isBareDraftCommand = userWantsDraft && Object.keys(bareDraftPreview).length === 0;

  const currentQId = session.lastAskedQuestionId;
  const currentQ = profile.questions.find(q => q.question_id === currentQId);
  const acknowledgments = [];
  let contextNoteText = null;

  // 3a. Handle Skip / "I don't know"
  if (!isBareDraftCommand && isSkipOrUnknown(cleanText)) {
    if (currentQ) {
      if (currentQ.blocking) {
        if (currentQ.field === 'pct_number') {
          return {
            session,
            readyToDraft: false,
            responseMarkdown: `The PCT International Application Number is required to establish the international filing date and operative disclosure for national phase entry.\n\nPlease provide the number (e.g. PCT/US2023/012345).`,
            nextQuestion: currentQ
          };
        }
        if (currentQ.field === 'wo_number') {
          return {
            session,
            readyToDraft: false,
            responseMarkdown: `To prepare the national-stage package without introducing unsupported subject matter, I need the underlying international application disclosure.\n\nPlease provide the WO publication number (e.g. WO 2023/135791) or upload the published PCT application.`,
            nextQuestion: currentQ
          };
        }
      } else {
        setFactInSession(session, currentQ.field, 'DEFERRED', {
          status: FACT_STATUSES.NOT_APPLICABLE,
          reason: 'USER_SKIPPED'
        });
        acknowledgments.push(`✓ Skipped: ${currentQ.label}.`);
      }
    }
  } else if (!isBareDraftCommand) {
    // 3b. Check for Corrections — honour the NAMED field, not just the
    // currently-asked question (e.g. "Actually applicant is B Ltd.").
    const correction = detectCorrection(cleanText, session);
    if (correction.isCorrection) {
      const targetLower = String(correction.rawTarget || '').toLowerCase();
      let targetField = currentQ ? currentQ.field : null;
      let targetLabel = currentQ ? currentQ.label : targetField;
      if (/applicant/.test(targetLower)) { targetField = 'applicants'; targetLabel = 'Applicant'; }
      else if (/inventor/.test(targetLower)) { targetField = 'inventors'; targetLabel = 'Inventor'; }
      else if (/title/.test(targetLower)) { targetField = 'title'; targetLabel = 'Title of Invention'; }
      else if (/office|jurisdiction/.test(targetLower)) { targetField = 'target_jurisdiction'; targetLabel = 'Target Office'; }
      else if (/pct/.test(targetLower)) { targetField = 'pct_number'; targetLabel = 'PCT International Application Number'; }
      else if (/wo\b|publication/.test(targetLower)) { targetField = 'wo_number'; targetLabel = 'International Publication'; }
      const parsedVal = correction.remainder;
      setFactInSession(session, targetField, parsedVal, {
        sourceType: SOURCE_TYPES.USER,
        status: FACT_STATUSES.USER_ASSERTED,
        reason: 'USER_CORRECTION'
      });
      acknowledgments.push(`✓ Updated: ${targetLabel} — ${parsedVal}.`);
    } else {
      // 3c. Extract voluntary multi-facts
      const voluntaryFacts = parseVoluntaryFacts(cleanText, currentQId, profile);

      if (currentQ) {
        const val = voluntaryFacts[currentQ.field] !== undefined ? voluntaryFacts[currentQ.field] : cleanText;
        if (typeof currentQ.validation === 'function') {
          const valRes = currentQ.validation(val);
          if (!valRes.valid) {
            return {
              session,
              readyToDraft: false,
              responseMarkdown: valRes.message,
              nextQuestion: currentQ
            };
          }
          voluntaryFacts[currentQ.field] = valRes.sanitized !== undefined ? valRes.sanitized : val;
        }

        const officialVal = sourceRecords[currentQ.field];
        if (officialVal && String(officialVal).trim().toLowerCase() !== String(val).trim().toLowerCase()) {
          session.conflicts.push({
            field: currentQ.field,
            sourceValue: officialVal,
            userValue: val,
            detectedAt: new Date().toISOString()
          });
          const conflictPrompt = `The official PCT record lists the ${currentQ.label.toLowerCase()} as "${officialVal}", but you provided "${val}".\n\nWhich should be used for the national phase filing?`;
          return {
            session,
            readyToDraft: false,
            responseMarkdown: conflictPrompt,
            nextQuestion: currentQ
          };
        }
      }

      for (const [fieldKey, fieldVal] of Object.entries(voluntaryFacts)) {
        setFactInSession(session, fieldKey, fieldVal, {
          sourceType: SOURCE_TYPES.USER,
          status: FACT_STATUSES.USER_ASSERTED
        });
        const matchedDef = profile.questions.find(q => q.field === fieldKey);
        if (matchedDef) {
          acknowledgments.push(
            typeof matchedDef.acknowledge === 'function'
              ? matchedDef.acknowledge(fieldVal)
              : `✓ Recorded: ${matchedDef.label} — ${fieldVal}.`
          );
          if (typeof matchedDef.contextNote === 'function') {
            const note = matchedDef.contextNote(session.facts);
            if (note) contextNoteText = note;
          }
        } else {
          acknowledgments.push(`✓ Recorded: ${fieldKey} — ${fieldVal}.`);
        }
      }
    }
  }

  if (session.facts.pct_number && !session.facts.wo_number) {
    attemptSourceRetrieval(session, sourceRecords);
  }

  const isReady = profile.readinessCheck(session.facts);

  if (userWantsDraft && !isReady) {
    session.userRequestedDraft = true;
    const nextUnresolved = selectNextQuestion(session, profile);
    session.lastAskedQuestionId = nextUnresolved ? nextUnresolved.question_id : null;
    if (nextUnresolved && !session.askedQuestionIds.includes(nextUnresolved.question_id)) {
      session.askedQuestionIds.push(nextUnresolved.question_id);
    }

    const ackHeader = acknowledgments.length > 0 ? `${acknowledgments.join('\n')}\n\n` : '';
    const gateNotice = `I still need the underlying PCT disclosure before I can safely prepare the substantive national-stage application without introducing unsupported subject matter.`;
    const nextQPrompt = typeof nextUnresolved?.question === 'function' ? nextUnresolved.question(session.facts) : nextUnresolved?.question;
    const responseMarkdown = `${ackHeader}${gateNotice}\n\n${nextQPrompt}`;

    return {
      session,
      readyToDraft: false,
      responseMarkdown,
      nextQuestion: nextUnresolved
    };
  }

  if (isReady) {
    session.state = QUESTION_STATES.READY_TO_DRAFT;
    session.readyToDraft = true;
    const ackHeader = acknowledgments.length > 0 ? `${acknowledgments.join('\n')}\n\n` : '';
    const readyMessage = `${ackHeader}All required national-stage filing information and operative document disclosures have been verified. Ready to draft.`;

    return {
      session,
      readyToDraft: true,
      responseMarkdown: readyMessage,
      nextQuestion: null
    };
  }

  const nextQ = selectNextQuestion(session, profile);
  session.lastAskedQuestionId = nextQ ? nextQ.question_id : null;
  if (nextQ && !session.askedQuestionIds.includes(nextQ.question_id)) {
    session.askedQuestionIds.push(nextQ.question_id);
  }

  const parts = [];
  if (acknowledgments.length > 0) {
    parts.push(acknowledgments.join('\n'));
  }
  if (contextNoteText) {
    parts.push(contextNoteText);
  }
  if (nextQ) {
    const qText = typeof nextQ.question === 'function' ? nextQ.question(session.facts) : nextQ.question;
    parts.push(qText);
  }

  const responseMarkdown = parts.join('\n\n');

  return {
    session,
    readyToDraft: false,
    responseMarkdown,
    nextQuestion: nextQ
  };
}

/**
 * ROUTING-PRECEDENCE LAYER (added for the conversational-interview fix).
 * Active interview state ALWAYS takes priority over generic intent routing.
 * Pure functions only — no DOM, no network — so chat, voice, and API
 * handlers share one binding implementation.
 */

export function isTaskSwitch(text = '') {
  const clean = String(text || '').trim().toLowerCase();
  if (!clean) return false;

  // Single word affirmative/negative answers or standard field values must NOT be switches
  if (/^(yes|no|y|n|unknown|none|n\/a)$/i.test(clean)) return false;

  // Explicit cancellation / reset commands
  if (/^(stop( this)?|cancel( this)?|abort|start over|forget this( application)?|new matter|new task|switch (to|tasks)|change topic|never\s*mind)\b/i.test(clean)) return true;

  // Switching to another document type or domain (e.g. NDA, trademark, contract, FTO)
  if (/\b(nda|non-disclosure|confidentiality agreement|trademark|contract|license|patentability|novelty|fto|prior art)\b/i.test(clean)) return true;
  if (/\b(switch to|let'?s do|start (an? )?|instead|develop something else|something else|different document|another document|i want to make|i want an?|make an?|draft an?)\b/i.test(clean) &&
      !/^(pct\/|wo\s*20\d{2})/i.test(clean)) return true;

  // Starting with 'no' followed by an alternative instruction
  if (/^no[,\s]+(develop|i want|let'?s|make|draft|switch|do|can we)\b/i.test(clean)) return true;

  return false;
}

export function sessionKey({ tenantId = 'default', userId = 'default', matterId = 'default', conversationId = 'default', documentId = 'default' } = {}) {
  const part = (value) => String(value ?? 'default').trim().toLowerCase().replace(/\|/g, '/') || 'default';
  return [part(tenantId), part(userId), part(matterId), part(conversationId), part(documentId)].join('|');
}

export function createSessionStore() {
  const map = new Map();
  return {
    get(key) {
      const raw = map.get(key);
      return raw ? JSON.parse(JSON.stringify(raw)) : null;
    },
    set(key, session) {
      map.set(key, JSON.parse(JSON.stringify(session)));
    },
    remove(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    keys() {
      return [...map.keys()];
    },
  };
}

export function saveInterviewSession(store, key, session) {
  store.set(key, session);
}

export function loadInterviewSession(store, key) {
  return store.get(key);
}

const UNCERTAINTY_MARKERS = /\b(i think|i believe|maybe|probably|likely|not (entirely )?sure|unsure|as far as i know)\b/i;

export function annotateUncertainty(session, message) {
  if (!session || !UNCERTAINTY_MARKERS.test(String(message || ''))) return false;
  const field = session.lastAskedQuestionId && session.facts[session.lastAskedQuestionId]
    ? session.lastAskedQuestionId
    : Object.keys(session.facts).pop();
  const fact = field ? session.facts[field] : null;
  if (!fact) return false;
  fact.certainty = 'UNCERTAIN';
  if (fact.status === FACT_STATUSES.KNOWN) fact.status = FACT_STATUSES.USER_ASSERTED;
  session.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Precedence router for one conversational turn.
 *
 * IF an interview session exists AND is WAITING_FOR_USER AND has an
 * active question AND the message is not an explicit task switch,
 * THEN the message binds to the active question (handled: true).
 * Otherwise the caller proceeds with normal intent routing (handled: false).
 */
export function routeInterviewTurn({
  store,
  key,
  message = '',
  documentId = null,
  matterContext = {},
  sourceRecords = {},
} = {}) {
  if (!store || !key) return { handled: false, reason: 'NO_SESSION_STORE' };
  const session = store.get(key);
  if (!session) return { handled: false, reason: 'NO_ACTIVE_SESSION' };
  if (session.state !== QUESTION_STATES.WAITING_FOR_USER || !session.lastAskedQuestionId) {
    return { handled: false, reason: 'SESSION_NOT_WAITING', session };
  }
  if (isTaskSwitch(message)) {
    session.state = QUESTION_STATES.INTERVIEW_NOT_STARTED;
    session.abandonedAt = new Date().toISOString();
    session.abandonReason = 'USER_TASK_SWITCH';
    store.set(key, session);
    return { handled: false, reason: 'TASK_SWITCH', session };
  }

  const effectiveDocumentId = documentId || session.documentId;
  const result = processInterviewTurn({
    session,
    userMessage: message,
    documentId: effectiveDocumentId,
    matterContext,
    sourceRecords,
  });

  annotateUncertainty(result.session, message);

  if (result.nextQuestion) {
    result.session.state = QUESTION_STATES.WAITING_FOR_USER;
  } else if (result.readyToDraft) {
    result.session.state = QUESTION_STATES.READY_TO_DRAFT;
  }
  store.set(key, result.session);

  return {
    handled: true,
    session: result.session,
    responseMarkdown: result.responseMarkdown,
    nextQuestion: result.nextQuestion || null,
    readyToDraft: Boolean(result.readyToDraft),
    activeQuestionId: result.session.lastAskedQuestionId,
  };
}

/**
 * Starts (or resumes) an interview session for a document and runs the
 * first turn through the engine. Used when a fresh document request
 * arrives while no session is waiting.
 */
export function startInterviewSession({
  store,
  key,
  documentId,
  openingMessage = '',
  matterContext = {},
  sourceRecords = {},
} = {}) {
  const session = createInterviewSession(documentId, matterContext);
  const result = processInterviewTurn({
    session,
    userMessage: openingMessage,
    documentId,
    matterContext,
    sourceRecords,
  });
  if (result.nextQuestion) {
    result.session.state = QUESTION_STATES.WAITING_FOR_USER;
  } else if (result.readyToDraft) {
    result.session.state = QUESTION_STATES.READY_TO_DRAFT;
  }
  if (store && key) store.set(key, result.session);
  return {
    session: result.session,
    responseMarkdown: result.responseMarkdown,
    nextQuestion: result.nextQuestion || null,
    readyToDraft: Boolean(result.readyToDraft),
  };
}



