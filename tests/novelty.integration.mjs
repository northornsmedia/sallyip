import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {runIpSpecialist} from '../src/lib/ip-specialist-service.js'
import {createPriorArtProject} from '../src/lib/prior-art-service.js'
import {reviewLegalSource} from '../src/lib/proposition-verification-service.js'
import {getMatterContext,matterContextPrompt} from '../src/lib/matter-service.js'
import {createNoveltyAnalysis,finalizeNoveltyAnalysis,reviewNoveltyMapping} from '../src/lib/novelty-service.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL)
const[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`
assert.ok(user,'A test user is required')
const matterId=randomUUID()

try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Novelty integration ${matterId.slice(0,8)}`},'patent_validity',${['EPO']})`
  const parsed=await runIpSpecialist(sql,user.id,{action:'parse_patent_claims',matter_id:matterId,publication_number:`EP-TARGET-${matterId.slice(0,6)}`,jurisdiction:'EPO',claims_text:'1. A secure device comprising: a processor configured to authenticate a user; a memory storing an encryption key; and a transmitter configured to send encrypted data.'})
  let project=await createPriorArtProject(sql,user.id,{matter_id:matterId,patent_entity_id:parsed.patent_entity_id,claim_id:parsed.claims[0].id,title:'Single-reference novelty search',jurisdiction:'EPO',critical_date:'2024-01-15',invention_summary:'A secure device authenticates a user, stores an encryption key, and sends encrypted data.',inventive_concepts:['user authentication','stored encryption key','encrypted data transmission']})
  const[reference]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${user.id},${matterId},'patent',${`EP-REF-${matterId.slice(0,6)}`},'Selected anticipation reference','EPO','{}'::jsonb,'inferred') RETURNING id`
  const[candidate]=await sql`INSERT INTO prior_art_candidates(project_id,patent_entity_id,publication_date,timing_status,accessible,quality_score) VALUES(${project.project.id},${reference.id},'2023-03-01','pre_critical',true,80) RETURNING id`
  const elements=await sql`SELECT id,ordinal FROM patent_claim_elements WHERE claim_id=${parsed.claims[0].id} ORDER BY ordinal`
  for(const element of elements)await sql`INSERT INTO prior_art_element_mappings(candidate_id,claim_element_id) VALUES(${candidate.id},${element.id})`

  const[referenceSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'Selected EP reference','patent_document',1,'EPO',${reference.canonical_identifier||'Selected EP reference'},'current','official_web') RETURNING id`
  const referencePassages=[]
  for(const element of elements){const[passage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${referenceSource.id},'paragraph',${`¶ ${element.ordinal}`},${`The selected reference expressly discloses limitation ${element.ordinal} of the tested claim.`}) RETURNING id`;referencePassages.push(passage)}
  const[otherSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'Different patent reference','patent_document',1,'EPO','EP-OTHER','current','official_web') RETURNING id`
  const[otherPassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${otherSource.id},'paragraph','¶ 99','A different document contains one limitation but cannot be mosaiced into novelty.') RETURNING id`
  const[authoritySource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'European Patent Convention Article 54','legislation',1,'EPO','Article 54 EPC','current','official_web') RETURNING id`
  const[authorityPassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${authoritySource.id},'article','Article 54(1)-(2)','An invention is new if it does not form part of the state of the art made available to the public before the filing date.') RETURNING id`
  for(const source of [referenceSource,otherSource,authoritySource])await reviewLegalSource(sql,user.id,{source_id:source.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'official_web',note:'Official source existence, pinpoint, and current status checked.'})

  let novelty=await createNoveltyAnalysis(sql,user.id,{prior_art_project_id:project.project.id,candidate_id:candidate.id,jurisdiction:'EPO'})
  assert.equal(novelty.mappings.length,elements.length)
  for(let index=0;index<novelty.mappings.length;index++)novelty=await reviewNoveltyMapping(sql,user.id,{analysis_id:novelty.analysis.id,mapping_id:novelty.mappings[index].id,disclosure_status:'explicit',review_status:'accepted',evidence_passage_id:index===novelty.mappings.length-1?otherPassage.id:referencePassages[index].id,confidence:.9,note:'Direct disclosure reviewed.'})
  await assert.rejects(()=>finalizeNoveltyAnalysis(sql,user.id,{analysis_id:novelty.analysis.id,reference_source_id:referenceSource.id,governing_authority_passage_id:authorityPassage.id,direct_and_unambiguous:true,enabling_disclosure:true,public_availability_checked:true,conclusion:'anticipated',conclusion_note:'All limitations appear disclosed.',review_status:'accepted'}),/single reference/i)

  const last=novelty.mappings.at(-1)
  novelty=await reviewNoveltyMapping(sql,user.id,{analysis_id:novelty.analysis.id,mapping_id:last.id,disclosure_status:'explicit',review_status:'accepted',evidence_passage_id:referencePassages.at(-1).id,confidence:.95,note:'Corrected to the selected reference pinpoint.'})
  novelty=await finalizeNoveltyAnalysis(sql,user.id,{analysis_id:novelty.analysis.id,reference_source_id:referenceSource.id,governing_authority_passage_id:authorityPassage.id,direct_and_unambiguous:true,enabling_disclosure:true,public_availability_checked:true,conclusion:'anticipated',conclusion_note:'The selected reference alone directly, unambiguously, and enablingly discloses every limitation before the critical date.',review_status:'accepted'})
  assert.equal(novelty.analysis.review_status,'accepted')
  assert.equal(novelty.analysis.conclusion,'anticipated')
  const[reviewedCandidate]=await sql`SELECT novelty_status FROM prior_art_candidates WHERE id=${candidate.id}`
  assert.equal(reviewedCandidate.novelty_status,'potentially_anticipates')
  const[graph]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND relationship_type='ASSESSES_NOVELTY_OF'`
  assert.equal(graph.count,1)
  const context=await getMatterContext(sql,user.id,matterId)
  assert.equal(context.noveltyAnalyses.length,1)
  assert.match(matterContextPrompt(context),/never combine or mosaic references/i)
  await assert.rejects(()=>reviewNoveltyMapping(sql,user.id,{analysis_id:novelty.analysis.id,mapping_id:novelty.mappings[0].id,disclosure_status:'not_found',review_status:'accepted'}),/reopened/i)
  await assert.rejects(()=>sql`UPDATE legal_sources SET verified_at=null WHERE id=${referenceSource.id}`,/reopened|verification/i)
  novelty=await finalizeNoveltyAnalysis(sql,user.id,{analysis_id:novelty.analysis.id,reference_source_id:referenceSource.id,governing_authority_passage_id:authorityPassage.id,direct_and_unambiguous:true,enabling_disclosure:true,public_availability_checked:true,conclusion:'anticipated',conclusion_note:'Reopened to test an ambiguity in limitation one.',review_status:'reopened'})
  await reviewNoveltyMapping(sql,user.id,{analysis_id:novelty.analysis.id,mapping_id:novelty.mappings[0].id,disclosure_status:'disputed',review_status:'accepted',note:'Ambiguity reopened for legal review.'})
  console.log('novelty integration passed')
}finally{
  await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`
}
