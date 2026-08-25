import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {runIpSpecialist} from '../src/lib/ip-specialist-service.js'
import {runAutomatedLegalWorkflow} from '../src/lib/workflow-orchestrator.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL),[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`,matterId=randomUUID(),conversationId=randomUUID()
assert.ok(user,'A test user is required')
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Automation ${matterId.slice(0,8)}`},'patent_fto',${['India']})`
  await sql`INSERT INTO conversations(id,user_id,title,matter_id) VALUES(${conversationId},${user.id},'Automation integration',${matterId})`
  await runIpSpecialist(sql,user.id,{action:'parse_patent_claims',matter_id:matterId,publication_number:`IN-AUTO-${matterId.slice(0,6)}`,jurisdiction:'India',title:'Automated secure inference patent',claims_text:'1. A secure computing device comprising: a processor configured to execute an inference model; and an encrypted memory configured to store inference keys.'})
  const[source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,retrieval_method) VALUES(${user.id},${matterId},'Product X specification','product_specification',5,'India','uploaded') RETURNING id`
  await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'section','Architecture','Product X contains a processor configured to execute an inference model. Product X includes encrypted memory that stores inference keys.')`
  await assert.rejects(()=>runAutomatedLegalWorkflow(sql,user.id,{matterId,conversationId,instruction:'Run an FTO analysis for Product X in India.',matterJurisdictions:['India']}),/No target patent was identified/)
  const[patentSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,retrieval_method) VALUES(${user.id},${matterId},'IN secure inference patent','patent_document',2,'India','uploaded') RETURNING id`
  await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${patentSource.id},'page','Page 12','Claims\n1. A secure computing device comprising: a processor configured to execute an inference model; and an encrypted memory configured to store inference keys.')`
  const result=await runAutomatedLegalWorkflow(sql,user.id,{matterId,conversationId,instruction:'Run an FTO analysis for Product X in India.',matterJurisdictions:['India']})
  assert.equal(result.plan.workflow_type,'fto')
  assert.equal(result.status,'partial')
  assert.ok(result.links.fto_project_id)
  assert.ok(result.artifact_id)
  assert.match(result.content,/Indian Patent Office \/ InPASS patent discovery was unavailable/i)
  assert.match(result.content,/limitation-by-limitation matrix/i)
  assert.match(result.content,/Product X specification, Architecture/i)
  const[run]=await sql`SELECT status,generated_artifact_id FROM legal_workflow_runs WHERE id=${result.run_id}`
  assert.equal(run.status,'partial');assert.equal(run.generated_artifact_id,result.artifact_id)
  const[reviews]=await sql`SELECT count(*)::int count FROM fto_patent_reviews WHERE project_id=${result.links.fto_project_id}`
  assert.equal(reviews.count,1)
  const[mappings]=await sql`SELECT count(*)::int count FROM fto_element_mappings m JOIN fto_patent_reviews r ON r.id=m.patent_review_id WHERE r.project_id=${result.links.fto_project_id} AND m.mapping_status<>'unreviewed'`
  assert.ok(mappings.count>0)
  const[citedMappings]=await sql`SELECT count(*)::int count FROM fto_element_mappings m JOIN fto_patent_reviews r ON r.id=m.patent_review_id WHERE r.project_id=${result.links.fto_project_id} AND m.product_feature_id IS NOT NULL AND m.evidence_passage_id IS NOT NULL`
  assert.ok(citedMappings.count>0)
  const[artifactVersion]=await sql`SELECT sources FROM artifact_versions WHERE artifact_id=${result.artifact_id} ORDER BY version DESC LIMIT 1`
  assert.ok(Array.isArray(artifactVersion.sources)&&artifactVersion.sources.some(source=>source.locator==='Architecture'))
  console.log('workflow automation integration passed')
}finally{await sql`DELETE FROM conversations WHERE id=${conversationId} AND user_id=${user.id}`;await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`}
