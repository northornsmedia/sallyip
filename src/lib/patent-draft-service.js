// US patent-draft guards: persona refusal, filing-posture correction, §101 screen,
// and section-by-section scaffold assembly. Pure helpers are unit-tested;
// matter grounding is injected by the workflow orchestrator.

export const DRAFT_RESPONSE_CONTRACT = `PATENT-DRAFT REQUEST — RESPONSE CONTRACT (highest priority for this answer):
You are Sally, an AI patent drafting co-pilot. You are NOT a registered US patent attorney and must never claim to be one, even when asked to "act as" counsel — politely decline that persona in one line and proceed as an AI co-pilot.

1. INVENTOR-FIRST DISCOVERY INTAKE: If the user asks to draft a patent application or claims but has not yet provided the concrete technical details, components, or mechanics of the invention:
   - DO NOT jump straight into statutory citations (e.g. 35 U.S.C. § 111, 37 C.F.R. § 1.73, antecedent basis, audit matrices).
   - DO NOT instruct the user to click other tools or pills.
   - Warmly welcome the request in plain English and ask the core invention-disclosure discovery questions:
     1. What makes the invention new or different from conventional alternatives?
     2. What concrete technical problem does it solve?
     3. How does it work (key mechanisms, sensors, or algorithms)?
     4. What are the main components or features?
     5. What type of device or technology is it?
     6. Do they have drawings, sketches, or prototype specifications?
   - Reassure the user that informal explanations without legal or patent terminology are completely fine.

2. PROGRESSIVE STRUCTURED DRAFTING: When technical details or features are provided:
   - Summarize the invention in plain English.
   - Identify potential inventive concepts (novelty and non-obviousness combinations).
   - Draft the structured US patent application: Title, Field, Background (without conceding prior-art admissions), Summary, Detailed Description of Embodiments, numbered Claims (independent apparatus/system, independent method, dependent claims), Abstract, and suggested Patent Drawings.
   - Run a § 101 / § 112 statutory and enablement screen, flagging inventor gaps for review with registered patent counsel.
    - If the request confuses 35 U.S.C. § 111(a) with provisional filing, clarify that provisionals are § 111(b) and nonprovisionals are § 111(a).

3. SILENT INTERNAL ORDER: understand invention → problem → inventive concepts → gaps → embodiments → claim strategy → independent claims → dependent claims → specification → §112 support/antecedent checks → §101 screen. Never expose this order unless the user asks.
4. Never invent technical details to complete a draft. Label user-provided facts vs retrieved evidence vs drafting assumptions vs proposed embodiments requiring confirmation.
5. Perform the task or gather the minimum information to perform it. Never respond with a description of Sally's capabilities, workspaces, buttons, or features.`

export function detectAttorneyPersona(instruction) {
  return /\b(act|acting)\s+as\b[\s\S]{0,40}\b(registered\s+)?(patent\s+attorney|attorney|lawyer)\b/i.test(String(instruction || ''))
}

export function detectFilingPosture(instruction) {
  const text = String(instruction || '')
  const wantsProvisional = /\bprovisional\b/i.test(text)
  const wantsNonprovisional = /\bnon[\s-]?provisional\b/i.test(text)
  const cites111a = /111\s*\(\s*a\s*\)/i.test(text) || (/35\s*U\.?S\.?C\.?\s*§?\s*111\b/i.test(text) && !wantsProvisional)
  const corrections = []
  if (wantsProvisional && /35\s*U\.?S\.?C\.?\s*§?\s*111(?!\s*\(\s*b\s*\))/i.test(text)) {
    corrections.push('US provisional applications are governed by 35 U.S.C. § 111(b), not § 111(a) (nonprovisional). This draft is postured as a § 111(b) provisional.')
  }
  const posture = wantsProvisional ? 'provisional' : wantsNonprovisional || cites111a ? 'nonprovisional' : 'unresolved'
  if (posture === 'unresolved') corrections.push('Filing posture unresolved: confirm provisional (§ 111(b)) vs nonprovisional (§ 111(a)) before filing; requirements differ.')
  return { posture, corrections }
}

const SOFTWARE_SIGNALS = [/software/i, /algorithm/i, /cryptograph/i, /webrtc/i, /blockchain/i, /neural network/i, /machine learning/i, /\bbusiness method\b/i, /abstract (idea|method)/i, /data (processing|collection)/i]

export function screenSection101(text) {
  const hits = SOFTWARE_SIGNALS.filter(r => r.test(String(text || '')))
  if (!hits.length) return null
  return 'Subject-matter screen: software/cryptographic subject matter detected. Under Alice/Mayo (35 U.S.C. § 101), frame every claim around the specific technical improvement (e.g. reduced round-trips, forward secrecy without a central server), not the abstract idea of key recovery. A registered practitioner must clear § 101 before filing.'
}

export function extractDraftFeatures(text, max = 10) {
  const sentences = String(text || '').replace(/\s+/g, ' ').split(/(?<=[.;])\s+|;/).map(s => s.trim()).filter(s => s.length > 24)
  const seen = new Set(), out = []
  for (const s of sentences) {
    const key = s.toLowerCase().slice(0, 60)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s.slice(0, 280))
    if (out.length >= max) break
  }
  return out
}

export function buildDraftScaffold({ title, posture, corrections, attorneyPersona, section101, features, gaps }) {
  const f = features.length ? features : ['[INVENTOR GAP — describe the core technical combination in one sentence]']
  const featureList = f.map((item, i) => `${i + 1}. ${item}`).join('\n')
  const lines = []
  lines.push(`# ${title}\n`)
  lines.push(`> **Status: AI-PREPARED DRAFT SCAFFOLD — NOT FILED — NOT LEGAL ADVICE.** Sally is not a registered US patent attorney and does not impersonate one. A registered practitioner must review, complete, and file this application.${attorneyPersona ? ' (You asked Sally to act as counsel; Sally declines that persona and assists as a drafting aide instead.)' : ''}\n`)
  if (corrections.length) lines.push(`## Filing corrections\n${corrections.map(c => `- ${c}`).join('\n')}\n`)
  if (section101) lines.push(`## § 101 screen\n${section101}\n`)
  lines.push(`## 1. Title\n${title}\n`)
  lines.push(`## 2. Field of the Invention\nThis invention relates to the technical features listed below. [INVENTOR GAP — one paragraph situating the field; do not copy the background here.]\n\n${featureList}\n`)
  lines.push(`## 3. Background and Problem Solved\n[INVENTOR GAP — closest known approaches and their concrete technical shortcomings. Do not admit prior art beyond what is true; admissions here can be used against patentability.]\n`)
  lines.push(`## 4. Summary of the Invention\nIn one embodiment, a system combining:\n${featureList}\n\n[INVENTOR GAP — add the technical effect each combination achieves.]\n`)
  lines.push(`## 5. Detailed Description of Preferred Embodiments\n### Architecture\n[INVENTOR GAP — step-by-step data flow. Reference drawings as Figure 1, Figure 2; drawings are REQUIRED for a complete filing.]\n\n### Embodiment A (primary)\n${f[0] || '[INVENTOR GAP]'}\n\n### Alternative embodiments\n${f.slice(1).map(item => `- ${item}`).join('\n') || '- [INVENTOR GAP — at least one fallback embodiment to support dependent claims.]'}\n`)
  lines.push(`## 6. Claim set (AI SKELETON — no § 112 support verified)\n**Claim 1 (independent method).** A computer-implemented method comprising: ${f.slice(0, 4).join('; ') || '[steps]'}.\n\n**Claim 2 (independent system).** A system configured to perform the method of claim 1, comprising the architecture of Embodiment A.\n`)
  f.slice(1, 6).forEach((item, i) => lines.push(`**Claim ${i + 3} (dependent).** The ${i % 2 ? 'system of claim 2' : 'method of claim 1'}, further comprising: ${item}.\n`))
  if (f.length < 2) lines.push('**Further dependent claims.** [INVENTOR GAP — add at least 3 dependent claims narrowing independent claims; each limitation must find literal support in Section 5.]\n')
  lines.push(`## 7. Abstract\n${(f[0] || 'An invention.').slice(0, 150)} [INVENTOR GAP — ≤150 words, single paragraph.]\n`)
  lines.push(`## Filing checklist (${posture === 'provisional' ? '§ 111(b) provisional' : posture === 'nonprovisional' ? '§ 111(a) nonprovisional' : 'posture TBD'})\n${posture === 'provisional'
    ? '- [ ] Specification with full § 112 written description and enablement\n- [ ] Drawings (required where necessary to understand the invention)\n- [ ] Provisional cover sheet (SB/16) and fee transmittal\n- [ ] Note: NO claims required, but well-drafted claims help priority; 12-month clock to nonprovisional starts at filing'
    : '- [ ] Specification + claim set with § 112 support mapping per limitation\n- [ ] Drawings with Figure references matching the description\n- [ ] Oath/declaration, application data sheet, fee transmittal\n- [ ] Information Disclosure Statement duty (37 CFR § 1.56) — disclose known prior art\n- [ ] Confirm provisional benefit claim within 12 months if applicable'}\n`)
  if (gaps.length) lines.push(`## Inventor gaps to close before review\n${gaps.map(g => `- [ ] ${g}`).join('\n')}\n`)
  return lines.join('\n')
}
