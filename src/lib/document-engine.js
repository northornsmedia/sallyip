import { resolveJurisdiction } from './jurisdiction-registry.js'

const CATALOGUE_CACHE = { profiles: new Map(), lastLoaded: null }

export async function loadDocumentProfile(slug) {
  const normalizedSlug = slug === 'patent-application' ? 'utility-patent-application' :
                         slug === 'non-provisional-patent-application' ? 'non-provisional-patent-application' : slug
  try {
    if (typeof fetch === 'function' && typeof window !== 'undefined') {
      const response = await fetch(`/api/documents/profiles?slug=${normalizedSlug}`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile) return data.profile
      }
    }
  } catch {}

  // Fallback for Node environment or direct disk access
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const filePath = path.resolve(process.cwd(), 'data', 'documents', 'profiles', `${normalizedSlug}.json`)
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
    const legacyPath = path.resolve(process.cwd(), 'data', 'documents', 'profiles', `${slug}.json`)
    if (fs.existsSync(legacyPath)) {
      return JSON.parse(fs.readFileSync(legacyPath, 'utf8'))
    }
  } catch {}

  return null
}

export async function loadCatalogue() {
  if (CATALOGUE_CACHE.lastLoaded && Date.now() - CATALOGUE_CACHE.lastLoaded < 3600000) {
    return CATALOGUE_CACHE
  }
  try {
    const response = await fetch('/api/documents/catalogue')
    if (!response.ok) return { profiles: new Map(), categories: [], aliases: new Map() }
    const data = await response.json()
    const profiles = new Map()
    for (const profile of data.catalogue || []) {
      profiles.set(profile.slug, profile)
      for (const alias of (profile.aliases || [])) {
        aliases.set(alias.toLowerCase(), profile.slug)
      }
    }
    CATALOGUE_CACHE.profiles = profiles
    CATALOGUE_CACHE.aliases = aliases
    CATALOGUE_CACHE.lastLoaded = Date.now()
    return CATALOGUE_CACHE
  } catch { return { profiles: new Map(), categories: [], aliases: new Map() } }
}

export function resolveDocumentFamily(intent) {
  const text = String(intent || '').toLowerCase().trim()
  const aliases = CATALOGUE_CACHE.aliases || new Map()
  if (aliases.has(text)) return aliases.get(text)
  for (const [pattern, slug] of DOCUMENT_FAMILY_PATTERNS) {
    if (pattern.test(text)) return slug
  }
  return null
}

const DOCUMENT_FAMILY_PATTERNS = [
  [/\bnda\b|non[- ]disclosure|confidentiality agreement|keep.*(?:information|data|documents?).*(?:secret|confidential|private)/i, 'nda-mutual'],
  [/\b103\b|office action.*rejection|§103|obviousness rejection/i, 'patent-office-action-response'],
  [/\b(?:is|would|could) (?:this|the|my|our) invention patentable\b|\bpatentability (?:assessment|opinion|analysis)\b/i, 'patentability-assessment'],
  [/\b(?:search for|find)\s+prior[- ]art\b|\bprior[- ]art search(?: report)?\b/i, 'patent-prior-art-search-report'],
  [/\b(?:is|would) (?:this|the) claim obvious\b|\bobviousness analysis\b|\binventive[- ]step analysis\b/i, 'inventive-step-analysis'],
  [/\b(?:prepare (?:an )?fto|freedom[- ]to[- ]operate(?:\s+opinion)?|fto(?:\s+opinion|\s+search)?|can we launch this product|can we sell this product|are there patents blocking this|check third[- ]party patent risk|clear this product for launch|do these patents cover our product|analy[sz]e blocking patents|check patent clearance|assess infringement risk before launch|(?:can|may) we practi[cs]e (?:this|the) invention)\b/i, 'freedom-to-operate-opinion'],
  [/\bdoes (?:this|the) patent cover (?:our|the|this) product\b|\bpatent infringement analysis\b|\binfringement claim chart\b/i, 'patent-infringement-analysis'],
  [/\b(?:is (?:this|the|my|our) claim novel|is claim \d+ novel|is (?:my|this|the|our) invention novel|prepare (?:a )?(?:patent )?novelty (?:opinion|assessment)|analy[sz]e novelty|check claim \d+ for novelty|does (?:this|the) reference anticipate (?:this|the) claim|compare (?:this|the) claim against prior art|analy[sz]e whether (?:this|the) claims? (?:is|are) anticipated|review novelty against (?:this|the|these) references|check novelty before filing|patent novelty opinion)\b/i, 'patent-novelty-opinion'],
  [/\bsoftware licence|software license|eula|end user|software licence agreement/i, 'software-licence'],
  [/\bsaas|software as a service|saas agreement|saas subscription/i, 'saas-agreement'],
  [/\btrademark coexistence|coexistence agreement|co-existence agreement/i, 'trademark-coexistence'],
  [/\bpatent assignment|assignment of patent|assign(?:ing)? (?:the|this|my|our)? ?patent/i, 'patent-assignment'],
  [/\bshare purchase|spa\b|stock purchase|share purchase agreement/i, 'share-purchase-agreement'],
  [/\btermination letter|employee termination|terminat(?:e|ing) (?:the|this|my|our)? ?employee|employment termination/i, 'employment-termination'],
  [/\bprivacy notice|privacy policy|privacy statement/i, 'privacy-policy'],
  [/\bdpa|data processing agreement|data processing addendum/i, 'data-processing-agreement'],
  [/\barbitration notice|arbitration demand|notice of arbitration|commence arbitration/i, 'arbitration-notice'],
  [/\bcease and desist|cease[- ]desist|stop using (?:our|my|the) (?:trademark|mark|brand)/i, 'cease-and-desist-letter'],
  [/\blegal research|legal memo|legal memorandum|opinion letter|legal opinion/i, 'legal-research-memorandum'],
  // Invention disclosure patterns (pre-filing intake)
  [/\binvention\s+disclosure(?:\s+form)?|\binventor\s+disclosure|\bdocument\s+my\s+invention|\bcapture\s+this\s+invention|\bturn\s+my\s+notes\s+into\s+an\s+invention\s+disclosure|\bprepare\s+an\s+invention\s+report|\bcollect\s+information\s+for\s+a\s+patent\s+application|\bhelp\s+me\s+describe\s+my\s+invention\s+before\s+filing/i, 'invention-disclosure-form'],
  // Plant patent patterns
  [/\bplant\s+patent|\bpatent\s+(?:for\s+)?(?:this\s+)?new\s+plant|\bpatent\s+this\s+new\s+plant\s+variety|\bplant\s+cultivar\s+patent/i, 'plant-patent-application'],
  // National phase patterns MUST come BEFORE PCT international application patterns
  [/\bnational\s+phase|\benter\s+(?:the\s+)?(?:us|europe|ep|epo|uk|ca|canada|canadian|australia|australian|au|india|indian|in)\s+(?:national\s+phase|from\s+(?:this\s+)?pct)|\bnationalise\s+(?:this\s+)?pct|\bpct\s+national\s+phase/i, 'national-phase-patent-application'],
  // European patent patterns (direct EPO filing)
  [/\beuropean\s+patent(?:\s+application)?|\bepo\s+patent(?:\s+application)?|\bep\s+patent(?:\s+application)?|\bpatent\s+application\s+for\s+(?:the\s+)?epo|\bdirect\s+european\s+filing|\bdraft\s+the\s+ep\s+application/i, 'european-patent-application'],
  // PCT international patterns
  [/\bpct\s+application|\bpct\s+patent|\binternational\s+patent|\bpatent\s+cooperation\s+treaty|\bwipo\s+pct|\bfile\s+internationally\s+under\s+(?:the\s+)?pct|\bconvert\s+this\s+patent\s+application\s+into\s+a\s+pct\s+draft/i, 'pct-international-patent-application'],
  // Non-provisional patent patterns (specific conversions / sections)
  [/\b35\s+usc\s+111a|\bsection\s+111a|\bfull\s+patent\s+application|\bconvert\s+provisional\s+to\s+nonprovisional|\butility\s+nonprovisional/i, 'non-provisional-patent-application'],
  // Utility patent patterns (general / 111a nonprovisional)
  [/\butility\s+patent(?:\s+application)?|\bnon-?provisional\s+patent(?:\s+application)?|\b(?:write|draft|prepare|file)\s+(?:a\s+|my\s+|our\s+)?(?:us\s+)?(?:utility\s+|non-?provisional\s+)?patent(?:\s+application)?|\bhelp\s+me\s+patent\s+my\s+invention/i, 'utility-patent-application'],
  // Provisional patent patterns
  [/\b(?<!non[-\s]?)provisional\s+patent|(?<!non[-\s]?)provisional\s+application|us\s+provisional|section\s+111b|35\s+usc\s+111b|early\s+patent\s+filing|file\s+a\s+provisional|(?<!non[-\s]?)provisional\s+filing|provisional\s+for\s+this\s+invention/i, 'provisional-patent-application'],
  [/\bpatent application|patent filing/i, 'utility-patent-application'],
  [/\bmsa\b|master services agreement|master service agreement|services agreement/i, 'msa-services'],
  [/\bip licence|ip license|intellectual property licence|technology licence|patent licence|trademark licence/i, 'ip-licence'],
  [/\binvention assignment|invention assignment agreement|employee invention assignment|assign (?:the )?invention/i, 'invention-assignment'],
  [/\bemployment agreement|employment contract|executive employment|employment terms/i, 'employment-agreement'],
  [/\bindependent contractor|contractor agreement|consulting agreement|freelance agreement/i, 'independent-contractor-agreement'],
  [/\bshareholders agreement|shareholders' agreement|sha\b|stockholders agreement/i, 'shareholders-agreement'],
  [/\bboard resolution|board resolution|directors resolution|corporate resolution/i, 'board-resolution'],
  [/\bsettlement agreement|settlement agreement|settlement terms|resolve (?:the )?dispute/i, 'settlement-agreement'],
  [/\blitigation hold|litigation hold notice|document preservation|legal hold|preservation notice/i, 'litigation-hold-notice'],
  [/\bdemand letter|demand for payment|letter of demand|payment demand|formal demand/i, 'commercial-demand-letter'],
]

export async function generatePreDraftQuestions(profile, knownFacts = {}) {
  if (!profile) return []
  const questions = []
  for (const question of (profile.pre_draft_questions || [])) {
    const inputField = profile.required_inputs?.find(i => i.id === question.input_field_id) ||
                       profile.optional_inputs?.find(i => i.id === question.input_field_id)
    if (!inputField) continue
    const knownValue = knownFacts[question.input_field_id] || getMatterFact(question.input_field_id)
    if (knownValue && knownValue !== '') continue
    questions.push({
      ...question,
      input_type: inputField.type,
      options: inputField.options,
      placeholder: inputField.placeholder
    })
  }
  return questions
}

function getMatterFact(fieldId) {
  const factMap = {
    'jurisdiction': window.sally?.matter?.jurisdictions?.[0] || null,
    'party_a': window.sally?.matter?.client_name || null,
    'counterparty': null
  }
  return factMap[fieldId] || null
}

export function classifyInputClass(inputField) {
  const inputClass = inputField.input_class || 'OPTIONAL'
  const knownFact = getMatterFact(inputField.id)
  if (knownFact && knownFact !== '') return 'AVAILABLE_FROM_MATTER'
  return inputClass
}

export function buildDocumentOutline(profile) {
  if (!profile) return []
  return (profile.sections || []).sort((a, b) => a.order - b.order).map(section => ({
    ...section,
    status: section.required ? 'REQUIRED' : 'OPTIONAL',
    clause_families: section.clause_families || [],
    content: null,
    provenance: 'PLACEHOLDER'
  }))
}

export function selectSectionsForDocument(profile, answers = {}) {
  if (!profile) return []
  return (profile.sections || []).filter(section => {
    if (!section.show_if) return true
    try { return new Function('answers', `return ${section.show_if}`)(answers) } catch { return true }
  }).sort((a, b) => a.order - b.order)
}

export function assembleDocument(profile, answers, jurisdiction = 'US') {
  if (!profile) return { content: '', error: 'No profile found' }
  const selectedSections = selectSectionsForDocument(profile, answers)
  let content = `# ${profile.name}\n\n`
  if (answers.party_a && answers.party_b) {
    content += `**Effective Date**: ${answers.effective_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}}\n\n`
    content += `**Parties**: ${answers.party_a} and ${answers.party_b}\n\n`
  }
  for (const section of selectedSections) {
    content += `## ${section.heading}\n\n`
    content += `[Content to be generated based on profile, answers, and jurisdiction: ${jurisdiction}]\n\n`
  }
  return {
    content,
    profile: profile.slug,
    sections: selectedSections.length,
    jurisdiction,
    provenance: { generated_by: 'document-engine', profile: profile.slug, jurisdiction }
  }
}

export function getClauseVariant(clauseFamily, position = 'NEUTRAL', jurisdiction = 'US') {
  const variants = {
    'confidentiality.duration': {
      'NEUTRAL': 'This Agreement shall govern all disclosures made between the Parties for a period of two (2) years from the Effective Date. The confidentiality obligations shall survive termination for a period of three (3) years from the date of disclosure.',
      'CUSTOMER_FRIENDLY': 'Confidentiality obligations shall expire after twelve (12) months from the Effective Date. No survival period applies.',
      'SUPPLIER_FRIENDLY': 'Confidentiality obligations shall endure for five (5) years from the Effective Date. Surviving obligations extend indefinitely for trade secrets.',
      'LICENSOR_FRIENDLY': 'Confidentiality shall persist for the full term of this Agreement plus three (3) years. Trade secret protections survive indefinitely.',
      'LICENSEE_FRIENDLY': 'Confidentiality obligations shall not exceed twenty-four (24) months. No survival period for non-trade-secret information.',
      'EMPLOYER_FRIENDLY': 'Employee shall protect Confidential Information during employment and for three (3) years thereafter.',
      'EMPLOYEE_FRIENDLY': 'Employee shall protect Confidential Information during employment only. No post-termination obligations beyond applicable law.',
      'BUYER_FRIENDLY': 'Confidentiality obligations shall survive for the duration of the transaction plus 24 months.',
      'SELLER_FRIENDLY': 'Confidentiality obligations shall survive for 5 years from the Effective Date.'
    }
  }
  return (variants[clauseFamily] && variants[clauseFamily][position]) || null
}

export async function verifyDocumentContent(profile, content, jurisdiction = 'US') {
  const verificationItems = []
  if (profile.verification_required) {
    verificationItems.push({
      item: 'Authority citations verified',
      status: 'pending',
      authorities: profile.authority_required || []
    })
  }
  if (profile.jurisdiction_type === 'JURISDICTION_SPECIFIC') {
    verificationItems.push({
      item: 'Jurisdiction-specific requirements checked',
      status: 'pending',
      jurisdiction
    })
  }
  if (profile.review_required) {
    verificationItems.push({
      item: 'Attorney review required',
      status: 'pending'
    })
  }
  return {
    document: profile.slug,
    jurisdiction,
    verification_items: verificationItems,
    overall_status: verificationItems.length ? 'NEEDS_REVIEW' : 'READY'
  }
}
