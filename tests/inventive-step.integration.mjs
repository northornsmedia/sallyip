import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {runIpSpecialist} from '../src/lib/ip-specialist-service.js'
import {createPriorArtProject} from '../src/lib/prior-art-service.js'
import {addInventiveStepReference,attachInventiveStepEvidence,createInventiveStepAnalysis,finalizeInventiveStep,reviewInventiveStep} from '../src/lib/inventive-step-service.js'
import {reviewLegalSource} from '../src/lib/proposition-verification-service.js'
import {getMatterContext,matterContextPrompt} from '../src/lib/matter-service.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL),[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`,matterId=randomUUID()
assert.ok(user,'A test user is required')
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Inventive step ${matterId.slice(0,8)}`},'patent_prosecution',${['EPO']})`
  const parsed=await runIpSpecialist(sql,user.id,{action:'parse_patent_claims',matter_id:matterId,publication_number:`EP-${matterId.slice(0,8)}`,jurisdiction:'EPO',claims_text:'1. A secure computing device comprising: a processor; and an encrypted memory configured to store inference keys.'})
  let project=await createPriorArtProject(sql,user.id,{matter_id:matterId,patent_entity_id:parsed.patent_entity_id,claim_id:parsed.claims[0].id,title:'Inventive-step integration prior art',jurisdiction:'EPO',critical_date:'2022-01-01',invention_summary:'A processor coupled to encrypted memory for storing inference keys.',inventive_concepts:['encrypted memory','inference key storage']})
  const[priorPatent]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,source_status) VALUES(${user.id},${matterId},'patent',${`EP-PA-${matterId.slice(0,8)}`},'Accepted prior reference','EPO','verified') RETURNING id`
  const[postPatent]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,source_status) VALUES(${user.id},${matterId},'patent',${`EP-POST-${matterId.slice(0,8)}`},'Post-critical reference','EPO','verified') RETURNING id`
  const[eligible]=await sql`INSERT INTO prior_art_candidates(project_id,patent_entity_id,publication_date,timing_status,technical_similarity,claim_coverage,accessible,quality_score,review_status) VALUES(${project.project.id},${priorPatent.id},'2020-01-01','pre_critical',80,60,true,75,'accepted') RETURNING id`
  const[late]=await sql`INSERT INTO prior_art_candidates(project_id,patent_entity_id,publication_date,timing_status,technical_similarity,accessible,quality_score,review_status) VALUES(${project.project.id},${postPatent.id},'2023-01-01','post_critical',75,true,50,'accepted') RETURNING id`
  let analysis=await createInventiveStepAnalysis(sql,user.id,{matter_id:matterId,prior_art_project_id:project.project.id,framework:'epo_problem_solution',title:'EPO claim 1 PSA'})
  assert.equal(analysis.steps.length,7)
  assert.equal(analysis.analysis.jurisdiction,'EPO')
  await assert.rejects(()=>addInventiveStepReference(sql,user.id,{analysis_id:analysis.analysis.id,candidate_id:late.id,reference_role:'closest_prior_art'}),/accepted pre-critical/)
  analysis=await addInventiveStepReference(sql,user.id,{analysis_id:analysis.analysis.id,candidate_id:eligible.id,reference_role:'closest_prior_art',rationale:'Same purpose and most relevant reviewed starting point.'})
  const[graphLinks]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND from_entity_id=${analysis.analysis.analysis_entity_id} AND relationship_type IN ('ANALYSES_CLAIM','RELIES_ON_PRIOR_ART')`
  assert.equal(graphLinks.count,2)
  await assert.rejects(()=>finalizeInventiveStep(sql,user.id,{analysis_id:analysis.analysis.id,conclusion:'appears_inventive',review_status:'accepted',contrary_evidence_checked:true}),/verified current governing authority/)
  const[source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'EPO Guidelines G-VII','official_guidance',1,'EPO','EPO Guidelines G-VII 5','current','official_web') RETURNING id`
  const[passage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'section','G-VII 5','The problem-solution approach identifies the closest prior art, distinguishing features, objective technical problem, and whether the skilled person would have arrived at the claimed solution.') RETURNING id`
  await reviewLegalSource(sql,user.id,{source_id:source.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'official_web',note:'Verified against current official EPO Guidelines.'})
  for(const step of analysis.steps){if(step.step_key!=='conclusion')analysis=await attachInventiveStepEvidence(sql,user.id,{step_id:step.id,passage_id:passage.id,support_type:'supports',evidence_kind:step.step_key==='skilled_person'?'common_general_knowledge':'legal_authority',note:'Integration evidence for framework gate.'});analysis=await reviewInventiveStep(sql,user.id,{step_id:step.id,analysis_text:`Reviewed ${step.label} analysis grounded in the selected reference and pinpoint record.`,review_status:'accepted',reviewer_note:'Accepted for integration test.'})}
  analysis=await finalizeInventiveStep(sql,user.id,{analysis_id:analysis.analysis.id,governing_authority_passage_id:passage.id,contrary_evidence_checked:true,conclusion:'appears_inventive',conclusion_note:'On the reviewed record, the could-would step is not established; retain stated uncertainty.',review_status:'accepted'})
  assert.equal(analysis.analysis.review_status,'accepted')
  assert.equal(analysis.gaps.unaccepted_steps,0)
  await assert.rejects(()=>sql`UPDATE inventive_step_analysis_steps SET analysis_text='weakened' WHERE id=${analysis.steps[0].id}`,/must be reopened/)
  await assert.rejects(()=>sql`DELETE FROM inventive_step_references WHERE analysis_id=${analysis.analysis.id} AND candidate_id=${eligible.id}`,/must be reopened/)
  await assert.rejects(()=>sql`INSERT INTO inventive_step_step_evidence(step_id,passage_id,support_type,evidence_kind) VALUES(${analysis.steps[0].id},${passage.id},'background','other') ON CONFLICT(step_id,passage_id) DO UPDATE SET support_type='background'`,/must be reopened/)
  await assert.rejects(()=>reviewLegalSource(sql,user.id,{source_id:source.id,existence_confirmed:false,pinpoint_confirmed:false,current_status_checked:false,verification_method:'manual_review',note:'Attempted withdrawal.'}),/must be reopened/)
  analysis=await finalizeInventiveStep(sql,user.id,{analysis_id:analysis.analysis.id,governing_authority_passage_id:passage.id,contrary_evidence_checked:true,conclusion:'appears_inventive',conclusion_note:'Reopened for further lawyer review.',review_status:'reopened'})
  analysis=await reviewInventiveStep(sql,user.id,{step_id:analysis.steps[0].id,analysis_text:'Revised closest-prior-art analysis after reopening.',review_status:'accepted',reviewer_note:'Re-review complete.'})
  assert.equal(analysis.steps[0].analysis_text,'Revised closest-prior-art analysis after reopening.')
  const audits=await sql`SELECT action,new_status FROM inventive_step_review_events WHERE analysis_id=${analysis.analysis.id} ORDER BY created_at`
  assert.ok(audits.some(row=>row.action==='analysis_review'&&row.new_status==='accepted'))
  const context=await getMatterContext(sql,user.id,matterId),prompt=matterContextPrompt(context)
  assert.equal(context.inventiveStepAnalyses.length,1)
  assert.equal(context.inventiveStepAnalyses[0].framework,'epo_problem_solution')
  assert.match(prompt,/PATENT INVENTIVE-STEP ANALYSES/)
  assert.match(prompt,/Never mix inventive-step frameworks/)
  console.log('inventive step integration passed')
}finally{await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`}
