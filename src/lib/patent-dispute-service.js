import {parsePatentClaims} from './patent-claim-service.js'

const clean=value=>String(value||'').replace(/\s+/g,' ').trim()

export function extractPatentMetadata(passages,sourceTitle=''){
  const text=passages.map(item=>item.content).join('\n')
  const publication=text.match(/\b((?:EP|US|WO|IN|GB|DE|FR|JP|CN|KR|AU|CA)\s?\d[\dA-Z/.-]{4,})\b/i)?.[1]?.replace(/\s+/g,'')||null
  const title=passages.find(item=>/\btitle\b/i.test(item.content))?.content?.slice(0,240)||sourceTitle||publication||'Target patent'
  const applicant=text.match(/\b(?:applicant|assignee|owner)\s*[:\-]\s*([^\n.;]{3,120})/i)?.[1]||null
  const priority=text.match(/\b(?:priority|filing)\s+date\s*[:\-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})/i)?.[1]||null
  return{publication_number:publication,title:clean(title),applicant:applicant?clean(applicant):null,priority_date:priority}
}

export function extractClaimsText(passages){
  const joined=passages.map(item=>item.content).join('\n')
  const claimsMatch=joined.match(/\bclaims?\b[\s\S]{0,40}\n([\s\S]{0,120000})/i)
  if(claimsMatch)return claimsMatch[1].trim()
  const numbered=joined.match(/(?:^|\n)\s*1[.)]\s+(?:a|an|the)\s+[\s\S]{120,}/i)
  return numbered?numbered[0].trim():joined.slice(0,120000)
}

export function buildDisputeReviewChecklist({claims=[],jurisdiction,warnings=[]}){
  return[
    'Confirm jurisdiction, forum, and applicable opposition / revocation procedure.',
    'Verify patent legal status, term, and any pending appeal or limitation.',
    'Lawyer-approve every claim selected for challenge and every ground pleaded.',
    'Verify prior-art timing, enablement, and public availability for each reference.',
    'Review prosecution-history estoppel before relying on amended claim scope.',
    claims.length?`Review AI-prepared analysis for ${claims.filter(c=>c.claim_type==='independent').length} independent claim(s).`:'Parse and approve target patent claims before filing.',
    ...warnings
  ]
}

export function buildOppositionDraft({metadata,claims,passages,jurisdiction,plan,priorArtProject,groundsPassages=[]}){
  const independent=claims.filter(item=>item.claim_type==='independent').slice(0,5)
  const cite=(passage,text=passage.content)=>`${clean(text).slice(0,500)} _(${passage.source_title}, ${passage.locator})_`
  const claimSections=independent.map(claim=>{
    const elements=(claim.elements||[]).slice(0,8)
    return`### Claim ${claim.claim_number} (${claim.claim_type})\n\n> ${clean(claim.claim_text).slice(0,1200)}\n\n**Proposed challenge themes (lawyer review required)**\n${elements.length?elements.map((element,index)=>`- Limitation ${index+1}: ${clean(element)} — _AI PREPARED; verify disclosure and timing._`).join('\n'):'- Claim text requires lawyer-approved limitation breakdown.'}\n`
  }).join('\n')
  const evidence=groundsPassages.slice(0,6).map(item=>`- ${cite(item)}`).join('\n')||'- No pinpoint invalidity evidence has been lawyer-verified yet.'
  return`# Patent opposition / invalidity draft\n\n**Status:** AI PREPARED — NOT FILED — LAWYER REVIEW REQUIRED\n\n## 1. Target patent\n- **Publication / identifier:** ${metadata.publication_number||'Unresolved — confirm from uploaded patent'}\n- **Title:** ${metadata.title}\n- **Applicant / proprietor:** ${metadata.applicant||'Not extracted'}\n- **Priority / filing date:** ${metadata.priority_date||'Not extracted'}\n- **Territory / procedure:** ${jurisdiction||plan.jurisdiction||'Specify jurisdiction and forum'}\n\n## 2. Relief sought\nThe opponent seeks revocation / opposition / invalidity of the target patent, or limitation of the claims, on grounds including lack of novelty, lack of inventive step, insufficiency, added matter, and/or ineligible subject matter, **subject to jurisdiction-specific availability and lawyer approval**.\n\n## 3. Grounds summary\n| Ground | AI assessment | Lawyer action |\n|---|---|---|\n| Novelty (Art. 54 EPC / §102 US) | Research prepared; no verified single-reference mapping | Accept references and limitation mappings |\n| Inventive step | Framework not auto-completed | Select closest prior art and approve obviousness analysis |\n| Insufficiency / support | Not auto-concluded | Review specification support for each disputed limitation |\n| Added matter / disclaimer | Not auto-concluded | Compare as-filed vs granted claims if prosecution history available |\n\n## 4. Claims challenged\n${claimSections||'_No parsed claims available — upload a patent PDF with numbered claims._'}\n\n## 5. Evidence and prior-art plan\n${evidence}\n\n- Prior-art project: **${priorArtProject?.project?.title||priorArtProject?.title||'Prepared during automation'}**\n- Search strategies prepared: **${priorArtProject?.strategies?.length||0}**\n\n## 6. Filing checklist\n${buildDisputeReviewChecklist({claims,jurisdiction:warnings}).map(item=>`- [ ] ${item}`).join('\n')}\n\n## 7. Next steps in chat\n- _"Edit section 4 to focus on claim 1 only"_\n- _"Add prior art reference EP1234567"_\n- _"Export opposition as DOCX"_\n\n**No legal conclusion, filing date, or service has been made. This draft is an automation-prepared research artifact.**`
}

export function summarizeUploadedDocument(passages,sourceTitle){
  const text=passages.map(item=>item.content).join('\n')
  const claimsText=extractClaimsText(passages)
  const claims=parsePatentClaims(claimsText)
  const patentLike=claims.length>0||/\bpatent\b/i.test(text)
  const trademarkLike=/\b(trademark|trade mark|nice class|goods and services)\b/i.test(text)
  const contractLike=/\b(agreement|license|assignment|whereas|party|indemn)\b/i.test(text)
  let docType='general document'
  if(patentLike)docType='patent / patent application'
  else if(trademarkLike)docType='trademark-related document'
  else if(contractLike)docType='IP transaction document'
  return{
    source_title:sourceTitle,
    document_type:docType,
    passage_count:passages.length,
    independent_claims:claims.filter(item=>item.claim_type==='independent').length,
    total_claims:claims.length,
    preview:clean(passages[0]?.content||'').slice(0,280),
    suggested_actions:patentLike?['File a dispute / opposition against this patent','Run prior art search','Assess novelty of claim 1','Build a claim chart']:trademarkLike?['Run trademark clearance','Compare similar marks','Translate / transliterate this mark']:contractLike?['Review this agreement','Draft an IP licence summary','Verify key propositions in verification desk']:['Summarize this document','Extract chronology','Verify material propositions']
  }
}
