import {orchestrateSally} from '../../src/lib/sally-orchestrator.js'
import {recordSallyTelemetry} from '../../src/lib/sally-telemetry.js'
import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {routeSpecialists} from '../../src/lib/specialist-router.js'
import {planLegalTask} from '../../src/lib/legal-task-planner.js'
import {DRAFT_RESPONSE_CONTRACT} from '../../src/lib/patent-draft-service.js'
import {getMatterContext,matterContextPrompt} from '../../src/lib/matter-service.js'
import {retrieveHybridEvidence,evidencePrompt,verificationSummary,guardAnswerCitations} from '../../src/lib/verification-service.js'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  try{
    const sql=neon(process.env.DATABASE_URL)
    const user=await getSessionUser(sql,req.headers.cookie)
    if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    const messages=req.body?.messages||[],latest=[...messages].reverse().find(message=>message.role==='user')?.content||''
    const matter=await getMatterContext(sql,user.id,req.body?.matter_id)
    const [conversation]=req.body?.conversation_id?await sql`SELECT id FROM conversations WHERE id=${req.body.conversation_id} AND user_id=${user.id}`:[]
    if(conversation&&matter)await sql`UPDATE conversations SET matter_id=${matter.matter.id},updated_at=now() WHERE id=${conversation.id}`
    const route=routeSpecialists(latest,{deepResearch:Boolean(req.body?.deep_research),matterJurisdictions:matter?.matter?.jurisdictions||[]})
    const evidence=await retrieveHybridEvidence(sql,user.id,matter?.matter?.id,latest,{limit:req.body?.deep_research?14:8,embeddingKey:process.env.OPENROUTER_EMBEDDING_API_KEY,embeddingModel:process.env.SALLYIP_EMBEDDING_MODEL})
    const verification=verificationSummary(evidence,route)
    const drafting=planLegalTask(latest,{}).workflow_type==='patent_drafting'
    const contextMessage={role:'system',content:`SALLY TASK ROUTE\nTask: ${route.task_class}\nSpecialists: ${route.specialists.join(', ')}\nJurisdictions: ${route.jurisdictions.join(', ')||'unresolved'}\nResearch mode: ${route.research_mode}\n\n${matterContextPrompt(matter)}\n\n${evidencePrompt(evidence)}\n\nQUALITY GATE: Identify jurisdiction and material dates; distinguish recorded facts, retrieved sources, model knowledge, and inference. Do not fabricate a search. Do not present unverified citations as verified. For professional analysis include counterarguments, research gaps, proposition-level confidence, and recommended next steps.${drafting?`\n\n${DRAFT_RESPONSE_CONTRACT}`:''}`}
    const result=await orchestrateSally([contextMessage,...messages],process.env,`https://${req.headers.host}`)
    const [run]=await sql`INSERT INTO specialist_agent_runs(user_id,matter_id,conversation_id,task_class,specialists,jurisdictions,research_mode,source_basis,verification_status) VALUES(${user.id},${matter?.matter?.id||null},${conversation?.id||null},${route.task_class},${route.specialists},${route.jurisdictions},${route.research_mode},${verification.source_basis},${verification.status}) RETURNING id`
    await recordSallyTelemetry(process.env.DATABASE_URL,result.meta).catch(()=>{})
    const guarded=guardAnswerCitations(result.answer,evidence,verification)
    const answer=guarded.answer
    return res.status(200).json({id:`sally-${Date.now()}`,object:'chat.completion',model:'sallyip/4.1-pro',choices:[{index:0,message:{role:'assistant',content:answer},finish_reason:'stop'}],sally_meta:{...result.meta,agent_run_id:run.id,route,verification,sources:evidence.map(({content,...source})=>source),citation_guard:guarded.guard}})
  }catch(error){return res.status(503).json({error:{message:error.message}})}
}
