const clamp=value=>Math.min(100,Math.max(0,Number(value)||0))
const cleanList=value=>[...new Set((Array.isArray(value)?value:[]).map(item=>String(item).trim()).filter(Boolean))].slice(0,40)

export function generatePriorArtStrategies({summary='',concepts=[],ipc=[],cpc=[],applicant='',inventor=''}){
  const terms=cleanList(concepts),base=terms.length?terms.join(' '):String(summary).trim().split(/\s+/).slice(0,10).join(' '),strategies=[]
  if(base)strategies.push({strategy_type:'keyword',query:`ta=(${base})`,rationale:'Keyword search across title and abstract concepts.'})
  for(const concept of terms.slice(0,3))strategies.push({strategy_type:'exact_phrase',query:`ta="${concept.replace(/["()]/g,' ')}"`,rationale:'Exact-phrase search for a stated inventive concept.'})
  for(const code of cleanList([...ipc,...cpc]).slice(0,6))strategies.push({strategy_type:'classification',query:`cl=${code.replace(/[^A-Za-z0-9/.-]/g,'')}`,rationale:'Classification-led search to reduce vocabulary dependence.'})
  if(applicant)strategies.push({strategy_type:'applicant',query:`pa="${String(applicant).replace(/["()]/g,' ')}"`,rationale:'Applicant portfolio search.'})
  if(inventor)strategies.push({strategy_type:'inventor',query:`in="${String(inventor).replace(/["()]/g,' ')}"`,rationale:'Inventor-name search.'})
  if(base)strategies.push({strategy_type:'semantic',query:base,rationale:'Semantic concept query for later vector or provider search.'})
  return strategies.slice(0,20)
}

export function scorePriorArtCandidate({criticalDate,publicationDate,technicalSimilarity=0,claimCoverage=0,familyRelevance=0,citationRelevance=0,accessible=false}){
  const asDate=value=>value instanceof Date?value:value?new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value))?`${value}T00:00:00Z`:value):null,critical=asDate(criticalDate),published=asDate(publicationDate),timingStatus=critical&&published&&!Number.isNaN(+critical)&&!Number.isNaN(+published)?published<critical?'pre_critical':'post_critical':'unknown',timing=timingStatus==='pre_critical'?100:timingStatus==='post_critical'?0:35
  const score=.3*clamp(technicalSimilarity)+.3*clamp(claimCoverage)+.2*timing+.1*clamp(familyRelevance)+.05*clamp(citationRelevance)+.05*(accessible?100:0)
  return{timing_status:timingStatus,quality_score:Number(score.toFixed(2)),factors:{technical_similarity:clamp(technicalSimilarity),claim_coverage:clamp(claimCoverage),timing,family_relevance:clamp(familyRelevance),citation_relevance:clamp(citationRelevance),accessibility:accessible?100:0}}
}

async function projectForUser(sql,userId,projectId){const[project]=await sql`SELECT p.*,e.name patent_name,e.canonical_identifier,pc.claim_number FROM prior_art_projects p JOIN ip_entities e ON e.id=p.patent_entity_id LEFT JOIN patent_claims pc ON pc.id=p.claim_id WHERE p.id=${projectId} AND p.user_id=${userId}`;if(!project)throw new Error('Prior-art project not found');return project}

export async function getPriorArtProject(sql,userId,projectId){
  const project=await projectForUser(sql,userId,projectId),strategies=await sql`SELECT * FROM prior_art_search_strategies WHERE project_id=${project.id} ORDER BY created_at`,candidates=await sql`SELECT c.*,e.name reference_title,e.canonical_identifier publication_number,e.jurisdiction,e.data,coalesce(count(m.id),0)::int element_count,coalesce(count(m.id) FILTER(WHERE m.review_status='accepted' AND m.disclosure_status IN ('explicit','implicit')),0)::int accepted_disclosures FROM prior_art_candidates c JOIN ip_entities e ON e.id=c.patent_entity_id LEFT JOIN prior_art_element_mappings m ON m.candidate_id=c.id WHERE c.project_id=${project.id} GROUP BY c.id,e.name,e.canonical_identifier,e.jurisdiction,e.data ORDER BY c.quality_score DESC,c.created_at`
  const mappings=candidates.length?await sql`SELECT m.*,e.ordinal,e.element_text,sp.locator_type,sp.locator,sp.content evidence_content,s.title source_title,s.citation,s.official_url,s.verified_at FROM prior_art_element_mappings m JOIN patent_claim_elements e ON e.id=m.claim_element_id LEFT JOIN source_passages sp ON sp.id=m.evidence_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE m.candidate_id=ANY(${candidates.map(item=>item.id)}::uuid[]) ORDER BY m.candidate_id,e.ordinal`:[]
  const enriched=candidates.map(candidate=>({...candidate,mappings:mappings.filter(mapping=>mapping.candidate_id===candidate.id)}))
  return{project,strategies,candidates:enriched,research_gaps:{planned_strategies:strategies.filter(item=>item.status==='planned').length,unreviewed_candidates:candidates.filter(item=>item.review_status==='unreviewed').length,unknown_timing:candidates.filter(item=>item.timing_status==='unknown').length,candidates_without_full_mapping:candidates.filter(item=>!item.element_count||item.accepted_disclosures<item.element_count).length}}
}

export async function listPriorArtProjects(sql,userId,matterId){const[matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');return{projects:await sql`SELECT p.id,p.title,p.status,p.critical_date,p.updated_at,e.name patent_name,e.canonical_identifier,count(DISTINCT c.id)::int candidate_count,count(DISTINCT s.id) FILTER(WHERE s.status='completed')::int completed_searches FROM prior_art_projects p JOIN ip_entities e ON e.id=p.patent_entity_id LEFT JOIN prior_art_candidates c ON c.project_id=p.id LEFT JOIN prior_art_search_strategies s ON s.project_id=p.id WHERE p.user_id=${userId} AND p.matter_id=${matter.id} GROUP BY p.id,e.name,e.canonical_identifier ORDER BY p.updated_at DESC`}}

export async function createPriorArtProject(sql,userId,body){
  const[matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`;if(!matter)throw new Error('Matter not found');const[patent]=await sql`SELECT id,name FROM ip_entities WHERE id=${body.patent_entity_id} AND matter_id=${matter.id} AND user_id=${userId} AND entity_type='patent'`;if(!patent)throw new Error('Patent entity not found')
  let claim=null;if(body.claim_id){[claim]=await sql`SELECT id FROM patent_claims WHERE id=${body.claim_id} AND patent_entity_id=${patent.id} AND user_id=${userId}`;if(!claim)throw new Error('Patent claim not found')}
  const summary=String(body.invention_summary||'').trim();if(summary.length<10)throw new Error('Invention summary is required')
  const concepts=cleanList(body.inventive_concepts),strategies=generatePriorArtStrategies({summary,concepts,ipc:body.ipc,cpc:body.cpc,applicant:body.applicant,inventor:body.inventor})
  const[project]=await sql`INSERT INTO prior_art_projects(user_id,matter_id,patent_entity_id,claim_id,title,jurisdiction,critical_date,invention_summary,inventive_concepts,synonyms) VALUES(${userId},${matter.id},${patent.id},${claim?.id||null},${String(body.title||`${patent.name} prior-art research`).slice(0,240)},${body.jurisdiction||null},${body.critical_date||null},${summary.slice(0,12000)},${concepts},${JSON.stringify(body.synonyms||{})}::jsonb) RETURNING id`
  for(const strategy of strategies)await sql`INSERT INTO prior_art_search_strategies(project_id,strategy_type,query,rationale) VALUES(${project.id},${strategy.strategy_type},${strategy.query},${strategy.rationale})`
  return getPriorArtProject(sql,userId,project.id)
}

export async function importPriorArtSearchRun(sql,userId,body){
  const project=await projectForUser(sql,userId,body.project_id),[strategy]=await sql`SELECT id FROM prior_art_search_strategies WHERE id=${body.strategy_id} AND project_id=${project.id}`;if(!strategy)throw new Error('Prior-art search strategy not found')
  const[run]=await sql`SELECT id,status,provider,result_count FROM professional_search_runs WHERE id=${body.search_run_id} AND user_id=${userId} AND matter_id=${project.matter_id} AND provider='epo_ops' AND status='completed'`;if(!run)throw new Error('Completed EPO search run not found')
  const results=await sql`SELECT r.id search_result_id,r.entity_id,r.raw_metadata,e.data FROM professional_search_results r JOIN ip_entities e ON e.id=r.entity_id WHERE r.search_run_id=${run.id} AND e.user_id=${userId}`
  for(const result of results){const publicationDate=result.data?.publication_date||null,priorityDate=result.data?.priority_date||null,scored=scorePriorArtCandidate({criticalDate:project.critical_date,publicationDate,accessible:true});const[candidate]=await sql`INSERT INTO prior_art_candidates(project_id,patent_entity_id,search_result_id,publication_date,priority_date,timing_status,accessible,quality_score) VALUES(${project.id},${result.entity_id},${result.search_result_id},${publicationDate},${priorityDate},${scored.timing_status},true,${scored.quality_score}) ON CONFLICT(project_id,patent_entity_id) DO UPDATE SET search_result_id=excluded.search_result_id,accessible=true RETURNING id`;if(project.claim_id){const elements=await sql`SELECT e.id FROM patent_claim_elements e WHERE e.claim_id=${project.claim_id} ORDER BY e.ordinal`;for(const element of elements)await sql`INSERT INTO prior_art_element_mappings(candidate_id,claim_element_id) VALUES(${candidate.id},${element.id}) ON CONFLICT DO NOTHING`}}
  await sql`UPDATE prior_art_search_strategies SET status='completed',search_run_id=${run.id},result_count=${results.length},source_basis='live_database',searched_at=now() WHERE id=${strategy.id}`;await sql`UPDATE prior_art_projects SET status='screening',updated_at=now() WHERE id=${project.id}`
  return getPriorArtProject(sql,userId,project.id)
}

export async function reviewPriorArtCandidate(sql,userId,body){
  const[candidate]=await sql`SELECT c.id,c.project_id,c.review_status FROM prior_art_candidates c JOIN prior_art_projects p ON p.id=c.project_id WHERE c.id=${body.candidate_id} AND p.user_id=${userId}`;if(!candidate)throw new Error('Prior-art candidate not found')
  const status=['unreviewed','accepted','rejected','needs_research'].includes(body.review_status)?body.review_status:null,novelty=['unreviewed','potentially_anticipates','does_not_anticipate','insufficient_evidence'].includes(body.novelty_status)?body.novelty_status:null;if(!status||!novelty)throw new Error('Invalid prior-art review status')
  const note=String(body.review_note||'').slice(0,4000)||null;await sql`UPDATE prior_art_candidates SET review_status=${status},novelty_status=${novelty},review_note=${note},reviewed_at=now() WHERE id=${candidate.id}`;await sql`INSERT INTO prior_art_review_events(user_id,project_id,candidate_id,action,previous_status,new_status,note) VALUES(${userId},${candidate.project_id},${candidate.id},'candidate_review',${candidate.review_status},${status},${note})`;return getPriorArtProject(sql,userId,candidate.project_id)
}

export async function updatePriorArtCandidate(sql,userId,body){
  const[candidate]=await sql`SELECT c.*,p.user_id,p.critical_date FROM prior_art_candidates c JOIN prior_art_projects p ON p.id=c.project_id WHERE c.id=${body.candidate_id} AND p.user_id=${userId}`;if(!candidate)throw new Error('Prior-art candidate not found')
  const publicationDate=body.publication_date||null,priorityDate=body.priority_date||null,technical=clamp(body.technical_similarity),family=clamp(body.family_relevance),citation=clamp(body.citation_relevance),accessible=body.accessible!==false,scored=scorePriorArtCandidate({criticalDate:candidate.critical_date,publicationDate,technicalSimilarity:technical,claimCoverage:candidate.claim_coverage,familyRelevance:family,citationRelevance:citation,accessible})
  await sql`UPDATE prior_art_candidates SET publication_date=${publicationDate},priority_date=${priorityDate},timing_status=${scored.timing_status},technical_similarity=${technical},family_relevance=${family},citation_relevance=${citation},accessible=${accessible},quality_score=${scored.quality_score} WHERE id=${candidate.id}`
  return getPriorArtProject(sql,userId,candidate.project_id)
}

export async function reviewPriorArtMapping(sql,userId,body){
  const allowedDisclosure=['unreviewed','explicit','implicit','not_found','disputed'],allowedReview=['unreviewed','accepted','rejected','needs_evidence'];if(!allowedDisclosure.includes(body.disclosure_status)||!allowedReview.includes(body.review_status))throw new Error('Invalid prior-art mapping status')
  const[mapping]=await sql`SELECT m.id,m.candidate_id,m.review_status,c.project_id,p.matter_id,p.critical_date,c.publication_date,c.technical_similarity,c.family_relevance,c.citation_relevance,c.accessible FROM prior_art_element_mappings m JOIN prior_art_candidates c ON c.id=m.candidate_id JOIN prior_art_projects p ON p.id=c.project_id WHERE m.id=${body.mapping_id} AND p.user_id=${userId}`;if(!mapping)throw new Error('Prior-art element mapping not found')
  const evidenceId=body.evidence_passage_id||null;if(['explicit','implicit'].includes(body.disclosure_status)&&!evidenceId)throw new Error('Disclosure mapping requires a pinpoint evidence passage')
  if(evidenceId){const[passage]=await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${evidenceId} AND s.user_id=${userId} AND s.matter_id=${mapping.matter_id}`;if(!passage)throw new Error('Prior-art evidence passage not found')}
  await sql`UPDATE prior_art_element_mappings SET disclosure_status=${body.disclosure_status},review_status=${body.review_status},evidence_passage_id=${evidenceId},confidence=${body.confidence==null?null:Math.min(1,Math.max(0,Number(body.confidence)))},note=${String(body.note||'').slice(0,4000)||null},reviewed_at=${body.review_status==='unreviewed'?null:new Date()} WHERE id=${mapping.id}`
  await sql`INSERT INTO prior_art_review_events(user_id,project_id,candidate_id,mapping_id,action,previous_status,new_status,note) VALUES(${userId},${mapping.project_id},${mapping.candidate_id},${mapping.id},'element_mapping_review',${mapping.review_status},${body.review_status},${String(body.note||'').slice(0,1000)||null})`
  const[coverage]=await sql`SELECT count(*)::int total,count(*) FILTER(WHERE review_status='accepted' AND disclosure_status IN ('explicit','implicit'))::int disclosed FROM prior_art_element_mappings WHERE candidate_id=${mapping.candidate_id}`,claimCoverage=coverage.total?coverage.disclosed/coverage.total*100:0,scored=scorePriorArtCandidate({criticalDate:mapping.critical_date,publicationDate:mapping.publication_date,technicalSimilarity:mapping.technical_similarity,claimCoverage,familyRelevance:mapping.family_relevance,citationRelevance:mapping.citation_relevance,accessible:mapping.accessible})
  await sql`UPDATE prior_art_candidates SET claim_coverage=${claimCoverage},timing_status=${scored.timing_status},quality_score=${scored.quality_score} WHERE id=${mapping.candidate_id}`
  return getPriorArtProject(sql,userId,mapping.project_id)
}
