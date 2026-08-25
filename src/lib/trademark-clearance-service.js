import {compareTrademarks} from './trademark-similarity-service.js'

const CHANNELS=['matter_graph','official_registry','common_law','company_names','domains','social','marketplaces']
const RISK_ORDER={unassessed:0,limited:1,low:2,moderate:3,high:4}
const classes=value=>Array.isArray(value)?value.map(Number).filter(item=>item>=1&&item<=45):[]
async function projectForUser(sql,userId,projectId){const[project]=await sql`SELECT p.*,t.name target_mark,t.data target_data FROM trademark_clearance_projects p JOIN ip_entities t ON t.id=p.target_mark_entity_id WHERE p.id=${projectId} AND p.user_id=${userId}`;if(!project)throw new Error('Clearance project not found');return project}

async function saveAnalysis(sql,userId,project,candidate,sourceBasis,sourceReference){
  const targetClasses=classes(project.nice_classes),candidateClasses=classes(candidate.data?.nice_classes),analysis=compareTrademarks({markA:project.target_mark,markB:candidate.name,classesA:targetClasses,classesB:candidateClasses,goodsA:project.goods_services||'',goodsB:candidate.data?.goods_services||'',jurisdiction:project.jurisdictions?.join(', ')||null})
  const[record]=await sql`INSERT INTO trademark_similarity_analyses(user_id,matter_id,mark_a_entity_id,mark_b_entity_id,jurisdiction,visual_score,phonetic_score,conceptual_score,goods_services_score,overall_score,factors) VALUES(${userId},${project.matter_id},${project.target_mark_entity_id},${candidate.id},${project.jurisdictions?.join(', ')||null},${analysis.visual_score},${analysis.phonetic_score},${analysis.conceptual_score},${analysis.goods_services_score},${analysis.overall_score},${JSON.stringify({...analysis.factors,clearance_project_id:project.id})}::jsonb) RETURNING id`
  await sql`INSERT INTO trademark_clearance_candidates(project_id,candidate_entity_id,analysis_id,source_basis,source_reference) VALUES(${project.id},${candidate.id},${record.id},${sourceBasis},${sourceReference||null}) ON CONFLICT(project_id,candidate_entity_id) DO UPDATE SET analysis_id=excluded.analysis_id,source_basis=excluded.source_basis,source_reference=excluded.source_reference`
  return analysis
}

export function clearanceGaps(coverage){return CHANNELS.filter(channel=>coverage.find(item=>item.channel===channel)?.status!=='completed')}

export async function getClearanceProject(sql,userId,projectId){
  const project=await projectForUser(sql,userId,projectId)
  const coverage=await sql`SELECT * FROM trademark_clearance_coverage WHERE project_id=${project.id} ORDER BY CASE channel WHEN 'matter_graph' THEN 1 WHEN 'official_registry' THEN 2 WHEN 'common_law' THEN 3 WHEN 'company_names' THEN 4 WHEN 'domains' THEN 5 WHEN 'social' THEN 6 ELSE 7 END`
  const candidates=await sql`SELECT c.*,e.name candidate_mark,e.canonical_identifier,e.jurisdiction,e.data,a.visual_score,a.phonetic_score,a.conceptual_score,a.goods_services_score,a.overall_score,a.factors FROM trademark_clearance_candidates c JOIN ip_entities e ON e.id=c.candidate_entity_id JOIN trademark_similarity_analyses a ON a.id=c.analysis_id WHERE c.project_id=${project.id} ORDER BY a.overall_score DESC`
  return{project,coverage,candidates,research_gaps:clearanceGaps(coverage)}
}

export async function listClearanceProjects(sql,userId,matterId){const[matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');return{projects:await sql`SELECT p.id,p.title,p.status,p.overall_risk,p.updated_at,t.name target_mark,count(c.id)::int candidate_count FROM trademark_clearance_projects p JOIN ip_entities t ON t.id=p.target_mark_entity_id LEFT JOIN trademark_clearance_candidates c ON c.project_id=p.id WHERE p.user_id=${userId} AND p.matter_id=${matter.id} GROUP BY p.id,t.name ORDER BY p.updated_at DESC`}}

export async function createClearanceProject(sql,userId,body){
  const[matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');const mark=String(body.mark||'').trim();if(mark.length<2)throw new Error('Target mark is required')
  const niceClasses=classes(body.nice_classes),jurisdictions=(Array.isArray(body.jurisdictions)?body.jurisdictions:[body.jurisdiction]).filter(Boolean).map(String)
  const[target]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,name,jurisdiction,data,source_status) VALUES(${userId},${matter.id},'trademark',${mark.slice(0,200)},${jurisdictions.join(', ')||null},${JSON.stringify({nice_classes:niceClasses,goods_services:String(body.goods_services||'')})}::jsonb,'user_supplied') RETURNING id`
  const[project]=await sql`INSERT INTO trademark_clearance_projects(user_id,matter_id,target_mark_entity_id,title,jurisdictions,nice_classes,goods_services) VALUES(${userId},${matter.id},${target.id},${String(body.title||`${mark} clearance`).slice(0,240)},${jurisdictions},${niceClasses},${String(body.goods_services||'').slice(0,5000)||null}) RETURNING id`
  for(const channel of CHANNELS)await sql`INSERT INTO trademark_clearance_coverage(project_id,channel) VALUES(${project.id},${channel})`
  return getClearanceProject(sql,userId,project.id)
}

export async function screenMatterTrademarks(sql,userId,projectId){
  const project=await projectForUser(sql,userId,projectId),candidates=await sql`SELECT id,name,canonical_identifier,jurisdiction,data FROM ip_entities WHERE user_id=${userId} AND matter_id=${project.matter_id} AND entity_type='trademark' AND id<>${project.target_mark_entity_id}`
  let highest='unassessed';for(const candidate of candidates){const analysis=await saveAnalysis(sql,userId,project,candidate,'matter_graph',candidate.canonical_identifier);if(RISK_ORDER[analysis.risk_band]>RISK_ORDER[highest])highest=analysis.risk_band}
  await sql`UPDATE trademark_clearance_coverage SET status='completed',source_basis='retrieved_source',result_count=${candidates.length},note='Screened trademark entities already stored in this matter; no external registry search was performed.',searched_at=now() WHERE project_id=${project.id} AND channel='matter_graph'`
  await sql`UPDATE trademark_clearance_projects SET status='in_review',overall_risk=${highest},updated_at=now() WHERE id=${project.id}`
  return getClearanceProject(sql,userId,project.id)
}

export async function addClearanceCandidate(sql,userId,body){
  const project=await projectForUser(sql,userId,body.project_id),sourceBasis=['user_supplied','uploaded_document','retrieved_source'].includes(body.source_basis)?body.source_basis:'user_supplied',mark=String(body.mark||'').trim();if(mark.length<2)throw new Error('Candidate mark is required')
  if(body.source_basis==='live_database')throw new Error('Live database candidates require a completed official search run')
  const[candidate]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${userId},${project.matter_id},'trademark',${body.identifier||null},${mark.slice(0,200)},${body.jurisdiction||null},${JSON.stringify({nice_classes:classes(body.nice_classes),goods_services:String(body.goods_services||''),owner:body.owner||null})}::jsonb,${sourceBasis==='user_supplied'?'user_supplied':'retrieved'}) RETURNING id,name,canonical_identifier,jurisdiction,data`
  const analysis=await saveAnalysis(sql,userId,project,candidate,sourceBasis,body.source_reference||body.identifier)
  await sql`UPDATE trademark_clearance_projects SET status='in_review',overall_risk=CASE WHEN ${RISK_ORDER[analysis.risk_band]}>CASE overall_risk WHEN 'high' THEN 4 WHEN 'moderate' THEN 3 WHEN 'low' THEN 2 WHEN 'limited' THEN 1 ELSE 0 END THEN ${analysis.risk_band} ELSE overall_risk END,updated_at=now() WHERE id=${project.id}`
  return getClearanceProject(sql,userId,project.id)
}

export async function importOfficialSearchRunIntoClearance(sql,userId,projectId,searchRunId){
  const project=await projectForUser(sql,userId,projectId)
  const[run]=await sql`SELECT id,matter_id,provider,status FROM professional_search_runs WHERE id=${searchRunId} AND user_id=${userId} AND matter_id=${project.matter_id} AND provider='euipo_trademark' AND status='completed'`
  if(!run)throw new Error('Completed EUIPO search run not found')
  const candidates=await sql`SELECT e.id,e.name,e.canonical_identifier,e.jurisdiction,e.data,r.external_id FROM professional_search_results r JOIN ip_entities e ON e.id=r.entity_id WHERE r.search_run_id=${run.id} AND e.user_id=${userId}`
  let highest='unassessed'
  for(const candidate of candidates){const analysis=await saveAnalysis(sql,userId,project,candidate,'live_database',candidate.external_id||candidate.canonical_identifier||run.id);if(RISK_ORDER[analysis.risk_band]>RISK_ORDER[highest])highest=analysis.risk_band}
  await sql`UPDATE trademark_clearance_coverage SET status='completed',source_basis='live_database',result_count=${candidates.length},search_run_id=${run.id},note='Imported from a completed EUIPO trademark search run.',searched_at=now() WHERE project_id=${project.id} AND channel='official_registry'`
  await sql`UPDATE trademark_clearance_projects SET status='in_review',overall_risk=CASE WHEN ${RISK_ORDER[highest]}>CASE overall_risk WHEN 'high' THEN 4 WHEN 'moderate' THEN 3 WHEN 'low' THEN 2 WHEN 'limited' THEN 1 ELSE 0 END THEN ${highest} ELSE overall_risk END,updated_at=now() WHERE id=${project.id}`
  return getClearanceProject(sql,userId,project.id)
}

export async function reviewClearanceCandidate(sql,userId,body){
  const allowed=['unreviewed','relevant','irrelevant','potential_conflict','needs_research'];if(!allowed.includes(body.review_status))throw new Error('Invalid review status')
  const[candidate]=await sql`SELECT c.id,c.project_id,c.review_status FROM trademark_clearance_candidates c JOIN trademark_clearance_projects p ON p.id=c.project_id WHERE c.id=${body.candidate_id} AND p.user_id=${userId}`;if(!candidate)throw new Error('Clearance candidate not found')
  const note=String(body.review_note||'').slice(0,4000)||null;await sql`UPDATE trademark_clearance_candidates SET review_status=${body.review_status},review_note=${note},reviewed_at=now() WHERE id=${candidate.id}`;await sql`INSERT INTO trademark_clearance_review_events(user_id,project_id,candidate_id,previous_status,new_status,note) VALUES(${userId},${candidate.project_id},${candidate.id},${candidate.review_status},${body.review_status},${note})`;return getClearanceProject(sql,userId,candidate.project_id)
}
