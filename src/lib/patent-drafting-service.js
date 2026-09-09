import { sanitizeModelResponse } from './document-tool-service.js'
import { orchestrateSally } from './sally-orchestrator.js'

export const USPTO_SECTIONS = [
  { key: 'title_field', heading: 'Title & Field of the Invention', order: 1, budget: 350 },
  { key: 'background', heading: 'Background & Technical Problem', order: 2, budget: 650 },
  { key: 'summary', heading: 'Brief Summary of the Invention', order: 3, budget: 650 },
  { key: 'drawings', heading: 'Brief Description of the Drawings', order: 4, budget: 350 },
  { key: 'claims', heading: 'Claims (35 U.S.C. § 112)', order: 5, budget: 850 },
  { key: 'detailed_description', heading: 'Detailed Description of Embodiments', order: 6, budget: 850 },
  { key: 'abstract', heading: 'Abstract (USPTO ≤ 150 words)', order: 7, budget: 250 }
]

// 35 U.S.C. § 101 Alice / Mayo Eligibility Screener
export function screenSubjectMatter101(disclosureText = '') {
  const text = String(disclosureText || '').toLowerCase()
  const risks = []
  const recommendations = []
  let riskScore = 15 // base low risk

  // Category 1: Mathematical Concepts & Cryptographic Algorithms
  const mathMatches = text.match(/\b(algorithm|cryptographic key|shamir|threshold|formula|hash|polynomial|matrix|equation|encryption algorithm)\b/gi) || []
  if (mathMatches.length >= 2) {
    riskScore += 30
    risks.push({
      category: 'Mathematical Concepts',
      flaggedTerms: [...new Set(mathMatches)].slice(0, 5),
      detail: 'Contains explicit algorithmic or mathematical concepts that examiners target under Alice Step 2A (Prong 1).'
    })
    recommendations.push('Tie cryptographic steps explicitly to specific physical network interfaces, hardware registers, or memory buffers rather than pure mathematical execution.')
  }

  // Category 2: Mental Processes & Data Manipulation
  const mentalMatches = text.match(/\b(calculating|determining|verifying|comparing|evaluating|analyzing data|processing data)\b/gi) || []
  if (mentalMatches.length >= 3) {
    riskScore += 25
    risks.push({
      category: 'Mental Processes',
      flaggedTerms: [...new Set(mentalMatches)].slice(0, 5),
      detail: 'Data manipulation phrases risk being construed as steps capable of being performed in the human mind.'
    })
    recommendations.push('Recite physical data channel state transitions, network socket lifecycles, or real-time packet exchange protocols (e.g. WebRTC RTCDataChannel negotiation).')
  }

  // Category 3: Methods of Organizing Human Activity / Commercial
  const commercialMatches = text.match(/\b(business method|escrow|commercial|transaction|settlement|payment|custody)\b/gi) || []
  if (commercialMatches.length >= 2) {
    riskScore += 25
    risks.push({
      category: 'Methods of Organizing Human Activity',
      flaggedTerms: [...new Set(commercialMatches)].slice(0, 5),
      detail: 'Financial, custody, or transaction concepts are strictly categorized as abstract business methods.'
    })
    recommendations.push('Frame all security mechanisms around fault-tolerant distributed system reliability and network latency reduction rather than monetary or custodial workflows.')
  }

  // Positive Indicators: Technical Improvement & Physical Grounding
  const techMatches = text.match(/\b(packet|latency|webrtc|socket|bandwidth|processor|server|client|peer-to-peer|ephemeral|memory buffer|signal)\b/gi) || []
  if (techMatches.length >= 3) {
    riskScore = Math.max(10, riskScore - 20)
  }

  const riskLevel = riskScore >= 50 ? 'red' : riskScore >= 30 ? 'amber' : 'green'
  return {
    riskScore: Math.min(100, riskScore),
    riskLevel,
    isEligible: riskLevel !== 'red',
    risks,
    recommendations,
    aliceProngAnalysis: {
      step2A_prong1: mathMatches.length || mentalMatches.length ? 'Abstract concept present (Math/Mental/Data)' : 'No obvious abstract concepts detected',
      step2A_prong2: techMatches.length >= 3 ? 'Integrated into practical application via computer architecture' : 'Needs stronger recitation of technical improvements',
      step2B_inventive_concept: 'Ensure claims recite specific ordered combinations of ephemeral channel establishment beyond generic computer use'
    }
  }
}

// 35 U.S.C. § 112 Antecedent Basis & Support Verifier
export function verifyClaimSupport112(claimsText = '', specText = '') {
  const claims = String(claimsText || '')
  const spec = String(specText || '').toLowerCase()
  const issues = []
  const matrix = []

  // Extract individual numbered claims
  const claimBlocks = claims.split(/(?:^|\n)(?=\d+\.\s+)/).filter(Boolean)

  for (const block of claimBlocks) {
    const numMatch = block.match(/^(\d+)\.\s+/);
    const claimNum = numMatch ? numMatch[1] : '1';
    
    // Check antecedent basis within claim: "the [noun]" without preceding "a/an [noun]"
    const definedNouns = new Set()
    const indefiniteRegex = /\b(?:a|an)\s+([a-zA-Z0-9_\-\s]{3,35}?)(?:,|\.|;|\s+comprising|\s+configured|\s+wherein|\s+connected)/gi
    let match
    while ((match = indefiniteRegex.exec(block)) !== null) {
      const noun = match[1].trim().toLowerCase()
      if (noun) definedNouns.add(noun)
    }

    const definiteRegex = /\b(?:the|said)\s+([a-zA-Z0-9_\-\s]{3,35}?)(?:,|\.|;|\s+configured|\s+wherein|\s+generates|\s+transmits)/gi
    while ((match = definiteRegex.exec(block)) !== null) {
      const noun = match[1].trim().toLowerCase()
      if (noun && !definedNouns.has(noun) && !Array.from(definedNouns).some(d => noun.includes(d) || d.includes(noun))) {
        issues.push({
          claimNumber: claimNum,
          type: 'antecedent_basis',
          term: noun,
          detail: `Claim ${claimNum} mentions "the ${noun}" without prior introduction as "a ${noun}". Violates 35 U.S.C. § 112(b).`
        })
      }
    }

    // Check specification enablement & written description support
    for (const term of definedNouns) {
      const foundInSpec = spec.includes(term)
      matrix.push({
        claimNumber: claimNum,
        limitation: term,
        status: foundInSpec ? 'supported' : 'missing',
        note: foundInSpec ? 'Found in specification text' : 'Missing explicit antecedent support in detailed description (§ 112(a))'
      })
      if (!foundInSpec && spec.length > 100) {
        issues.push({
          claimNumber: claimNum,
          type: 'enablement_gap',
          term,
          detail: `Claim limitation "${term}" is not explicitly described in the Detailed Description. Invites § 112(a) lack of written description rejection.`
        })
      }
    }
  }

  return {
    totalChecked: matrix.length,
    supportedCount: matrix.filter(m => m.status === 'supported').length,
    missingCount: matrix.filter(m => m.status === 'missing').length,
    issues,
    matrix
  }
}

// Create new structured patent draft
export async function createPatentDraft(sql, userId, { matterId, title, filingType = 'provisional_111b', disclosureText = '' }) {
  const filingLabel = filingType === 'nonprovisional_111a' ? 'Nonprovisional (35 U.S.C. § 111(a))' : 'Provisional (35 U.S.C. § 111(b))'
  const draftTitle = String(title || 'Patent Draft Specification').slice(0, 200)

  // Run initial 101 screening
  const screening = screenSubjectMatter101(disclosureText)

  const [draft] = await sql`
    INSERT INTO patent_drafts (
      user_id, matter_id, title, filing_type, status, invention_summary, screening_results
    ) VALUES (
      ${userId}, ${matterId || null}, ${draftTitle}, ${filingType}, 'intake', ${disclosureText.slice(0, 10000)}, ${JSON.stringify(screening)}::jsonb
    ) RETURNING *
  `

  // Seed standard USPTO sections
  for (const sec of USPTO_SECTIONS) {
    await sql`
      INSERT INTO patent_draft_sections (
        draft_id, section_key, heading, content, order_index
      ) VALUES (
        ${draft.id}, ${sec.key}, ${sec.heading}, '', ${sec.order}
      )
    `
  }

  return getPatentDraft(sql, userId, draft.id)
}

// Get patent draft with all sections
export async function getPatentDraft(sql, userId, draftId) {
  const [draft] = await sql`SELECT * FROM patent_drafts WHERE id=${draftId} AND user_id=${userId}`
  if (!draft) throw new Error('Patent draft not found')
  const sections = await sql`SELECT * FROM patent_draft_sections WHERE draft_id=${draft.id} ORDER BY order_index ASC`
  return { draft, sections }
}

// List patent drafts
export async function listPatentDrafts(sql, userId, matterId = null) {
  const rows = matterId
    ? await sql`SELECT id, title, filing_type, status, active_version, is_approved, updated_at FROM patent_drafts WHERE user_id=${userId} AND matter_id=${matterId} ORDER BY updated_at DESC`
    : await sql`SELECT id, title, filing_type, status, active_version, is_approved, updated_at FROM patent_drafts WHERE user_id=${userId} ORDER BY updated_at DESC`
  return { drafts: rows }
}

// Update section content
export async function updateDraftSection(sql, userId, draftId, sectionKey, content, reviewNotes = '') {
  const [draft] = await sql`SELECT id FROM patent_drafts WHERE id=${draftId} AND user_id=${userId}`
  if (!draft) throw new Error('Patent draft not found')

  const text = String(content || '').trim()
  const words = text ? text.split(/\s+/).length : 0
  const tokenEst = Math.ceil(words * 1.33)

  const [section] = await sql`
    UPDATE patent_draft_sections 
    SET content=${text}, word_count=${words}, token_estimate=${tokenEst}, status='ready', review_notes=${reviewNotes || null}, updated_at=now()
    WHERE draft_id=${draft.id} AND section_key=${sectionKey}
    RETURNING *
  `
  await sql`UPDATE patent_drafts SET updated_at=now() WHERE id=${draft.id}`
  return section
}

// Generate an individual section inside dedicated token budget
export async function generateDraftSection(env, sql, userId, { draftId, sectionKey, customInstructions = '' }) {
  const { draft, sections } = await getPatentDraft(sql, userId, draftId)
  const targetSec = sections.find(s => s.section_key === sectionKey)
  if (!targetSec) throw new Error(`Unknown section key: ${sectionKey}`)

  const claimsSec = sections.find(s => s.section_key === 'claims')?.content || ''
  const specSec = sections.find(s => s.section_key === 'detailed_description')?.content || ''
  const secMeta = USPTO_SECTIONS.find(s => s.key === sectionKey)

  const sectionPrompts = {
    title_field: `Write strictly the TITLE and FIELD OF THE INVENTION for a US patent application.
TITLE: Short, descriptive, avoiding laudatory terms.
FIELD OF THE INVENTION: Recite the technical field under 35 U.S.C. (e.g., "The present disclosure relates generally to distributed cryptographic key recovery, and more specifically to threshold secret sharing over ephemeral peer-to-peer data channels.").
Do not include any other sections. Do not include introductory conversation.`,

    background: `Write the BACKGROUND OF THE INVENTION section for a US patent application.
1. Description of the Related Art: Detail the technical challenges with existing systems (e.g., centralized key vaults creating single points of failure, man-in-the-middle risks, channel setup latency, vulnerability to server seizures).
2. Technical Need: Explicitly define the unresolved technical problem in computer and network architecture WITHOUT admitted prior art statements that could bind the applicant in prosecution estoppel.
Do not recite the solution here. Keep within 500 words.`,

    summary: `Write the BRIEF SUMMARY OF THE INVENTION section for a US patent application.
State the technical solution and core objects of the invention.
Anchor the description to concrete improvements in computer network performance, security resilience, and distributed data handling under 35 U.S.C. § 101.
Introduce the primary apparatus and method aspects mirroring the contemplated independent claims.`,

    drawings: `Write the BRIEF DESCRIPTION OF THE DRAWINGS section for a US patent application.
List 4 to 6 figures in standard USPTO format:
- FIG. 1 is a block diagram of the distributed cryptographic key recovery system architecture, according to some embodiments.
- FIG. 2 is a sequence diagram illustrating ephemeral WebRTC data channel establishment and threshold share exchange.
- FIG. 3 is a flowchart of an automated key recovery method executed by a participating node.
- FIG. 4 is a diagram illustrating threshold polynomial reconstruction.
- FIG. 5 is a block diagram of an exemplary computer system implementing the electronic control unit.`,

    claims: `Draft a rigorous, standard USPTO claim set complying strictly with 35 U.S.C. § 112:
- Claim 1: An independent method claim using transitional phrase "comprising", reciting step-by-step physical operations, ephemeral data channel negotiation, threshold share distribution, and reconstruction.
- Claim 2 to 5: Dependent method claims adding specific technical limitations (e.g. timeout triggers, cryptographic zero-knowledge verification, channel encryption parameters).
- Claim 6: An independent system claim comprising a processor and memory storing instructions configured to perform the operations.
- Claim 7: A non-transitory computer-readable medium claim.
Ensure impeccable antecedent basis (never use "the [element]" without prior "a/an [element]").`,

    detailed_description: `Write the DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS section for a US patent application.
Ground all descriptions in concrete technical structures and operations:
1. System Architecture: Refer to FIG. 1 and describe participating node components, ephemeral WebRTC data channel establishment (STUN/TURN signaling, DTLS/SRTP handshake), and threshold share generation.
2. Step-by-step operation: Detail the packet exchange, timeout handling, and Shamir polynomial evaluation.
3. Explicit Hardware Support: Reference memory buffers, network interfaces, cryptographic processors, and state machines to establish full written description and enablement support under 35 U.S.C. § 112(a).
Write comprehensive technical prose.`,

    abstract: `Write the ABSTRACT OF THE DISCLOSURE for a US patent application.
USPTO rules require:
- Maximum 150 words.
- Single paragraph.
- State the technical disclosure of the invention, the system components, and the core operation.
- No laudatory statements, no legal jargon ("said", "whereby").`
  }

  const prompt = `You are an expert US Patent Attorney and technical spec writer.
INVENTION DISCLOSURE:
${draft.invention_summary || draft.title}

TARGET SECTION: ${targetSec.heading}
${claimsSec ? `\nCURRENT CLAIMS FOR REFERENCE:\n${claimsSec.slice(0, 1500)}` : ''}

SPECIFIC SECTION INSTRUCTIONS:
${sectionPrompts[sectionKey] || 'Draft this section in formal USPTO format.'}
${customInstructions ? `\nADDITIONAL USER GUIDANCE: ${customInstructions}` : ''}

Output ONLY the section content in standard Markdown. Never include conversational chatter.`

  const result = await orchestrateSally([{ role: 'user', content: prompt }], env)
  const cleanContent = sanitizeModelResponse(result.answer)

  return updateDraftSection(sql, userId, draftId, sectionKey, cleanContent)
}

// Assemble complete patent specification in USPTO filing order
export function assembleFullSpecification(draft, sections) {
  const orderedKeys = ['title_field', 'background', 'summary', 'drawings', 'detailed_description', 'claims', 'abstract']
  const sectionsMap = new Map(sections.map(s => [s.section_key, s]))

  let doc = `# ${draft.title.toUpperCase()}\n\n`
  doc += `**Filing Category:** ${draft.filing_type === 'nonprovisional_111a' ? 'Nonprovisional Patent Application under 35 U.S.C. § 111(a)' : 'Provisional Patent Application under 35 U.S.C. § 111(b)'}\n`
  doc += `**Jurisdiction:** United States Patent and Trademark Office (USPTO)\n\n---\n\n`

  for (const key of orderedKeys) {
    const sec = sectionsMap.get(key)
    if (sec && sec.content.trim()) {
      doc += `## ${sec.heading.toUpperCase()}\n\n${sec.content.trim()}\n\n---\n\n`
    }
  }

  return doc.trim()
}
