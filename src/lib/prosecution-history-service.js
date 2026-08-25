const wordTokens=value=>String(value||'').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)||[]
const unique=value=>[...new Set(value)]

export function analyzeClaimAmendment(priorText,amendedText){
  const before=wordTokens(priorText),after=wordTokens(amendedText)
  if(!before.length||!after.length)return{added_terms:[],removed_terms:[],retained_ratio:null,scope_signal:'insufficient',estoppel_review_required:false,added_matter_review_required:false,admission_candidates:[],explanation:'Both the prior and amended claim text are required for a scope-change screen.'}
  const beforeSet=new Set(before),afterSet=new Set(after),added=unique(after.filter(term=>!beforeSet.has(term))),removed=unique(before.filter(term=>!afterSet.has(term))),retained=before.filter(term=>afterSet.has(term)).length/before.length
  const scopeSignal=added.length&&!removed.length?'potential_narrowing':removed.length&&!added.length?'potential_broadening':added.length||removed.length?'mixed_change':'no_material_text_change'
  return{added_terms:added,removed_terms:removed,retained_ratio:Number(retained.toFixed(4)),scope_signal:scopeSignal,estoppel_review_required:scopeSignal==='potential_narrowing'||scopeSignal==='mixed_change',added_matter_review_required:Boolean(added.length),admission_candidates:[],explanation:scopeSignal==='no_material_text_change'?'No material token-level change was detected.':'This is a deterministic text-change screen only. Claim construction, added matter, disclaimer, and estoppel effects require jurisdiction-specific legal review.'}
}

const allowedTypes=new Set(['filing','office_action','examiner_objection','applicant_response','argument','claim_amendment','interview','allowance','grant','appeal','opposition','other'])
const allowedBasis=new Set(['user_supplied','uploaded_document','retrieved_source','live_database'])

async function patentForUser(sql,userId,matterId,patentId){const[patent]=await sql`SELECT id,name,jurisdiction,canonical_identifier FROM ip_entities WHERE id=${patentId} AND matter_id=${matterId} AND user_id=${userId} AND entity_type='patent'`;if(!patent)throw new Error('Patent entity not found');return patent}

export async function getProsecutionHistory(sql,userId,patentEntityId){
  const[patent]=await sql`SELECT id,name,jurisdiction,canonical_identifier,matter_id FROM ip_entities WHERE id=${patentEntityId} AND user_id=${userId} AND entity_type='patent'`;if(!patent)throw new Error('Patent entity not found')
  const events=await sql`SELECT e.*,a.added_terms,a.removed_terms,a.retained_ratio,a.scope_signal,a.estoppel_review_required,a.added_matter_review_required,a.admission_candidates,a.explanation FROM patent_prosecution_events e LEFT JOIN prosecution_amendment_analyses a ON a.event_id=e.id WHERE e.patent_entity_id=${patent.id} AND e.user_id=${userId} ORDER BY e.sequence,e.event_date NULLS LAST`
  return{patent,events,gaps:{undated_events:events.filter(item=>!item.event_date).length,unreviewed_events:events.filter(item=>item.review_status==='unreviewed').length,unsourced_events:events.filter(item=>!item.source_passage_id).length}}
}

export async function recordProsecutionHistory(sql,userId,body){
  const[matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found')
  const patent=await patentForUser(sql,userId,matter.id,body.patent_entity_id),events=Array.isArray(body.events)?body.events:[]
  if(!events.length||events.length>100)throw new Error('One to 100 prosecution events are required')
  if(body.replace_existing){await sql`DELETE FROM patent_prosecution_events WHERE patent_entity_id=${patent.id} AND user_id=${userId}`}
  for(let index=0;index<events.length;index++){
    const event=events[index],eventType=allowedTypes.has(event.event_type)?event.event_type:'other',basis=allowedBasis.has(event.source_basis)?event.source_basis:'user_supplied',sequence=Number(event.sequence)||index+1,title=String(event.title||eventType.replaceAll('_',' ')).trim().slice(0,240)
    let sourcePassage=null
    if(event.source_passage_id){[sourcePassage]=await sql`SELECT sp.id,s.retrieval_method,s.verified_at FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${event.source_passage_id} AND s.user_id=${userId} AND s.matter_id=${matter.id}`;if(!sourcePassage)throw new Error('Prosecution source passage not found');if(basis==='live_database'&&!['live_database','official_web'].includes(sourcePassage.retrieval_method))throw new Error('Live database provenance requires an official retrieved source')}
    const[entity]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${userId},${matter.id},'event',${`${patent.canonical_identifier||patent.id}:prosecution:${sequence}`},${title},${patent.jurisdiction},${JSON.stringify({event_type:eventType,event_date:event.event_date||null,claim_number:event.claim_number||null})}::jsonb,${sourcePassage?.verified_at?'verified':basis==='user_supplied'?'user_supplied':'retrieved'}) RETURNING id`
    const[record]=await sql`INSERT INTO patent_prosecution_events(user_id,matter_id,patent_entity_id,event_entity_id,event_type,event_date,sequence,title,content,claim_number,prior_claim_text,amended_claim_text,source_passage_id,source_basis) VALUES(${userId},${matter.id},${patent.id},${entity.id},${eventType},${event.event_date||null},${sequence},${title},${String(event.content||'').slice(0,30000)||null},${Number(event.claim_number)||null},${String(event.prior_claim_text||'').slice(0,30000)||null},${String(event.amended_claim_text||'').slice(0,30000)||null},${sourcePassage?.id||null},${basis}) RETURNING id`
    await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,source_id,confidence) VALUES(${userId},${matter.id},${entity.id},'PROSECUTION_EVENT_OF',${patent.id},${JSON.stringify({sequence,event_type:eventType})}::jsonb,${sourcePassage?.id||null},${sourcePassage?.verified_at?1:null}) ON CONFLICT DO NOTHING`
    if(eventType==='claim_amendment'){const analysis=analyzeClaimAmendment(event.prior_claim_text,event.amended_claim_text);await sql`INSERT INTO prosecution_amendment_analyses(event_id,added_terms,removed_terms,retained_ratio,scope_signal,estoppel_review_required,added_matter_review_required,admission_candidates,explanation) VALUES(${record.id},${analysis.added_terms},${analysis.removed_terms},${analysis.retained_ratio},${analysis.scope_signal},${analysis.estoppel_review_required},${analysis.added_matter_review_required},${JSON.stringify(analysis.admission_candidates)}::jsonb,${analysis.explanation})`}
  }
  return getProsecutionHistory(sql,userId,patent.id)
}

export async function reviewProsecutionEvent(sql,userId,body){
  const allowed=new Set(['unreviewed','accepted','rejected','needs_research']);if(!allowed.has(body.review_status))throw new Error('Invalid prosecution review status')
  const[event]=await sql`SELECT e.id,e.review_status,e.patent_entity_id FROM patent_prosecution_events e WHERE e.id=${body.event_id} AND e.user_id=${userId}`;if(!event)throw new Error('Prosecution event not found')
  const note=String(body.review_note||'').trim().slice(0,4000)||null
  await sql`UPDATE patent_prosecution_events SET review_status=${body.review_status},review_note=${note},reviewed_at=now() WHERE id=${event.id}`
  await sql`INSERT INTO prosecution_review_events(user_id,prosecution_event_id,previous_status,new_status,note) VALUES(${userId},${event.id},${event.review_status},${body.review_status},${note})`
  return getProsecutionHistory(sql,userId,event.patent_entity_id)
}
