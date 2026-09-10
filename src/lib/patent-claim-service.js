const claimStart=/^\s*(\d+)\s*[.\):]\s*/gm

export function parsePatentClaims(text){
  const source=String(text||'').replace(/\r/g,'').trim();if(!source)return[]
  const matches=[...source.matchAll(claimStart)];if(!matches.length)return[]
  return matches.map((match,index)=>{
    const number=Number(match[1]),start=match.index+match[0].length,end=matches[index+1]?.index??source.length,claimText=source.slice(start,end).trim().replace(/\n+/g,' ')
    const dependencyText=claimText.match(/\b(?:claim|claims)\s+((?:\d+\s*(?:,|and|or|-)?\s*)+)/i)?.[1]||''
    const dependsOn=[...new Set((dependencyText.match(/\d+/g)||[]).map(Number).filter(value=>value<number))]
    const elements=splitClaimElements(claimText)
    return{claim_number:number,claim_type:dependsOn.length?'dependent':'independent',depends_on:dependsOn,claim_text:claimText,elements}
  }).filter(claim=>claim.claim_text)
}

export function splitClaimElements(text){
  const cleaned=String(text||'').replace(/\s+/g,' ').trim()
  const chunks=cleaned.split(/;\s*(?:and\s+)?|\bwherein\b|\bcharacteri[sz]ed in that\b/i).map(item=>item.replace(/^[,\s]+|[,\s]+$/g,'')).filter(Boolean)
  if(chunks.length>1)return chunks
  return cleaned.split(/,\s+(?=(?:a|an|the|receiving|generating|determining|transmitting|wherein)\b)/i).map(item=>item.trim()).filter(Boolean)
}

export function buildClaimTree(claims){
  const nodes=new Map(claims.map(claim=>[claim.claim_number,{...claim,children:[]}]))
  for(const claim of nodes.values())for(const parent of claim.depends_on)nodes.get(parent)?.children.push(claim.claim_number)
  return[...nodes.values()].filter(claim=>!claim.depends_on.length)
}

// Canonical dependency-aware decomposition used by claims, prior-art and
// novelty workflows. It preserves the exact claim wording and carries every
// inherited limitation into the effective dependent-claim set.
export function buildEffectiveClaimLimitations(claims = [], claimSetVersion = null) {
  const byNumber = new Map((claims || []).map((claim) => [Number(claim.claim_number), claim]))
  const cache = new Map()

  const visit = (claimNumber, trail = []) => {
    if (cache.has(claimNumber)) return cache.get(claimNumber)
    if (trail.includes(claimNumber)) throw new Error(`Circular claim dependency: ${[...trail, claimNumber].join(' -> ')}`)
    const claim = byNumber.get(claimNumber)
    if (!claim) throw new Error(`Claim ${claimNumber} not found`)
    const own = (claim.elements?.length ? claim.elements : splitClaimElements(claim.claim_text)).map((text, index) => ({
      limitation_id: `${claimSetVersion || 'UNVERSIONED'}:claim-${claimNumber}:limitation-${index + 1}`,
      claim_number: claimNumber,
      ordinal: index + 1,
      exact_text: String(text || '').trim(),
      normalized_concept: String(text || '').replace(/\s+/g, ' ').trim().toLowerCase(),
      dependency_source: claimNumber,
      inherited: false,
      specification_support: claim.specification_support?.[index] || 'UNKNOWN',
      priority_support: claim.priority_support?.[index] || 'UNCERTAIN',
      analysis_status: 'UNREVIEWED',
    }))
    const inherited = []
    for (const parent of claim.depends_on || []) {
      for (const limitation of visit(Number(parent), [...trail, claimNumber]).full_effective_limitations) {
        inherited.push({ ...limitation, inherited: true })
      }
    }
    const deduped = [...inherited, ...own].filter((item, index, all) =>
      all.findIndex((candidate) => candidate.limitation_id === item.limitation_id) === index)
    const result = {
      claim_number: claimNumber,
      claim_text: claim.claim_text,
      claim_type: (claim.depends_on || []).length ? 'dependent' : 'independent',
      depends_on: [...(claim.depends_on || [])],
      inherited_limitations: deduped.filter((item) => item.inherited),
      added_limitations: own,
      full_effective_limitations: deduped,
    }
    cache.set(claimNumber, result)
    return result
  }

  return [...byNumber.keys()].sort((a, b) => a - b).map((number) => visit(number))
}
