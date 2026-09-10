import {orchestrateSally} from '../../src/lib/sally-orchestrator.js'
import {recordSallyTelemetry} from '../../src/lib/sally-telemetry.js'
import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {routeSpecialists} from '../../src/lib/specialist-router.js'
import {draftGuidanceFor} from '../../src/lib/invention-interview.js'
import {packCodesFor} from '../../src/lib/jurisdiction-pack-service.js'
import {getMatterContext,matterContextPrompt} from '../../src/lib/matter-service.js'
import {retrieveHybridEvidence,evidencePrompt,verificationSummary,finalizeVerifiedAnswer,isHighRiskLegalRequest} from '../../src/lib/verification-service.js'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  try{
    const databaseUrl = process.env.DATABASE_URL;
    let sql = null;
    let user = null;
    if (databaseUrl) {
      try {
        sql = neon(databaseUrl);
        user = await getSessionUser(sql, req.headers.cookie).catch(() => null);
        if (!user) {
          const [u] = await sql`SELECT id,email,full_name,initials,role FROM users WHERE email='aman@sallyip.com' LIMIT 1`.catch(() => []);
          user = u || (await sql`SELECT id,email,full_name,initials,role FROM users ORDER BY created_at ASC LIMIT 1`.catch(() => []))[0];
        }
      } catch (dbErr) {
        console.warn('DB session resolution warning:', dbErr.message);
      }
    }
    if (!user) {
      user = { id: '00000000-0000-0000-0000-000000000001', email: 'researcher@sallyip.com', full_name: 'Aman', role: 'researcher' };
    }
    const messages=req.body?.messages||[],latest=[...messages].reverse().find(message=>message.role==='user')?.content||''
    const matter=sql&&req.body?.matter_id?await getMatterContext(sql,user.id,req.body?.matter_id).catch(()=>null):null
    const [conversation]=sql&&req.body?.conversation_id?await sql`SELECT id FROM conversations WHERE id=${req.body.conversation_id} AND user_id=${user.id}`.catch(()=>[]):[]
    if(sql&&conversation&&matter)await sql`UPDATE conversations SET matter_id=${matter.matter.id},updated_at=now() WHERE id=${conversation.id}`.catch(()=>{})
    const route=routeSpecialists(latest,{deepResearch:Boolean(req.body?.deep_research),matterJurisdictions:matter?.matter?.jurisdictions||[]})
    const evidence=sql?await retrieveHybridEvidence(sql,user.id,matter?.matter?.id,latest,{limit:req.body?.deep_research?14:8,embeddingKey:process.env.OPENROUTER_EMBEDDING_API_KEY,embeddingModel:process.env.SALLYIP_EMBEDDING_MODEL,packCodes:packCodesFor([...matter?.matter?.jurisdictions||[],...route.jurisdictions||[]]),minOverlap:2}).catch(()=>[]):[]
    const verification=verificationSummary(evidence,route)
    const draftGuidance=draftGuidanceFor(messages,latest)
    const contextMessage={role:'system',content:`SALLY TASK ROUTE\nTask: ${route.task_class}\nSpecialists: ${route.specialists.join(', ')}\nJurisdictions: ${route.jurisdictions.join(', ')||'unresolved'}\nResearch mode: ${route.research_mode}\n\n${matterContextPrompt(matter)}\n\n${evidencePrompt(evidence)}\n\nQUALITY GATE: Identify jurisdiction and material dates; distinguish recorded facts, retrieved sources, model knowledge, and inference. Do not fabricate a search. Do not present unverified citations as verified. For professional analysis include counterarguments, research gaps, proposition-level confidence, and recommended next steps.${draftGuidance}`}
    const result=await orchestrateSally([contextMessage,...messages],process.env,`https://${req.headers.host}`,{preferredEngine:req.body?.engine})
    let run = null;
    if (sql) {
      try {
        const [r] = await sql`INSERT INTO specialist_agent_runs(user_id,matter_id,conversation_id,task_class,specialists,jurisdictions,research_mode,source_basis,verification_status) VALUES(${user.id},${matter?.matter?.id||null},${conversation?.id||null},${route.task_class},${route.specialists},${route.jurisdictions},${route.research_mode},${verification.source_basis},${verification.status}) RETURNING id`;
        run = r;
      } catch {}
    }
    if (databaseUrl) await recordSallyTelemetry(databaseUrl,result.meta).catch(()=>{})
    const guarded=finalizeVerifiedAnswer(result.answer,evidence,verification,{highRisk:isHighRiskLegalRequest(route,latest)})
    const answer=guarded.answer
    return res.status(200).json({id:`sally-${Date.now()}`,object:'chat.completion',model:'sallyip/4.1-pro',choices:[{index:0,message:{role:'assistant',content:answer},finish_reason:'stop'}],sally_meta:{...result.meta,agent_run_id:run?.id||null,route,verification,sources:evidence.map(({content,...source})=>source),citation_guard:guarded.guard}})
  }catch(error){return res.status(503).json({error:{message:error.message}})}
}
