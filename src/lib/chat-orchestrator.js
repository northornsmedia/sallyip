import {orchestrateSally} from './sally-orchestrator.js'
import {recordSallyTelemetry} from './sally-telemetry.js'
import {routeSpecialists} from './specialist-router.js'
import {planLegalTask,automationSuggestions} from './legal-task-planner.js'
import {getMatterContext,matterContextPrompt} from './matter-service.js'
import {retrieveHybridEvidence,evidencePrompt,verificationSummary,finalizeVerifiedAnswer,isHighRiskLegalRequest} from './verification-service.js'
import {runAutomatedLegalWorkflow} from './workflow-orchestrator.js'
import {classifyDocumentIntent,resolveArtifactReference,buildGenerateFileToolCall} from './document-tool-service.js'

const latestUser=messages=>[...messages].reverse().find(message=>message.role==='user')?.content||''

function workflowMessage(workflow){
  const completed=workflow.steps.filter(step=>step.status==='completed').map(step=>`- ✓ ${step.key.replaceAll('_',' ')}`).join('\n')
  const pending=[
    ...workflow.steps.filter(step=>['skipped','needs_review'].includes(step.status)).map(step=>`- ⚠ ${step.key.replaceAll('_',' ')}`),
    ...(workflow.warnings||[]).map(warning=>`- ⚠ ${warning}`)
  ].join('\n')
  return`${workflow.content}\n\n## Workflow execution\n\n**Completed**\n${completed||'- Workflow prepared'}\n\n${pending?`**Needs review / incomplete**\n${pending}`:`**Status:** ${workflow.status}`}`
}

function fallbackSuggestions(plan,route){
  const items=automationSuggestions()
  if(plan.workflow_type&&!plan.requires_clarification)return[`Try adding jurisdiction, mark, or product details for ${plan.task_class.replaceAll('_',' ').toLowerCase()}.`,...items.slice(0,3)]
  if(route.task_class==='GENERAL_IP_RESEARCH')return items
  return items.slice(0,4)
}

export async function orchestrateChat(sql,user,body,env){
  const messages=body.messages||[],latest=latestUser(messages),matter=await getMatterContext(sql,user.id,body.matter_id)
  const route=routeSpecialists(latest,{deepResearch:Boolean(body.deep_research),matterJurisdictions:matter?.matter?.jurisdictions||[]})
  const plan=planLegalTask(latest,{matterJurisdictions:matter?.matter?.jurisdictions||[]})
  const intent=classifyDocumentIntent(latest)
  const conversationId=body.conversation_id||null
  const artifact=intent.references_artifact?await resolveArtifactReference(sql,user.id,conversationId,body):null
  const toolCall=buildGenerateFileToolCall(intent,artifact)

  if(body.matter_id&&plan.workflow_type&&!intent.revision&&intent.intent!=='EXPORT_DOCUMENT'){
    try{
      const workflow=await runAutomatedLegalWorkflow(sql,user.id,{matterId:body.matter_id,conversationId,instruction:latest,matterJurisdictions:matter?.matter?.jurisdictions||[]})
      if(workflow){
        const [run]=await sql`INSERT INTO specialist_agent_runs(user_id,matter_id,conversation_id,task_class,specialists,jurisdictions,research_mode,source_basis,verification_status) VALUES(${user.id},${body.matter_id},${conversationId},${plan.task_class},${route.specialists},${route.jurisdictions},${body.deep_research?'deep':'automated'},'matter_sources',${workflow.status}) RETURNING id`
        return{
          mode:'workflow',
          content:workflowMessage(workflow),
          artifact:workflow.artifact_id?{id:workflow.artifact_id,title:workflow.title,version:1,content:workflow.content,document_type:workflow.type}:null,
          workflow:{run_id:workflow.run_id,status:workflow.status,steps:workflow.steps,warnings:workflow.warnings,links:workflow.links},
          tool_call:toolCall,
          sally_meta:{agent_run_id:run.id,route:{...route,task_class:plan.task_class},plan,verification:{source_basis:'matter_sources',sources_retrieved:0,status:workflow.status},sources:[]}
        }
      }
    }catch(error){
      const evidence=await retrieveHybridEvidence(sql,user.id,body.matter_id,latest,{limit:8,embeddingKey:env.OPENROUTER_EMBEDDING_API_KEY,embeddingModel:env.SALLYIP_EMBEDDING_MODEL})
      const verification=verificationSummary(evidence,route)
      const contextMessage={role:'system',content:`SALLY TASK ROUTE\nTask: ${plan.task_class}\nSpecialists: ${route.specialists.join(', ')}\n\nAutomated workflow failed: ${error.message}\n\n${matterContextPrompt(matter)}\n\n${evidencePrompt(evidence)}\n\nProvide a helpful next-step answer. Explain what is missing, what Sally can still do in chat, and do not fabricate legal conclusions.`}
      const result=await orchestrateSally([contextMessage,...messages],env,`https://${body.host||'sallyip.com'}`)
      await recordSallyTelemetry(env.DATABASE_URL,result.meta).catch(()=>{})
      const guarded=finalizeVerifiedAnswer(`${result.answer}\n\n---\n**Automation note:** ${error.message}\n\n**Try next:**\n${fallbackSuggestions(plan,route).map(item=>`- ${item}`).join('\n')}`,evidence,verification,{highRisk:isHighRiskLegalRequest(route,latest),prompt:latest})
      return{
        mode:'chat',
        content:guarded.answer,
        artifact:null,
        workflow:{status:'failed',error:error.message,plan},
        tool_call:toolCall,
        sally_meta:{route:{...route,task_class:plan.task_class},plan,verification,citation_guard:guarded.guard,sources:evidence.map(({content,...source})=>source)}
      }
    }
  }

  if(plan.requires_matter&&!body.matter_id&&plan.workflow_type){
    return{
      mode:'chat',
      content:`Select or create a **matter** first so Sally can run **${plan.task_class.replaceAll('_',' ').toLowerCase()}** against your uploaded documents and matter brain.\n\nOnce a matter is active, I can ingest files, analyse them, draft artifacts, and prepare filing-ready exports entirely in this chat.`,
      artifact:null,
      workflow:null,
      tool_call:toolCall,
      sally_meta:{route,plan,verification:{source_basis:'none',sources_retrieved:0,status:'needs_matter'}}
    }
  }

  const evidence=await retrieveHybridEvidence(sql,user.id,body.matter_id,latest,{limit:body.deep_research?14:8,embeddingKey:env.OPENROUTER_EMBEDDING_API_KEY,embeddingModel:env.SALLYIP_EMBEDDING_MODEL})
  const verification=verificationSummary(evidence,route)
  const revision=intent.revision&&artifact
  const documentRequest=intent.intent==='DRAFT_LEGAL_DOCUMENT'||intent.intent==='EDIT_DOCUMENT'||revision
  let requestMessages=messages
  if(revision){
    requestMessages=[...messages.slice(0,-1),{role:'user',content:`DOCUMENT REVISION REQUEST\n\nExisting artifact: ${artifact.title}, version ${artifact.version}\n\n${artifact.content}\n\nRequested revision: ${latest}\n\nReturn only the complete revised document content.`}]
  }else if(documentRequest){
    requestMessages=[...messages.slice(0,-1),{role:'user',content:`DOCUMENT CONTENT REQUEST\n\nCreate or revise the requested legal/IP artifact.\nUser request: ${latest}\n\nReturn only the polished document content. Do not mention file-generation limitations.`}]
  }
  const suggestions=fallbackSuggestions(plan,route).map(item=>`- ${item}`).join('\n')
  const contextMessage={role:'system',content:`SALLY TASK ROUTE\nTask: ${plan.task_class}\nSpecialists: ${route.specialists.join(', ')}\nJurisdictions: ${route.jurisdictions.join(', ')||'unresolved'}\nResearch mode: ${body.deep_research?'deep':'quick'}\n\n${matterContextPrompt(matter)}\n\n${evidencePrompt(evidence)}\n\nCHAT-NATIVE LEGAL/IP ASSISTANT\n- Answer like a specialist legal/IP copilot in natural conversation.\n- Use matter brain sources when available; distinguish facts, retrieved passages, inference, and model knowledge.\n- When no automated workflow ran, still give practical analysis and suggest automations Sally can run next:\n${suggestions}\n- Do not fabricate official searches or verified citations.\n- Legal conclusions remain subject to lawyer review.`}
  const result=await orchestrateSally([contextMessage,...requestMessages],env,`https://${body.host||'sallyip.com'}`)
  const [run]=await sql`INSERT INTO specialist_agent_runs(user_id,matter_id,conversation_id,task_class,specialists,jurisdictions,research_mode,source_basis,verification_status) VALUES(${user.id},${body.matter_id||null},${conversationId},${plan.task_class},${route.specialists},${route.jurisdictions},${body.deep_research?'deep':'quick'},${verification.source_basis},${verification.status}) RETURNING id`
  await recordSallyTelemetry(env.DATABASE_URL,result.meta).catch(()=>{})
  const guarded=finalizeVerifiedAnswer(result.answer,evidence,verification,{highRisk:isHighRiskLegalRequest(route,latest),prompt:latest})
  let answer=guarded.answer
  if(route.task_class==='GENERAL_IP_RESEARCH'&&!documentRequest)answer=`${answer}\n\n---\n**Sally can also automate:**\n${suggestions}`
  return{
    mode:documentRequest?'document':'chat',
    content:answer,
    artifact:documentRequest?{title:artifact?.title||latest.slice(0,80),content:answer,document_type:artifact?.document_type||'legal_document',revision,id:artifact?.id,version:(artifact?.version||0)+1}:null,
    workflow:null,
    tool_call:toolCall,
    sally_meta:{...result.meta,agent_run_id:run.id,route,plan,verification,citation_guard:guarded.guard,sources:evidence.map(({content,...source})=>source)}
  }
}
