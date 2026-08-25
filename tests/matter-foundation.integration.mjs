import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {getMatterContext} from '../src/lib/matter-service.js'
import {retrieveHybridEvidence,retrieveVerifiedEvidence,verificationSummary} from '../src/lib/verification-service.js'
import {routeSpecialists} from '../src/lib/specialist-router.js'
import {ingestDocumentLocal} from '../src/lib/document-ingestion-local.js'
import {runIpSpecialist} from '../src/lib/ip-specialist-service.js'
import {createClaimChart,reviewClaimChartRow} from '../src/lib/claim-chart-service.js'
import {createClearanceProject,reviewClearanceCandidate,screenMatterTrademarks} from '../src/lib/trademark-clearance-service.js'
import {addPatentFamilyMember,createPatentFamily,linkPatentFamilyMembers} from '../src/lib/patent-family-service.js'
import {attachPropositionSource,createProposition,evaluateProposition,reviewLegalSource} from '../src/lib/proposition-verification-service.js'
import {runOfficialSearch} from '../src/lib/official-search-persistence.js'
import {recordProsecutionHistory,reviewProsecutionEvent} from '../src/lib/prosecution-history-service.js'
import {createPriorArtProject,importPriorArtSearchRun,reviewPriorArtCandidate,reviewPriorArtMapping,updatePriorArtCandidate} from '../src/lib/prior-art-service.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL)
const [user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`
assert.ok(user,'A test user is required')
const matterId=randomUUID()
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Foundation test ${matterId.slice(0,8)}`},'patent_litigation',${['EPO','Germany']})`
  await sql`INSERT INTO matter_facts(matter_id,fact_type,label,value,status) VALUES(${matterId},'client_position','Infringement position',${JSON.stringify('Denied')}::jsonb,'verified')`
  const [patent]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${user.id},${matterId},'patent','EP1234567','Example patent','EPO',${JSON.stringify({claims_in_issue:[1,4,7]})}::jsonb,'verified') RETURNING id`
  const [product]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,name,jurisdiction,data) VALUES(${user.id},${matterId},'product','Acme X20','Germany',${JSON.stringify({status:'accused'})}::jsonb) RETURNING id`
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,confidence) VALUES(${user.id},${matterId},${product.id},'ACCUSED_OF_INFRINGING',${patent.id},0.8)`
  const [source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'EPO Guidelines','official_guidance',1,'EPO','EPO Guidelines G-VII','current','official_web') RETURNING id`
  await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'section','G-VII 5','The problem-solution approach is applied when assessing inventive step for a claimed invention.')`
  const context=await getMatterContext(sql,user.id,matterId)
  assert.equal(context.matter.name.startsWith('Foundation test'),true)
  assert.equal(context.entities.length,2)
  assert.equal(context.relationships[0].relationship_type,'ACCUSED_OF_INFRINGING')
  const evidence=await retrieveVerifiedEvidence(sql,user.id,matterId,'How is inventive step assessed using the problem solution approach?')
  assert.equal(evidence.length,1)
  assert.equal(evidence[0].authority_tier,1)
  const route=routeSpecialists('Assess inventive step at the EPO',{deepResearch:true,matterJurisdictions:context.matter.jurisdictions})
  const verification=verificationSummary(evidence,route)
  assert.equal(verification.source_basis,'retrieved_source')
  assert.equal(verification.primary_sources,1)
  let proposition=await createProposition(sql,user.id,{matter_id:matterId,issue:'Inventive step framework',proposition:'The EPO applies the problem-solution approach when assessing inventive step.',jurisdiction:'EPO'})
  proposition=await attachPropositionSource(sql,user.id,{proposition_id:proposition.proposition.id,passage_id:evidence[0].passage_id,support_type:'supports',verification_note:'Pinpoint directly states the test.'})
  await assert.rejects(()=>sql`UPDATE legal_sources SET verified_at=now() WHERE id=${source.id}`,/verification requires a completed verification review/)
  await reviewLegalSource(sql,user.id,{source_id:source.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'official_web',note:'Checked against current EPO Guidelines.'})
  proposition=await evaluateProposition(sql,user.id,{proposition_id:proposition.proposition.id,contrary_authority_checked:true})
  assert.equal(proposition.proposition.verification_status,'supported')
  assert.equal(proposition.proposition.confidence,'high')
  const[contraryPassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'section','Contrary test','A contrary passage limits application of the proposition in a special procedural context.') RETURNING id`
  proposition=await attachPropositionSource(sql,user.id,{proposition_id:proposition.proposition.id,passage_id:contraryPassage.id,support_type:'contradicts',verification_note:'Potential limiting context.'})
  proposition=await evaluateProposition(sql,user.id,{proposition_id:proposition.proposition.id,contrary_authority_checked:true})
  assert.equal(proposition.proposition.confidence,'moderate')
  const[verificationEvent]=await sql`SELECT new_confidence FROM proposition_verification_events WHERE proposition_id=${proposition.proposition.id} ORDER BY created_at DESC LIMIT 1`
  assert.equal(verificationEvent.new_confidence,'moderate')
  const enrichedMatter=await getMatterContext(sql,user.id,matterId)
  assert.ok(enrichedMatter.propositions.some(item=>item.id===proposition.proposition.id&&item.sources.some(link=>link.support_type==='contradicts')),'Matter Brain should expose audited propositions and contrary evidence')
  const uniqueText=`Confidential product mapping ${matterId} identifies limitation Z in the accused product.`
  const ingested=await ingestDocumentLocal(sql,user,{matter_id:matterId,filename:'product-mapping.txt',data:Buffer.from(uniqueText).toString('base64'),rights_confirmed:true,authority_tier:5})
  assert.equal(ingested.source.passage_count,1)
  const uploadedEvidence=await retrieveVerifiedEvidence(sql,user.id,matterId,`Where is limitation Z identified in product mapping ${matterId}?`)
  assert.ok(uploadedEvidence.some(item=>item.content.includes('limitation Z')))
  const syntheticVector=[1,...Array(1023).fill(0)],serializedVector=`[${syntheticVector.join(',')}]`
  await sql`UPDATE knowledge_chunks SET embedding=${serializedVector}::vector WHERE source_id=${ingested.source.id}`
  const semanticEvidence=await retrieveHybridEvidence(sql,user.id,matterId,'nonlexicalsemanticprobe',{limit:3,queryVector:syntheticVector})
  assert.ok(semanticEvidence.some(item=>item.retrieval_channels.includes('semantic')),'pgvector retrieval should return a matter-scoped passage')
  const parsedClaims=await runIpSpecialist(sql,user.id,{action:'parse_patent_claims',matter_id:matterId,publication_number:'EP-TEST-1',jurisdiction:'EPO',claims_text:'1. A device comprising: a processor; and a memory.\n2. The device of claim 1, wherein the memory stores claim data.'})
  assert.equal(parsedClaims.claims.length,2)
  assert.deepEqual(parsedClaims.claims[1].depends_on,[1])
  const prosecution=await recordProsecutionHistory(sql,user.id,{matter_id:matterId,patent_entity_id:parsedClaims.patent_entity_id,replace_existing:true,events:[{sequence:1,event_type:'office_action',event_date:'2023-02-01',title:'Inventive-step objection',content:'Examiner raised an inventive-step objection.',source_basis:'user_supplied'},{sequence:2,event_type:'claim_amendment',event_date:'2023-04-10',title:'Claim 1 amendment',claim_number:1,prior_claim_text:'A device comprising a processor and memory.',amended_claim_text:'A device comprising a processor and encrypted memory configured to store keys.',source_basis:'user_supplied'}]})
  assert.equal(prosecution.events.length,2)
  assert.equal(prosecution.events[1].scope_signal,'potential_narrowing')
  assert.equal(prosecution.events[1].estoppel_review_required,true)
  assert.equal(prosecution.gaps.unsourced_events,2)
  const reviewedProsecution=await reviewProsecutionEvent(sql,user.id,{event_id:prosecution.events[1].id,review_status:'needs_research',review_note:'Confirm added-matter and estoppel effect under the governing jurisdiction.'})
  assert.equal(reviewedProsecution.events[1].review_status,'needs_research')
  assert.equal(reviewedProsecution.gaps.unreviewed_events,1)
  const[prosecutionReview]=await sql`SELECT previous_status,new_status FROM prosecution_review_events WHERE prosecution_event_id=${prosecution.events[1].id} ORDER BY created_at DESC LIMIT 1`
  assert.equal(prosecutionReview.previous_status,'unreviewed')
  assert.equal(prosecutionReview.new_status,'needs_research')
  const[prosecutionGraph]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND relationship_type='PROSECUTION_EVENT_OF'`
  assert.equal(prosecutionGraph.count,2)
  let priorArt=await createPriorArtProject(sql,user.id,{matter_id:matterId,patent_entity_id:parsedClaims.patent_entity_id,claim_id:parsedClaims.claims[0].id,title:'Foundation prior-art project',jurisdiction:'EPO',critical_date:'2022-01-01',invention_summary:'A processor coupled to memory for storing and processing device data.',inventive_concepts:['processor memory coupling','device data processing'],cpc:['G06F12/00']})
  assert.ok(priorArt.strategies.length>=4)
  const keywordStrategy=priorArt.strategies.find(item=>item.strategy_type==='keyword')
  const epoXml=`<?xml version="1.0"?><ops:world-patent-data xmlns:ops="http://ops.epo.org"><ops:biblio-search><ops:search-result><exchange-documents><exchange-document><bibliographic-data><publication-reference><document-id><country>EP</country><doc-number>7654321</doc-number><kind>A1</kind></document-id></publication-reference><invention-title lang="en">Prior device memory system</invention-title></bibliographic-data></exchange-document></exchange-documents></ops:search-result></ops:biblio-search></ops:world-patent-data>`
  let epoCalls=0;const epoFetch=async url=>{epoCalls++;return String(url).includes('accesstoken')?{ok:true,json:async()=>({access_token:'epo-integration-token'})}:{ok:true,text:async()=>epoXml}}
  const epoRun=await runOfficialSearch(sql,user.id,{matter_id:matterId,provider:'epo_ops',task_type:'prior_art_search',query:keywordStrategy.query},{EPO_OPS_KEY:'integration-key',EPO_OPS_SECRET:'integration-secret'},{fetchImpl:epoFetch})
  priorArt=await importPriorArtSearchRun(sql,user.id,{project_id:priorArt.project.id,strategy_id:keywordStrategy.id,search_run_id:epoRun.search_run_id})
  assert.equal(priorArt.candidates.length,1)
  assert.equal(priorArt.candidates[0].element_count,parsedClaims.claims[0].elements.length)
  assert.equal(priorArt.candidates[0].timing_status,'unknown','bibliographic results without a parsed date must not be assumed pre-critical')
  await assert.rejects(()=>sql`UPDATE prior_art_candidates SET novelty_status='potentially_anticipates' WHERE id=${priorArt.candidates[0].id}`,/every element/)
  for(const mapping of priorArt.candidates[0].mappings){const[pinpoint]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'paragraph',${`prior-art element ${mapping.ordinal}`},${`The single reference expressly discloses this reviewed element: ${mapping.element_text}`}) RETURNING id`;priorArt=await reviewPriorArtMapping(sql,user.id,{mapping_id:mapping.id,disclosure_status:'explicit',review_status:'accepted',evidence_passage_id:pinpoint.id,confidence:.9,note:'Accepted against a pinpoint passage for invariant testing.'})}
  assert.equal(priorArt.candidates[0].accepted_disclosures,priorArt.candidates[0].element_count)
  await assert.rejects(()=>reviewPriorArtCandidate(sql,user.id,{candidate_id:priorArt.candidates[0].id,review_status:'accepted',novelty_status:'potentially_anticipates',review_note:'Coverage alone is insufficient while timing is unknown.'}),/pre-critical timing/)
  priorArt=await updatePriorArtCandidate(sql,user.id,{candidate_id:priorArt.candidates[0].id,publication_date:'2020-01-01',technical_similarity:82,family_relevance:40,citation_relevance:25,accessible:true})
  assert.equal(priorArt.candidates[0].timing_status,'pre_critical')
  priorArt=await reviewPriorArtCandidate(sql,user.id,{candidate_id:priorArt.candidates[0].id,review_status:'accepted',novelty_status:'potentially_anticipates',review_note:'Every limitation and the pre-critical publication date were reviewed against this single reference.'})
  assert.equal(priorArt.candidates[0].novelty_status,'potentially_anticipates')
  await assert.rejects(()=>sql`UPDATE prior_art_element_mappings SET disclosure_status='not_found' WHERE id=${priorArt.candidates[0].mappings[0].id}`,/must be reopened/)
  const[priorArtAudit]=await sql`SELECT action,new_status FROM prior_art_review_events WHERE project_id=${priorArt.project.id} ORDER BY created_at DESC LIMIT 1`
  assert.equal(priorArtAudit.action,'candidate_review')
  assert.equal(priorArtAudit.new_status,'accepted')
  await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'paragraph','42','The accused product contains a processor coupled to a memory for storing device data.')`
  const chart=await createClaimChart(sql,user.id,{matter_id:matterId,claim_id:parsedClaims.claims[0].id,chart_type:'infringement',target_name:'Foundation accused product',jurisdiction:'Germany'})
  assert.ok(chart.rows.length>=2)
  assert.ok(chart.rows.some(row=>row.evidence_passage_id),'candidate evidence should be attached without deciding the mapping')
  assert.ok(chart.rows.every(row=>row.mapping_status==='unmapped'&&row.review_status==='unreviewed'))
  const reviewed=await reviewClaimChartRow(sql,user.id,{row_id:chart.rows[0].id,mapping_status:'partial',review_status:'accepted',evidence_passage_id:chart.rows[0].evidence_passage_id,comments:'Reviewer accepted this passage as partial evidence.'})
  assert.equal(reviewed.rows[0].review_status,'accepted')
  const [reviewEvent]=await sql`SELECT new_status FROM claim_chart_review_events WHERE chart_id=${chart.chart.id} ORDER BY created_at DESC LIMIT 1`
  assert.equal(reviewEvent.new_status,'accepted')
  let family=await createPatentFamily(sql,user.id,{matter_id:matterId,name:'Foundation invention family',family_type:'declared',earliest_priority_date:'2020-01-02'})
  family=await addPatentFamilyMember(sql,user.id,{family_id:family.family.id,application_number:'GB200001',publication_number:'GB2580001',jurisdiction:'GB',priority_date:'2020-01-02',filing_date:'2020-01-02',source_basis:'user_supplied'})
  family=await addPatentFamilyMember(sql,user.id,{family_id:family.family.id,application_number:'PCT/GB2021/000001',publication_number:'WO2021123456',jurisdiction:'WO',priority_date:'2020-01-02',filing_date:'2021-01-02',source_basis:'uploaded_document'})
  family=await addPatentFamilyMember(sql,user.id,{family_id:family.family.id,application_number:'EP21700001',publication_number:'EP4000001',jurisdiction:'EP',filing_date:'2021-01-02',source_basis:'retrieved_source'})
  family=await linkPatentFamilyMembers(sql,user.id,{family_id:family.family.id,from_member_id:family.members[0].id,to_member_id:family.members[1].id,relationship_type:'claims_priority_to',source_basis:'uploaded_document'})
  family=await linkPatentFamilyMembers(sql,user.id,{family_id:family.family.id,from_member_id:family.members[1].id,to_member_id:family.members[2].id,relationship_type:'national_phase_of',source_basis:'retrieved_source'})
  assert.deepEqual(family.layers.map(layer=>layer.length),[1,1,1])
  await assert.rejects(()=>linkPatentFamilyMembers(sql,user.id,{family_id:family.family.id,from_member_id:family.members[2].id,to_member_id:family.members[0].id,relationship_type:'continuation_of'}),/cycle/)
  const[familyGraph]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND relationship_type IN ('MEMBER_OF_FAMILY','CLAIMS_PRIORITY_TO','NATIONAL_PHASE_OF')`
  assert.equal(familyGraph.count,5)
  const markAnalysis=await runIpSpecialist(sql,user.id,{action:'compare_trademarks',matter_id:matterId,markA:'SALLY IP',markB:'SALI-IP',classesA:[9,42],classesB:[9],goodsA:'legal AI software',goodsB:'legal software',jurisdiction:'EU'})
  assert.ok(markAnalysis.overall_score>50)
  const clearance=await createClearanceProject(sql,user.id,{matter_id:matterId,mark:'SALLYIP PRO',jurisdictions:['EU'],nice_classes:[9,42],goods_services:'legal artificial intelligence software'})
  assert.ok(clearance.research_gaps.includes('official_registry'))
  const euipoCalls=[]
  const euipoFetch=async(url,options)=>{euipoCalls.push({url:String(url),options});return euipoCalls.length===1?{ok:true,json:async()=>({access_token:'integration-token'})}:{ok:true,json:async()=>({trademarks:[{applicationNumber:'018999001',verbalElement:'SALLY PRO',niceClasses:[9,42],applicants:[{name:'Integration Owner'}],status:'REGISTERED'}]})}}
  const registrySearch=await runOfficialSearch(sql,user.id,{matter_id:matterId,provider:'euipo_trademark',task_type:'trademark_search',query:'SALLYIP PRO',mark:'SALLYIP PRO',classes:[9,42],clearance_project_id:clearance.project.id},{EUIPO_CLIENT_ID:'integration-client',EUIPO_CLIENT_SECRET:'integration-secret'},{fetchImpl:euipoFetch})
  assert.equal(registrySearch.source_basis,'live_database')
  assert.equal(registrySearch.results.length,1)
  const[registryCoverage]=await sql`SELECT status,source_basis,result_count,search_run_id FROM trademark_clearance_coverage WHERE project_id=${clearance.project.id} AND channel='official_registry'`
  assert.equal(registryCoverage.status,'completed')
  assert.equal(registryCoverage.source_basis,'live_database')
  assert.equal(registryCoverage.result_count,1)
  assert.equal(registryCoverage.search_run_id,registrySearch.search_run_id)
  const[registryCandidate]=await sql`SELECT source_basis,source_reference FROM trademark_clearance_candidates WHERE project_id=${clearance.project.id} AND source_basis='live_database'`
  assert.equal(registryCandidate.source_reference,'018999001')
  const screened=await screenMatterTrademarks(sql,user.id,clearance.project.id)
  assert.ok(screened.candidates.length>=2)
  assert.equal(screened.coverage.find(item=>item.channel==='matter_graph').status,'completed')
  assert.ok(screened.research_gaps.includes('common_law'),'matter graph screening must not imply common-law clearance')
  const reviewedCandidate=await reviewClearanceCandidate(sql,user.id,{candidate_id:screened.candidates[0].id,review_status:'potential_conflict',review_note:'Escalate for registry and use evidence.'})
  assert.equal(reviewedCandidate.candidates[0].review_status,'potential_conflict')
  const [clearanceEvent]=await sql`SELECT new_status FROM trademark_clearance_review_events WHERE project_id=${clearance.project.id} ORDER BY created_at DESC LIMIT 1`
  assert.equal(clearanceEvent.new_status,'potential_conflict')
  const [specialistGraph]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND relationship_type IN ('CLAIM_OF','DEPENDS_ON','COMPARED_WITH')`
  assert.equal(specialistGraph.count,4)
  assert.equal(await getMatterContext(sql,randomUUID(),matterId),null,'tenant boundary must reject another user id')
  console.log('matter foundation integration passed')
}finally{
  await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`
}
