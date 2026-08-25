import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {runIpSpecialist} from '../src/lib/ip-specialist-service.js'
import {runAutomatedLegalWorkflow} from '../src/lib/workflow-orchestrator.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL),[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`,matterId=randomUUID(),conversationId=randomUUID()
assert.ok(user,'A test user is required')
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Patentability automation ${matterId.slice(0,8)}`},'patentability',${['India']})`
  await sql`INSERT INTO conversations(id,user_id,title,matter_id) VALUES(${conversationId},${user.id},'Patentability automation',${matterId})`
  await runIpSpecialist(sql,user.id,{action:'parse_patent_claims',matter_id:matterId,publication_number:'EP-UNRELATED-1',jurisdiction:'Europe',title:'Unrelated document classifier',claims_text:'1. A method comprising receiving an electronic document; classifying the document with a machine-learning model.'})
  const[source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,retrieval_method) VALUES(${user.id},${matterId},'Invention disclosure — irrigation valve','invention_disclosure',5,'India','uploaded') RETURNING id`
  await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'section','Description','A solar-powered irrigation valve system includes a capacitive soil-moisture sensor, a photovoltaic panel charging a supercapacitor, a low-power controller, and a rain-sense pad configured to adjust a moisture threshold. The prototype was publicly demonstrated on 12 July 2026.')`
  const result=await runAutomatedLegalWorkflow(sql,user.id,{matterId,conversationId,instruction:'Assess patentability of this irrigation valve in India.',matterJurisdictions:['India']})
  assert.match(result.content,/Invention disclosure — irrigation valve/)
  assert.match(result.content,/not filed, not an existing patent claim/i)
  assert.doesNotMatch(result.content,/EP-UNRELATED-1/)
  const[project]=await sql`SELECT to_char(critical_date,'YYYY-MM-DD') critical_date,invention_summary FROM prior_art_projects WHERE id=${result.links.prior_art_project_id}`
  assert.equal(project.critical_date,'2026-07-12')
  assert.match(project.invention_summary,/soil-moisture sensor/i)
  console.log('patentability automation integration passed')
}finally{
  await sql`DELETE FROM conversations WHERE id=${conversationId} AND user_id=${user.id}`
  await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`
}
