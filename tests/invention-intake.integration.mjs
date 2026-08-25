import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {runAutomatedLegalWorkflow} from '../src/lib/workflow-orchestrator.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL),[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`,matterId=randomUUID(),conversationId=randomUUID()
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},'Drone intake test','patentability',${['India']})`
  await sql`INSERT INTO conversations(id,user_id,title,matter_id) VALUES(${conversationId},${user.id},'Drone intake',${matterId})`
  const[source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,retrieval_method) VALUES(${user.id},${matterId},'drone-disclosure.docx','invention_disclosure',5,'India','uploaded') RETURNING id`
  const rows=[['paragraph 1','Invention Disclosure Form'],['paragraph 2','Internal document prepared for evaluation ahead of patent filing.'],['paragraph 3','1. Inventors'],['paragraph 4',"The vision model was built on the inventor's employer laptops and GPU credits during work hours; ownership is unclear."],['paragraph 5','2. Title of invention'],['paragraph 6','Modular Multispectral Drone Attachment for Early Crop Disease Detection'],['paragraph 7','4. Detailed description'],['paragraph 8','A drone module includes a five-band multispectral camera and an onboard compute board configured to execute a compressed disease-classification model without a cloud connection.'],['paragraph 9','5. What we believe is novel'],['paragraph 10','The combination detects disease before visible symptoms using local multispectral inference.'],['paragraph 11','7. Public disclosure, prior use and funding'],['paragraph 12','Results were presented publicly on 2 August 2026 and the project used grant funding.'],['paragraph 13','9. Open questions for legal review'],['paragraph 14','Does the employer own the model and does the NDA restrict the training dataset?']]
  for(const[locator,content]of rows)await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'paragraph',${locator},${content})`
  const result=await runAutomatedLegalWorkflow(sql,user.id,{matterId,conversationId,instruction:"Provide document type, invention summary, key technical elements, novelty signals, red flags, open questions and next steps. Don't draft claims; this is intake analysis.",matterJurisdictions:['India']})
  assert.equal(result.plan.workflow_type,'invention_intake')
  assert.equal(result.status,'completed')
  assert.match(result.content,/## 1\. Document type and formality/)
  assert.match(result.content,/## 7\. Next steps before drafting/)
  assert.match(result.content,/paragraph 12, § Public disclosure/i)
  assert.match(result.content,/No claims were drafted/i)
  const[researchClaims]=await sql`SELECT count(*)::int count FROM ip_entities WHERE matter_id=${matterId} AND entity_type='patent'`
  assert.equal(researchClaims.count,0)
  console.log('invention intake integration passed')
}finally{await sql`DELETE FROM conversations WHERE id=${conversationId} AND user_id=${user.id}`;await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`}
