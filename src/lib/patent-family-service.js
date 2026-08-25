const RELATIONSHIPS=['claims_priority_to','continuation_of','divisional_of','national_phase_of','validation_of','family_equivalent']
const SOURCE_BASIS=['user_supplied','uploaded_document','retrieved_source','live_database']
const safeDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?value:null

export function createsFamilyCycle(links,fromId,toId){
  if(fromId===toId)return true
  const outgoing=new Map();for(const link of links){if(link.relationship_type==='family_equivalent')continue;const list=outgoing.get(link.from_member_id)||[];list.push(link.to_member_id);outgoing.set(link.from_member_id,list)}
  const stack=[toId],seen=new Set();while(stack.length){const current=stack.pop();if(current===fromId)return true;if(seen.has(current))continue;seen.add(current);stack.push(...(outgoing.get(current)||[]))}return false
}

export function familyLayers(members,links){
  const incoming=new Map(members.map(item=>[item.id,0]));for(const link of links)if(link.relationship_type!=='family_equivalent')incoming.set(link.to_member_id,(incoming.get(link.to_member_id)||0)+1)
  const roots=members.filter(item=>!incoming.get(item.id)),layers=[],seen=new Set(),queue=roots.map(item=>({item,depth:0}));if(!queue.length)queue.push(...members.map(item=>({item,depth:0})))
  while(queue.length){const{item,depth}=queue.shift();if(seen.has(item.id))continue;seen.add(item.id);(layers[depth]||=[]).push(item);for(const link of links.filter(link=>link.from_member_id===item.id&&link.relationship_type!=='family_equivalent')){const child=members.find(member=>member.id===link.to_member_id);if(child)queue.push({item:child,depth:depth+1})}}
  for(const member of members)if(!seen.has(member.id))(layers[0]||=[]).push(member)
  return layers
}

async function familyForUser(sql,userId,familyId){const[family]=await sql`SELECT f.*,e.name entity_name FROM patent_families f JOIN ip_entities e ON e.id=f.family_entity_id WHERE f.id=${familyId} AND f.user_id=${userId}`;if(!family)throw new Error('Patent family not found');return family}

export async function getPatentFamily(sql,userId,familyId){
  const family=await familyForUser(sql,userId,familyId),members=await sql`SELECT m.*,e.name,e.canonical_identifier,e.data FROM patent_family_members m JOIN ip_entities e ON e.id=m.patent_entity_id WHERE m.family_id=${family.id} ORDER BY coalesce(m.priority_date,m.filing_date,m.publication_date) NULLS LAST,m.created_at`,links=await sql`SELECT l.*,fm.publication_number from_publication,tm.publication_number to_publication FROM patent_family_links l JOIN patent_family_members fm ON fm.id=l.from_member_id JOIN patent_family_members tm ON tm.id=l.to_member_id WHERE l.family_id=${family.id} ORDER BY l.created_at`
  return{family,members,links,layers:familyLayers(members,links)}
}

export async function listPatentFamilies(sql,userId,matterId){const[matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');return{families:await sql`SELECT f.id,f.name,f.family_type,f.earliest_priority_date,f.source_status,f.updated_at,count(m.id)::int member_count FROM patent_families f LEFT JOIN patent_family_members m ON m.family_id=f.id WHERE f.user_id=${userId} AND f.matter_id=${matter.id} GROUP BY f.id ORDER BY f.updated_at DESC`}}

export async function createPatentFamily(sql,userId,body){
  const[matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');const name=String(body.name||'').trim();if(name.length<2)throw new Error('Family name is required')
  const[entity]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,name,jurisdiction,data,source_status) VALUES(${userId},${matter.id},'patent_family',${name.slice(0,200)},${body.jurisdiction||null},${JSON.stringify({family_type:body.family_type||'declared'})}::jsonb,'user_supplied') RETURNING id`
  const[family]=await sql`INSERT INTO patent_families(user_id,matter_id,family_entity_id,name,family_type,earliest_priority_date) VALUES(${userId},${matter.id},${entity.id},${name.slice(0,200)},${['simple','extended'].includes(body.family_type)?body.family_type:'declared'},${safeDate(body.earliest_priority_date)}) RETURNING id`
  return getPatentFamily(sql,userId,family.id)
}

export async function addPatentFamilyMember(sql,userId,body){
  const family=await familyForUser(sql,userId,body.family_id),publication=String(body.publication_number||'').trim(),application=String(body.application_number||'').trim();if(!publication&&!application)throw new Error('Application or publication number is required')
  const sourceBasis=SOURCE_BASIS.includes(body.source_basis)?body.source_basis:'user_supplied';if(sourceBasis==='live_database'&&!body.search_run_id)throw new Error('Live database members require a completed search run')
  if(body.search_run_id){const[run]=await sql`SELECT id FROM professional_search_runs WHERE id=${body.search_run_id} AND user_id=${userId} AND matter_id=${family.matter_id} AND status='completed'`;if(!run)throw new Error('Completed search run not found')}
  const[entity]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${userId},${family.matter_id},'patent',${publication||application},${String(body.title||publication||application).slice(0,250)},${body.jurisdiction||null},${JSON.stringify({application_number:application||null,publication_number:publication||null,kind_code:body.kind_code||null,legal_status:body.legal_status||'unknown'})}::jsonb,${sourceBasis==='user_supplied'?'user_supplied':'retrieved'}) RETURNING id`
  const verifiedAt=body.search_run_id?new Date():null,[member]=await sql`INSERT INTO patent_family_members(family_id,patent_entity_id,application_number,publication_number,jurisdiction,kind_code,filing_date,priority_date,publication_date,grant_date,legal_status,source_basis,source_reference,verified_at) VALUES(${family.id},${entity.id},${application||null},${publication||null},${body.jurisdiction||null},${body.kind_code||null},${safeDate(body.filing_date)},${safeDate(body.priority_date)},${safeDate(body.publication_date)},${safeDate(body.grant_date)},${body.legal_status||'unknown'},${sourceBasis},${body.source_reference||body.search_run_id||null},${verifiedAt}) RETURNING id`
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,confidence) VALUES(${userId},${family.matter_id},${entity.id},'MEMBER_OF_FAMILY',${family.family_entity_id},${JSON.stringify({family_member_id:member.id,source_basis:sourceBasis})}::jsonb,${verifiedAt?1:null}) ON CONFLICT(from_entity_id,relationship_type,to_entity_id) DO UPDATE SET data=excluded.data,confidence=excluded.confidence`
  await sql`UPDATE patent_families SET earliest_priority_date=least(coalesce(earliest_priority_date,${safeDate(body.priority_date)}),coalesce(${safeDate(body.priority_date)},earliest_priority_date)),updated_at=now() WHERE id=${family.id}`
  return getPatentFamily(sql,userId,family.id)
}

export async function linkPatentFamilyMembers(sql,userId,body){
  const family=await familyForUser(sql,userId,body.family_id);if(!RELATIONSHIPS.includes(body.relationship_type))throw new Error('Invalid family relationship')
  const members=await sql`SELECT id,patent_entity_id FROM patent_family_members WHERE family_id=${family.id} AND id=ANY(${[body.from_member_id,body.to_member_id]}::uuid[])`;if(members.length!==2)throw new Error('Family member not found')
  const existing=await sql`SELECT from_member_id,to_member_id,relationship_type FROM patent_family_links WHERE family_id=${family.id}`;if(body.relationship_type!=='family_equivalent'&&createsFamilyCycle(existing,body.from_member_id,body.to_member_id))throw new Error('Family relationship would create a cycle')
  const sourceBasis=SOURCE_BASIS.includes(body.source_basis)?body.source_basis:'user_supplied';let verifiedAt=null
  if(body.source_passage_id){const[passage]=await sql`SELECT sp.id,s.verified_at FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.source_passage_id} AND s.user_id=${userId} AND s.matter_id=${family.matter_id}`;if(!passage)throw new Error('Source passage not found');verifiedAt=passage.verified_at||null}
  if(sourceBasis==='live_database'){const[run]=body.search_run_id?await sql`SELECT id FROM professional_search_runs WHERE id=${body.search_run_id} AND user_id=${userId} AND matter_id=${family.matter_id} AND status='completed'`:[];if(!run)throw new Error('Live database links require a completed search run');verifiedAt=new Date()}
  const[link]=await sql`INSERT INTO patent_family_links(family_id,from_member_id,to_member_id,relationship_type,source_basis,source_passage_id,note,verified_at) VALUES(${family.id},${body.from_member_id},${body.to_member_id},${body.relationship_type},${sourceBasis},${body.source_passage_id||null},${String(body.note||'').slice(0,2000)||null},${verifiedAt}) ON CONFLICT(family_id,from_member_id,to_member_id,relationship_type) DO UPDATE SET source_basis=excluded.source_basis,source_passage_id=excluded.source_passage_id,note=excluded.note,verified_at=excluded.verified_at RETURNING id`
  const from=members.find(item=>item.id===body.from_member_id),to=members.find(item=>item.id===body.to_member_id);await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,confidence) VALUES(${userId},${family.matter_id},${from.patent_entity_id},${body.relationship_type.toUpperCase()},${to.patent_entity_id},${JSON.stringify({family_link_id:link.id,source_basis:sourceBasis})}::jsonb,${verifiedAt?1:null}) ON CONFLICT(from_entity_id,relationship_type,to_entity_id) DO UPDATE SET data=excluded.data,confidence=excluded.confidence`
  return getPatentFamily(sql,userId,family.id)
}
