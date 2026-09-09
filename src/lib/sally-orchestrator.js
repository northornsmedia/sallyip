import { sanitizeModelResponse } from './document-tool-service.js'

const CHAT_ENGINES=[
  {slug:'gemini-3.7-flash',name:'Gemini 3.7 Flash',key:'GEMINI_API_KEY',baseUrl:'https://generativelanguage.googleapis.com/v1beta/openai',weight:100,role:'Primary flagship legal reasoning & drafting'},
  {slug:'nvidia/nemotron-3-ultra-550b-a55b:free',name:'Nemotron 3 Ultra 550B',key:'OPENROUTER_API_KEY',weight:80,role:'Secondary fallback legal-technical synthesis and drafting'},
  {slug:'nvidia/nemotron-3.5-lightning:free',name:'Nemotron 3.5 Lightning',key:'OPENROUTER_API_KEY',weight:60,role:'Fast Nemotron fallback'}
]
// Designated rescue engine: Nemotron 3.5 Lightning
const OX_ALPHA_SLUG='nvidia/nemotron-3.5-lightning:free'
const RESCUE_THRESHOLD=1
const INTERNAL_PROMPT=`You are an internal reasoning engine inside SallyIP 4.1 Pro. Your public identity is strictly Sally. Never claim another model or provider name. Give accurate, practical intellectual-property research and drafting assistance. Distinguish facts from uncertainty. Return only useful output; never reveal hidden chain-of-thought.

HIGH-FIDELITY CONVERSATION MEMORY & CONTINUOUS CONTEXT RETENTION:
You maintain permanent, active working memory of everything the user said and what you responded throughout this entire conversation.
- Retain all facts: Every invention detail, technical specification, component, mechanism, constraint, goal, and instruction previously disclosed by the user is verified ground truth.
- Never forget or re-ask: Never ask the user to re-state or re-describe information they already provided in prior turns.
- Direct continuity: Seamlessly connect the user's latest message with earlier exchanges. If the user refers to "it", "the device", "my invention", "what I said earlier", "continue", or asks for the next step (e.g. drafting claims, patentability analysis, specification), build directly and precisely upon the accumulated details from the conversation history.

OUTPUT AND ARTIFACT FORMAT: Sally's web application automatically generates downloadable files and artifacts from your response. Always write responses in standard, clean Markdown directly for the user. Never emit internal tool call syntax, pseudo-code functions, XML tags, or raw tokens such as <itool_call_begin>, <itool_call_end>, <tool_call>, or [generate_file(...)]. Do not escape text into single string arguments. Keep conversational chat clear, and structure legal agreements or guides using standard Markdown headings, lists, and tables. Supported downloadable formats handled by the application include PDF, DOCX, PPTX, XLSX, CSV, Markdown, HTML, JSON, and TXT. Never invent download links, never instruct the user to copy content into Word, Google Docs, or another application, and never claim file generation is unavailable. Keep chat text separate from artifact content. Resolve "this", "that", "the document", "the agreement", "the report", "previous draft", and bare requests such as "PDF please" to the active artifact. Existing artifacts must be exported without regeneration unless revisions are explicitly requested. When a prompt is marked DOCUMENT CONTENT REQUEST, return only the polished document content in Markdown: no capability disclaimers, file-generation instructions, conversational preface, or statements about being unable to generate files. Legal notices are rendered by the application UI and should not be inserted into drafted agreements or artifacts unless the user requests them or they are substantively required.`
const OPENROUTER_CHAT_URL='https://openrouter.ai/api/v1/chat/completions'
const engineUrl=(engine,env)=>{
  if(!engine.baseUrl) return OPENROUTER_CHAT_URL
  const base = env[engine.baseUrl] || (engine.baseUrl.startsWith('http') ? engine.baseUrl : null)
  return base ? `${String(base).replace(/\/+$/,'')}/chat/completions` : OPENROUTER_CHAT_URL
}
const engineCredential=(engine,env)=>{
  if(!engine) return null
  if(engine.key && env[engine.key]) return env[engine.key]
  if(engine.key === 'GEMINI_API_KEY' || engine.key === 'GOOGLE_API_KEY') return env.GEMINI_API_KEY || env.GOOGLE_API_KEY || null
  return !engine.baseUrl ? env.OPENROUTER_API_KEY : null
}
const RETRY_FAST_FAIL_MS=1000
const STRAGGLER_ABORT_MS=25000
const RACE_TIMEOUT=28000
const STREAM_CHUNK_SIZE=48
const STREAM_CHUNK_DELAY_MS=12

export const sallyEngineInfo=CHAT_ENGINES
export {OX_ALPHA_SLUG,RESCUE_THRESHOLD}

export function isTruncatedOrCutOff(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (!t) return true;
  if (t.endsWith(':') || t.endsWith('with:') || t.endsWith('and:') || t.endsWith('for:')) return true;
  if (t.includes("Here's what I can help you with:") && t.length < 120) return true;
  return false;
}

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
      baseUrl:env.SALLYIP_PRIMARY_BASE_URL?String(env.SALLYIP_PRIMARY_BASE_URL).slice(0,160):undefined,
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

const getErrorMessage = (data, fallback) => {
  const err = Array.isArray(data) ? data[0]?.error : data?.error;
  return err?.message || fallback;
};

const fetchJson=async(url,options,timeoutMs=5000)=>{
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(Math.max(250,timeoutMs))});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(getErrorMessage(data, `${response.status} ${response.statusText}`));
  return data;
}
const fetchStreamingContent=async(url,options,timeoutMs,onDelta)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  let content='',buffer='',streamError=null;
  try{
    const response=await fetch(url,{...options,body:JSON.stringify({...JSON.parse(options.body),stream:true}),signal:controller.signal});
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(getErrorMessage(data, `${response.status} ${response.statusText}`));
    }
    const reader=response.body.getReader(),decoder=new TextDecoder();
    while(true){
      const{done,value}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split('\n');
      buffer=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: ')||line==='data: [DONE]')continue;
        try{
          const payload=JSON.parse(line.slice(6));
          const err = Array.isArray(payload) ? payload[0]?.error : payload?.error;
          if(err){
            streamError=new Error(err.message||'Stream error from model API');
            throw streamError;
          }
          const delta=payload.choices?.[0]?.delta?.content||'';
          content+=delta;
          if(delta&&onDelta)onDelta(delta);
        }catch(e){
          if(streamError) throw streamError;
        }
      }
    }
  }catch(error){
    if(streamError) throw streamError;
    if(error.message?.includes('overloaded') || error.message?.includes('intermittent errors')) throw error;
    if(!content && error.name!=='AbortError') throw error;
  }finally{
    clearTimeout(timer);
  }
  if(!content.trim())throw new Error('Empty response');
  if(isTruncatedOrCutOff(content))throw new Error('Incomplete/truncated response received from model API');
  return content.trim();
}
const emitInChunks=async(text,onDelta)=>{const clean=sanitizeModelResponse(text);for(let index=0;index<clean.length;index+=STREAM_CHUNK_SIZE){onDelta(clean.slice(index,index+STREAM_CHUNK_SIZE));await new Promise(resolve=>setTimeout(resolve,STREAM_CHUNK_DELAY_MS))}}

export function prepareChatMessages(messages, internalPrompt = INTERNAL_PROMPT) {
  const systemParts = [internalPrompt.trim()];
  const dialogTurns = [];

  for (const m of messages || []) {
    if (!m) continue;
    const role = m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.trim() : String(m.content || '').trim();
    if (!content) continue;

    if (role === 'system') {
      if (!systemParts.includes(content)) {
        systemParts.push(content);
      }
    } else {
      dialogTurns.push({ role, content });
    }
  }

  // Active Context & Working Memory Injection:
  // If there are prior conversation turns, extract an explicit turn-by-turn memory brief
  const priorTurns = dialogTurns.slice(0, -1);
  if (priorTurns.length > 0) {
    const memoryLines = [];
    let turnCount = 0;
    for (const turn of priorTurns) {
      if (turn.role === 'user') {
        turnCount++;
        memoryLines.push(`• USER (Turn ${turnCount}): "${turn.content.slice(0, 500)}"`);
      } else if (turn.role === 'assistant') {
        const snippet = turn.content.replace(/\n+/g, ' ').slice(0, 300);
        memoryLines.push(`• SALLY (Response ${turnCount}): "${snippet}..."`);
      }
    }

    systemParts.push(
      `ACTIVE CONVERSATION MEMORY & ACCUMULATED CONTEXT:\n` +
      `You are in an ongoing multi-turn dialogue with the user. You must maintain continuous, precise awareness of everything said previously in this session.\n` +
      `Chronology of earlier exchanges in this thread:\n` +
      memoryLines.join('\n') + `\n\n` +
      `MANDATORY RETENTION RULES:\n` +
      `1. Ground all reasoning in the facts, specifications, mechanisms, problems, and decisions established above.\n` +
      `2. Never ask the user to repeat or re-describe information they already provided in prior messages.\n` +
      `3. When the user asks to continue, draft claims, or references earlier details, connect seamlessly to the accumulated disclosures.`
    );
  }

  return [
    { role: 'system', content: systemParts.join('\n\n---\n\n') },
    ...dialogTurns
  ];
}

function createWireTrace(){
  const events=[]
  return{
    events,
    add:(label,detail,status='ok')=>events.push({t:Date.now(),label,detail,status})
  }
}

function createEngineCollector(env,messages,headers,trace,engines=CHAT_ENGINES){
  const requestMessages=prepareChatMessages(messages, INTERNAL_PROMPT)
  const maxTokens=Number(env.SALLYIP_MAX_TOKENS)||4096
  const controllers=new Map()
  const runAttempt=async(engine,allowRetry)=>{
    const started=Date.now()
    trace.add('wire','→ '+engine.name+' ('+engine.slug+') dispatched','pending')
    const controller=new AbortController();controllers.set(engine.slug,controller)
    try{
      const credential=engineCredential(engine,env)
      if(!credential)throw new Error('Model credential unavailable')
      const content=await fetchStreamingContent(engineUrl(engine,env),{method:'POST',headers:headers(credential),signal:controller.signal,body:JSON.stringify({model:engine.slug,temperature:.3,max_tokens:maxTokens,messages:requestMessages})}, STRAGGLER_ABORT_MS)
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
  const budget=onToken?35000:25000
  const deadline=totalStarted+budget
  const headers=key=>({Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':siteUrl,'X-Title':'SallyIP Labs'})
  const latest=[...messages].reverse().find(message=>message.role==='user')?.content||''
  const trace=options.trace||createWireTrace()
  trace.add('request','prompt received ('+latest.length+' chars)','ok')
  const embeddingPromise=(async()=>{const started=Date.now();if(!env.OPENROUTER_EMBEDDING_API_KEY)return{data:null,status:'error',latency_ms:0};try{return{data:await fetchJson('https://openrouter.ai/api/v1/embeddings',{method:'POST',headers:headers(env.OPENROUTER_EMBEDDING_API_KEY),body:JSON.stringify({model:env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free',input:latest.slice(0,8000),encoding_format:'float'})},2500),status:'success',latency_ms:Date.now()-started}}catch{return{data:null,status:'error',latency_ms:Date.now()-started}}})()

  const ENGINES=resolveEngines(env)
  const maxTokens=Number(env.SALLYIP_MAX_TOKENS)||4096
  const requestMessages=prepareChatMessages(messages, INTERNAL_PROMPT)

  const attempts=[]
  let finalAnswer=''
  let primaryEngine=null
  let synthesisStatus='single-engine'

  // Model pipeline: First Gemini 3.7, then fallback to Nemotron (no other models)
  const geminiEngine = ENGINES.find(e => e.slug === 'gemini-3.7-flash') || {
    slug: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    key: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    weight: 100,
    role: 'Primary flagship legal reasoning & drafting'
  }

  const nemotronEngines = ENGINES.filter(e => e.slug.includes('nemotron'))
  if (!nemotronEngines.length) {
    nemotronEngines.push(
      { slug: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', key: 'OPENROUTER_API_KEY', weight: 80, role: 'Secondary fallback' },
      { slug: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning', key: 'OPENROUTER_API_KEY', weight: 60, role: 'Fast fallback' }
    )
  }

  const pipeline = [geminiEngine, ...nemotronEngines]

  // Allow explicit engine choice if specified
  const preferredSlug = String(options.preferredEngine || '').trim()
  if (preferredSlug && preferredSlug !== 'auto') {
    const hitIdx = pipeline.findIndex(e => e.slug === preferredSlug)
    if (hitIdx > 0) {
      const [hit] = pipeline.splice(hitIdx, 1)
      pipeline.unshift(hit)
    }
  }

  for (const engine of pipeline) {
    const cred = engineCredential(engine, env)
    if (!cred) continue

    const started = Date.now()
    trace.add('wire', `→ ${engine.name} (${engine.slug}) dispatched`, 'pending')

    try {
      const remainingTime = Math.max(4000, deadline - Date.now())
      const raw = await fetchStreamingContent(
        engineUrl(engine, env),
        {
          method: 'POST',
          headers: headers(cred),
          body: JSON.stringify({
            model: engine.slug,
            temperature: 0.3,
            max_tokens: maxTokens,
            messages: requestMessages
          })
        },
        Math.min(STRAGGLER_ABORT_MS, remainingTime),
        onToken
      )

      const cleaned = sanitizeModelResponse(raw)
      if (cleaned && !isTruncatedOrCutOff(cleaned)) {
        finalAnswer = cleaned
        primaryEngine = engine.slug
        attempts.push({ ...engine, content: cleaned, status: 'success', latency_ms: Date.now() - started, retried: false })
        trace.add('node', `${engine.name} responded · ${cleaned.length} chars`, 'success')
        break // First model succeeded: do NOT talk to any other model!
      } else {
        throw new Error('Incomplete response received')
      }
    } catch (err) {
      const elapsed = Date.now() - started
      attempts.push({ ...engine, content: '', status: 'error', latency_ms: elapsed, error: err.message, retried: false })
      trace.add('node', `${engine.name} failed (${(err.message || '').slice(0, 60)}) → falling back`, 'warn')
    }
  }

  if (!finalAnswer) {
    trace.add('error', 'Both Gemini and Nemotron engines exhausted', 'error')
    throw new Error('Sally reasoning engines are temporarily unavailable')
  }

  finalAnswer = sanitizeModelResponse(finalAnswer)
  const embedding = await embeddingPromise
  const meta = {
    engines_requested: pipeline.length,
    engines_completed: attempts.filter(a => a.status === 'success').length,
    preferred_engine: preferredSlug || 'gemini-3.7-flash',
    fast_fail_retries: 0,
    stragglers_aborted: 0,
    rescue_used: primaryEngine !== 'gemini-3.7-flash',
    primary_engine: primaryEngine,
    embedding_dimensions: embedding.data?.data?.[0]?.embedding?.length || 0,
    embedding_status: embedding.status,
    embedding_latency_ms: embedding.latency_ms,
    reranked: false,
    synthesis_status: synthesisStatus,
    total_latency_ms: Date.now() - totalStarted,
    engines: attempts.map(({ slug, name, weight, status, latency_ms, retried }) => ({ slug, name, weight, status, latency_ms, retried })),
    sally_version: onToken ? '4.2 Pro Stream' : '4.1 Pro'
  }

  trace.add('response', 'answer delivered · ' + finalAnswer.length + ' chars · ' + meta.total_latency_ms + 'ms', 'success')
  if (options.sql) persistBrainOutcome(options.sql, {
    conversation_id: options.conversation_id,
    task_class: options.task_class,
    prompt: latest,
    answer: finalAnswer,
    total_latency_ms: meta.total_latency_ms,
    engines_completed: meta.engines_completed,
    engines_requested: meta.engines_requested,
    primary_engine: meta.primary_engine,
    rescue_used: meta.rescue_used,
    events: trace.events,
    attempts
  }).catch(() => {})

  return { answer: finalAnswer, meta }
}

export async function orchestrateSally(messages,env,siteUrl='https://sallyip.com',options={}){
  return orchestrateSallyStreaming(messages,env,siteUrl,null,options)
}

