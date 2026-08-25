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
