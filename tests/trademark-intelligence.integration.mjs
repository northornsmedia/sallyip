import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {createClearanceProject} from '../src/lib/trademark-clearance-service.js'
import {reviewLegalSource} from '../src/lib/proposition-verification-service.js'
import {getMatterContext,matterContextPrompt} from '../src/lib/matter-service.js'
import {
  addTrademarkGoodsTerm,
  addTrademarkVariant,
  createTrademarkIntelligenceProject,
  finalizeTrademarkIntelligence,
  reviewTrademarkGoodsTerm,
  reviewTrademarkVariant,
  syncTrademarkIntelligenceToClearance,
  updateTrademarkLanguageCoverage,
} from '../src/lib/trademark-intelligence-service.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL)
const[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`
assert.ok(user,'A test user is required')
const matterId=randomUUID()

try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Trademark intelligence ${matterId.slice(0,8)}`},'trademark_clearance',${['EU']})`
  const clearance=await createClearanceProject(sql,user.id,{matter_id:matterId,title:'SALLYIP multilingual clearance',mark:'SALLYIP',jurisdictions:['EU'],nice_classes:[9],goods_services:'AI software'})
  let intelligence=await createTrademarkIntelligenceProject(sql,user.id,{matter_id:matterId,clearance_project_id:clearance.project.id,jurisdictions:['EU'],target_languages:['English','Arabic'],scripts:{English:'Latin',Arabic:'Arabic'}})
  assert.equal(intelligence.coverage.length,10)

  const[languageSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'Arabic linguistic review','expert_material',3,'EU','Linguist review 1','current','uploaded') RETURNING id`
  const[languagePassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${languageSource.id},'paragraph','Arabic review ¶ 1','The reviewed Arabic transliteration of SALLYIP is سالي آي بي.') RETURNING id`
  const[officeSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,authority_status,retrieval_method) VALUES(${user.id},${matterId},'EUIPO Harmonised Database','official_guidance',1,'EU','EUIPO HDB Class 9','current','official_web') RETURNING id`
  const[officePassage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${officeSource.id},'class','Nice class 9','Artificial intelligence software is accepted wording in Class 9 for this office record.') RETURNING id`

  intelligence=await addTrademarkVariant(sql,user.id,{project_id:intelligence.project.id,variant_type:'transliteration',language:'Arabic',script:'Arabic',variant_text:'سالي آي بي',meaning:'Phonetic rendering of SALLYIP',source_passage_id:languagePassage.id,source_basis:'linguist_review'})
  const variant=intelligence.variants[0]
  await assert.rejects(()=>reviewTrademarkVariant(sql,user.id,{variant_id:variant.id,source_passage_id:languagePassage.id,review_status:'accepted',reviewer_note:'Accepted after linguist review'}),/verified pinpoint language source/i)
  await reviewLegalSource(sql,user.id,{source_id:languageSource.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'uploaded_original',note:'Linguist source and pinpoint checked.'})
  intelligence=await reviewTrademarkVariant(sql,user.id,{variant_id:variant.id,source_passage_id:languagePassage.id,review_status:'accepted',reviewer_note:'Accepted after verified linguist review'})
  assert.deepEqual(intelligence.search_set,['SALLYIP','سالي آي بي'])

  for(const channel of intelligence.coverage){
    const completed=channel.language==='Arabic'&&channel.channel==='transliteration'
    intelligence=await updateTrademarkLanguageCoverage(sql,user.id,{coverage_id:channel.id,status:completed?'completed':'not_applicable',source_passage_id:completed?languagePassage.id:null,note:completed?'Verified Arabic transliteration reviewed':'Reviewed and not applicable to this scoped search'})
  }
  intelligence=await addTrademarkGoodsTerm(sql,user.id,{project_id:intelligence.project.id,user_description:'Downloadable AI software for intellectual-property research',proposed_wording:'Artificial intelligence software',nice_class:9,jurisdiction:'EU',office:'EUIPO',acceptability_status:'accepted_wording',source_passage_id:officePassage.id})
  const goods=intelligence.goods_terms[0]
  await assert.rejects(()=>reviewTrademarkGoodsTerm(sql,user.id,{goods_term_id:goods.id,proposed_wording:goods.proposed_wording,nice_class:9,acceptability_status:'accepted_wording',source_passage_id:officePassage.id,review_status:'accepted',reviewer_note:'Office wording checked'}),/verified Tier-1 office classification guidance/i)
  await reviewLegalSource(sql,user.id,{source_id:officeSource.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'official_web',note:'Checked current EUIPO class wording and pinpoint.'})
  intelligence=await reviewTrademarkGoodsTerm(sql,user.id,{goods_term_id:goods.id,proposed_wording:goods.proposed_wording,nice_class:9,acceptability_status:'accepted_wording',source_passage_id:officePassage.id,review_status:'accepted',reviewer_note:'Verified EUIPO wording'})
  intelligence=await finalizeTrademarkIntelligence(sql,user.id,{project_id:intelligence.project.id,review_status:'accepted',conclusion_note:'Arabic query expansion and EUIPO Class 9 wording accepted for the scoped EU search.'})
  assert.equal(intelligence.project.review_status,'accepted')

  await syncTrademarkIntelligenceToClearance(sql,user.id,{project_id:intelligence.project.id})
  const[clearanceRow]=await sql`SELECT nice_classes,goods_services FROM trademark_clearance_projects WHERE id=${clearance.project.id}`
  assert.deepEqual(clearanceRow.nice_classes,[9])
  assert.match(clearanceRow.goods_services,/Artificial intelligence software/)
  const[mark]=await sql`SELECT data FROM ip_entities WHERE id=${intelligence.project.mark_entity_id}`
  assert.deepEqual(mark.data.linguistic_variants,['سالي آي بي'])
  const[graph]=await sql`SELECT count(*)::int count FROM ip_relationships WHERE matter_id=${matterId} AND relationship_type IN ('LINGUISTIC_VARIANT_OF','CLASSIFIES_GOODS_FOR')`
  assert.equal(graph.count,2)

  const context=await getMatterContext(sql,user.id,matterId)
  assert.equal(context.trademarkIntelligence.length,1)
  const prompt=matterContextPrompt(context)
  assert.match(prompt,/TRADEMARK LANGUAGE AND GOODS\/SERVICES INTELLIGENCE/)
  assert.match(prompt,/Proposed or unverified mark variants are not clearance search terms/)
  await assert.rejects(()=>updateTrademarkLanguageCoverage(sql,user.id,{coverage_id:intelligence.coverage[0].id,status:'not_applicable',note:'Attempted accepted mutation'}),/must be reopened/i)
  await assert.rejects(()=>sql`UPDATE legal_sources SET verified_at=null WHERE id=${languageSource.id}`,/must be reopened|verification/i)
  intelligence=await finalizeTrademarkIntelligence(sql,user.id,{project_id:intelligence.project.id,review_status:'reopened',conclusion_note:'Reopened for additional regional review.'})
  assert.equal(intelligence.project.review_status,'reopened')
  await reviewTrademarkVariant(sql,user.id,{variant_id:variant.id,source_passage_id:languagePassage.id,review_status:'accepted',reviewer_note:'Reconfirmed after reopening'})
  console.log('trademark intelligence integration passed')
}finally{
  await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`
}
