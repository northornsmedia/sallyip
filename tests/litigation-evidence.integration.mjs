import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {neon} from '@neondatabase/serverless'
import {attachLitigationEvidence,createChronologyEvent,createEvidenceItem,createLitigationIssue,getLitigationEvidenceWorkspace,reviewChronologyEvent,reviewEvidenceItem} from '../src/lib/litigation-evidence-service.js'
import {reviewLegalSource} from '../src/lib/proposition-verification-service.js'
import {getMatterContext,matterContextPrompt} from '../src/lib/matter-service.js'

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required')
const sql=neon(process.env.DATABASE_URL),[user]=await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`,matterId=randomUUID()
assert.ok(user,'A test user is required')
try{
  await sql`INSERT INTO matters(id,user_id,name,matter_type,jurisdictions) VALUES(${matterId},${user.id},${`Evidence integration ${matterId.slice(0,8)}`},'patent_litigation',${['Germany']})`
  const[source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,retrieval_method) VALUES(${user.id},${matterId},'Notice email','uploaded_email',5,'uploaded') RETURNING id`
  const[passage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},'page','1','On 14 March 2024, the recipient received written notice of the asserted patent.') RETURNING id`
  let workspace=await createLitigationIssue(sql,user.id,{matter_id:matterId,title:'Knowledge of the asserted patent',issue_type:'infringement'})
  const issue=workspace.issues[0]
  workspace=await createChronologyEvent(sql,user.id,{matter_id:matterId,issue_id:issue.id,event_date:'2024-03-14',title:'Written notice received',passage_id:passage.id,provenance_basis:'uploaded_document'})
  const event=workspace.events[0]
  await assert.rejects(()=>reviewChronologyEvent(sql,user.id,{event_id:event.id,review_status:'verified'}),/verified supporting pinpoint/)
  workspace=await createEvidenceItem(sql,user.id,{issue_id:issue.id,required_fact:'The accused infringer knew of the asserted patent before the relevant acts.',gap_note:'Confirm receipt and recipient identity.'})
  const item=workspace.items[0]
  workspace=await attachLitigationEvidence(sql,user.id,{object_type:'evidence_item',object_id:item.id,passage_id:passage.id,evidence_type:'supports',weight:'moderate'})
  await assert.rejects(()=>reviewEvidenceItem(sql,user.id,{item_id:item.id,assessment_status:'supported'}),/verified supporting pinpoint/)
  await reviewLegalSource(sql,user.id,{source_id:source.id,existence_confirmed:true,pinpoint_confirmed:true,current_status_checked:true,verification_method:'uploaded_original',note:'Original email and pinpoint reviewed.'})
  workspace=await reviewChronologyEvent(sql,user.id,{event_id:event.id,review_status:'verified'})
  workspace=await reviewEvidenceItem(sql,user.id,{item_id:item.id,assessment_status:'supported',gap_note:''})
  assert.equal(workspace.summary.verified_events,1)
  assert.equal(workspace.summary.open_gaps,0)
  await assert.rejects(()=>sql`UPDATE chronology_event_passages SET relation_type='context' WHERE event_id=${event.id} AND passage_id=${passage.id}`,/Cannot remove or weaken/)
  await assert.rejects(()=>sql`DELETE FROM evidence_matrix_passages WHERE item_id=${item.id} AND passage_id=${passage.id}`,/Cannot remove or weaken/)
  const audit=await sql`SELECT object_type,new_status FROM litigation_evidence_review_events WHERE matter_id=${matterId} ORDER BY created_at`
  assert.deepEqual(audit.map(row=>row.new_status),['verified','supported'])
  const tenantView=await getLitigationEvidenceWorkspace(sql,user.id,matterId)
  assert.equal(tenantView.events[0].evidence[0].source_verified,true)
  const matterContext=await getMatterContext(sql,user.id,matterId),prompt=matterContextPrompt(matterContext)
  assert.equal(matterContext.chronology[0].review_status,'verified')
  assert.equal(matterContext.evidenceMatrix[0].assessment_status,'supported')
  assert.match(prompt,/MATTER CHRONOLOGY/)
  assert.match(prompt,/EVIDENCE MATRIX/)
  assert.match(prompt,/Written notice received/)
  console.log('litigation evidence integration passed')
}finally{await sql`DELETE FROM matters WHERE id=${matterId} AND user_id=${user.id}`}
