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
  [/\b103\b|office action.*rejection|Â§103|obviousness rejection/i, 'patent-office-action-response'],
  [/\b(?:is|would|could) (?:this|the|my|our) invention patentable\b|\bpatentability\b|\bassess\s+patentability\b|\bassess(?:\s+whether)?\s+(?:this\s+|the\s+|my\s+)?invention\s+is\s+patentable\b|\bevaluate\s+whether\s+this\s+can\s+be\s+patented\b|\breview\s+the\s+patentability\s+of\s+this\s+invention\b|\bassess\s+novelty\s+and\s+(?:inventive\s+step|obviousness)\b|\bdoes\s+this\s+invention\s+appear\s+patentable\b|\bis it patentable\b|\banaly[sz]e\s+patentability\s+against\s+(?:this\s+)?prior\s+art\b|\bprepare\s+a\s+preliminary\s+patentability\s+report\b/i, 'patentability-assessment'],
  [/\b(?:search for|find)\s+prior[- ]art\b|\bprior[- ]art search(?: report)?\b|\bprepare a prior-art search report\b|\bfind patents similar to this invention\b|\bsearch patents against claim \d+\b|\bfind earlier patents\b|\bfind documents before my filing date\b|\blook for prior art against these claims\b|\bdo a novelty search\b|\bsearch for invalidating references\b|\bfind technical papers before this date\b|\bfind patent and non-patent literature\b/i, 'patent-prior-art-search-report'],
  // Patent Claim Chart patterns (Document #020, canonical generic mapping). Infringement/novelty/invalidity/FTO/support intents keep priority via guards below.
  [/\bcreate (?:a )?claim chart\b|\bchart claim \d+\b|\bmap this claim\b|\bmap (?:the )?claim against this document\b|\bcompare these claims against the reference\b|\bbreak this claim into limitations\b|\bcreate (?:a )?limitation chart\b|\bmap each element\b|\bshow where each claim element appears\b|\bcompare claim \d+ with this patent\b|\bchart these claims against the evidence\b|\bpatent claim chart\b|\bclaim limitation chart\b/i, 'patent-claim-chart'],
  [/\b(?:is|would) (?:this|the) claim obvious\b|\bobviousness analysis\b|\binventive[- ]step analysis\b/i, 'inventive-step-analysis'],
  [/\b(?:prepare (?:an )?fto|freedom[- ]to[- ]operate(?:\s+opinion)?|fto(?:\s+opinion|\s+search)?|can we launch (?:this|our|the) product|can we sell this product|are there patents blocking this|check third[- ]party patent risk|clear this product for launch|do these patents cover our product|analy[sz]e blocking patents|check patent clearance|assess infringement risk before launch|(?:can|may) we practi[cs]e (?:this|the) invention)\b/i, 'freedom-to-operate-opinion'],
  // Patent Invalidity Opinion patterns (Document #017). Must not steal patentability/novelty/FTO/infringement/search intents.
  [/\bis (?:this|that|the) patent invalid\b|\b(?:is|are) (?:this|these|the) (?:patent )?claims? (?:invalid|lacking novelty)\b|\bcan we invalidate\b|\binvalidity opinion\b|\bprepare (?:an? )?(?:patent )?invalidity (?:opinion|assessment|analysis)\b|\bvalidity challenge\b|\bassess (?:the )?validity of\b|\bvalidity (?:assessment|opinion)\b|\bchallenge (?:the )?validity\b|\bfind invalidity grounds\b|\banaly[sz]e (?:this|that|the) patent against prior art\b|\bis claim \d+ anticipated\b|\bcould this patent be revoked\b|\bassess whether these claims lack novelty\b|\bassess whether these claims are obvious\b|\banaly[sz]e added matter\b|\bsufficiently disclosed\b|\bpatent invalidity opinion\b/i, 'patent-invalidity-opinion'],
  // Patent Landscape Report patterns (Document #018). Prior-art/patentability/FTO/invalidity/infringement intents keep priority above.
  [/\bprepare (?:a )?patent landscape\b|\bmap patents in this technology\b|\bshow patent trends\b|\banaly[sz]e patent activity\b|\bwho is filing in this space\b|\bshow key assignees\b|\bcompare patent portfolios\b|\bidentify white space\b|\blandscape this technology\b|\bshow filing trends by year\b|\bmap patent families\b|\banaly[sz]e competitors['’] patents\b|\bshow emerging patent themes\b|\bpatent landscape report\b|\btechnology landscape\b|\bmap (?:the )?(?:whole )?technology space\b/i, 'patent-landscape-report'],  [/\bdoes (?:this|the|their) patent cover (?:our|the|this) product\b|\bpatent infringement analysis\b|\binfringement claim chart\b/i, 'patent-infringement-analysis'],
  [/\b(?:is (?:this|the|my|our|my own) claim novel|is claim \d+ novel|is claim \d+ novel|is (?:my|this|the|our) invention novel|prepare (?:a )?(?:patent )?novelty (?:opinion|assessment)|analy[sz]e novelty|check claim \d+ for novelty|does (?:this|the) reference anticipate (?:this|the) claim|compare (?:this|the) claim against prior art|analy[sz]e whether (?:this|the) claims? (?:is|are) anticipated|review novelty against (?:this|the|these) references|check novelty before filing|patent novelty opinion)\b/i, 'patent-novelty-opinion'],
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
  // Patent Specification from disclosure (Document #009): must precede generic invention-disclosure intake.
  [/\binvention\s+disclosure\s+into\s+(?:a\s+)?patent\s+specification\b/i, 'patent-specification'],
  // Invention disclosure patterns (pre-filing intake)
  [/\binvention\s+disclosure(?:\s+form)?|\binventor\s+disclosure|\bdocument\s+my\s+invention|\bcapture\s+this\s+invention|\bturn\s+my\s+notes\s+into\s+an\s+invention\s+disclosure|\bprepare\s+an\s+invention\s+report|\bcollect\s+information\s+for\s+a\s+patent\s+application|\bhelp\s+me\s+describe\s+my\s+invention\s+before\s+filing/i, 'invention-disclosure-form'],
  // Patent Drawings Instructions patterns (Document #012). Formal ornamental design-figure requests are handled separately.
  [/\bpatent drawing instructions\b|\binstructions for (?:the )?(?:patent )?figures?\b|\bfigure instructions\b|\bdrawing instructions for (?:this|the|my) patent\b|\bpatent (?:figure|illustration) brief\b|\bdrawing brief for (?:my|this|the) patent\b|\btell the illustrator what to draw\b|\bwhat drawings do i need(?: for this patent)?\b|\bmap (?:the )?specification into drawings\b|\bprepare instructions for figures?(?: \d+ to \d+)?/i, 'patent-drawings-instructions'],
  // Plant patent patterns
  [/\bplant\s+patent|\bpatent\s+(?:for\s+)?(?:this\s+)?new\s+plant|\bpatent\s+this\s+new\s+plant\s+variety|\bplant\s+cultivar\s+patent/i, 'plant-patent-application'],
  // National phase patterns MUST come BEFORE PCT international application patterns
  [/\bnational\s+phase|\benter\s+(?:the\s+)?(?:us|europe|ep|epo|uk|ca|canada|canadian|australia|australian|au|india|indian|in)\s+(?:national\s+phase|from\s+(?:this\s+)?pct)|\bnationalise\s+(?:this\s+)?pct|\bpct\s+national\s+phase/i, 'national-phase-patent-application'],
  // European patent patterns (direct EPO filing)
  [/\beuropean\s+patent(?:\s+application)?(?!\s+abstract\b)|\bepo\s+patent(?:\s+application)?(?!\s+abstract\b)|\bep\s+patent(?:\s+application)?(?!\s+abstract\b)|\bpatent\s+application\s+for\s+(?:the\s+)?epo|\bdirect\s+european\s+filing|\bdraft\s+the\s+ep\s+application/i, 'european-patent-application'],
// PCT international patterns
  [/\bpct\s+application|\bpct\s+patent|\binternational\s+patent|\bpatent\s+cooperation\s+treaty|\bwipo\s+pct|\bfile\s+internationally\s+under\s+(?:the\s+)?pct|\bconvert\s+this\s+patent\s+application\s+into\s+a\s+pct\s+draft/i, 'pct-international-patent-application'],
// Patent Abstract patterns must precede generic patent-application matching.
  // They intentionally do not match abstract-idea/Section 101 or investor/business summaries.
  [/\bpatent\s+abstract\b(?!\s+idea\b)|\babstract\s+of\s+(?:the\s+)?disclosure\b(?!\s+idea\b)|\b(?:draft|write|prepare|rewrite|review|shorten|adapt|check)\b.{0,40}?\bpatent\s+abstract\b(?!\s+idea\b)|\b(?:draft|write|prepare)\b.{0,20}?\babstract\b(?!\s+idea\b)(?!\s+under\s+section\s+101\b)|\bshorten\b.{0,30}?\babstract\b(?!\s+idea\b)|\bmake\b.{0,30}?\babstract\b.{0,20}?\b(?:concise|shorter|short)\b|\b(?:pct|ep|european)\s+(?:patent\s+)?abstract\b(?!\s+idea\b)|\babstract\b.{0,20}?\bfrom\b.{0,20}?\b(?:specification|claims?|disclosure|application)\b/i, 'patent-abstract'],
  // Patent Specification patterns - must come BEFORE generic patent-application but AFTER specific filing routes
  [/\bpatent\s+specification\b|\bdraft\s+(?:a\s+|the\s+)?patent\s+specification\b|\b(?:prepare|draft)\s+(?:the\s+)?specification\b|\bwrite\s+(?:the\s+)?detailed\s+patent\s+specification\b|\bprepare\s+a\s+full\s+patent\s+description\b|\bdraft\s+the\s+description\s+for\s+my\s+patent\b|\bturn\s+this\s+invention\s+disclosure\s+into\s+a\s+patent\s+specification\b|\bprepare\s+the\s+patent\s+description\b|\bdraft\s+the\s+specification\s+around\s+these\s+claims\b|\bdraft\s+patent\s+description\b|\bpatent\s+spec\b/i, 'patent-specification'],
// Non-provisional patent patterns (MUST come BEFORE provisional patterns)
  [/\bnon[\s-]?provisional\s+patent|\bnon[\s-]?provisional\s+application|\b35\s+usc\s+111a|\bsection\s+111a|\bfull\s+patent\s+application|\bconvert\s+provisional\s+to\s+nonprovisional|\bnonprovisional\s+patent|\butility\s+nonprovisional|\bprepare\s+a\s+non[\s-]?provisional|\bconvert\s+my\s+provisional\s+into\s+a\s+non[\s-]?provisional|\bprepare\s+a\s+us\s+nonprovisional|\bdraft\s+my\s+utility\s+non[\s-]?provisional|\bprepare\s+the\s+non[\s-]?provisional|\bdraft\s+the\s+non[\s-]?provisional|\bfile\s+the\s+non[\s-]?provisional|\bfor\s+this\s+matter.*\bnon[\s-]?provisional|\bnon[\s-]?provisional.*\bfor\s+this\s+matter/i, 'non-provisional-patent-application'],
   // Design patent patterns MUST come BEFORE generic patent application patterns
   [/\bdesign\s+patent(?:\s+application)?|\bdraft\s+(?:a\s+|my\s+)?design\s+patent|\bprepare\s+(?:a\s+|my\s+)?design\s+patent(?:\s+application)?|\bfile\s+a\s+design\s+patent|\bmy\s+design\s+patent\b|\bdesign\s+application\b/i, 'design-patent-application'],
   // Utility patent patterns (general)
   [/\butility\s+patent(?:\s+application)?|\b(?:write|draft|prepare|file)\s+(?:a\s+|my\s+|our\s+)?(?:us\s+)?(?:utility\s+)?patent(?:\s+application)?|\bhelp\s+me\s+patent\s+my\s+invention|\bwrite\s+my\s+patent\s+application/i, 'utility-patent-application'],
   // Provisional patent patterns (MUST come AFTER non-provisional)
   [/\bprovisional\s+patent(?!.*non[\s-]?provisional)|\bprovisional\s+application(?!.*non[\s-]?provisional)|us\s+provisional|section\s+111b|35\s+usc\s+111b|early\s+patent\s+filing|file\s+a\s+provisional|provisional\s+filing|provisional\s+for\s+this\s+invention/i, 'provisional-patent-application'],
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
    try {
      const expr = String(section.show_if).replace(/[^a-zA-Z0-9_.\s=!<>|&()]/g, '');
      return new Function('answers', `return (${expr})`)(answers);
    } catch { return true }
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








