import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {runIpSpecialist} from '../src/lib/ip-specialist-service.js'
import {addFtoPatentReview,createFtoProject,finalizeFtoProject,reviewFtoFeature,reviewFtoMapping,reviewFtoPatent,updateFtoCoverage} from '../src/lib/fto-service.js'
import {reviewLegalSource} from '../src/lib/proposition-verification-service.js'
import {getMatterContext,matterContextPrompt} from '../src/lib/matter-service.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL),[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`,matterId=randomUUID()
assert.ok(user,'A test user is required')
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`FTO integration ${matterId.slice(0,8)}`},'patent_fto',${['Germany']})`
  const parsed=await runIpSpecialist(sql,user.id,{action:'parse_patent_claims',matter_id:matterId,publication_number:`EP-FTO-${matterId.slice(0,8)}`,jurisdiction:'Germany',claims_text:'1. A secure computing device comprising: a processor; and an encrypted memory configured to store inference keys.'})
  let project=await createFtoProject(sql,user.id,{matter_id:matterId,product_name:'Integration Product X',jurisdiction:'Germany',proposed_launch_date:'2027-01-15',features:['A processor executes inference workloads.','Encrypted memory stores inference keys.'],scope_note:'German manufacture, offer, sale, and use.'})
  assert.equal(project.coverage.length,4)
  assert.equal(project.features.length,2)
  await assert.rejects(()=>reviewFtoFeature(sql,user.id,{feature_id:project.features[0].id,review_status:'accepted'}),/verified pinpoint product evidence/)
  const[productSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,authority_status,retrieval_method) VALUES(${user.id},${matterId},'Product X technical specification','product_specification',5,'Germany','current','uploaded') RETURNING id`
  const[productPassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${productSource.id},'section','Architecture 2.1','Product X includes a processor that executes inference workloads and encrypted memory that stores inference keys.') RETURNING id`
  const[statusSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,authority_status,retrieval_method) VALUES(${user.id},${matterId},'German patent register extract','official_register',1,'Germany','current','official_web') RETURNING id`
  const[statusPassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${statusSource.id},'record','Legal status','The German part of the patent is granted and in force as of 2026-08-24.') RETURNING id`
  await reviewLegalSource(sql,user.id,{source_id:productSource.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'uploaded_original',note:'Technical specification verified.'})
  await reviewLegalSource(sql,user.id,{source_id:statusSource.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'official_web',note:'Official register record verified.'})
  for(const feature of project.features)project=await reviewFtoFeature(sql,user.id,{feature_id:feature.id,review_status:'accepted',source_passage_id:productPassage.id,note:'Feature confirmed in technical specification.'})
  await assert.rejects(()=>finalizeFtoProject(sql,user.id,{project_id:project.project.id,patentability_distinguished:true,overall_conclusion:'high_identified_risk',review_status:'accepted'}),/search and status channel/)
  for(const coverage of project.coverage)project=await updateFtoCoverage(sql,user.id,{coverage_id:coverage.id,status:'completed',source_basis:'manual_verified',source_passage_id:statusPassage.id,result_count:coverage.channel==='official_patent_search'?1:0,note:'Integration coverage verified against matter record.'})
  project=await addFtoPatentReview(sql,user.id,{project_id:project.project.id,claim_id:parsed.claims[0].id})
  let review=project.reviews[0]
  for(let index=0;index<review.mappings.length;index++){const mapping=review.mappings[index],feature=project.features[Math.min(index,project.features.length-1)];project=await reviewFtoMapping(sql,user.id,{mapping_id:mapping.id,product_feature_id:feature.id,evidence_passage_id:productPassage.id,mapping_status:'mapped',review_status:'accepted',confidence:.9,note:'Lawyer-accepted literal feature mapping.'});review=project.reviews[0]}
  await assert.rejects(()=>reviewFtoPatent(sql,user.id,{patent_review_id:review.id,status_category:'active_granted',status_as_of:'2026-08-24',legal_status_passage_id:statusPassage.id,claim_conclusion:'no_literal_coverage',review_status:'accepted'}),/at least one accepted missing/)
  project=await reviewFtoPatent(sql,user.id,{patent_review_id:review.id,status_category:'active_granted',status_as_of:'2026-08-24',expiry_date:'2035-01-01',territory_status:'German designation confirmed in force.',legal_status_passage_id:statusPassage.id,claim_conclusion:'potential_literal_coverage',uncertainty_note:'Claim construction and equivalents require separate legal analysis.',review_status:'accepted'})
  await assert.rejects(()=>finalizeFtoProject(sql,user.id,{project_id:project.project.id,patentability_distinguished:false,overall_conclusion:'high_identified_risk',review_status:'accepted'}),/distinguish FTO from patentability/)
  project=await finalizeFtoProject(sql,user.id,{project_id:project.project.id,patentability_distinguished:true,overall_conclusion:'high_identified_risk',conclusion_note:'One reviewed active German claim potentially maps every limitation. FTO is distinct from patentability; investigate claim construction, defences, licence, and design-around options.',review_status:'accepted'})
  assert.equal(project.project.review_status,'accepted')
  assert.equal(project.gaps.coverage_incomplete,0)
  const[graph]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND from_entity_id=${project.project.analysis_entity_id} AND relationship_type IN ('ASSESSES_FTO_FOR','ASSESSES_FTO_AGAINST','MAPS_PRODUCT_TO_CLAIM')`
  assert.equal(graph.count,3)
  await assert.rejects(()=>sql`UPDATE fto_element_mappings SET mapping_status='missing' WHERE id=${project.reviews[0].mappings[0].id}`,/must be reopened/)
  await assert.rejects(()=>reviewLegalSource(sql,user.id,{source_id:productSource.id,existence_confirmed:false,pinpoint_confirmed:false,current_status_checked:false,verification_method:'manual_review',note:'Attempt withdrawal.'}),/must be reopened/)
  project=await finalizeFtoProject(sql,user.id,{project_id:project.project.id,patentability_distinguished:true,overall_conclusion:'high_identified_risk',conclusion_note:'Reopened for new product evidence.',review_status:'reopened'})
  project=await reviewFtoPatent(sql,user.id,{patent_review_id:project.reviews[0].id,status_category:'active_granted',status_as_of:'2026-08-24',legal_status_passage_id:statusPassage.id,claim_conclusion:'potential_literal_coverage',review_status:'reopened'})
  project=await reviewFtoMapping(sql,user.id,{mapping_id:project.reviews[0].mappings[0].id,product_feature_id:project.features[0].id,evidence_passage_id:productPassage.id,mapping_status:'partial',review_status:'accepted',confidence:.6,note:'Reopened mapping revised after product change.'})
  assert.equal(project.reviews[0].mappings[0].mapping_status,'partial')
  const context=await getMatterContext(sql,user.id,matterId),prompt=matterContextPrompt(context)
  assert.equal(context.ftoProjects.length,1)
  assert.equal(context.ftoProjects[0].jurisdiction,'Germany')
  assert.match(prompt,/FREEDOM-TO-OPERATE PROJECTS/)
  assert.match(prompt,/Never confuse FTO with patentability/)
  console.log('FTO integration passed')
}finally{await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`}
