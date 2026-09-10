import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local', override: true })
import { fileURLToPath, URL } from 'node:url'
import { spawn } from 'node:child_process'
import { neon } from '@neondatabase/serverless'
import { orchestrateSally, orchestrateSallyStreaming } from './src/lib/sally-orchestrator.js'
import { checkAdminCredentials, createAdminSession, verifyAdminSession, destroyAdminSession, clearAdminCookie, brainOverview, brainTrace } from './src/lib/brain-admin.js'
import { readSallyTelemetry, recordSallyTelemetry } from './src/lib/sally-telemetry.js'
import { clearSessionCookie, createSession, destroySession, getSessionUser, hashPassword, sessionCookie, verifyPassword } from './src/lib/auth.js'
import { getPassage } from './src/lib/passage-service.js'
import { getClientIp, logSecurityEvent, loginBlocked, recordLoginAttempt, requireEditor } from './src/lib/security.js'
import { routeSpecialists } from './src/lib/specialist-router.js'
import { getMatterContext, matterContextPrompt } from './src/lib/matter-service.js'
import { retrieveHybridEvidence, evidencePrompt, verificationSummary, guardAnswerCitations } from './src/lib/verification-service.js'
import { ingestDocumentLocal } from './src/lib/document-ingestion-local.js'
import { runIpSpecialist } from './src/lib/ip-specialist-service.js'
import { providerStatus } from './src/lib/official-search-service.js'
import { runOfficialSearch } from './src/lib/official-search-persistence.js'
import { acceptSuggestedClaimChartRows, createClaimChart, getClaimChart, listClaimChartInputs, reviewClaimChartRow } from './src/lib/claim-chart-service.js'
import { embedKnowledgeSource } from './src/lib/embedding-service.js'
import { addClearanceCandidate, createClearanceProject, getClearanceProject, listClearanceProjects, reviewClearanceCandidate, screenMatterTrademarks } from './src/lib/trademark-clearance-service.js'
import { addTrademarkGoodsTerm, addTrademarkVariant, createTrademarkIntelligenceProject, finalizeTrademarkIntelligence, getTrademarkIntelligenceProject, listTrademarkIntelligenceInputs, reviewTrademarkGoodsTerm, reviewTrademarkVariant, syncTrademarkIntelligenceToClearance, updateTrademarkLanguageCoverage } from './src/lib/trademark-intelligence-service.js'
import { addPatentFamilyMember, createPatentFamily, getPatentFamily, linkPatentFamilyMembers, listPatentFamilies } from './src/lib/patent-family-service.js'
import { attachPropositionSource, createProposition, evaluateProposition, getProposition, listVerificationDesk, reviewLegalSource } from './src/lib/proposition-verification-service.js'
import { buildGenerateFileToolCall, classifyDocumentIntent, GENERATE_FILE_TOOL, resolveArtifactReference } from './src/lib/document-tool-service.js'
import { createPriorArtProject, getPriorArtProject, importPriorArtSearchRun, listPriorArtProjects, reviewPriorArtCandidate, reviewPriorArtMapping, updatePriorArtCandidate } from './src/lib/prior-art-service.js'
import { attachLitigationEvidence, createChronologyEvent, createEvidenceItem, createLitigationIssue, getLitigationEvidenceWorkspace, proposeChronologyFromSources, reviewChronologyEvent, reviewEvidenceItem } from './src/lib/litigation-evidence-service.js'
import { addInventiveStepReference, attachInventiveStepEvidence, createInventiveStepAnalysis, finalizeInventiveStep, getInventiveStepAnalysis, listInventiveStepInputs, reviewInventiveStep } from './src/lib/inventive-step-service.js'
import { addFtoDesignAround, addFtoPatentReview, createFtoProject, finalizeFtoProject, getFtoProject, listFtoInputs, reviewFtoFeature, reviewFtoMapping, reviewFtoPatent, updateFtoCoverage } from './src/lib/fto-service.js'
import { createNoveltyAnalysis, finalizeNoveltyAnalysis, getNoveltyAnalysis, listNoveltyInputs, reviewNoveltyMapping } from './src/lib/novelty-service.js'
import { createOfficeAction, getOfficeAction, listOfficeActions, proposeAmendment, reviewAmendment } from './src/lib/office-action-service.js'
import { listPatentBench, runPatentBench } from './src/lib/patent-bench.js'
import { buildPlaybookInstruction, createPlaybook, getPlaybook, listPlaybooks, updatePlaybook } from './src/lib/playbook-service.js'
import { createContract, getContract, listTemplates, reviewContract, updateContract } from './src/lib/contract-service.js'
import { listAnswerCitations, recordAnswerCitations, verifyQuote } from './src/lib/citation-service.js'
import { createReviewTable, getReviewTable, listReviewTables, runReviewTable } from './src/lib/vault-review-service.js'
import { listEvalRuns, runEval } from './src/lib/eval-harness.js'
import { draftGuidanceFor } from './src/lib/invention-interview.js'
import { packCodesFor } from './src/lib/jurisdiction-pack-service.js'
import { planLegalTask } from './src/lib/legal-task-planner.js'
import { exportGroundingPairs, exportRiskPairs, flywheelCounts } from './src/lib/flywheel-export.js'
import { runAutomatedLegalWorkflow } from './src/lib/workflow-orchestrator.js'
import { createPatentDraft, getPatentDraft, listPatentDrafts, updateDraftSection, generateDraftSection, screenSubjectMatter101, verifyClaimSupport112, assembleFullSpecification } from './src/lib/patent-drafting-service.js'

function sallyChatApi(apiKey, databaseUrl, model, embeddingKey, embeddingModel, lfmChatKey, lfmChatModel, dotsKey, dotsModel, gemmaKey, gemmaModel, rerankKey, rerankModel, oxKey, oxModel, epoKey, epoSecret, euipoClientId, euipoClientSecret, euipoAuthUrl, euipoApiBase, brainAdminUsername, brainAdminPassword, omniRouteKey, omniRouteBaseUrl, usptoApiKey, usptoApiBase, courtListenerToken, courtListenerCourt) {
  return {
    name: 'sally-chat-api',
    configureServer(server) {
      server.middlewares.use('/api/workflows',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}try{const sql=neon(databaseUrl||''),user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),result=await runAutomatedLegalWorkflow(sql,user.id,{matterId:body.matter_id,conversationId:body.conversation_id,instruction:body.instruction,matterJurisdictions:body.matter_jurisdictions||[]});res.statusCode=result?200:422;return res.end(JSON.stringify(result||{error:{message:'No automated Phase 1 workflow matched this instruction'}}))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Automated workflow failed'}}))}})
      server.middlewares.use('/api/playbooks',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');return res.end(JSON.stringify(id?await getPlaybook(sql,user.id,id):await listPlaybooks(sql,user.id)))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),action=body.action||'create';try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if(action==='create'){res.statusCode=201;return res.end(JSON.stringify(await createPlaybook(sql,user.id,body)))}if(action==='update')return res.end(JSON.stringify(await updatePlaybook(sql,user.id,body.playbook_id,body)));if(action==='run'){const{playbook}=await getPlaybook(sql,user.id,body.playbook_id),instruction=buildPlaybookInstruction(playbook,body.variables||{}),result=await runAutomatedLegalWorkflow(sql,user.id,{matterId:body.matter_id,conversationId:body.conversation_id,instruction,matterJurisdictions:body.matter_jurisdictions||(playbook.default_jurisdiction?[playbook.default_jurisdiction]:[])});if(result?.run_id){const[v]=await sql`SELECT max(version) AS version FROM legal_playbook_versions WHERE playbook_id=${playbook.id}`;await sql`UPDATE legal_workflow_runs SET playbook_id=${playbook.id},playbook_version=${v?.version||1} WHERE id=${result.run_id}`}res.statusCode=result?200:422;return res.end(JSON.stringify(result||{error:{message:'Playbook did not match an automated workflow'}}))}throw new Error('Unknown playbook action')}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Playbook operation failed'}}))}})
      server.middlewares.use('/api/contracts',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');if(id)return res.end(JSON.stringify(await getContract(sql,user.id,id)));if(url.searchParams.get('templates')!==null)return res.end(JSON.stringify(await listTemplates(sql)));const contracts=await sql`SELECT id,title,contract_type,jurisdiction,status,active_version,updated_at FROM legal_contracts WHERE user_id=${user.id} ORDER BY updated_at DESC LIMIT 100`;return res.end(JSON.stringify({contracts}))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),action=body.action||'create';if(action==='templates')return res.end(JSON.stringify(await listTemplates(sql)));try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if(action==='create'){res.statusCode=201;return res.end(JSON.stringify(await createContract(sql,user.id,body)))}if(action==='review')return res.end(JSON.stringify(await reviewContract(sql,user.id,body.contract_id)));if(action==='update')return res.end(JSON.stringify(await updateContract(sql,user.id,body.contract_id,body)));throw new Error('Unknown contract action')}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Contract operation failed'}}))}})
      server.middlewares.use('/api/patent-drafts',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');if(id)return res.end(JSON.stringify(await getPatentDraft(sql,user.id,id)));return res.end(JSON.stringify(await listPatentDrafts(sql,user.id,url.searchParams.get('matter_id'))))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),action=body.action||'create';try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if(action==='create'){res.statusCode=201;return res.end(JSON.stringify(await createPatentDraft(sql,user.id,body)))}if(action==='screen_101'){const screening=screenSubjectMatter101(body.disclosure_text||'');if(body.draft_id)await sql`UPDATE patent_drafts SET screening_results=${JSON.stringify(screening)}::jsonb, updated_at=now() WHERE id=${body.draft_id} AND user_id=${user.id}`;return res.end(JSON.stringify({screening}))}if(action==='generate_section'){const env={OPENROUTER_API_KEY:apiKey,SALLYIP_MODEL:model};const section=await generateDraftSection(env,sql,user.id,{draftId:body.draft_id,sectionKey:body.section_key,customInstructions:body.custom_instructions});return res.end(JSON.stringify({section}))}if(action==='update_section'){const section=await updateDraftSection(sql,user.id,body.draft_id,body.section_key,body.content,body.review_notes);return res.end(JSON.stringify({section}))}if(action==='verify_112'){const verification=verifyClaimSupport112(body.claims_text||'',body.spec_text||'');if(body.draft_id)await sql`UPDATE patent_drafts SET support_matrix=${JSON.stringify(verification.matrix)}::jsonb, updated_at=now() WHERE id=${body.draft_id} AND user_id=${user.id}`;return res.end(JSON.stringify({verification}))}if(action==='assemble'){const{draft,sections}=await getPatentDraft(sql,user.id,body.draft_id);return res.end(JSON.stringify({fullDoc:assembleFullSpecification(draft,sections),title:draft.title,filing_type:draft.filing_type}))}if(action==='approve'){const[draft]=await sql`UPDATE patent_drafts SET is_approved=true, status='approved', attorney_review_notes=${body.notes||null}, updated_at=now() WHERE id=${body.draft_id} AND user_id=${user.id} RETURNING *`;return res.end(JSON.stringify({draft}))}throw new Error(`Unknown patent draft action: ${action}`)}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Patent drafting failed'}}))}})
      server.middlewares.use('/api/citations',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost');return res.end(JSON.stringify(await listAnswerCitations(sql,user.id,{conversation_id:url.searchParams.get('conversation_id'),agent_run_id:url.searchParams.get('agent_run_id'),matter_id:url.searchParams.get('matter_id')})))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');if((body.action||'record')==='verify'){const[p]=await sql`SELECT sp.content FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.passage_id} AND s.user_id=${user.id}`;if(!p)throw new Error('Source passage not found');return res.end(JSON.stringify({match_status:verifyQuote(p.content,body.quote||'')}))}try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}res.statusCode=201;return res.end(JSON.stringify(await recordAnswerCitations(sql,user.id,body)))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Citation operation failed'}}))}})
      server.middlewares.use('/api/vault-reviews',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');return res.end(JSON.stringify(id?await getReviewTable(sql,user.id,id):await listReviewTables(sql,user.id,url.searchParams.get('matter_id'))))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if((body.action||'create')==='create'){res.statusCode=201;return res.end(JSON.stringify(await createReviewTable(sql,user.id,body)))}if(body.action==='run')return res.end(JSON.stringify(await runReviewTable(sql,user.id,body.table_id)));throw new Error('Unknown review-table action')}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Review table operation failed'}}))}})
      server.middlewares.use('/api/eval-runs',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost');return res.end(JSON.stringify(await listEvalRuns(sql,{limit:url.searchParams.get('limit')})))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}res.statusCode=201;return res.end(JSON.stringify(await runEval(sql,user.id,JSON.parse(raw||'{}').name)))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Eval operation failed'}}))}})
      server.middlewares.use('/api/flywheel',async(req,res)=>{const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}try{requireEditor(user)}catch{res.statusCode=403;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if(req.method!=='GET'){res.statusCode=405;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}const url=new URL(req.url,'http://localhost'),dataset=url.searchParams.get('dataset');if(!dataset){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(await flywheelCounts(sql,user.id)))}const exporter=dataset==='grounding'?exportGroundingPairs:dataset==='risk'?exportRiskPairs:null;if(!exporter){res.statusCode=400;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Unknown dataset (grounding|risk)'}}))}res.setHeader('Content-Type','application/x-ndjson');res.setHeader('Content-Disposition',`attachment; filename="sallyip-${dataset}.jsonl"`);return res.end(await exporter(sql,user.id,{limit:url.searchParams.get('limit')}))}catch(error){res.statusCode=400;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:error.message||'Export failed'}}))}})
      server.middlewares.use('/api/ip-graph',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const url=new URL(req.url,'http://localhost'),matterId=url.searchParams.get('matter_id');const [matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${user.id}`;if(!matter){res.statusCode=404;return res.end(JSON.stringify({error:{message:'Matter not found'}}))}if(req.method==='GET'){const entities=await sql`SELECT * FROM ip_entities WHERE matter_id=${matter.id} AND user_id=${user.id} ORDER BY updated_at DESC`;const relationships=await sql`SELECT * FROM ip_relationships WHERE matter_id=${matter.id} AND user_id=${user.id} ORDER BY created_at DESC`;return res.end(JSON.stringify({entities,relationships}))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');if((body.action||'create_entity')==='create_entity'){const [entity]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${user.id},${matter.id},${body.entity_type},${body.canonical_identifier||null},${body.name},${body.jurisdiction||null},${JSON.stringify(body.data||{})}::jsonb,${body.source_status||'user_supplied'}) RETURNING *`;res.statusCode=201;return res.end(JSON.stringify({entity}))}const [from]=await sql`SELECT id FROM ip_entities WHERE id=${body.from_entity_id} AND matter_id=${matter.id} AND user_id=${user.id}`;const [to]=await sql`SELECT id FROM ip_entities WHERE id=${body.to_entity_id} AND matter_id=${matter.id} AND user_id=${user.id}`;if(!from||!to){res.statusCode=404;return res.end(JSON.stringify({error:{message:'Graph entity not found'}}))}const [relationship]=await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,confidence) VALUES(${user.id},${matter.id},${from.id},${body.relationship_type},${to.id},${JSON.stringify(body.data||{})}::jsonb,${body.confidence??null}) ON CONFLICT(from_entity_id,relationship_type,to_entity_id) DO UPDATE SET data=excluded.data,confidence=excluded.confidence RETURNING *`;res.statusCode=201;return res.end(JSON.stringify({relationship}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message||'IP graph operation failed'}}))}})
      server.middlewares.use('/api/prior-art',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const url=new URL(req.url,'http://localhost');if(req.method==='GET')return res.end(JSON.stringify(url.searchParams.get('project_id')?await getPriorArtProject(sql,user.id,url.searchParams.get('project_id')):await listPriorArtProjects(sql,user.id,url.searchParams.get('matter_id'))));if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:createPriorArtProject,import_search:importPriorArtSearchRun,review_candidate:reviewPriorArtCandidate,review_mapping:reviewPriorArtMapping,update_candidate:updatePriorArtCandidate},action=actions[body.action||'create'];if(!action)throw new Error('Unknown prior-art action');res.end(JSON.stringify(await action(sql,user.id,body)))}catch(error){res.statusCode=400;res.end(JSON.stringify({error:{message:error.message||'Prior-art workflow failed'}}))}})
      server.middlewares.use('/api/litigation-evidence',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const url=new URL(req.url,'http://localhost');if(req.method==='GET')return res.end(JSON.stringify(await getLitigationEvidenceWorkspace(sql,user.id,url.searchParams.get('matter_id'))));if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create_issue:createLitigationIssue,create_event:createChronologyEvent,review_event:reviewChronologyEvent,create_item:createEvidenceItem,attach_evidence:attachLitigationEvidence,review_item:reviewEvidenceItem,propose_chronology:proposeChronologyFromSources},action=actions[body.action];if(!action)throw new Error('Unknown litigation evidence action');res.end(JSON.stringify(await action(sql,user.id,body)))}catch(error){res.statusCode=400;res.end(JSON.stringify({error:{message:error.message||'Litigation evidence operation failed'}}))}})
      server.middlewares.use('/api/inventive-step',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const url=new URL(req.url,'http://localhost');if(req.method==='GET')return res.end(JSON.stringify(url.searchParams.get('analysis_id')?await getInventiveStepAnalysis(sql,user.id,url.searchParams.get('analysis_id')):await listInventiveStepInputs(sql,user.id,url.searchParams.get('matter_id'))));if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:createInventiveStepAnalysis,add_reference:addInventiveStepReference,attach_evidence:attachInventiveStepEvidence,review_step:reviewInventiveStep,finalize:finalizeInventiveStep},action=actions[body.action];if(!action)throw new Error('Unknown inventive-step action');res.end(JSON.stringify(await action(sql,user.id,body)))}catch(error){res.statusCode=400;res.end(JSON.stringify({error:{message:error.message||'Inventive-step operation failed'}}))}})
      server.middlewares.use('/api/fto',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const url=new URL(req.url,'http://localhost');if(req.method==='GET')return res.end(JSON.stringify(url.searchParams.get('project_id')?await getFtoProject(sql,user.id,url.searchParams.get('project_id')):await listFtoInputs(sql,user.id,url.searchParams.get('matter_id'))));if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:createFtoProject,add_patent:addFtoPatentReview,review_feature:reviewFtoFeature,update_coverage:updateFtoCoverage,review_mapping:reviewFtoMapping,review_patent:reviewFtoPatent,add_design_around:addFtoDesignAround,finalize:finalizeFtoProject},action=actions[body.action];if(!action)throw new Error('Unknown FTO action');res.end(JSON.stringify(await action(sql,user.id,body)))}catch(error){res.statusCode=400;res.end(JSON.stringify({error:{message:error.message||'FTO operation failed'}}))}})
      const resolveDevUser = async (sql, cookie) => {
        // Phase 3: dev fallback must never execute in production.
        if (String(process.env.NODE_ENV || process.env.VERCEL_ENV || '').toLowerCase() === 'production' || String(process.env.SALLYIP_ENV || '').toLowerCase() === 'production') {
          const error = new Error('Security: dev authentication fallback is blocked in production.');
          error.code = 'DEV_FALLBACK_BLOCKED';
          throw error;
        }
        let user = await getSessionUser(sql, cookie).catch(() => null);
        if (!user) {
          try {
            const [u] = await sql`SELECT id,email,full_name,initials,role FROM users WHERE email='aman@sallyip.com' LIMIT 1`;
            user = u || (await sql`SELECT id,email,full_name,initials,role FROM users ORDER BY created_at ASC LIMIT 1`)[0];
          } catch {}
        }
        return user;
      };

      server.middlewares.use('/api/document-tools',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}try{const sql=neon(databaseUrl||''),user=await resolveDevUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}let raw='';for await(const chunk of req)raw+=chunk;if(raw.length>200000)throw new Error('Request is too large');const body=JSON.parse(raw||'{}'),intent=classifyDocumentIntent(body.message),artifact=intent.references_artifact?await resolveArtifactReference(sql,user.id,body.conversation_id,body):null;return res.end(JSON.stringify({intent,tool:GENERATE_FILE_TOOL,tool_call:buildGenerateFileToolCall(intent,artifact),artifact}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:'Document orchestration failed'}}))}})
      server.middlewares.use('/api/generated-files',async(req,res)=>{const sql=neon(databaseUrl||'');try{const user=await resolveDevUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const url=new URL(req.url,'http://localhost');const id=url.searchParams.get('id');if(!id){if(req.method==='GET'){const files=await sql`SELECT id,filename,format,mime_type,size_bytes,artifact_id,artifact_version,conversation_id,created_at FROM generated_files WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 200`;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({files:files.map(f=>({id:f.id,name:f.filename,filename:f.filename,format:f.format,mime_type:f.mime_type,size:f.size_bytes,size_bytes:f.size_bytes,artifact_id:f.artifact_id,artifact_version:f.artifact_version,conversation_id:f.conversation_id,created_at:f.created_at,url:`/api/generated-files?id=${f.id}`}))}))}res.statusCode=400;return res.end(JSON.stringify({error:{message:'File id is required'}}))}if(req.method==='DELETE'){await sql`DELETE FROM generated_files WHERE id=${id} AND user_id=${user.id}`;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({success:true}))}const [file]=await sql`SELECT filename,mime_type,size_bytes,content FROM generated_files WHERE id=${id} AND user_id=${user.id} LIMIT 1`;if(!file){res.statusCode=404;return res.end('File not found')}res.setHeader('Content-Type',file.mime_type);res.setHeader('Content-Length',String(file.size_bytes));res.setHeader('Content-Disposition',`attachment; filename="${file.filename.replace(/["\r\n]/g,'_')}"`);return res.end(Buffer.from(file.content))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:'File operation failed'}}))}})
      server.middlewares.use('/api/generate-file',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}try{const sql=neon(databaseUrl||'');const user=await resolveDevUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}let raw='';for await(const chunk of req)raw+=chunk;const payload=JSON.parse(raw||'{}');if(raw.length>200000)throw new Error('Request is too large');if(payload.artifact_id){const [resolved]=await sql`SELECT a.title,v.version,v.content FROM artifacts a JOIN artifact_versions v ON v.artifact_id=a.id AND v.version=coalesce(${payload.artifact_version},a.active_version) WHERE a.id=${payload.artifact_id} AND a.user_id=${user.id}`;if(!resolved)throw new Error('Artifact not found');payload.title=resolved.title;payload.content=resolved.content;payload.artifact_version=resolved.version}const result=await new Promise((resolve,reject)=>{const child=spawn('python',['scripts/create_chat_file.py'],{cwd:process.cwd(),windowsHide:true});let output='',errors='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>errors+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(output)):reject(new Error(errors||'File generator failed')));child.stdin.end(JSON.stringify(payload))});const [conversation]=payload.conversation_id?await sql`SELECT id FROM conversations WHERE id=${payload.conversation_id} AND user_id=${user.id}`:[];const bytes=Buffer.from(result.data,'base64');const [saved]=await sql`INSERT INTO generated_files(user_id,conversation_id,artifact_id,artifact_version,filename,mime_type,format,size_bytes,content) VALUES(${user.id},${conversation?.id||null},${payload.artifact_id||null},${payload.artifact_version||null},${result.filename},${result.mime_type},${payload.format},${bytes.length},decode(${result.data},'base64')) RETURNING id`;return res.end(JSON.stringify({success:true,file:{id:saved.id,name:result.filename,mime_type:result.mime_type,format:payload.format,size:bytes.length,artifact_id:payload.artifact_id||null,artifact_version:payload.artifact_version||null,url:`/api/generated-files?id=${saved.id}`}}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({success:false,error:'FILE_GENERATION_FAILED',message:error.message||'Sally could not create the file'}))}})
      server.middlewares.use('/api/artifacts',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await resolveDevUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),content=String(body.content||'').trim();if(!content)throw new Error('Artifact content is required');const convId=body.conversation_id||body.conversationId;if((body.action||'create')==='create'){let [conversation]=convId?await sql`SELECT id FROM conversations WHERE id=${convId} AND user_id=${user.id}`:[];if(!conversation&&convId){try{await sql`INSERT INTO conversations(id,user_id,title) VALUES(${convId},${user.id},${body.title||'SallyIP document'}) ON CONFLICT(id) DO NOTHING`;[conversation]=await sql`SELECT id FROM conversations WHERE id=${convId}`;}catch{}}if(!conversation){try{[conversation]=await sql`SELECT id FROM conversations WHERE user_id=${user.id} ORDER BY updated_at DESC LIMIT 1`;}catch{}}const artifactId=body.artifact_id||crypto.randomUUID();const [artifact]=await sql`INSERT INTO artifacts(id,user_id,conversation_id,title,document_type) VALUES(${artifactId},${user.id},${conversation?.id||null},${body.title||'SallyIP document'},${body.document_type||'legal_document'}) RETURNING *`;const [version]=await sql`INSERT INTO artifact_versions(artifact_id,version,content,metadata) VALUES(${artifact.id},1,${content},${JSON.stringify(body.metadata||{})}::jsonb) RETURNING *`;if(conversation)await sql`UPDATE conversations SET last_active_artifact_id=${artifact.id} WHERE id=${conversation.id}`;return res.end(JSON.stringify({artifact:{...artifact,...version,id:artifact.id}}))}const [artifact]=await sql`SELECT * FROM artifacts WHERE id=${body.artifact_id} AND user_id=${user.id}`;if(!artifact)throw new Error('Artifact not found');const [next]=await sql`SELECT coalesce(max(version),0)::int+1 next FROM artifact_versions WHERE artifact_id=${artifact.id}`;const [version]=await sql`INSERT INTO artifact_versions(artifact_id,version,content,metadata) VALUES(${artifact.id},${next.next},${content},${JSON.stringify(body.metadata||{})}::jsonb) RETURNING *`;await sql`UPDATE artifacts SET active_version=${version.version},updated_at=now() WHERE id=${artifact.id}`;if(artifact.conversation_id)await sql`UPDATE conversations SET last_active_artifact_id=${artifact.id} WHERE id=${artifact.conversation_id}`;return res.end(JSON.stringify({artifact:{...artifact,...version,id:artifact.id}}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message||'Artifact operation failed'}}))}})
      server.middlewares.use('/api/auth', async (req, res) => {
        res.setHeader('Content-Type','application/json')
        const sql=neon(databaseUrl||'')
        try{
          if(req.method==='GET'){const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}return res.end(JSON.stringify({user:{id:user.id,email:user.email,name:user.full_name,initials:user.initials,role:user.role}}))}
          if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}
          let raw='';for await(const chunk of req)raw+=chunk;const {action,email='',password='',name=''}=JSON.parse(raw||'{}')
          if(action==='logout'){const me=await getSessionUser(sql,req.headers.cookie);await destroySession(sql,req.headers.cookie);await logSecurityEvent(sql,{userId:me?.id||null,event_type:'logout',req});res.setHeader('Set-Cookie',clearSessionCookie(false));return res.end(JSON.stringify({ok:true}))}
          const normalized=email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(normalized)){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Enter a valid email address'}}))}if(password.length<8){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Password must contain at least 8 characters'}}))}
          const attemptKey=`${normalized}|${getClientIp(req)||'unknown'}`;if(await loginBlocked(sql,attemptKey)){await logSecurityEvent(sql,{event_type:'login_rate_limited',req,metadata:{email:normalized}});res.statusCode=429;return res.end(JSON.stringify({error:{message:'Too many attempts. Try again in a few minutes.'}}))}
          let user
          if(action==='signup'){const fullName=name.trim();if(fullName.length<2){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Enter your name'}}))}const initials=fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();const passwordHash=await hashPassword(password);try{[user]=await sql`INSERT INTO users(email,full_name,initials,password_hash) VALUES(${normalized},${fullName},${initials},${passwordHash}) RETURNING id,email,full_name,initials,role`}catch(error){if(error.code==='23505'){res.statusCode=409;return res.end(JSON.stringify({error:{message:'An account with this email already exists'}}))}throw error}await sql`INSERT INTO subscriptions(user_id,plan_id,status) VALUES(${user.id},'basic','active')`;await logSecurityEvent(sql,{userId:user.id,event_type:'signup',req})}
          else if(action==='login'){[user]=await sql`SELECT id,email,full_name,initials,role,password_hash FROM users WHERE email=${normalized} LIMIT 1`;if(!user||!await verifyPassword(password,user.password_hash)){await recordLoginAttempt(sql,attemptKey);await logSecurityEvent(sql,{userId:user?.id||null,event_type:'login_failed',req,metadata:{email:normalized}});res.statusCode=401;return res.end(JSON.stringify({error:{message:'Incorrect email or password'}}))}await logSecurityEvent(sql,{userId:user.id,event_type:'login_success',req})}
          else{res.statusCode=400;return res.end(JSON.stringify({error:{message:'Unknown authentication action'}}))}
          const token=await createSession(sql,user.id);res.setHeader('Set-Cookie',sessionCookie(token,false));return res.end(JSON.stringify({user:{id:user.id,email:user.email,name:user.full_name,initials:user.initials,role:user.role}}))
        }catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:'Authentication is temporarily unavailable'}}))}
      })
      server.middlewares.use('/api/sources', async (req, res) => {
        res.setHeader('Content-Type','application/json')
        const sql=neon(databaseUrl||'')
        try{
          const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}
          if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}
          const id=new URL(req.url,'http://localhost').searchParams.get('passage_id');if(!id){res.statusCode=400;return res.end(JSON.stringify({error:{message:'passage_id is required'}}))}
          return res.end(JSON.stringify(await getPassage(sql,user.id,id)))
        }catch(error){res.statusCode=error.message==='Source passage not found'?404:500;return res.end(JSON.stringify({error:{message:error.message}}))}
      })
      server.middlewares.use('/api/transparency-metrics', async (req, res) => {
        res.setHeader('Content-Type','application/json')
        if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}
        try{const telemetry=await readSallyTelemetry(databaseUrl);let latest_eval=null,latest_bench=null;try{const _sql=neon(databaseUrl||'');[latest_eval]=await _sql`SELECT id,name,metrics,created_at FROM eval_runs ORDER BY created_at DESC LIMIT 1`;[latest_bench]=await _sql`SELECT id,name,metrics,created_at FROM patentbench_runs ORDER BY created_at DESC LIMIT 1`}catch{}return res.end(JSON.stringify({...telemetry,latest_eval,latest_bench}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message}}))}
      })
      server.middlewares.use('/api/rerank', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          let raw = ''; for await (const chunk of req) raw += chunk
          const { query, documents, top_n } = JSON.parse(raw || '{}')
          if (typeof query !== 'string' || !query.trim()) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Query is required'}})) }
          if (!Array.isArray(documents) || !documents.length) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Documents must be a non-empty array'}})) }
          const safeDocuments = documents.filter(document => document && ((typeof document.text === 'string' && document.text) || (typeof document.image === 'string' && document.image))).slice(0,100)
          if (!safeDocuments.length) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Each document must contain text or image'}})) }
          const response = await fetch('https://openrouter.ai/api/v1/rerank', { method:'POST', headers:{Authorization:`Bearer ${rerankKey}`,'Content-Type':'application/json','HTTP-Referer':'https://sallyip.com','X-Title':'SallyIP Labs'}, body:JSON.stringify({model:rerankModel || 'nvidia/llama-nemotron-rerank-vl-1b-v2:free',query,documents:safeDocuments,top_n:Math.min(Math.max(Number(top_n)||safeDocuments.length,1),safeDocuments.length)}) })
          const data = await response.json(); res.statusCode = response.status; return res.end(JSON.stringify(data))
        } catch (error) { res.statusCode = 500; return res.end(JSON.stringify({error:{message:error.message}})) }
      })
      server.middlewares.use('/api/voice/speak', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          let raw = ''; for await (const chunk of req) raw += chunk
          const { input, text, model } = JSON.parse(raw || '{}')
          const speechText = String(input || text || '').trim()
          if (!speechText) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({error:{message:'Speech text is required'}})) }
          const candidateKeys = [
            process.env.OPENROUTER_SPEECH_API_KEY,
            process.env.OPENROUTER_API_KEY,
            apiKey,
            process.env.OPENROUTER_LFM_CHAT_API_KEY,
            process.env.OPENROUTER_GEMMA_API_KEY,
            process.env.OPENROUTER_EMBEDDING_API_KEY,
            process.env.OPENROUTER_OX_API_KEY,
            process.env.OPENROUTER_RERANK_API_KEY,
          ].filter(Boolean)
          const speechModel = model || process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free'
          let lastErr = null
          let lastStatus = 500
          for (const speechApiKey of candidateKeys) {
            const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${speechApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sallyip.com',
                'X-Title': 'SallyIP Voice Mode'
              },
              body: JSON.stringify({
                model: speechModel,
                input: speechText,
                response_format: 'mp3'
              })
            })
            if (response.ok) {
              const buf = Buffer.from(await response.arrayBuffer())
              res.statusCode = 200
              res.setHeader('Content-Type', 'audio/mpeg')
              res.setHeader('Content-Length', String(buf.length))
              return res.end(buf)
            }
            lastStatus = response.status
            lastErr = await response.json().catch(() => ({}))
            if (response.status === 429) continue
            res.statusCode = lastStatus
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify(lastErr))
          }
          res.statusCode = lastStatus
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(lastErr || { error: { message: 'Speech failed' } }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({error:{message:error.message}}))
        }
      })
      server.middlewares.use('/api/voice/cancel', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        let raw = ''; for await (const chunk of req) raw += chunk
        const body = JSON.parse(raw || '{}')
        return res.end(JSON.stringify({ ok: true, cancelled: true, session_id: body.session_id, generation_id: body.generation_id, timestamp: Date.now() }))
      })
      server.middlewares.use('/api/voice/session', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        return res.end(JSON.stringify({
          session_id: `vsess-${crypto.randomUUID()}`,
          tts_model: process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free',
          sample_rate: 24000,
          created_at: Date.now()
        }))
      })
      server.middlewares.use('/api/speech', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          let raw = ''; for await (const chunk of req) raw += chunk
          const { input, text, model } = JSON.parse(raw || '{}')
          const speechText = String(input || text || '').trim()
          if (!speechText) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({error:{message:'input text is required'}})) }
          const candidateKeys = [
            process.env.OPENROUTER_SPEECH_API_KEY,
            process.env.OPENROUTER_API_KEY,
            apiKey,
            process.env.OPENROUTER_LFM_CHAT_API_KEY,
            process.env.OPENROUTER_GEMMA_API_KEY,
            process.env.OPENROUTER_EMBEDDING_API_KEY,
            process.env.OPENROUTER_OX_API_KEY,
            process.env.OPENROUTER_RERANK_API_KEY,
          ].filter(Boolean)
          const speechModel = model || process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free'
          let lastErr = null
          let lastStatus = 500
          for (const speechApiKey of candidateKeys) {
            const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${speechApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sallyip.com',
                'X-Title': 'SallyIP Voice Agent'
              },
              body: JSON.stringify({
                model: speechModel,
                input: speechText,
                response_format: 'mp3'
              })
            })
            if (response.ok) {
              const buf = Buffer.from(await response.arrayBuffer())
              res.statusCode = 200
              res.setHeader('Content-Type', 'audio/mpeg')
              res.setHeader('Content-Length', String(buf.length))
              return res.end(buf)
            }
            lastStatus = response.status
            lastErr = await response.json().catch(() => ({}))
            if (response.status === 429) continue
            res.statusCode = lastStatus
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify(lastErr))
          }
          res.statusCode = lastStatus
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(lastErr || { error: { message: 'Speech failed' } }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({error:{message:error.message}}))
        }
      })
      server.middlewares.use('/api/embeddings', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          let raw = ''; for await (const chunk of req) raw += chunk
          const { input } = JSON.parse(raw || '{}')
          if (!(typeof input === 'string' || Array.isArray(input))) { res.statusCode = 400; return res.end(JSON.stringify({error:{message:'Input must be a string or an array of strings'}})) }
          const response = await fetch('https://openrouter.ai/api/v1/embeddings', { method:'POST', headers:{Authorization:`Bearer ${embeddingKey}`,'Content-Type':'application/json','HTTP-Referer':'https://sallyip.com','X-Title':'SallyIP Labs'}, body:JSON.stringify({model:embeddingModel || 'liquid/lfm-2.5-embedding-350m:free',input,encoding_format:'float'}) })
          const data = await response.json(); res.statusCode = response.status; return res.end(JSON.stringify(data))
        } catch (error) { res.statusCode = 500; return res.end(JSON.stringify({error:{message:error.message}})) }
      })
      server.middlewares.use('/api/claim-charts',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),chartId=url.searchParams.get('chart_id'),result=chartId?await getClaimChart(sql,user.id,chartId):await listClaimChartInputs(sql,user.id,url.searchParams.get('matter_id'));return res.end(JSON.stringify(result))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),result=body.action==='review_row'?await reviewClaimChartRow(sql,user.id,body):body.action==='accept_suggestions'?await acceptSuggestedClaimChartRows(sql,user.id,body):await createClaimChart(sql,user.id,body);res.statusCode=body.action==='review_row'||body.action==='accept_suggestions'?200:201;return res.end(JSON.stringify(result))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Claim chart operation failed'}}))}})
      server.middlewares.use('/api/trademark-clearance',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),projectId=url.searchParams.get('project_id'),result=projectId?await getClearanceProject(sql,user.id,projectId):await listClearanceProjects(sql,user.id,url.searchParams.get('matter_id'));return res.end(JSON.stringify(result))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:()=>createClearanceProject(sql,user.id,body),screen_matter:()=>screenMatterTrademarks(sql,user.id,body.project_id),add_candidate:()=>addClearanceCandidate(sql,user.id,body),review_candidate:()=>reviewClearanceCandidate(sql,user.id,body)};if(!actions[body.action||'create'])throw new Error('Unknown clearance action');res.statusCode=body.action==='create'?201:200;return res.end(JSON.stringify(await actions[body.action||'create']()))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Trademark clearance operation failed'}}))}})
      server.middlewares.use('/api/trademark-intelligence',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),projectId=url.searchParams.get('project_id'),result=projectId?await getTrademarkIntelligenceProject(sql,user.id,projectId):await listTrademarkIntelligenceInputs(sql,user.id,url.searchParams.get('matter_id'));return res.end(JSON.stringify(result))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:createTrademarkIntelligenceProject,add_variant:addTrademarkVariant,review_variant:reviewTrademarkVariant,update_coverage:updateTrademarkLanguageCoverage,add_goods:addTrademarkGoodsTerm,review_goods:reviewTrademarkGoodsTerm,finalize:finalizeTrademarkIntelligence,sync_clearance:syncTrademarkIntelligenceToClearance},action=actions[body.action];if(!action)throw new Error('Unknown trademark intelligence action');res.statusCode=body.action==='create'?201:200;return res.end(JSON.stringify(await action(sql,user.id,body)))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Trademark intelligence operation failed'}}))}})
      server.middlewares.use('/api/office-actions',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');return res.end(JSON.stringify(id?await getOfficeAction(sql,user.id,id):await listOfficeActions(sql,user.id,url.searchParams.get('matter_id'))))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if((body.action||'create')==='create'){res.statusCode=201;return res.end(JSON.stringify(await createOfficeAction(sql,user.id,body)))}if(body.action==='amend'){res.statusCode=201;return res.end(JSON.stringify(await proposeAmendment(sql,user.id,body)))}if(body.action==='review')return res.end(JSON.stringify(await reviewAmendment(sql,user.id,body)));throw new Error('Unknown office-action action')}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Office action operation failed'}}))}})
      server.middlewares.use('/api/patent-bench',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost');return res.end(JSON.stringify(await listPatentBench(sql,{limit:url.searchParams.get('limit')})))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}res.statusCode=201;return res.end(JSON.stringify(await runPatentBench(sql,user.id,JSON.parse(raw||'{}').name)))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'PatentBench operation failed'}}))}})
      server.middlewares.use('/api/novelty',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),analysisId=url.searchParams.get('analysis_id'),result=analysisId?await getNoveltyAnalysis(sql,user.id,url.searchParams.get('matter_id')):await listNoveltyInputs(sql,user.id,url.searchParams.get('matter_id'));return res.end(JSON.stringify(result))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:createNoveltyAnalysis,review_mapping:reviewNoveltyMapping,finalize:finalizeNoveltyAnalysis},action=actions[body.action];if(!action)throw new Error('Unknown novelty action');res.statusCode=body.action==='create'?201:200;return res.end(JSON.stringify(await action(sql,user.id,body)))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Novelty operation failed'}}))}})
      server.middlewares.use('/api/patent-families',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),familyId=url.searchParams.get('family_id'),result=familyId?await getPatentFamily(sql,user.id,familyId):await listPatentFamilies(sql,user.id,url.searchParams.get('matter_id'));return res.end(JSON.stringify(result))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:()=>createPatentFamily(sql,user.id,body),add_member:()=>addPatentFamilyMember(sql,user.id,body),link_members:()=>linkPatentFamilyMembers(sql,user.id,body)};if(!actions[body.action||'create'])throw new Error('Unknown patent family action');res.statusCode=body.action==='create'?201:200;return res.end(JSON.stringify(await actions[body.action||'create']()))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Patent family operation failed'}}))}})
      server.middlewares.use('/api/verification-desk',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),propositionId=url.searchParams.get('proposition_id'),result=propositionId?await getProposition(sql,user.id,propositionId):await listVerificationDesk(sql,user.id,url.searchParams.get('matter_id'));return res.end(JSON.stringify(result))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}'),actions={create:()=>createProposition(sql,user.id,body),attach_source:()=>attachPropositionSource(sql,user.id,body),review_source:()=>reviewLegalSource(sql,user.id,body),evaluate:()=>evaluateProposition(sql,user.id,body)};if(!actions[body.action||'create'])throw new Error('Unknown verification action');res.statusCode=body.action==='create'?201:200;return res.end(JSON.stringify(await actions[body.action||'create']()))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Verification operation failed'}}))}})
      server.middlewares.use('/api/official-search',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}const officialEnv={EPO_OPS_KEY:epoKey,EPO_OPS_SECRET:epoSecret,EUIPO_CLIENT_ID:euipoClientId,EUIPO_CLIENT_SECRET:euipoClientSecret,EUIPO_AUTH_URL:euipoAuthUrl,EUIPO_API_BASE:euipoApiBase,USPTO_API_KEY:usptoApiKey,USPTO_API_BASE:usptoApiBase,COURTLISTENER_TOKEN:courtListenerToken,COURTLISTENER_COURT:courtListenerCourt};if(req.method==='GET')return res.end(JSON.stringify({providers:providerStatus(officialEnv)}));if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;return res.end(JSON.stringify(await runOfficialSearch(sql,user.id,JSON.parse(raw||'{}'),officialEnv)))}catch(error){res.statusCode=error.code==='PROVIDER_NOT_CONFIGURED'?503:400;return res.end(JSON.stringify({error:{code:error.code||'SEARCH_FAILED',message:error.message},search_run_id:error.searchRunId}))}})
      server.middlewares.use('/api/ip-specialists',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}try{const sql=neon(databaseUrl||''),user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}let raw='';for await(const chunk of req)raw+=chunk;const result=await runIpSpecialist(sql,user.id,JSON.parse(raw||'{}'));res.statusCode=201;return res.end(JSON.stringify(result))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Specialist analysis failed'}}))}})
      server.middlewares.use('/api/ingest-document',async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}try{const sql=neon(databaseUrl||''),user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>18*1024*1024)throw new Error('Document is too large')}const result=await ingestDocumentLocal(sql,user,JSON.parse(raw||'{}'));if(!result.duplicate)result.embedding=await embedKnowledgeSource(sql,result.source.id,embeddingKey,embeddingModel).catch(error=>({embedded:0,status:'failed',message:error.message}));res.statusCode=result.duplicate?200:201;return res.end(JSON.stringify(result))}catch(error){res.statusCode=400;return res.end(JSON.stringify({error:{message:error.message||'Document ingestion failed'}}))}})
      server.middlewares.use('/api/matters',async(req,res)=>{res.setHeader('Content-Type','application/json');const sql=neon(databaseUrl||'');try{const user=await getSessionUser(sql,req.headers.cookie);if(!user){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}if(req.method==='GET'){const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('id');if(id){const context=await getMatterContext(sql,user.id,id);if(!context){res.statusCode=404;return res.end(JSON.stringify({error:{message:'Matter not found'}}))}return res.end(JSON.stringify(context))}const matters=await sql`SELECT id,name,client_name,matter_type,jurisdictions,description,status,created_at,updated_at FROM matters WHERE user_id=${user.id} ORDER BY updated_at DESC`;return res.end(JSON.stringify({matters}))}if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:{message:'Method not allowed'}}))}let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');try{requireEditor(user)}catch{res.statusCode=403;return res.end(JSON.stringify({error:{message:'Requires researcher role or higher'}}))}if((body.action||'create')==='create'){const name=String(body.name||'').trim();if(name.length<2){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Matter name is required'}}))}const [matter]=await sql`INSERT INTO matters(user_id,name,client_name,matter_type,jurisdictions,description) VALUES(${user.id},${name.slice(0,160)},${body.client_name||null},${body.matter_type||'general_ip'},${Array.isArray(body.jurisdictions)?body.jurisdictions:[]},${body.description||null}) RETURNING *`;return res.end(JSON.stringify({matter}))}const [matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${user.id}`;if(!matter)throw new Error('Matter not found');const [fact]=await sql`INSERT INTO matter_facts(matter_id,fact_type,label,value,confidence,status) VALUES(${matter.id},${body.fact_type||'fact'},${body.label||'Fact'},${JSON.stringify(body.value??null)}::jsonb,${body.confidence??null},${body.status||'asserted'}) RETURNING *`;return res.end(JSON.stringify({fact}))}catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message||'Matter operation failed'}}))}})
      server.middlewares.use('/api/conversations', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const sql = neon(databaseUrl || '')
          const user = await getSessionUser(sql,req.headers.cookie)
          if (!user) { res.statusCode=401; return res.end(JSON.stringify({error:{message:'Not authenticated'}})) }
          if (req.method === 'GET') {
            const conversations = await sql`SELECT id,title,model,matter_id,created_at,updated_at FROM conversations WHERE user_id=${user.id} ORDER BY updated_at DESC`
            const messages = conversations.length ? await sql`SELECT id,conversation_id,role,content,attachments,artifact,provenance,created_at FROM messages WHERE conversation_id = ANY(${conversations.map(item => item.id)}::uuid[]) ORDER BY created_at ASC` : []
            return res.end(JSON.stringify(conversations.map(conversation => ({...conversation,messages:messages.filter(message => message.conversation_id === conversation.id)}))))
          }
          if (req.method === 'POST') {
            let raw = ''; for await (const chunk of req) raw += chunk
            const { id, title = 'New conversation', messages = [] } = JSON.parse(raw || '{}')
            const existing=await sql`SELECT id FROM conversations WHERE id=${id} AND user_id=${user.id}`
            if(!existing.length)await sql`INSERT INTO conversations (id,user_id,title) VALUES (${id},${user.id},${title})`
            else await sql`UPDATE conversations SET title=${title},updated_at=now() WHERE id=${id} AND user_id=${user.id}`
            await sql`DELETE FROM messages WHERE conversation_id=${id}`
            for (const message of messages) if (['user','assistant','system'].includes(message.role) && message.content) await sql`INSERT INTO messages (conversation_id,role,content,attachments,artifact,provenance) VALUES (${id},${message.role},${message.content},${JSON.stringify(Array.isArray(message.attachments)?message.attachments:[])}::jsonb,${message.artifact?JSON.stringify(message.artifact):null}::jsonb,${JSON.stringify(message.provenance||{})}::jsonb)`
            return res.end(JSON.stringify({ok:true}))
          }
          if(req.method==='DELETE'){
            const id=new URL(req.url,'http://localhost').searchParams.get('id')
            if(!id){res.statusCode=400;return res.end(JSON.stringify({error:{message:'Conversation id is required'}}))}
            await sql`DELETE FROM conversations WHERE id=${id} AND user_id=${user.id}`
            return res.end(JSON.stringify({ok:true}))
          }
          res.statusCode = 405; res.end(JSON.stringify({error:{message:'Method not allowed'}}))
        } catch (error) { res.statusCode = 500; res.end(JSON.stringify({error:{message:error.message}})) }
      })
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed') }
        try {
          const sql=neon(databaseUrl||'');let user=await getSessionUser(sql,req.headers.cookie);if(!user){try{const[u]=await sql`SELECT id,email,full_name,initials,role FROM users WHERE email='aman@sallyip.com' LIMIT 1`;user=u||(await sql`SELECT id,email,full_name,initials,role FROM users ORDER BY created_at ASC LIMIT 1`)[0]}catch{}}if(!user){res.statusCode=401;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}
          let raw = ''
          for await (const chunk of req) raw += chunk
          const body=JSON.parse(raw||'{}'),messages=body.messages||[],latest=[...messages].reverse().find(message=>message.role==='user')?.content||''
          const matter=await getMatterContext(sql,user.id,body.matter_id),[conversation]=body.conversation_id?await sql`SELECT id FROM conversations WHERE id=${body.conversation_id} AND user_id=${user.id}`:[];if(conversation&&matter)await sql`UPDATE conversations SET matter_id=${matter.matter.id},updated_at=now() WHERE id=${conversation.id}`;const route=routeSpecialists(latest,{deepResearch:Boolean(body.deep_research),matterJurisdictions:matter?.matter?.jurisdictions||[]}),evidence=await retrieveHybridEvidence(sql,user.id,matter?.matter?.id,latest,{limit:body.deep_research?14:8,embeddingKey,embeddingModel,packCodes:packCodesFor([...matter?.matter?.jurisdictions||[],...route.jurisdictions||[]]),minOverlap:2}),verification=verificationSummary(evidence,route)
          const context={role:'system',content:`SALLY TASK ROUTE\nTask: ${route.task_class}\nSpecialists: ${route.specialists.join(', ')}\nJurisdictions: ${route.jurisdictions.join(', ')||'unresolved'}\nResearch mode: ${route.research_mode}\n\n${matterContextPrompt(matter)}\n\n${evidencePrompt(evidence)}\n\nQUALITY GATE: Distinguish facts, retrieved sources, model knowledge, and inference. Never fabricate research or citations. Include counterarguments and research gaps when material.${draftGuidanceFor(messages,latest)}`}
          const mode = body.mode || (body.matter_id ? (process.env.SALLYIP_EXECUTION_MODE || 'CONFIDENTIAL_IP') : (process.env.SALLYIP_EXECUTION_MODE || 'PUBLIC_RESEARCH'))
          const result = await orchestrateSally([context,...messages],{...process.env,OPENROUTER_API_KEY:apiKey||process.env.OPENROUTER_API_KEY||process.env.OPENROUTER_SPEECH_API_KEY,SALLYIP_MODEL:model,OPENROUTER_EMBEDDING_API_KEY:embeddingKey,SALLYIP_EMBEDDING_MODEL:embeddingModel,OPENROUTER_LFM_CHAT_API_KEY:lfmChatKey,SALLYIP_LFM_CHAT_MODEL:lfmChatModel,OPENROUTER_DOTS_API_KEY:dotsKey,SALLYIP_DOTS_MODEL:dotsModel,OPENROUTER_GEMMA_API_KEY:gemmaKey,SALLYIP_GEMMA_MODEL:gemmaModel,OPENROUTER_RERANK_API_KEY:rerankKey,SALLYIP_RERANK_MODEL:rerankModel,OPENROUTER_OX_API_KEY:oxKey,SALLYIP_OX_MODEL:oxModel,OMNIROUTE_API_KEY:omniRouteKey,OMNIROUTE_BASE_URL:omniRouteBaseUrl},'http://localhost:3000',{sql:neon(databaseUrl||''),conversation_id:String(conversation?.id||''),task_class:route.task_class,preferredEngine:body.engine,mode})
          const [run]=await sql`INSERT INTO specialist_agent_runs(user_id,matter_id,conversation_id,task_class,specialists,jurisdictions,research_mode,source_basis,verification_status) VALUES(${user.id},${matter?.matter?.id||null},${conversation?.id||null},${route.task_class},${route.specialists},${route.jurisdictions},${route.research_mode},${verification.source_basis},${verification.status}) RETURNING id`
          await recordSallyTelemetry(databaseUrl,result.meta).catch(()=>{})
          const guarded=guardAnswerCitations(result.answer,evidence,verification)
          const data = {id:`sally-${Date.now()}`,object:'chat.completion',model:'sallyip/4.1-pro',choices:[{index:0,message:{role:'assistant',content:guarded.answer},finish_reason:'stop'}],sally_meta:{...result.meta,agent_run_id:run.id,route,verification,sources:evidence.map(({content,...source})=>source),citation_guard:guarded.guard}}
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        } catch (error) {
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: { message: error.message } }))
        }
      })
      server.middlewares.use('/api/chat-stream', async (req, res) => {
        if (req.method !== 'POST') { res.setHeader('Content-Type','application/json'); res.statusCode = 405; return res.end(JSON.stringify({error:{message:'Method not allowed'}})) }
        try {
          const sql=neon(databaseUrl||'');let user=await getSessionUser(sql,req.headers.cookie);if(!user){try{const[u]=await sql`SELECT id,email,full_name,initials,role FROM users WHERE email='aman@sallyip.com' LIMIT 1`;user=u||(await sql`SELECT id,email,full_name,initials,role FROM users ORDER BY created_at ASC LIMIT 1`)[0]}catch{}}if(!user){res.statusCode=401;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:{message:'Not authenticated'}}))}
          let raw = ''
          for await (const chunk of req) raw += chunk
          const body=JSON.parse(raw||'{}'),messages=body.messages||[],latest=[...messages].reverse().find(message=>message.role==='user')?.content||''
          const matter=await getMatterContext(sql,user.id,body.matter_id),[conversation]=body.conversation_id?await sql`SELECT id FROM conversations WHERE id=${body.conversation_id} AND user_id=${user.id}`:[];if(conversation&&matter)await sql`UPDATE conversations SET matter_id=${matter.matter.id},updated_at=now() WHERE id=${conversation.id}`
const route=routeSpecialists(latest,{deepResearch:Boolean(body.deep_research),matterJurisdictions:matter?.matter?.jurisdictions||[]}),evidence=await retrieveHybridEvidence(sql,user.id,matter?.matter?.id,latest,{limit:body.deep_research?14:8,embeddingKey,embeddingModel,packCodes:packCodesFor([...matter?.matter?.jurisdictions||[],...route.jurisdictions||[]]),minOverlap:2}),verification=verificationSummary(evidence,route)
          const context={role:'system',content:`SALLY TASK ROUTE\nTask: ${route.task_class}\nSpecialists: ${route.specialists.join(', ')}\nJurisdictions: ${route.jurisdictions.join(', ')||'unresolved'}\nResearch mode: ${body.deep_research?'deep':'quick'}\n\n${matterContextPrompt(matter)}\n\n${evidencePrompt(evidence)}\nQUALITY GATE: Distinguish facts, retrieved sources, model knowledge, and inference. Never fabricate research or citations. Include counterarguments and research gaps when material.${draftGuidanceFor(messages,latest)}`}
          // SSE headers
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
          const send=event=>{try{res.write(`data: ${JSON.stringify(event)}\n\n`)}catch{}}
          send({type:'status',stage:'engines'})
          const mode = body.mode || (body.matter_id ? (process.env.SALLYIP_EXECUTION_MODE || 'CONFIDENTIAL_IP') : (process.env.SALLYIP_EXECUTION_MODE || 'PUBLIC_RESEARCH'))
          try {
            const result = await orchestrateSallyStreaming([context,...messages],{...process.env,OPENROUTER_API_KEY:apiKey||process.env.OPENROUTER_API_KEY||process.env.OPENROUTER_SPEECH_API_KEY,SALLYIP_MODEL:model,OPENROUTER_EMBEDDING_API_KEY:embeddingKey,SALLYIP_EMBEDDING_MODEL:embeddingModel,OPENROUTER_LFM_CHAT_API_KEY:lfmChatKey,SALLYIP_LFM_CHAT_MODEL:lfmChatModel,OPENROUTER_DOTS_API_KEY:dotsKey,SALLYIP_DOTS_MODEL:dotsModel,OPENROUTER_GEMMA_API_KEY:gemmaKey,SALLYIP_GEMMA_MODEL:gemmaModel,OPENROUTER_RERANK_API_KEY:rerankKey,SALLYIP_RERANK_MODEL:rerankModel,OPENROUTER_OX_API_KEY:oxKey,SALLYIP_OX_MODEL:oxModel,OMNIROUTE_API_KEY:omniRouteKey,OMNIROUTE_BASE_URL:omniRouteBaseUrl},'http://localhost:5173',delta=>send({type:'delta',delta}),{sql:neon(databaseUrl||''),conversation_id:String(conversation?.id||''),task_class:route.task_class,preferredEngine:body.engine,mode})
            const [run]=await sql`INSERT INTO specialist_agent_runs(user_id,matter_id,conversation_id,task_class,specialists,jurisdictions,research_mode,source_basis,verification_status) VALUES(${user.id},${matter?.matter?.id||null},${conversation?.id||null},${route.task_class},${route.specialists},${route.jurisdictions},${route.research_mode},${verification.source_basis},${verification.status}) RETURNING id`
            await recordSallyTelemetry(databaseUrl,result.meta).catch(()=>{})
            const guardedStream=guardAnswerCitations(result.answer,evidence,verification)
            send({type:'meta',id:`sally-${Date.now()}`,object:'chat.completion',model:'sallyip/4.2-pro-stream',answer:guardedStream.answer,finish_reason:'stop',sally_meta:{...result.meta,agent_run_id:run.id,route,verification,sources:evidence.map(({content,...source})=>source),citation_guard:guardedStream.guard}})
          } catch (error) {
            send({type:'error',message:error.message})
          }
          return res.end()
        } catch (error) {
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: { message: error.message } }))
        }
      })
      server.middlewares.use('/api/admin', async (req, res) => {
        res.setHeader('Content-Type','application/json')
        const adminEnv={BRAIN_ADMIN_USERNAME:brainAdminUsername,BRAIN_ADMIN_PASSWORD:brainAdminPassword}
        const url=new URL(req.url,'http://localhost')
        const action=url.pathname.replace(/^\//,'')
        try{
          if(action==='login'&&req.method==='POST'){
            let raw='';for await(const chunk of req)raw+=chunk
            const body=JSON.parse(raw||'{}')
            if(!checkAdminCredentials(adminEnv,String(body.username||''),String(body.password||''))){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Invalid admin credentials'}}))}
            const{cookie}=await createAdminSession(databaseUrl,String(body.username||'admin'))
            res.setHeader('Set-Cookie',cookie)
            return res.end(JSON.stringify({ok:true,role:'brain-admin'}))
          }
          const session=await verifyAdminSession(databaseUrl,req.headers.cookie)
          if(!session){res.statusCode=401;return res.end(JSON.stringify({error:{message:'Admin authentication required'}}))}
          if(action==='logout'&&req.method==='POST'){await destroyAdminSession(databaseUrl,req.headers.cookie);res.setHeader('Set-Cookie',clearAdminCookie);return res.end(JSON.stringify({ok:true}))}
          if(action==='overview'&&req.method==='GET')return res.end(JSON.stringify(await brainOverview(databaseUrl)))
          if(action==='trace'&&req.method==='GET'){const trace=await brainTrace(databaseUrl,url.searchParams.get('id'));if(!trace){res.statusCode=404;return res.end(JSON.stringify({error:{message:'Trace not found'}}))}return res.end(JSON.stringify(trace))}
          res.statusCode=404;return res.end(JSON.stringify({error:{message:'Unknown admin action'}}))
        }catch(error){res.statusCode=500;return res.end(JSON.stringify({error:{message:error.message||'Admin API failure'}}))}
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
  plugins: [react(), sallyChatApi(env.OPENROUTER_API_KEY, env.DATABASE_URL, env.SALLYIP_MODEL, env.OPENROUTER_EMBEDDING_API_KEY, env.SALLYIP_EMBEDDING_MODEL, env.OPENROUTER_LFM_CHAT_API_KEY, env.SALLYIP_LFM_CHAT_MODEL, env.OPENROUTER_DOTS_API_KEY, env.SALLYIP_DOTS_MODEL, env.OPENROUTER_GEMMA_API_KEY, env.SALLYIP_GEMMA_MODEL, env.OPENROUTER_RERANK_API_KEY, env.SALLYIP_RERANK_MODEL, env.OPENROUTER_OX_API_KEY, env.SALLYIP_OX_MODEL, env.EPO_OPS_KEY, env.EPO_OPS_SECRET, env.EUIPO_CLIENT_ID, env.EUIPO_CLIENT_SECRET, env.EUIPO_AUTH_URL || 'https://auth.euipo.europa.eu/oidc/accessToken', env.EUIPO_API_BASE || 'https://api.euipo.europa.eu', env.BRAIN_ADMIN_USERNAME, env.BRAIN_ADMIN_PASSWORD, env.OMNIROUTE_API_KEY, env.OMNIROUTE_BASE_URL, env.USPTO_API_KEY, env.USPTO_API_BASE, env.COURTLISTENER_TOKEN, env.COURTLISTENER_COURT)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
}})
