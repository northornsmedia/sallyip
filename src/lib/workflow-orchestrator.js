import {planLegalTask} from './legal-task-planner.js'
import {createClaimChart,getClaimChart} from './claim-chart-service.js'
import {addFtoPatentReview,createFtoProject,getFtoProject} from './fto-service.js'
import {createPriorArtProject} from './prior-art-service.js'
import {createClearanceProject,screenMatterTrademarks} from './trademark-clearance-service.js'
import {proposeChronologyFromSources} from './litigation-evidence-service.js'
import {officialPatentAuthority} from './jurisdiction-registry.js'
import {runIpSpecialist} from './ip-specialist-service.js'
import {buildDraftScaffold,detectAttorneyPersona,detectFilingPosture,extractDraftFeatures,screenSection101} from './patent-draft-service.js'

const clean=value=>String(value||'').replace(/\s+/g,' ').trim()
const title=value=>clean(value).slice(0,180)
const officialPatentSource=officialPatentAuthority

async function recordStep(sql,runId,ordinal,step_key,service_name,status,details={},source_basis='none',error_message=null){
  await sql`INSERT INTO legal_workflow_steps(workflow_run_id,ordinal,step_key,service_name,status,details,source_basis,error_message,completed_at) VALUES(${runId},${ordinal},${step_key},${service_name},${status},${JSON.stringify(details)}::jsonb,${source_basis},${error_message},now())`
}

async function createArtifact(sql,userId,conversationId,{title:artifactTitle,type,content,jurisdiction,sources=[]}){
  if(!conversationId)return null
  const[conversation]=await sql`SELECT id FROM conversations WHERE id=${conversationId} AND user_id=${userId}`
  if(!conversation)return null
  const[artifact]=await sql`INSERT INTO artifacts(user_id,conversation_id,title,document_type,jurisdiction,status) VALUES(${userId},${conversation.id},${artifactTitle},${type},${jurisdiction||null},'review') RETURNING id`
  await sql`INSERT INTO artifact_versions(artifact_id,version,content,metadata,sources) VALUES(${artifact.id},1,${content},${JSON.stringify({automation:true,workflow:type})}::jsonb,${JSON.stringify(sources)}::jsonb)`
  await sql`UPDATE conversations SET last_active_artifact_id=${artifact.id},updated_at=now() WHERE id=${conversation.id}`
  return artifact.id
}

async function matterInputs(sql,userId,matterId){
  const claims=await sql`SELECT pc.id,pc.claim_number,pc.claim_type,pc.claim_text,pc.patent_entity_id,p.name patent_name,p.canonical_identifier,p.jurisdiction FROM patent_claims pc JOIN ip_entities p ON p.id=pc.patent_entity_id WHERE pc.user_id=${userId} AND pc.matter_id=${matterId} ORDER BY CASE pc.claim_type WHEN 'independent' THEN 0 ELSE 1 END,pc.claim_number`
  const passages=await sql`SELECT sp.id,sp.source_id,sp.content,sp.locator,s.title source_title,s.verified_at,s.source_type FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE s.user_id=${userId} AND s.matter_id=${matterId} ORDER BY s.created_at DESC,sp.created_at LIMIT 5000`
  return{claims,passages}
}

function partitionFtoSources(passages){
  const groups=new Map()
  for(const passage of passages){const group=groups.get(passage.source_id)||[];group.push(passage);groups.set(passage.source_id,group)}
  const patentSourceIds=new Set()
  for(const[sourceId,items]of groups){
    const text=items.map(item=>item.content).join('\n'),type=String(items[0]?.source_type||'')
    const patentLike=/patent|published_application|official_search_result/i.test(type)||(/\bclaims?\b/i.test(text)&&/(?:^|\n)\s*1[.)]\s+(?:a|an|the)\s+/i.test(text))
    if(patentLike)patentSourceIds.add(sourceId)
  }
  return{patentPassages:passages.filter(item=>patentSourceIds.has(item.source_id)),productPassages:passages.filter(item=>!patentSourceIds.has(item.source_id))}
}

function sectionedPassages(passages){
  let section='Document opening'
  return passages.map(passage=>{const value=clean(passage.content),heading=value.match(/^\d+\.\s+(.{2,100})$/);if(heading)section=heading[1];return{...passage,section,is_heading:Boolean(heading)}})
}

const citePassage=(passage,text=passage.content)=>`${clean(text).slice(0,700)} _(${passage.source_title}, ${passage.locator}, § ${passage.section})_`
const linesFrom=(items,limit=8)=>items.filter(item=>!item.is_heading).slice(0,limit).map(item=>`- ${citePassage(item)}`).join('\n')||'- Not stated in the uploaded document.'

async function automateInventionIntake(sql,userId,matterId,plan,step){
  const inputs=await matterInputs(sql,userId,matterId),sourceRoles=partitionFtoSources(inputs.passages),latest=sourceRoles.productPassages[0]
  if(!latest)throw new Error('Upload an invention disclosure before running intake analysis')
  const passages=sectionedPassages(sourceRoles.productPassages.filter(item=>item.source_id===latest.source_id)),findSection=pattern=>passages.filter(item=>pattern.test(item.section)),nonHeadings=passages.filter(item=>!item.is_heading)
  const titlePassages=findSection(/title of invention/i),background=findSection(/field|background|problem/i),details=findSection(/detailed description|description of the invention/i),novelty=findSection(/believe is novel|think is new|novel/i),questions=findSection(/open questions/i)
  const redFlagPattern=/public|presented|posted|published|blog|meetup|demo|employer|work hours|laptop|gpu|ownership|nda|collaboration|third[- ]party|dataset|licen[cs]|grant|funding|foreign filing|section 39|sold|trial|verbal agreement|prior art search|freedom.to.operate/i
  const redFlags=nonHeadings.filter(item=>redFlagPattern.test(item.content)).slice(0,12)
  const elements=productFeatures(details.length?details:nonHeadings).slice(0,12)
  const elementRows=elements.map(item=>`- ${item.text} _(${item.source_title}, ${item.locator}, § ${passages.find(p=>p.id===item.passage_id)?.section||'Technical description'})_`).join('\n')||'- No sufficiently specific technical elements were extracted.'
  const sourceOpening=nonHeadings.slice(0,2),summaryPassages=[...titlePassages.filter(item=>!item.is_heading),...background.filter(item=>!item.is_heading),...details.filter(item=>!item.is_heading).slice(0,2)]
  const nextSteps=[
    redFlags.some(item=>/employer|work hours|laptop|gpu|ownership/i.test(item.content))&&'Resolve inventorship and employer/assignment ownership in writing before filing.',
    redFlags.some(item=>/nda|collaboration|dataset|third[- ]party|licen[cs]/i.test(item.content))&&'Review every NDA, dataset licence, collaboration agreement, and permission governing training data or third-party material.',
    redFlags.some(item=>/public|presented|posted|published|blog|meetup|demo/i.test(item.content))&&'Preserve copies and exact dates/content/audience of every disclosure; obtain jurisdiction-specific novelty advice immediately.',
    redFlags.some(item=>/grant|funding/i.test(item.content))&&'Review grant or funding terms for assignment, reporting, consent, and government-right provisions.',
    redFlags.some(item=>/foreign filing|section 39/i.test(item.content))&&'Confirm Indian foreign-filing permission requirements and filing sequence before any non-Indian filing.',
    'Collect the missing attachments, prototype records, dated test data, drawings, and contributor history.',
    'Run a professional prior-art and ownership review before drafting claims.',
    'After the evidence and ownership issues are resolved, prepare a claim strategy covering the strongest technical combinations and fallback embodiments.'
  ].filter(Boolean)
  const content=`# Invention intake analysis\n\n## 1. Document type and formality\nThis is an **invention disclosure / pre-filing intake document**, not a patent application and not a granted or published patent. It is useful for internal evaluation but remains incomplete wherever referenced attachments, agreements, datasets, test records, or ownership documents are absent.\n\n${linesFrom(sourceOpening,2)}\n\n## 2. Invention summary\n${linesFrom(summaryPassages,5)}\n\n## 3. Key technical elements\n${elementRows}\n\n## 4. Novelty signals stated by the document\n${linesFrom(novelty,8)}\n\nThese are inventor assertions, not verified novelty conclusions.\n\n## 5. Red flags\n${linesFrom(redFlags,12)}\n\n## 6. Open questions\n${linesFrom(questions.length?questions:nonHeadings.filter(item=>item.content.includes('?')),12)}\n\n## 7. Next steps before drafting\n${nextSteps.map(item=>`- ${item}`).join('\n')}\n\nNo claims were drafted and no patentability conclusion was made in this intake step.`
  await step('classify_document','document-ingestion','completed',{source_id:latest.source_id,source_title:latest.source_title,document_type:'invention_disclosure'},'uploaded_document')
  await step('extract_intake','invention-intake','completed',{technical_elements:elements.length,red_flags:redFlags.length,open_questions:questions.filter(item=>!item.is_heading).length},'uploaded_document')
  return{title:`Invention intake — ${latest.source_title}`,type:'invention_intake',jurisdiction:plan.jurisdiction,summary:`Sally completed a seven-part intake analysis of ${latest.source_title}, with ${elements.length} technical elements and ${redFlags.length} cited red-flag passages.`,warnings:[],links:{source_id:latest.source_id},sources:passages.map(item=>({passage_id:item.id,title:item.source_title,locator:item.locator,section:item.section})),content}
}

function productFeatures(passages){
  const candidates=[],seen=new Set()
  const technical=/\b(compris|contain|include|configur|connect|coupl|process|store|transmit|receive|generate|detect|encrypt|classif|model|processor|memory|sensor|server|network|module|device|system|method|database|interface)\w*/i
  for(const passage of passages){
    for(const sentence of String(passage.content||'').split(/(?<=[.!?;])\s+|\n+/)){
      const value=clean(sentence).replace(/^[-*\d.)\s]+/,'')
      const fingerprint=value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
      if(value.length<25||value.length>360||!technical.test(value)||seen.has(fingerprint))continue
      seen.add(fingerprint)
      candidates.push({text:value,passage_id:passage.id,locator:passage.locator,source_title:passage.source_title})
    }
  }
  return candidates.slice(0,15)
}

async function automateClaimChart(sql,userId,matterId,plan,step){
  const inputs=await matterInputs(sql,userId,matterId),claims=inputs.claims.filter(item=>item.claim_type==='independent').slice(0,3)
  if(!claims.length)throw new Error('No parsed independent patent claim is available in this matter')
  const target=plan.product||inputs.passages[0]?.source_title||'Matter product evidence',charts=[]
  await step('identify_inputs','claim-chart-service','completed',{claims:claims.map(c=>c.claim_number),target,passages:inputs.passages.length},'matter_sources')
  for(const claim of claims){const chart=await createClaimChart(sql,userId,{matter_id:matterId,claim_id:claim.id,chart_type:'infringement',target_name:target,jurisdiction:plan.jurisdiction||claim.jurisdiction});await sql`UPDATE claim_chart_rows SET mapping_status=CASE WHEN evidence_passage_id IS NULL THEN 'missing' WHEN confidence>=0.6 THEN 'mapped' ELSE 'partial' END,review_status=CASE WHEN evidence_passage_id IS NULL THEN 'needs_evidence' ELSE 'unreviewed' END,comments=CASE WHEN evidence_passage_id IS NULL THEN 'AI PREPARED — missing product evidence.' ELSE 'AI MAPPED — NOT LAWYER APPROVED. Review by exception.' END WHERE chart_id=${chart.chart.id}`;charts.push(await getClaimChart(sql,userId,chart.chart.id))}
  const uncertain=charts.reduce((n,c)=>n+c.rows.filter(r=>r.mapping_status!=='mapped'||Number(r.confidence)<.6).length,0),mapped=charts.reduce((n,c)=>n+c.rows.filter(r=>r.mapping_status==='mapped').length,0)
  await step('map_claims','claim-chart-service','needs_review',{charts:charts.map(c=>c.chart.id),mapped,uncertain},'matter_sources')
  return{title:`Automated claim chart — ${target}`,type:'claim_chart',jurisdiction:plan.jurisdiction,summary:`Sally created ${charts.length} claim chart(s), AI-mapped ${mapped} limitations, and placed ${uncertain} exceptions in the lawyer review queue.`,warnings:uncertain?[`${uncertain} mappings require lawyer review.`]:[],links:{claim_chart_ids:charts.map(c=>c.chart.id)},content:`# Automated claim-chart result\n\nTarget: **${target}**\n\n- Independent claims analysed: ${charts.map(c=>c.chart.claim_number).join(', ')}\n- AI-mapped limitations: ${mapped}\n- Needs review or evidence: ${uncertain}\n\nHigh-confidence rows are labelled **AI MAPPED — NOT LAWYER APPROVED**. No automated mapping has been represented as lawyer-approved.`}
}

async function automateFto(sql,userId,matterId,plan,step){
  const inputs=await matterInputs(sql,userId,matterId),sourceRoles=partitionFtoSources(inputs.passages),features=productFeatures(sourceRoles.productPassages),claims=inputs.claims.filter(c=>c.claim_type==='independent').slice(0,8)
  if(!features.length)throw new Error('Upload a product specification before running FTO')
  if(!sourceRoles.patentPassages.length)throw new Error('No target patent was identified. Upload a patent document containing numbered claims; an invention disclosure alone is not a target patent for FTO.')
  if(!claims.length)throw new Error('A target patent document is present, but no independent claim has been parsed. Parse its numbered claims before running FTO.')
  if(!plan.jurisdiction)throw new Error('FTO jurisdiction is required')
  await step('extract_product','fto-service','completed',{features:features.length,passages:inputs.passages.length},'uploaded_document')
  const project=await createFtoProject(sql,userId,{matter_id:matterId,product_name:plan.product||inputs.passages[0]?.source_title||'Matter product',jurisdiction:plan.jurisdiction,features:features.map(f=>f.text),scope_note:'Automatically prepared from matter product evidence; lawyer review required.'})
  for(const claim of claims)await addFtoPatentReview(sql,userId,{project_id:project.project.id,claim_id:claim.id})
  const preparedProject=await getFtoProject(sql,userId,project.project.id)
  for(let index=0;index<preparedProject.features.length;index+=1){
    const sourcePassageId=features[index]?.passage_id||null
    await sql`UPDATE fto_product_features SET source_passage_id=${sourcePassageId},note='AI EXTRACTED — NOT LAWYER APPROVED' WHERE id=${preparedProject.features[index].id}`
  }
  await sql`UPDATE fto_element_mappings SET mapping_status=CASE WHEN product_feature_id IS NULL THEN 'missing' WHEN confidence>=.6 THEN 'mapped' ELSE 'partial' END,review_status=CASE WHEN product_feature_id IS NULL THEN 'needs_evidence' ELSE 'unreviewed' END,note=CASE WHEN product_feature_id IS NULL THEN 'AI PREPARED — product feature missing.' ELSE 'AI MAPPED — NOT LAWYER APPROVED.' END WHERE patent_review_id IN(SELECT id FROM fto_patent_reviews WHERE project_id=${project.project.id})`
  await sql`UPDATE fto_element_mappings m SET evidence_passage_id=f.source_passage_id FROM fto_product_features f,fto_patent_reviews r WHERE m.product_feature_id=f.id AND m.patent_review_id=r.id AND r.project_id=${project.project.id} AND f.source_passage_id IS NOT NULL`
  await sql`UPDATE fto_search_coverage SET status='not_available',note='No configured official provider result was available during this automated run.' WHERE project_id=${project.project.id} AND status='not_started'`
  const result=await getFtoProject(sql,userId,project.project.id),uncertain=result.reviews.reduce((n,r)=>n+r.mappings.filter(m=>m.mapping_status!=='mapped'||Number(m.confidence)<.6).length,0)
  await step('map_product_to_claims','fto-service','needs_review',{project_id:result.project.id,claims:result.reviews.length,uncertain},'matter_sources')
  const officialSource=officialPatentSource(plan.jurisdiction)
  await step('official_search','official-search-service','skipped',{authority:officialSource,reason:`No configured successful ${officialSource} search run`},'none')
  const rows=result.reviews.flatMap(review=>review.mappings.map(mapping=>({review,mapping})))
  const matrix=rows.map(({review,mapping})=>`| ${review.publication_number||review.patent_name} / Claim ${review.claim_number} | ${mapping.ordinal}. ${clean(mapping.element_text)} | ${mapping.feature_text?clean(mapping.feature_text):'No matching product feature'} | ${mapping.source_title?`${mapping.source_title}, ${mapping.locator||'location unavailable'}`:'Evidence gap'} | ${mapping.mapping_status} / ${mapping.review_status} |`).join('\n')
  const sources=[...new Map(features.map(feature=>[feature.passage_id,{passage_id:feature.passage_id,title:feature.source_title,locator:feature.locator}])).values()]
  return{title:result.project.title,type:'fto_report',jurisdiction:plan.jurisdiction,summary:`Preliminary FTO prepared for ${plan.jurisdiction}: ${features.length} legally relevant product features extracted, ${result.reviews.length} independent claims mapped, ${uncertain} exceptions require review.`,warnings:[`${officialSource} patent discovery and live legal-status searches were not completed; no clearance conclusion is stated.`],links:{fto_project_id:result.project.id},sources,content:`# Preliminary FTO result\n\n## Scope and provenance\n- Territory: **${plan.jurisdiction}**\n- Product features extracted: **${features.length}**\n- Uploaded independent claims assessed: **${result.reviews.length}**\n- Review exceptions: **${uncertain}**\n\n## Limitation-by-limitation matrix\n| Patent claim | Claim limitation | Product feature | Exact product-source location | Status |\n|---|---|---|---|---|\n${matrix||'| — | No uploaded patent claim was available | — | — | evidence gap |'}\n\n## Review by exception\nOnly uncertain, partial, missing, or low-confidence mappings require lawyer action. AI-prepared mappings remain unapproved until explicitly accepted.\n\n## Incomplete external work\n- ${officialSource} patent discovery was unavailable.\n- Live ${plan.jurisdiction} legal-status verification was unavailable.\n\nThis persisted result is an automation-prepared research artifact, not a final freedom-to-operate opinion.`}
}

async function automatePatentability(sql,userId,matterId,plan,step){
  const inputs=await matterInputs(sql,userId,matterId),sourceRoles=partitionFtoSources(inputs.passages)
  const disclosure=sourceRoles.productPassages[0]
  if(!disclosure)throw new Error('Upload an invention disclosure or technical specification before assessing patentability')
  const disclosurePassages=sourceRoles.productPassages.filter(item=>item.source_id===disclosure.source_id),summary=clean(disclosurePassages.map(item=>item.content).join('\n'))
  const extracted=productFeatures(disclosurePassages)
  if(!extracted.length)throw new Error('No technical inventive features could be extracted from the selected invention disclosure')
  const concepts=extracted.map(item=>item.text).slice(0,12),canonicalIdentifier=`DISCLOSURE:${disclosure.source_id}`
  let[proposal]=await sql`SELECT id FROM ip_entities WHERE user_id=${userId} AND matter_id=${matterId} AND entity_type='patent' AND canonical_identifier=${canonicalIdentifier} ORDER BY created_at DESC LIMIT 1`
  const claimsText=`1. A proposed ${disclosure.source_title||'invention'} system comprising: ${concepts.join('; and ')}.`
  const parsed=await runIpSpecialist(sql,userId,{action:'parse_patent_claims',matter_id:matterId,patent_entity_id:proposal?.id,publication_number:proposal?null:canonicalIdentifier,jurisdiction:plan.jurisdiction,title:`Research claim — ${disclosure.source_title||'invention disclosure'}`,claims_text:claimsText})
  const claim=parsed.claims.find(item=>item.claim_type==='independent')||parsed.claims[0]
  proposal={id:parsed.patent_entity_id}
  await sql`UPDATE ip_entities SET data=data||${JSON.stringify({research_claim:true,not_filed:true,source_id:disclosure.source_id,source_title:disclosure.source_title})}::jsonb,source_status='inferred' WHERE id=${proposal.id}`
  const dateMatch=summary.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i),months={january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'},criticalDate=dateMatch?`${dateMatch[3]}-${months[dateMatch[2].toLowerCase()]}-${dateMatch[1].padStart(2,'0')}`:null
  const project=await createPriorArtProject(sql,userId,{matter_id:matterId,patent_entity_id:proposal.id,claim_id:claim.id,jurisdiction:plan.jurisdiction,critical_date:criticalDate,invention_summary:summary,inventive_concepts:concepts,title:`Automated patentability — ${disclosure.source_title}`})
  await step('extract_invention','document-ingestion','completed',{source_id:disclosure.source_id,source_title:disclosure.source_title,concepts:concepts.length,public_disclosure_date:criticalDate},'uploaded_document')
  await step('prepare_prior_art','prior-art-service','completed',{project_id:project.project.id,strategies:project.strategies.length,research_claim:claim.claim_number,not_filed:true},'matter_sources')
  await step('official_search','official-search-service','skipped',{reason:'No completed authorised official search run was available'},'none')
  const dateWarning=criticalDate?`A public-disclosure date of ${criticalDate} was extracted; its jurisdiction-specific legal effect requires review.`:'No reliable public-disclosure date was extracted.'
  return{title:`Patentability assessment — ${disclosure.source_title}`,type:'patentability_report',jurisdiction:plan.jurisdiction,summary:`Sally extracted ${concepts.length} inventive concepts from ${disclosure.source_title}, generated a non-filed research claim, and prepared ${project.strategies.length} prior-art strategies.`,warnings:['Official prior-art search unavailable; novelty and inventive-step engines were not falsely marked complete.',dateWarning],links:{prior_art_project_id:project.project.id},sources:disclosurePassages.map(item=>({passage_id:item.id,title:item.source_title,locator:item.locator})),content:`# Preliminary patentability assessment\n\n## Source-bound invention\n- Source: **${disclosure.source_title}**\n- Proposed research claim: **Claim ${claim.claim_number} — not filed, not an existing patent claim**\n- Inventive concepts extracted: **${concepts.length}**\n- Search strategies prepared: **${project.strategies.length}**\n- Public-disclosure date found: **${criticalDate||'none'}**\n\n## Safeguards\nThe research claim was generated only to structure searching. It is not represented as a filed claim. No unrelated stored patent claim was selected.\n\n## Incomplete\nNo authorised official search result is available, so Sally has not fabricated references or produced a false novelty or inventive-step conclusion.`}
}

async function automateTrademark(sql,userId,matterId,plan,step){
  if(!plan.mark)throw new Error('State the mark in uppercase, for example: Clear NOVARA in the EU for SaaS')
  const nice=/saas/i.test(plan.goods||plan.instruction)?[9,42]:[],project=await createClearanceProject(sql,userId,{matter_id:matterId,mark:plan.mark,jurisdictions:[plan.jurisdiction||'EU'],nice_classes:nice,goods_services:plan.goods||plan.instruction})
  const screened=await screenMatterTrademarks(sql,userId,project.project.id)
  await step('prepare_clearance','trademark-clearance-service','completed',{project_id:screened.project.id,mark:plan.mark,nice_classes:nice},'matter_graph')
  await step('official_registry','official-search-service','skipped',{reason:'No completed authorised EUIPO search run was available'},'none')
  return{title:`${plan.mark} trademark clearance`,type:'trademark_clearance_report',jurisdiction:plan.jurisdiction||'EU',summary:`Sally created the clearance scope, suggested Nice classes ${nice.join(', ')||'pending'}, and screened ${screened.candidates.length} matter candidates.`,warnings:['Official registry, common-law, company-name, domain, social and marketplace channels remain incomplete.'],links:{clearance_project_id:screened.project.id},content:`# Preliminary trademark clearance — ${plan.mark}\n\n- Jurisdiction: ${plan.jurisdiction||'EU'}\n- Goods/services: ${plan.goods||plan.instruction}\n- Suggested Nice classes: ${nice.join(', ')||'Requires review'}\n- Matter candidates screened: ${screened.candidates.length}\n\nExternal clearance channels remain clearly recorded as research gaps.`}
}

async function automatePatentDraft(sql,userId,matterId,plan,step){
  const instruction=plan.instruction||'',attorneyPersona=detectAttorneyPersona(instruction),posture=detectFilingPosture(instruction)
  await step('classify_posture','patent-draft-service','completed',{posture:posture.posture,attorney_persona:attorneyPersona,corrections:posture.corrections.length},'instruction')
  let features=[],sources=[],grounded=false
  if(matterId){
    const inputs=await matterInputs(sql,userId,matterId),roles=partitionFtoSources(inputs.passages)
    const pool=roles.productPassages.length?roles.productPassages:inputs.passages
    features=productFeatures(pool).slice(0,10).map(item=>item.text)
    sources=pool.slice(0,8).map(item=>({passage_id:item.id,title:item.source_title,locator:item.locator}))
    grounded=features.length>0
    await step('extract_invention','document-ingestion','completed',{features:features.length,passages:inputs.passages.length},grounded?'uploaded_document':'none')
  }
  if(!features.length)features=extractDraftFeatures(instruction.replace(/^.*?invention for\s+/i,'').slice(0,2000))
  const section101=screenSection101(instruction+(grounded?'':'')+features.join(' '))
  await step('screen_subject_matter','patent-draft-service',section101?'needs_review':'completed',{software_signals:Boolean(section101)},'instruction')
  const gaps=[]
  if(!grounded)gaps.push('Upload an invention disclosure and run intake + prior-art search before relying on any claim scope.')
  if(posture.posture==='unresolved')gaps.push('Confirm provisional (§ 111(b)) vs nonprovisional (§ 111(a)) filing posture.')
  if(section101)gaps.push('Obtain § 101 subject-matter clearance from a registered practitioner (software-implemented subject matter).')
  gaps.push('Supply drawings with Figure references; a filing without drawings is incomplete where needed to understand the invention.')
  gaps.push('Map every claim limitation to literal § 112 support in Section 5 before filing.')
  const draftTitle=title(instruction.match(/invention for\s+(.+?)(?:\.|that uses|using)/i)?.[1]||'AI-prepared patent draft scaffold')
  const content=buildDraftScaffold({title:draftTitle,posture:posture.posture,corrections:posture.corrections,attorneyPersona,section101,features,gaps})
  await step('assemble_scaffold','patent-draft-service','needs_review',{sections:7,claims:2+Math.min(5,Math.max(0,features.length-1)),gaps:gaps.length},grounded?'matter_sources':'none')
  const warnings=['AI-prepared scaffold only: not filed, not legal advice, not attorney work product.',...posture.corrections]
  if(section101)warnings.push('§ 101 subject-matter risk flagged for software-implemented subject matter.')
  if(!grounded)warnings.push('Drafted from the instruction text alone; no uploaded invention disclosure was available.')
  return{title:`Patent draft scaffold — ${draftTitle}`,type:'patent_draft',jurisdiction:plan.jurisdiction||'US',summary:`Sally prepared a 7-section ${posture.posture} draft scaffold with ${gaps.length} inventor gaps requiring closure${attorneyPersona?' (attorney persona declined)':''}.`,warnings,links:matterId?{matter_id:matterId}:{},sources,content}
}

async function automateEvidence(sql,userId,matterId,plan,step){const result=await proposeChronologyFromSources(sql,userId,{matter_id:matterId});await step('extract_chronology','litigation-evidence-service','needs_review',{events:result.events.length,passages:result.passages.length},'uploaded_document');return{title:'Automated evidence chronology',type:'litigation_chronology',jurisdiction:plan.jurisdiction,summary:`Sally parsed matter evidence and prepared ${result.events.length} chronology candidates for review.`,warnings:result.events.length?[]:['No dated passages were detected.'],links:{matter_id:matterId},content:`# Evidence chronology candidate\n\n- Source passages processed: ${result.passages.length}\n- Dated event candidates: ${result.events.length}\n\nEvents remain proposed until lawyer review.`}}

export async function runAutomatedLegalWorkflow(sql,userId,{matterId,conversationId,instruction,matterJurisdictions=[]}){
  const plan=planLegalTask(instruction,{matterJurisdictions});if(!plan.workflow_type)return null
  const[matter]=matterId?await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`:[]
  if(!matter&&plan.workflow_type!=='patent_drafting')throw new Error('Select a matter before running an automated legal workflow')
  const matterKey=matter?.id||null
  const[run]=await sql`INSERT INTO legal_workflow_runs(user_id,matter_id,conversation_id,workflow_type,instruction) VALUES(${userId},${matterKey},${conversationId||null},${plan.workflow_type},${instruction}) RETURNING id`,steps=[]
  const step=async(key,service,status,details,basis)=>{const item={ordinal:steps.length+1,key,service,status,details,source_basis:basis};steps.push(item);await recordStep(sql,run.id,item.ordinal,key,service,status,details,basis)}
  try{let result;if(plan.workflow_type==='invention_intake')result=await automateInventionIntake(sql,userId,matterKey,plan,step);else if(plan.workflow_type==='claim_chart')result=await automateClaimChart(sql,userId,matterKey,plan,step);else if(plan.workflow_type==='fto')result=await automateFto(sql,userId,matterKey,plan,step);else if(plan.workflow_type==='patentability')result=await automatePatentability(sql,userId,matterKey,plan,step);else if(plan.workflow_type==='trademark_clearance')result=await automateTrademark(sql,userId,matterKey,plan,step);else if(plan.workflow_type==='patent_drafting')result=await automatePatentDraft(sql,userId,matterKey,plan,step);else result=await automateEvidence(sql,userId,matterKey,plan,step);const artifactId=await createArtifact(sql,userId,conversationId,result);const status=result.warnings.length?'partial':'completed';await sql`UPDATE legal_workflow_runs SET status=${status},result_summary=${result.summary},warnings=${JSON.stringify(result.warnings)}::jsonb,generated_artifact_id=${artifactId},verification_status=${result.warnings.length?'qualified':'prepared'},completed_at=now() WHERE id=${run.id}`;return{run_id:run.id,status,plan,steps,artifact_id:artifactId,...result}}
  catch(error){await recordStep(sql,run.id,steps.length+1,'workflow_failure','workflow-orchestrator','failed',{},'none',error.message);await sql`UPDATE legal_workflow_runs SET status='failed',failed_steps=${JSON.stringify([{step:steps.length+1,error:error.message}])}::jsonb,result_summary=${error.message},completed_at=now() WHERE id=${run.id}`;throw error}
}
