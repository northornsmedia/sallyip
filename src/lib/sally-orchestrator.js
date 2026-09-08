import { sanitizeModelResponse } from './document-tool-service.js'

const CHAT_ENGINES=[
  {slug:'nvidia/nemotron-3.5-lightning:free',name:'Nemotron 3.5 Lightning',key:'OPENROUTER_API_KEY',weight:16,role:'Fast legal-technical reasoning'},
  {slug:'google/gemma-4-26b-a4b-it:free',name:'Gemma 4 26B',key:'OPENROUTER_GEMMA_API_KEY',weight:13,role:'Language clarity and explanation'},
  {slug:'stealth/ox-alpha',name:'OX Alpha',key:'OPENROUTER_OX_API_KEY',weight:50,role:'Primary deep synthesis and edge-case review'},
  {slug:'liquid/lfm-2.5-2.6b:free',name:'Liquid LFM 2.5 2.6B',key:'OPENROUTER_LFM_CHAT_API_KEY',weight:12,role:'Efficient structured reasoning'},
  {slug:'openrouter/google/gemini-3.5-flash-lite',name:'OmniRoute Gemini Flash',key:'OMNIROUTE_API_KEY',baseUrl:'OMNIROUTE_BASE_URL',weight:14,role:'Fast gateway routing across providers'}
]
// OX_ALPHA_RESERVE: ox-alpha is the designated rescue engine. It is excluded from
// the initial parallel race and held back; if fewer than RESCUE_THRESHOLD engines
// succeed, ox-alpha runs alone as the primary brain so Sally never goes silent.
const OX_ALPHA_SLUG='stealth/ox-alpha'
const RESCUE_THRESHOLD=3
const INTERNAL_PROMPT=`You are an internal reasoning engine inside SallyIP 4.1 Pro. Your public identity is strictly Sally. Never claim another model or provider name. Give accurate, practical intellectual-property research and drafting assistance. Distinguish facts from uncertainty. Return only useful output; never reveal hidden chain-of-thought.

OUTPUT AND ARTIFACT FORMAT: Sally's web application automatically generates downloadable files and artifacts from your response. Always write responses in standard, clean Markdown directly for the user. Never emit internal tool call syntax, pseudo-code functions, XML tags, or raw tokens such as <itool_call_begin>, <itool_call_end>, <tool_call>, or [generate_file(...)]. Do not escape text into single string arguments. Keep conversational chat clear, and structure legal agreements or guides using standard Markdown headings, lists, and tables. Supported downloadable formats handled by the application include PDF, DOCX, PPTX, XLSX, CSV, Markdown, HTML, JSON, and TXT. Never invent download links, never instruct the user to copy content into Word, Google Docs, or another application, and never claim file generation is unavailable. Keep chat text separate from artifact content. Resolve "this", "that", "the document", "the agreement", "the report", "previous draft", and bare requests such as "PDF please" to the active artifact. Existing artifacts must be exported without regeneration unless revisions are explicitly requested. When a prompt is marked DOCUMENT CONTENT REQUEST, return only the polished document content in Markdown: no capability disclaimers, file-generation instructions, conversational preface, or statements about being unable to generate files. Legal notices are rendered by the application UI and should not be inserted into drafted agreements or artifacts unless the user requests them or they are substantively required.`
const OPENROUTER_CHAT_URL='https://openrouter.ai/api/v1/chat/completions'
const engineUrl=(engine,env)=>engine.baseUrl&&env[engine.baseUrl]?`${String(env[engine.baseUrl]).replace(/\/+$/,'')}/chat/completions`:OPENROUTER_CHAT_URL
const engineCredential=(engine,env)=>env[engine.key]||(!engine.baseUrl?env.OPENROUTER_API_KEY:null)
const RETRY_FAST_FAIL_MS=1000
const STRAGGLER_ABORT_MS=6000
const RACE_TIMEOUT=8000
const STREAM_CHUNK_SIZE=48
const STREAM_CHUNK_DELAY_MS=12

export const sallyEngineInfo=CHAT_ENGINES
export {OX_ALPHA_SLUG,RESCUE_THRESHOLD}

// Env-driven engine extension: switching primary models is config-only.
// SALLYIP_PRIMARY_MODEL=anthropic/claude-opus-4-6 (+ SALLYIP_PRIMARY_KEY,
// SALLYIP_PRIMARY_NAME, SALLYIP_PRIMARY_WEIGHT, SALLYIP_PRIMARY_BASE_URL)
// SALLYIP_EXTRA_ENGINES=[{"slug":"...","name":"...","key":"ENV_NAME","weight":20}]
export function resolveEngines(env={}){
  const engines=[...CHAT_ENGINES]
  const primarySlug=String(env.SALLYIP_PRIMARY_MODEL||'').trim()
  if(primarySlug&&!engines.some(engine=>engine.slug===primarySlug)){
    engines.unshift({
      slug:primarySlug,
      name:String(env.SALLYIP_PRIMARY_NAME||'Primary flagship').slice(0,80),
      key:String(env.SALLYIP_PRIMARY_KEY||'OPENROUTER_API_KEY').slice(0,80),
      baseUrl:env.SALLYIP_PRIMARY_BASE_URL?String(env.SALLYIP_PRIMARY_BASE_URL).slice(0,80):undefined,
      weight:Math.min(100,Math.max(1,Number(env.SALLYIP_PRIMARY_WEIGHT)||60)),
      role:'Primary flagship reasoning',
    })
  }
  try{
    const extra=JSON.parse(env.SALLYIP_EXTRA_ENGINES||'[]')
    for(const item of Array.isArray(extra)?extra:[]){
      const slug=String(item?.slug||'').trim()
      if(!slug||engines.some(engine=>engine.slug===slug))continue
      engines.push({
        slug,
        name:String(item.name||slug).slice(0,80),
        key:String(item.key||'OPENROUTER_API_KEY').slice(0,80),
        baseUrl:item.baseUrl?String(item.baseUrl).slice(0,80):undefined,
        weight:Math.min(100,Math.max(1,Number(item.weight)||10)),
        role:String(item.role||'Auxiliary engine').slice(0,80),
      })
    }
  }catch{/* malformed extra engines never break chat */}
  return engines
}

const fetchJson=async(url,options,timeoutMs=5000)=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(Math.max(250,timeoutMs))});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||`${response.status} ${response.statusText}`);return data}
const fetchStreamingContent=async(url,options,timeoutMs,onDelta)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let content='',buffer='';try{const response=await fetch(url,{...options,body:JSON.stringify({...JSON.parse(options.body),stream:true}),signal:controller.signal});if(!response.ok){const data=await response.json();throw new Error(data?.error?.message||`${response.status} ${response.statusText}`)}const reader=response.body.getReader(),decoder=new TextDecoder();while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data: ')||line==='data: [DONE]')continue;try{const delta=JSON.parse(line.slice(6)).choices?.[0]?.delta?.content||'';content+=delta;if(delta&&onDelta)onDelta(delta)}catch{}}}}catch(error){if(!content&&error.name!=='AbortError')throw error}finally{clearTimeout(timer)}if(!content.trim())throw new Error('Empty response');return content.trim()}
const emitInChunks=async(text,onDelta)=>{const clean=sanitizeModelResponse(text);for(let index=0;index<clean.length;index+=STREAM_CHUNK_SIZE){onDelta(clean.slice(index,index+STREAM_CHUNK_SIZE));await new Promise(resolve=>setTimeout(resolve,STREAM_CHUNK_DELAY_MS))}}

function createWireTrace(){
  const events=[]
  return{
    events,
    add:(label,detail,status='ok')=>events.push({t:Date.now(),label,detail,status})
  }
}

function createEngineCollector(env,messages,headers,trace,engines=CHAT_ENGINES){
  const requestMessages=[{role:'system',content:INTERNAL_PROMPT},...messages]
  const controllers=new Map()
  const runAttempt=async(engine,allowRetry)=>{
    const started=Date.now()
    trace.add('wire','→ '+engine.name+' ('+engine.slug+') dispatched','pending')
    const controller=new AbortController();controllers.set(engine.slug,controller)
    try{
      const credential=engineCredential(engine,env)
      if(!credential)throw new Error('Model credential unavailable')
      const content=await fetchStreamingContent(engineUrl(engine,env),{method:'POST',headers:headers(env[engine.key]),signal:controller.signal,body:JSON.stringify({model:engine.slug,temperature:.3,max_tokens:900,messages:requestMessages})}, STRAGGLER_ABORT_MS)
      controllers.delete(engine.slug)
      trace.add('node',engine.name+' responded · '+content.length+' chars','success')
      return{...engine,content,status:'success',latency_ms:Date.now()-started,retried:!allowRetry}
    }catch(error){
      controllers.delete(engine.slug)
      const elapsed=Date.now()-started
      const fastFail=elapsed<RETRY_FAST_FAIL_MS
      if(allowRetry&&fastFail)return runAttempt(engine,false)
      trace.add('node',engine.name+(fastFail?' fast-fail → retried':' failed')+': '+(error.message||'error').slice(0,80),'error')
      return{...engine,content:'',status:'error',latency_ms:elapsed,error:error.message,retried:!allowRetry}
    }
  }
  return{
    run:cutoffMs=>new Promise(resolve=>{
      const attempts=[];let settled=false,remaining=engines.length
      const finish=()=>{if(settled)return;settled=true;clearTimeout(cutoff);for(const controller of controllers.values())try{controller.abort()}catch{}
        resolve({attempts:[...attempts],successes:attempts.filter(item=>item.status==='success'&&item.content)})}
      const cutoff=setTimeout(finish,Math.max(1500,cutoffMs))
      for(const engine of engines)runAttempt(engine,true).then(result=>{attempts.push(result);if(--remaining===0)finish()}).catch(error=>{attempts.push({...engine,content:'',status:'error',latency_ms:0,error:String(error?.message||error)});if(--remaining===0)finish()})
    }),
    abortAll:()=>{for(const controller of controllers.values())try{controller.abort()}catch{}}
  }
}

// Adaptive weights: blend base importance with live success-rate + speed.
export function computeAdaptiveWeights(statsBySlug,engines=CHAT_ENGINES){
  return engines.map(engine=>{
    const stats=statsBySlug.get(engine.slug)
    let adaptive=engine.weight
    if(stats&&(stats.successes+stats.failures)>=3){
      const total=stats.successes+stats.failures
      const reliability=stats.successes/total
      const avgLatency=stats.latency_sum_ms/Math.max(1,total)
      const speedBonus=Math.max(.5,Math.min(1.5,4000/Math.max(500,avgLatency)))
      adaptive=engine.weight*(0.55+0.45*reliability)*speedBonus
    }
    return{...engine,adaptive_weight:Math.round(adaptive*100)/100}
  })
}

async function loadAdaptiveStats(sql){
  if(!sql)return new Map()
  try{
    const rows=await sql`SELECT engine_slug,successes,failures,latency_sum_ms FROM brain_engine_stats`
    return new Map(rows.map(row=>[row.engine_slug,row]))
  }catch{return new Map()}
}

export async function persistBrainOutcome(sql,record){
  if(!sql)return
  try{
    for(const engine of record.attempts){
      const fastFail=(engine.latency_ms||0)<RETRY_FAST_FAIL_MS&&engine.status!=='success'
      const successAt=engine.status==='success'?new Date().toISOString():null
      const failureAt=engine.status!=='success'?new Date().toISOString():null
      await sql`INSERT INTO brain_engine_stats (engine_slug,base_weight,successes,failures,fast_fails,timeouts,latency_sum_ms,tokens_generated,last_success_at,last_failure_at,updated_at)
        VALUES (${engine.slug},${engine.weight},${engine.status==='success'?1:0},${engine.status!=='success'?1:0},${fastFail?1:0},${(!fastFail&&engine.status!=='success')?1:0},${engine.latency_ms||0},${engine.content?.length||0},${successAt},${failureAt},now())
        ON CONFLICT (engine_slug) DO UPDATE SET
          successes=brain_engine_stats.successes+EXCLUDED.successes,
          failures=brain_engine_stats.failures+EXCLUDED.failures,
          fast_fails=brain_engine_stats.fast_fails+EXCLUDED.fast_fails,
          timeouts=brain_engine_stats.timeouts+EXCLUDED.timeouts,
          latency_sum_ms=brain_engine_stats.latency_sum_ms+EXCLUDED.latency_sum_ms,
          tokens_generated=brain_engine_stats.tokens_generated+EXCLUDED.tokens_generated,
          last_success_at=coalesce(EXCLUDED.last_success_at,brain_engine_stats.last_success_at),
          last_failure_at=coalesce(EXCLUDED.last_failure_at,brain_engine_stats.last_failure_at),
          updated_at=now()`
    }
    await sql`INSERT INTO brain_wire_traces (conversation_id,task_class,prompt_excerpt,answer_excerpt,total_latency_ms,engines_completed,engines_requested,primary_engine,rescue_used,events)
      VALUES (${record.conversation_id||null},${record.task_class||null},${(record.prompt||'').slice(0,300)},${(record.answer||'').slice(0,300)},${record.total_latency_ms||0},${record.engines_completed||0},${record.engines_requested||0},${record.primary_engine||null},${record.rescue_used||false},${JSON.stringify(record.events||[])}::jsonb)`
  }catch{/* observatory must never break chat */}
}

export async function orchestrateSallyStreaming(messages,env,siteUrl='https://sallyip.com',onToken=null,options={}){
  const totalStarted=Date.now()
  const budget=onToken?16000:9500
  const deadline=totalStarted+budget
  const headers=key=>({Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':siteUrl,'X-Title':'SallyIP Labs'})
  const latest=[...messages].reverse().find(message=>message.role==='user')?.content||''
  const trace=options.trace||createWireTrace()
  trace.add('request','prompt received ('+latest.length+' chars)','ok')
  const embeddingPromise=(async()=>{const started=Date.now();if(!env.OPENROUTER_EMBEDDING_API_KEY)return{data:null,status:'error',latency_ms:0};try{return{data:await fetchJson('https://openrouter.ai/api/v1/embeddings',{method:'POST',headers:headers(env.OPENROUTER_EMBEDDING_API_KEY),body:JSON.stringify({model:env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free',input:latest.slice(0,8000),encoding_format:'float'})},2500),status:'success',latency_ms:Date.now()-started}}catch{return{data:null,status:'error',latency_ms:Date.now()-started}}})()

  // Adaptive weights from live DB stats (self-improving ordering)
  const ENGINES=resolveEngines(env)
  const statsMap=await loadAdaptiveStats(options.sql)
  const weightedEngines=computeAdaptiveWeights(statsMap,ENGINES).sort((a,b)=>b.adaptive_weight-a.adaptive_weight)
  trace.add('request','adaptive weights loaded: '+weightedEngines.map(e=>e.name.split(' ')[0]+' '+e.adaptive_weight.toFixed(1)).join(', '),'ok')

  // Race all engines EXCEPT the ox-alpha reserve
  const racers=weightedEngines.filter(engine=>engine.slug!==OX_ALPHA_SLUG)
  const racerEnv={...env}
  const collector=createEngineCollector(racerEnv,messages,headers,trace,racers)
  const collectCutoff=Math.max(4500,budget*0.45)
  const {attempts,successes}=await collector.run(collectCutoff)

  // === OX-ALPHA RESCUE: if fewer than RESCUE_THRESHOLD engines succeeded, run ox-alpha alone ===
  let rescueUsed=false
  let rescueResult=null
  const rescueEngine=ENGINES.find(engine=>engine.slug===OX_ALPHA_SLUG)
  const rescueCredential=engineCredential(rescueEngine,env)
  if(successes.length<RESCUE_THRESHOLD&&rescueCredential){
    rescueUsed=true
    trace.add('rescue','< RESCUE_THRESHOLD ('+successes.length+'/'+RESCUE_THRESHOLD+') — engaging OX Alpha primary','warn')
    const started=Date.now()
    try{
      const rawContent=await fetchStreamingContent(engineUrl(rescueEngine,env),{method:'POST',headers:headers(rescueCredential),body:JSON.stringify({model:OX_ALPHA_SLUG,max_tokens:1200,messages:[{role:'system',content:INTERNAL_PROMPT},...messages]})},Math.max(6000,deadline-Date.now()))
      const content=sanitizeModelResponse(rawContent)
      rescueResult={...rescueEngine,content,status:'success',latency_ms:Date.now()-started,retried:false}
      trace.add('rescue','OX Alpha primary answered · '+content.length+' chars','success')
    }catch(error){
      rescueResult={...rescueEngine,content:'',status:'error',latency_ms:Date.now()-started,error:error.message,retried:false}
      trace.add('rescue','OX Alpha rescue failed: '+(error.message||'').slice(0,80),'error')
    }
  }

  let candidates=[...successes]
  if(rescueResult){
    attempts.push(rescueResult)
    if(rescueResult.status==='success')candidates.push(rescueResult)
  }
  // Last-resort provider-managed routing. This deliberately uses a distinct
  // virtual model so an outage or retirement of every configured model does
  // not take the public chat offline.
  if(!candidates.length&&env.OPENROUTER_API_KEY){
    const emergency={slug:'openrouter/free',name:'OpenRouter Free Router',key:'OPENROUTER_API_KEY',weight:1,role:'Emergency availability fallback'}
    const started=Date.now()
    trace.add('rescue','configured engines exhausted — engaging provider router','warn')
    try{
      const rawContent=await fetchStreamingContent(OPENROUTER_CHAT_URL,{method:'POST',headers:headers(env.OPENROUTER_API_KEY),body:JSON.stringify({model:emergency.slug,temperature:.3,max_tokens:900,messages:[{role:'system',content:INTERNAL_PROMPT},...messages]})},8000)
      const content=sanitizeModelResponse(rawContent)
      const result={...emergency,content,status:'success',latency_ms:Date.now()-started,retried:false,adaptive_weight:emergency.weight}
      attempts.push(result);candidates.push(result);rescueUsed=true
      trace.add('rescue','provider router answered · '+content.length+' chars','success')
    }catch(error){
      attempts.push({...emergency,content:'',status:'error',latency_ms:Date.now()-started,error:error.message,retried:false})
      trace.add('rescue','provider router failed: '+(error.message||'').slice(0,80),'error')
    }
  }
  // OmniRoute gateway as final safety net before giving up.
  if(!candidates.length&&env.OMNIROUTE_API_KEY){
    const omniEmergency={slug:'openrouter/google/gemini-3.5-flash-lite',name:'OmniRoute Emergency',key:'OMNIROUTE_API_KEY',weight:1,role:'Gateway emergency fallback'}
    const started=Date.now()
    trace.add('rescue','all engines down — engaging OmniRoute gateway','warn')
    try{
      const rawContent=await fetchStreamingContent(engineUrl(omniEmergency,env),{method:'POST',headers:headers(env.OMNIROUTE_API_KEY),body:JSON.stringify({model:omniEmergency.slug,temperature:.3,max_tokens:900,messages:[{role:'system',content:INTERNAL_PROMPT},...messages]})},Math.max(8000,deadline-Date.now()))
      const content=sanitizeModelResponse(rawContent)
      const result={...omniEmergency,content,status:'success',latency_ms:Date.now()-started,retried:false,adaptive_weight:omniEmergency.weight}
      attempts.push(result);candidates.push(result);rescueUsed=true
      trace.add('rescue','OmniRoute gateway answered · '+content.length+' chars','success')
    }catch(error){
      attempts.push({...omniEmergency,content:'',status:'error',latency_ms:Date.now()-started,error:error.message,retried:false})
      trace.add('rescue','OmniRoute gateway failed: '+(error.message||'').slice(0,80),'error')
    }
  }
  candidates.sort((a,b)=>b.weight-a.weight)
  if(!candidates.length){
    trace.add('error','all engines exhausted','error')
    throw new Error('Sally reasoning engines are temporarily unavailable')
  }
  const retries=attempts.filter(item=>item.retried).length

  let reranked=false
  if(env.OPENROUTER_RERANK_API_KEY&&candidates.length>1){try{const ranked=await fetchJson('https://openrouter.ai/api/v1/rerank',{method:'POST',headers:headers(env.OPENROUTER_RERANK_API_KEY),body:JSON.stringify({model:env.SALLYIP_RERANK_MODEL||'nvidia/llama-nemotron-rerank-vl-1b-v2:free',query:latest.slice(0,4000),documents:candidates.map(candidate=>({text:candidate.content})),top_n:candidates.length})},Math.min(1200,Math.max(250,deadline-Date.now()-2300)));const scores=new Map((ranked.results||[]).map(result=>[result.index,result.relevance_score]));candidates=candidates.map((candidate,index)=>({...candidate,relevance:scores.get(index)||0})).sort((a,b)=>(b.relevance+b.adaptive_weight/100)-(a.relevance+a.adaptive_weight/100));reranked=true}catch{candidates.sort((a,b)=>b.adaptive_weight-a.adaptive_weight)}}
  const evidence=candidates.map((candidate,index)=>`CANDIDATE ${index+1} | orchestration weight ${candidate.adaptive_weight}% | relevance ${Number(candidate.relevance||0).toFixed(4)}\n${candidate.content.slice(0,7000)}`).join('\n\n')
  const synthesisEngine=candidates.find(candidate=>engineCredential(candidate,env))||candidates[0]
  let finalAnswer=sanitizeModelResponse(candidates[0].content)
  let synthesisStatus=candidates.length===1?'single-engine':'fallback'
  trace.add('synthesis','merging '+candidates.length+' candidate(s) via '+synthesisEngine.name,'ok')
  try{
    const remaining=deadline-Date.now()
    if(candidates.length>1&&remaining>800){
      const rawFinal=await fetchStreamingContent(engineUrl(synthesisEngine,env),{method:'POST',headers:headers(engineCredential(synthesisEngine,env)),body:JSON.stringify({model:synthesisEngine.slug,max_tokens:900,messages:[{role:'system',content:'You are Sally, the single public intelligence of SallyIP 4.1 Pro. Merge the weighted internal candidate answers into one accurate, direct, well-structured Markdown response. Resolve conflicts, preserve useful caveats, remove repetition, and never mention internal model/provider names, candidates, orchestration, weights, tool syntax, or hidden reasoning. Your name is Sally and no other name.'},{role:'user',content:`USER QUESTION:\n${latest}\n\nINTERNAL EVIDENCE:\n${evidence}`}]})},Math.min(7000,remaining),onToken)
      finalAnswer=sanitizeModelResponse(rawFinal)
      synthesisStatus='success'
      trace.add('synthesis','merged answer streamed · '+finalAnswer.length+' chars','success')
    }else if(onToken){
      await emitInChunks(finalAnswer,onToken)
      trace.add('synthesis','single-engine answer streamed · '+finalAnswer.length+' chars','success')
    }
  }catch(error){
    if(!finalAnswer)throw error
    synthesisStatus='fallback'
    finalAnswer=sanitizeModelResponse(candidates[0].content)
    trace.add('synthesis','merge failed → top candidate used ('+(error.message||'').slice(0,60)+')','warn')
    if(onToken)await emitInChunks(finalAnswer,onToken)
  }
  finalAnswer=sanitizeModelResponse(finalAnswer)
  const embedding=await embeddingPromise
  const meta={engines_requested:ENGINES.length,engines_completed:candidates.length,fast_fail_retries:retries,stragglers_aborted:attempts.filter(item=>item.status!=='success'&&item.latency_ms>=8000).length,rescue_used:rescueUsed,primary_engine:candidates[0]?.slug||null,embedding_dimensions:embedding.data?.data?.[0]?.embedding?.length||0,embedding_status:embedding.status,embedding_latency_ms:embedding.latency_ms,reranked,synthesis_status:synthesisStatus,total_latency_ms:Date.now()-totalStarted,engines:attempts.map(({slug,name,weight,status,latency_ms,retried})=>({slug,name,weight,status,latency_ms,retried})),sally_version:onToken?'4.2 Pro Stream':'4.1 Pro'}
  trace.add('response','answer delivered · '+finalAnswer.length+' chars · '+meta.total_latency_ms+'ms','success')
  if(options.sql)persistBrainOutcome(options.sql,{conversation_id:options.conversation_id,task_class:options.task_class,prompt:latest,answer:finalAnswer,total_latency_ms:meta.total_latency_ms,engines_completed:candidates.length,engines_requested:ENGINES.length,primary_engine:meta.primary_engine,rescue_used:rescueUsed,events:trace.events,attempts}).catch(()=>{})
  return{answer:finalAnswer,meta}
}

export async function orchestrateSally(messages,env,siteUrl='https://sallyip.com'){
  return orchestrateSallyStreaming(messages,env,siteUrl,null)
}

