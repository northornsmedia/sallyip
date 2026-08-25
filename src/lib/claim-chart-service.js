const STOP=new Set(['with','that','this','from','into','wherein','comprising','having','being','said','each','such','their','which','thereof'])

export function evidenceOverlap(elementText,passageText){
  const normalize=token=>token.replace(/(ing|ed|es|s)$/,'').replace(/e$/,'')
  const tokens=text=>new Set((String(text).toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g)||[]).filter(token=>!STOP.has(token)).map(normalize).filter(token=>token.length>2))
  const element=tokens(elementText),passage=tokens(passageText)
  if(!element.size)return 0
  let shared=0;for(const token of element)if(passage.has(token))shared++
  return Math.round(shared/element.size*1000)/1000
}

async function assertMatter(sql,userId,matterId){const[matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');return matter}

export async function listClaimChartInputs(sql,userId,matterId){
  await assertMatter(sql,userId,matterId)
  const claims=await sql`SELECT pc.id,pc.patent_entity_id,pc.claim_number,pc.claim_type,pc.claim_text,p.name patent_name,p.canonical_identifier publication_number FROM patent_claims pc JOIN ip_entities p ON p.id=pc.patent_entity_id WHERE pc.user_id=${userId} AND pc.matter_id=${matterId} ORDER BY p.name,pc.claim_number`
  const charts=await sql`SELECT cc.id,cc.title,cc.chart_type,cc.status,cc.updated_at,pc.claim_number,p.name patent_name,t.name target_name,count(r.id)::int row_count,count(r.id) FILTER(WHERE r.review_status='accepted')::int accepted_count FROM claim_charts cc JOIN patent_claims pc ON pc.id=cc.claim_id JOIN ip_entities p ON p.id=cc.patent_entity_id JOIN ip_entities t ON t.id=cc.target_entity_id LEFT JOIN claim_chart_rows r ON r.chart_id=cc.id WHERE cc.user_id=${userId} AND cc.matter_id=${matterId} GROUP BY cc.id,pc.claim_number,p.name,t.name ORDER BY cc.updated_at DESC`
  return{claims,charts}
}

export async function getClaimChart(sql,userId,chartId){
  const[chart]=await sql`SELECT cc.*,pc.claim_number,pc.claim_text,p.name patent_name,p.canonical_identifier publication_number,t.name target_name FROM claim_charts cc JOIN patent_claims pc ON pc.id=cc.claim_id JOIN ip_entities p ON p.id=cc.patent_entity_id JOIN ip_entities t ON t.id=cc.target_entity_id WHERE cc.id=${chartId} AND cc.user_id=${userId}`
  if(!chart)throw new Error('Claim chart not found')
  const rows=await sql`SELECT r.*,e.ordinal,e.element_text,s.title source_title,s.citation,sp.locator_type,sp.locator,sp.content evidence_content,s.official_url,s.verified_at FROM claim_chart_rows r JOIN patent_claim_elements e ON e.id=r.claim_element_id LEFT JOIN source_passages sp ON sp.id=r.evidence_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE r.chart_id=${chart.id} AND r.user_id=${userId} ORDER BY e.ordinal`
  return{chart,rows}
}

export async function createClaimChart(sql,userId,body){
  await assertMatter(sql,userId,body.matter_id)
  const[claim]=await sql`SELECT pc.*,p.name patent_name FROM patent_claims pc JOIN ip_entities p ON p.id=pc.patent_entity_id WHERE pc.id=${body.claim_id} AND pc.user_id=${userId} AND pc.matter_id=${body.matter_id}`
  if(!claim)throw new Error('Patent claim not found')
  const chartType=body.chart_type==='prior_art'?'prior_art':'infringement',targetName=String(body.target_name||'').trim();if(targetName.length<2)throw new Error('Target name is required')
  const entityType=chartType==='prior_art'?'document':'product'
  const[target]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,name,jurisdiction,data,source_status) VALUES(${userId},${body.matter_id},${entityType},${targetName.slice(0,200)},${body.jurisdiction||null},${JSON.stringify({role:chartType==='prior_art'?'prior_art_reference':'accused_product'})}::jsonb,'user_supplied') RETURNING id,name`
  const title=String(body.title||`${claim.patent_name} claim ${claim.claim_number} — ${targetName}`).slice(0,240)
  const[chart]=await sql`INSERT INTO claim_charts(user_id,matter_id,patent_entity_id,claim_id,target_entity_id,chart_type,title) VALUES(${userId},${body.matter_id},${claim.patent_entity_id},${claim.id},${target.id},${chartType},${title}) RETURNING *`
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data) VALUES(${userId},${body.matter_id},${claim.claim_entity_id},${chartType==='prior_art'?'CHARTED_AGAINST_PRIOR_ART':'CHARTED_AGAINST_PRODUCT'},${target.id},${JSON.stringify({chart_id:chart.id})}::jsonb) ON CONFLICT(from_entity_id,relationship_type,to_entity_id) DO UPDATE SET data=excluded.data`
  const elements=await sql`SELECT id,ordinal,element_text FROM patent_claim_elements WHERE claim_id=${claim.id} ORDER BY ordinal`
  const passages=await sql`SELECT sp.id,sp.content FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE s.user_id=${userId} AND s.matter_id=${body.matter_id} ORDER BY s.authority_tier,sp.created_at DESC LIMIT 500`
  for(const element of elements){let best=null,score=0;for(const passage of passages){const candidate=evidenceOverlap(element.element_text,passage.content);if(candidate>score){score=candidate;best=passage}}const suggested=score>=.2?best:null;await sql`INSERT INTO claim_chart_rows(user_id,matter_id,chart_id,claim_element_id,target_entity_id,chart_type,evidence_passage_id,mapping_status,confidence,comments) VALUES(${userId},${body.matter_id},${chart.id},${element.id},${target.id},${chartType},${suggested?.id||null},'unmapped',${suggested?score:null},${suggested?'Candidate passage suggested by lexical overlap; requires lawyer review.':'No candidate evidence found.'})`}
  return getClaimChart(sql,userId,chart.id)
}

export async function reviewClaimChartRow(sql,userId,body){
  const allowedStatus=['mapped','partial','missing','disputed','unmapped'],allowedReview=['unreviewed','accepted','rejected','needs_evidence']
  if(!allowedStatus.includes(body.mapping_status)||!allowedReview.includes(body.review_status))throw new Error('Invalid review status')
  const[row]=await sql`SELECT r.id,r.review_status,r.chart_id FROM claim_chart_rows r JOIN claim_charts c ON c.id=r.chart_id WHERE r.id=${body.row_id} AND r.user_id=${userId} AND c.user_id=${userId}`;if(!row)throw new Error('Claim chart row not found')
  const evidenceId=body.evidence_passage_id||null;if(evidenceId){const[passage]=await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id JOIN claim_charts c ON c.matter_id=s.matter_id WHERE sp.id=${evidenceId} AND c.id=${row.chart_id} AND c.user_id=${userId}`;if(!passage)throw new Error('Evidence passage not found')}
  await sql`UPDATE claim_chart_rows SET mapping_status=${body.mapping_status},review_status=${body.review_status},evidence_passage_id=${evidenceId},comments=${String(body.comments||'').slice(0,4000)||null},reviewed_at=${body.review_status==='unreviewed'?null:new Date()},updated_at=now() WHERE id=${row.id}`
  await sql`INSERT INTO claim_chart_review_events(user_id,chart_id,row_id,previous_status,new_status,note) VALUES(${userId},${row.chart_id},${row.id},${row.review_status},${body.review_status},${String(body.comments||'').slice(0,1000)||null})`
  await sql`UPDATE claim_charts SET status='in_review',updated_at=now() WHERE id=${row.chart_id} AND status='draft'`
  return getClaimChart(sql,userId,row.chart_id)
}

export async function acceptSuggestedClaimChartRows(sql,userId,body){
  const[chart]=await sql`SELECT id FROM claim_charts WHERE id=${body.chart_id} AND user_id=${userId}`
  if(!chart)throw new Error('Claim chart not found')
  const rows=await sql`SELECT id,review_status FROM claim_chart_rows WHERE chart_id=${chart.id} AND user_id=${userId} AND evidence_passage_id IS NOT NULL AND review_status<>'accepted'`
  if(!rows.length)throw new Error('No unreviewed evidence suggestions found')
  const note=String(body.comments||'Candidate evidence accepted through bulk reviewer confirmation.').slice(0,1000)
  for(const row of rows){await sql`UPDATE claim_chart_rows SET mapping_status='mapped',review_status='accepted',comments=${note},reviewed_at=now(),updated_at=now() WHERE id=${row.id}`;await sql`INSERT INTO claim_chart_review_events(user_id,chart_id,row_id,previous_status,new_status,note) VALUES(${userId},${chart.id},${row.id},${row.review_status},'accepted',${note})`}
  const[remaining]=await sql`SELECT count(*)::int count FROM claim_chart_rows WHERE chart_id=${chart.id} AND review_status<>'accepted'`
  await sql`UPDATE claim_charts SET status=${remaining.count===0?'reviewed':'in_review'},updated_at=now() WHERE id=${chart.id}`
  return getClaimChart(sql,userId,chart.id)
}
