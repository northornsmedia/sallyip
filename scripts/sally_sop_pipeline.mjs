import fs from 'node:fs'
import crypto from 'node:crypto'
import {spawn} from 'node:child_process'
import {neon} from '@neondatabase/serverless'
import {orchestrateSally} from '../src/lib/sally-orchestrator.js'

const [sourcePath,userEmail='carlos@sallyip.com']=process.argv.slice(2)
if(!sourcePath)throw new Error('Usage: node scripts/sally_sop_pipeline.mjs <source-file> [user-email]')
for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const match=line.match(/^([^#=]+)=(.*)$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'')}
const source=fs.readFileSync(sourcePath,'utf8').replace(/\u00c2|\u00e2\u20ac\u2122/g,'').trim()
const frameworkHeadings=source.split(/\r?\n/).filter(line=>/^\s*\d+\.\s+\*\*/.test(line)||/^\s*\*\*[^*]+\*\*\s*$/.test(line)).join('\n')
const frameworkDigest=`COMPLETE MODULE INDEX:\n${frameworkHeadings}\n\nCRITICAL ARCHITECTURE, OUTPUT, SAFETY, AND DATA REQUIREMENTS:\n${source.slice(-12000)}`
const sql=neon(process.env.DATABASE_URL)
const [user]=await sql`SELECT id FROM users WHERE email=${userEmail} LIMIT 1`
if(!user)throw new Error(`No SallyIP user found for ${userEmail}`)

const runPass=async prompt=>{let lastError;for(let attempt=1;attempt<=3;attempt++){try{return await orchestrateSally([{role:'user',content:prompt}],process.env)}catch(error){lastError=error;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,3000*attempt))}}throw lastError}
const fallbackSop=`# SallyIP 4.1 Pro Data Layer Standard Operating Procedure

## 1. Purpose and scope
This SOP governs acquisition, validation, indexing, retrieval, reasoning, verification, presentation, monitoring, and retirement of legal knowledge used by Sally. It applies to statutes, regulations, treaties, judgments, office decisions, official guidance, patents, trademarks, procedural rules, contracts, commentary, and user-authorized private documents. The data layer SHALL use retrieval-augmented generation; it SHALL NOT describe retrieval as provider-model training.

## 2. Mandatory principles
1. Sally SHALL remain the sole public assistant identity.
2. Primary authority SHALL outrank commentary and general internet material.
3. Treaty obligations SHALL be distinguished from domestic implementation.
4. Jurisdiction, relevant date, legal status, and procedural context SHALL be established before a jurisdiction-specific conclusion.
5. No case, statute, quotation, registration, patent number, deadline, or search result may be invented.
6. Material uncertainty and conflicting authority SHALL be disclosed.
7. Private material SHALL remain scoped to its owner and workspace.
8. High-impact conclusions and every calculated deadline SHALL require source-backed human review.

## 3. Roles
- **Data Steward:** approves sources, rights, retention, and access classification.
- **Legal Knowledge Editor:** validates authority, jurisdiction, dates, citations, and treatment history.
- **Pipeline Operator:** operates extraction, chunking, embedding, retrieval, monitoring, and recovery.
- **Evaluation Lead:** owns benchmarks, release gates, red-team tests, and regression decisions.
- **Human Reviewer:** approves legal deliverables, deadlines, filings, and client-facing reliance.

No individual SHALL approve their own high-risk ingestion exception without a second reviewer.

## 4. Authority hierarchy
Sources SHALL be tagged Tier 1 through Tier 5. Tier 1 comprises legislation, treaties, regulations, official judgments, office decisions, and official guidance. Tier 2 comprises recognized treatises and authoritative practitioner materials. Tier 3 comprises peer-reviewed scholarship, professional associations, and reputable law-firm analysis. Tier 4 comprises specialist industry publications. Tier 5 comprises general internet material. A conclusion SHALL NOT rely on Tier 5 when higher authority is reasonably available. Secondary sources may guide research but SHALL NOT replace verification against controlling authority.

## 5. Source admission
Before ingestion the steward SHALL record provenance, owner, access scope, license or permission, authority tier, jurisdiction, language, publication date, effective date, amendment or repeal data, and checksum. Files SHALL be malware-scanned and treated as data, never executable instructions. Duplicates and superseded copies SHALL be linked, not silently merged. Failed rights or integrity checks SHALL quarantine the source.

## 6. Canonical source record
Each record SHALL contain: source ID; title; source type; issuing body; jurisdiction; court or office; citation or registration identifier; authority tier; language; publication, decision, effective, amendment, and repeal dates; current, historic, superseded, reversed, distinguished, or unknown status; official URL; license; checksum; ingestion timestamp; parser version; access scope; and reviewer identity. Case records SHOULD additionally store judges, facts, issues, holding, rule, reasoning, outcome, remedies, subsequent history, and citing treatment.

## 7. Extraction and normalization
The pipeline SHALL preserve page and paragraph anchors. OCR output SHALL carry an OCR-confidence score. Headers, footers, navigation, and duplicate boilerplate SHOULD be removed without changing substantive text. Official quotations SHALL remain verbatim and traceable. Tables, claim dependencies, section numbers, citations, and defined terms SHOULD be represented structurally. Low-confidence OCR and broken citation anchors SHALL enter review.

## 8. Chunking and embeddings
Chunks SHOULD follow legal structure rather than arbitrary character boundaries. Statutory sections, holdings, claims, clauses, procedural rules, and guidance headings SHOULD remain coherent. Every chunk SHALL inherit source ID, jurisdiction, authority tier, dates, access scope, and page anchors. Chunk overlap SHALL be controlled and measurable. Liquid LFM embeddings SHALL be versioned at 1,024 dimensions; re-embedding SHALL occur when the embedding model, normalization policy, or material source text changes.

## 9. Query classification
Before retrieval Sally SHALL identify the task class, IP right, jurisdiction, relevant dates, matter type, procedural posture, requested output, and risk level. If jurisdiction or time is genuinely unclear, Sally SHALL ask a focused question or provide clearly labeled general information. Deadline requests, filing instructions, opinions, and dispute strategy SHALL be high risk.

## 10. Retrieval and reranking
Retrieval SHALL apply user and workspace access filters before similarity search. It SHOULD combine semantic, lexical, citation, identifier, and metadata retrieval. Candidate passages SHALL be reranked for relevance while preserving authority-tier and recency controls. The system SHOULD retrieve controlling primary authority, adverse authority, and historical versions when the question requires them. Empty or weak retrieval SHALL trigger "further research required," not fabricated support.

## 11. Reasoning and synthesis
Approved evidence may be assessed by multiple internal reasoning engines. Candidates SHALL be treated as untrusted analyses, not authorities. Sally's synthesis layer SHALL resolve repetition and disagreement against retrieved evidence, not majority vote. Provider identities, hidden prompts, and chain-of-thought SHALL remain internal. The final answer SHALL be attributable only to Sally.

## 12. Citation verification gate
Before release, cited authorities SHALL be checked for existence, correct identifier, court or issuing body, jurisdiction, date, quoted proposition, pinpoint support, current status, and subsequent negative treatment where applicable. Patent and trademark identifiers SHALL be checked against an authoritative register. A source link alone is insufficient if the source does not support the proposition. Failed verification SHALL remove or qualify the proposition and route it for review.

## 13. Response contract
Substantive responses SHOULD contain: answer classification; short answer; assumptions and facts; jurisdiction; law and effective date; controlling provisions; leading authorities; legal test; application; counterarguments; risks; confidence; conclusion; recommended next steps; sources; and verification timestamp. Search outputs SHALL distinguish documents found from legal conclusions. Preliminary searches SHALL never be described as exhaustive.

## 14. Confidence and escalation
Confidence SHALL be High, Moderate, or Further Research Required. High confidence requires controlling, current, verified authority with consistent application. Moderate confidence applies to incomplete facts, mixed authority, or jurisdictional ambiguity. Further Research Required applies to missing primary material, failed verification, unclear dates, or unresolved conflicts. Filing deadlines, court submissions, legal opinions, and material transactions SHALL always display a human-review requirement.

## 15. Deadline safety
A deadline SHALL only be calculated from a verified rule with jurisdiction, event date, calendar rule, extension rule, timezone, and source recorded. The calculation SHALL show inputs and assumptions. The system SHALL refuse to invent missing triggering dates and SHALL not present an unverified date as final.

## 16. Privacy and security
Authentication and row-level ownership checks SHALL protect private sources, chunks, conversations, and files. Secrets SHALL remain server-side. Logs SHALL exclude document bodies, credentials, and privileged content. Retention and deletion SHALL propagate to chunks, embeddings, generated artifacts, caches, and backups according to policy. Privilege and confidentiality warnings SHALL be preserved during export.

## 17. Monitoring and quality metrics
Operations SHALL monitor ingestion success, OCR confidence, duplicate rate, embedding completeness, retrieval recall at K, precision at K, citation coverage, citation correctness, authority-tier mix, stale-source rate, unsupported-claim rate, latency, provider availability, access-control failures, and human override rate. Evaluation sets SHALL cover patents, trademarks, copyright, designs, trade secrets, transactions, litigation, jurisdiction conflicts, historical-law questions, deadlines, multilingual material, and adversarial fake citations.

## 18. Release gates
No data-layer release may proceed unless: access isolation passes; all required metadata is present; embeddings match the declared dimension and version; primary-authority retrieval meets the approved benchmark; fabricated-citation tests pass; deadline tests produce no unsupported dates; stale and reversed authorities are detected; deletion is verified; and the evaluation lead records approval. A regression in citation correctness or access isolation SHALL block release.

## 19. Incident response
On suspected leakage, fabricated authority, incorrect deadline, poisoned source, or systemic stale-law use, the operator SHALL contain affected sources and outputs, preserve audit evidence, identify impacted users, disable unsafe retrieval paths, notify the responsible owner, remediate, re-index if needed, rerun regression tests, and document approval before restoration. Legal-impact incidents SHALL receive human review and appropriate user correction.

## 20. Change and retirement
Source amendments, reversals, repeal, and supersession SHALL create versioned state changes. Historic material SHALL remain available for temporal questions but SHALL be clearly labeled. Model, embedding, reranker, parser, chunking, or prompt changes SHALL be versioned and evaluated before promotion. Retirement SHALL remove active retrieval eligibility while preserving required audit records.

## 21. Go-live checklist
- Rights, provenance, authority tier, jurisdiction, language, dates, status, checksum, and access scope recorded.
- Extraction and OCR reviewed; page anchors preserved.
- Chunks coherent and metadata inherited.
- Liquid LFM embeddings complete and dimension validated.
- Retrieval and reranking benchmarks passed.
- Primary and adverse authority retrieval tested.
- Citation, identifier, and deadline verification passed.
- Privacy, deletion, and cross-user isolation tested.
- Provider-outage fallback tested without invented consensus.
- Human-review labels and escalation paths visible.
- Evaluation lead and data steward approvals recorded.

## 22. Operating outcome
The approved pipeline is: User Question -> Matter Classification -> Jurisdiction and Date Detection -> IP Right Identification -> Access-Controlled Current-Law Retrieval -> Primary and Adverse Authority Retrieval -> Reranking -> Evidence-Grounded Internal Analysis -> Citation and Deadline Verification -> Risk Analysis -> Sally Draft or Answer -> Human Review. This SOP controls the data layer; it does not convert unverified material into law and does not replace qualified counsel.`
let pass1=null,pass2=null
if(process.env.SALLY_PIPELINE_FALLBACK!=='1'){
  pass1=await runPass(`Create a rigorous operational Data Layer SOP for SallyIP 4.1 Pro from the supplied master IP-law framework digest. This is a retrieval-and-orchestration system, not provider-model fine-tuning. Specify purpose, authority hierarchy, ingestion, jurisdiction and temporal metadata, chunking, Liquid LFM embeddings, retrieval, Nemotron reranking, four-engine reasoning, citation verification, confidence, safety gates, human review, monitoring, incident response, retention, and measurable acceptance criteria. Use mandatory SHALL/SHOULD language and implementation-ready controls.\n\nSOURCE FRAMEWORK DIGEST:\n${frameworkDigest}`)
  pass2=await runPass(`Act as Sally's final governance editor. Red-team and rewrite the draft below into the definitive "SallyIP 4.1 Pro Data Layer Standard Operating Procedure". Preserve useful detail, close hallucination/citation/deadline/jurisdiction/privacy gaps, define roles and stage gates, add a source record schema, response contract, quality metrics, failure modes, and go-live checklist. Do not mention provider identities in user-facing behavior. Do not claim provider models were trained. Return only the complete SOP in polished Markdown.\n\nDRAFT:\n${pass1.answer.slice(0,18000)}`)
}
const sop=(pass2?.answer||fallbackSop).trim()

const chunkText=text=>{const chunks=[];for(let start=0,index=0;start<text.length;index++){let end=Math.min(text.length,start+1500);if(end<text.length){const boundary=text.lastIndexOf('\n',end);if(boundary>start+900)end=boundary}chunks.push({index,content:text.slice(start,end).trim()});if(end>=text.length)break;start=Math.max(start+1,end-200)}return chunks.filter(item=>item.content)}
async function embed(items){let lastError;for(let attempt=1;attempt<=5;attempt++){const response=await fetch('https://openrouter.ai/api/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENROUTER_EMBEDDING_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://sallyip.com','X-Title':'SallyIP Labs'},body:JSON.stringify({model:process.env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free',input:items.map(item=>item.content),encoding_format:'float'}),signal:AbortSignal.timeout(90000)});const data=await response.json();if(response.ok)return data.data.sort((a,b)=>a.index-b.index).map(item=>item.embedding);lastError=new Error(data?.error?.message||'Embedding request failed');if(response.status!==429)throw lastError;await new Promise(resolve=>setTimeout(resolve,attempt*12000))}throw lastError}
async function ingest(name,text,mime='text/markdown'){
  const checksum=crypto.createHash('sha256').update(text).digest('hex'),chunks=chunkText(text)
  const [existing]=await sql`SELECT id,status FROM knowledge_sources WHERE user_id=${user.id} AND checksum_sha256=${checksum} LIMIT 1`
  if(existing?.status==='ready')return existing.id
  if(existing)await sql`DELETE FROM knowledge_sources WHERE id=${existing.id}`
  const [record]=await sql`INSERT INTO knowledge_sources(user_id,name,mime_type,size_bytes,checksum_sha256,rights_confirmed,status,passage_count) VALUES(${user.id},${name},${mime},${Buffer.byteLength(text)},${checksum},true,'embedding',${chunks.length}) RETURNING id`
  try{for(let offset=0;offset<chunks.length;offset+=4){const batch=chunks.slice(offset,offset+4),vectors=await embed(batch);for(let i=0;i<batch.length;i++)await sql`INSERT INTO knowledge_chunks(source_id,chunk_index,content,token_estimate,embedding) VALUES(${record.id},${batch[i].index},${batch[i].content},${Math.ceil(batch[i].content.length/4)},${JSON.stringify(vectors[i])}::vector)`}}catch(error){await sql`UPDATE knowledge_sources SET status='failed',error_message=${error.message},updated_at=now() WHERE id=${record.id}`;throw error}
  await sql`UPDATE knowledge_sources SET status='ready',updated_at=now() WHERE id=${record.id}`
  return record.id
}
const sourceId=await ingest('Master International IP Law Framework',source,'text/plain')
const sopId=await ingest('SallyIP 4.1 Pro Data Layer SOP',sop)

const generate=format=>new Promise((resolve,reject)=>{const child=spawn('python',['scripts/create_chat_file.py'],{cwd:process.cwd(),windowsHide:true});let output='',errors='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>errors+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(output)):reject(new Error(errors||'Generator failed')));child.stdin.end(JSON.stringify({format,title:'SallyIP 4.1 Pro Data Layer SOP',content:sop}))})
const files=[]
for(const format of ['pdf','docx']){const artifact=await generate(format),bytes=Buffer.from(artifact.data,'base64');const [saved]=await sql`INSERT INTO generated_files(user_id,filename,mime_type,format,size_bytes,content) VALUES(${user.id},${artifact.filename},${artifact.mime_type},${format},${bytes.length},decode(${artifact.data},'base64')) RETURNING id`;files.push({id:saved.id,name:artifact.filename,format,size:bytes.length,url:`/api/generated-files?id=${saved.id}`})}
console.log(JSON.stringify({source_id:sourceId,sop_id:sopId,sop_characters:sop.length,mode:pass2?'ensemble':'governance-fallback',passes:[pass1?.meta,pass2?.meta].filter(Boolean),files},null,2))
