const SUPPORT_TYPES=['supports','contradicts','distinguishes','background']
const METHODS=['official_database','official_web','uploaded_original','manual_review']

export function assessPropositionEvidence(sources,{contraryAuthorityChecked=false}={}){
  const supporting=sources.filter(item=>item.support_type==='supports'),contrary=sources.filter(item=>item.support_type==='contradicts'),verified=supporting.filter(item=>item.verified_at),verifiedPrimary=verified.filter(item=>Number(item.authority_tier)===1),currentVerified=verified.filter(item=>item.authority_status==='current')
  let verification_status='pending',confidence='insufficient'
  if(!supporting.length&&contrary.length)verification_status='rejected'
  else if(supporting.length){verification_status=verified.length&&contraryAuthorityChecked?'supported':'qualified';confidence=verified.length?'moderate':'low';if(verifiedPrimary.length&&currentVerified.length&&contraryAuthorityChecked&&!contrary.length)confidence='high';if(contrary.length&&confidence==='high')confidence='moderate'}
  return{verification_status,confidence,counts:{supporting:supporting.length,contrary:contrary.length,distinguishing:sources.filter(item=>item.support_type==='distinguishes').length,verified_supporting:verified.length,verified_primary:verifiedPrimary.length,current_verified:currentVerified.length},gaps:[!supporting.length?'no_supporting_passage':null,supporting.length&&!verified.length?'support_not_verified':null,!contraryAuthorityChecked?'contrary_authority_not_checked':null].filter(Boolean)}
}

async function assertMatter(sql,userId,matterId){const[matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');return matter}
async function propositionForUser(sql,userId,propositionId){const[item]=await sql`SELECT p.* FROM legal_propositions p JOIN matters m ON m.id=p.matter_id WHERE p.id=${propositionId} AND p.user_id=${userId} AND m.user_id=${userId}`;if(!item)throw new Error('Proposition not found');return item}

export async function listVerificationDesk(sql,userId,matterId){
  await assertMatter(sql,userId,matterId)
  const propositions=await sql`SELECT p.*,count(ps.passage_id)::int source_count,count(ps.passage_id) FILTER(WHERE ps.support_type='supports')::int support_count,count(ps.passage_id) FILTER(WHERE ps.support_type='contradicts')::int contrary_count FROM legal_propositions p LEFT JOIN proposition_sources ps ON ps.proposition_id=p.id WHERE p.user_id=${userId} AND p.matter_id=${matterId} GROUP BY p.id ORDER BY p.updated_at DESC`
  const passages=await sql`SELECT sp.id passage_id,sp.locator_type,sp.locator,left(sp.content,700) content,s.id source_id,s.title,s.citation,s.source_type,s.authority_tier,s.authority_status,s.official_url,s.verified_at FROM legal_sources s JOIN source_passages sp ON sp.source_id=s.id WHERE s.user_id=${userId} AND s.matter_id=${matterId} ORDER BY s.authority_tier,s.created_at DESC LIMIT 500`
  return{propositions,passages}
}

export async function getProposition(sql,userId,propositionId){
  const proposition=await propositionForUser(sql,userId,propositionId)
  const sources=await sql`SELECT ps.support_type,ps.verification_note,ps.quote,ps.quote_match,sp.id passage_id,sp.locator_type,sp.locator,sp.content,s.id source_id,s.title,s.citation,s.source_type,s.authority_tier,s.jurisdiction,s.authority_status,s.official_url,s.retrieval_method,s.verified_at,(SELECT row_to_json(r) FROM source_verification_reviews r WHERE r.source_id=s.id ORDER BY r.reviewed_at DESC LIMIT 1) verification_review FROM proposition_sources ps JOIN source_passages sp ON sp.id=ps.passage_id JOIN legal_sources s ON s.id=sp.source_id WHERE ps.proposition_id=${proposition.id} ORDER BY CASE ps.support_type WHEN 'supports' THEN 1 WHEN 'contradicts' THEN 2 WHEN 'distinguishes' THEN 3 ELSE 4 END,s.authority_tier`
  const events=await sql`SELECT * FROM proposition_verification_events WHERE proposition_id=${proposition.id} ORDER BY created_at DESC LIMIT 50`
  return{proposition,sources,events,assessment:assessPropositionEvidence(sources,{contraryAuthorityChecked:proposition.contrary_authority_checked})}
}

export async function createProposition(sql,userId,body){await assertMatter(sql,userId,body.matter_id);const text=String(body.proposition||'').trim();if(text.length<5)throw new Error('A material legal proposition is required');const[item]=await sql`INSERT INTO legal_propositions(user_id,matter_id,proposition,issue,jurisdiction) VALUES(${userId},${body.matter_id},${text.slice(0,5000)},${String(body.issue||'').slice(0,500)||null},${body.jurisdiction||null}) RETURNING id`;return getProposition(sql,userId,item.id)}

export async function attachPropositionSource(sql,userId,body){
  const proposition=await propositionForUser(sql,userId,body.proposition_id);if(!SUPPORT_TYPES.includes(body.support_type))throw new Error('Invalid support type')
  const[passage]=await sql`SELECT sp.id,sp.content FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.passage_id} AND s.user_id=${userId} AND s.matter_id=${proposition.matter_id}`;if(!passage)throw new Error('Source passage not found')
  let quote=null,quoteMatch='unchecked'
  if(body.quote!==undefined&&body.quote!==null&&String(body.quote).trim()!==''){
    quote=String(body.quote).slice(0,4000)
    const {verifyQuote}=await import('./citation-service.js')
    quoteMatch=verifyQuote(passage.content,quote)
    if(quoteMatch==='missing')throw new Error('Quote not found in the cited passage — check the exact wording and locator')
  }
  await sql`INSERT INTO proposition_sources(proposition_id,passage_id,support_type,verification_note,quote,quote_match) VALUES(${proposition.id},${passage.id},${body.support_type},${String(body.verification_note||'').slice(0,2000)||null},${quote},${quoteMatch}) ON CONFLICT(proposition_id,passage_id) DO UPDATE SET support_type=excluded.support_type,verification_note=excluded.verification_note,quote=excluded.quote,quote_match=excluded.quote_match`;await sql`UPDATE legal_propositions SET updated_at=now() WHERE id=${proposition.id}`;return getProposition(sql,userId,proposition.id)
}

export async function reviewLegalSource(sql,userId,body){
  const[source]=await sql`SELECT s.* FROM legal_sources s JOIN matters m ON m.id=s.matter_id WHERE s.id=${body.source_id} AND s.user_id=${userId} AND m.user_id=${userId}`;if(!source)throw new Error('Legal source not found');if(!METHODS.includes(body.verification_method))throw new Error('Invalid verification method')
  const existence=body.existence_confirmed===true,pinpoint=body.pinpoint_confirmed===true,current=body.current_status_checked===true,[review]=await sql`INSERT INTO source_verification_reviews(user_id,source_id,existence_confirmed,pinpoint_confirmed,current_status_checked,verification_method,note) VALUES(${userId},${source.id},${existence},${pinpoint},${current},${body.verification_method},${String(body.note||'').slice(0,3000)||null}) RETURNING *`
  await sql`UPDATE legal_sources SET verified_at=${existence&&pinpoint&&current?new Date():null} WHERE id=${source.id}`
  return{source_id:source.id,verified:existence&&pinpoint&&current,review}
}

export async function evaluateProposition(sql,userId,body){
  const proposition=await propositionForUser(sql,userId,body.proposition_id),sources=await sql`SELECT ps.support_type,s.authority_tier,s.authority_status,s.verified_at FROM proposition_sources ps JOIN source_passages sp ON sp.id=ps.passage_id JOIN legal_sources s ON s.id=sp.source_id WHERE ps.proposition_id=${proposition.id}`,contraryAuthorityChecked=body.contrary_authority_checked===true,assessment=assessPropositionEvidence(sources,{contraryAuthorityChecked})
  await sql`UPDATE legal_propositions SET confidence=${assessment.confidence},verification_status=${assessment.verification_status},contrary_authority_checked=${contraryAuthorityChecked},verified_at=${assessment.verification_status==='supported'?new Date():null},updated_at=now() WHERE id=${proposition.id}`
  await sql`INSERT INTO proposition_verification_events(user_id,proposition_id,previous_status,new_status,previous_confidence,new_confidence,rationale) VALUES(${userId},${proposition.id},${proposition.verification_status},${assessment.verification_status},${proposition.confidence},${assessment.confidence},${JSON.stringify(assessment)}::jsonb)`
  return getProposition(sql,userId,proposition.id)
}
