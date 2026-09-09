import {resolveJurisdiction} from './jurisdiction-registry.js'

export const WORKFLOW_TYPES=[
  'invention_intake','patent_dispute','document_review','official_search','verification_desk',
  'trademark_intelligence','trademark_similarity','trademark_clearance','prosecution_history','patent_family',
  'novelty','inventive_step','prior_art','fto','claim_chart','patentability','evidence_chronology',
  'copyright_analysis','ip_transaction','patent_drafting'
]

const TASK_CLASS={
  invention_intake:'INVENTION_INTAKE',
  patent_dispute:'PATENT_DISPUTE',
  document_review:'DOCUMENT_REVIEW',
  official_search:'OFFICIAL_SEARCH',
  verification_desk:'VERIFICATION_DESK',
  trademark_intelligence:'TRADEMARK_INTELLIGENCE',
  trademark_similarity:'TRADEMARK_SIMILARITY',
  trademark_clearance:'TRADEMARK_CLEARANCE',
  prosecution_history:'PATENT_PROSECUTION',
  patent_family:'PATENT_FAMILY',
  novelty:'PATENT_NOVELTY',
  inventive_step:'PATENT_INVENTIVE_STEP',
  prior_art:'PATENT_PRIOR_ART',
  fto:'PATENT_FTO',
  claim_chart:'PATENT_CLAIM_CHART',
  patentability:'PATENT_PATENTABILITY',
  evidence_chronology:'IP_LITIGATION',
  copyright_analysis:'COPYRIGHT_ANALYSIS',
  ip_transaction:'IP_TRANSACTION',
  patent_drafting:'PATENT_DRAFTING'
}

const matchers=[
  {type:'invention_intake',test:text=>/\b(intake analysis|document type|invention summary|key technical elements|novelty signals|red flags|open questions)\b/.test(text)||/do(?:n't| not) draft claims/.test(text)},
  {type:'patent_dispute',test:text=>/\b(file\s+(?:a\s+)?dispute|patent\s+dispute|revocation|invalidity|post.?grant|inter\s+partes|ipr|epo\s+opposition|opposition\s+(?:to|against)\s+(?:the\s+)?patent|challenge\s+(?:this\s+)?patent)\b/.test(text)||(/\b(opposition|opposition\s+paper)\b/.test(text)&&/\b(patent|claim|granted|ep|us|in)\b/.test(text))},
  {type:'document_review',test:text=>/\b(review (?:this|the|uploaded|my)|summari[sz]e (?:this|the|uploaded|my)|what did (?:you|sally) find|analy[sz]e (?:this|the) (?:document|pdf|file|patent)|read (?:this|the) (?:document|pdf|file))\b/.test(text)},
  {type:'official_search',test:text=>/\b(epo\s+ops|euipo|official (?:patent|trademark|registry) search|search epo|search uspto|live patent search|run (?:an )?official search)\b/.test(text)||(/\bsearch\b/.test(text)&&/\b(epo|euipo|patent office|trademark registry)\b/.test(text))},
  {type:'verification_desk',test:text=>/\b(verification desk|verify (?:this|that|the)|fact.?check|proposition verification|check (?:this|that) (?:proposition|statement|claim))\b/.test(text)},
  {type:'trademark_intelligence',test:text=>/\b(translate|translation|transliterat(?:e|ion)|phonetic equivalent|conceptual equivalent|multilingual mark|classif(?:y|ication) (?:the |these )?goods|goods (?:and|&) services wording|nice classification|office.accepted wording)\b/.test(text)},
  {type:'trademark_similarity',test:text=>/\b(compare|similarity|likelihood of confusion)\b/.test(text)&&/\b(mark|trademark|brand)\b/.test(text)},
  {type:'trademark_clearance',test:text=>/\b(clear|clearance|available|conflict)\b/.test(text)&&/\b(mark|trademark|brand|saas|goods|services)\b/.test(text)},
  {type:'prosecution_history',test:text=>/\b(prosecution history|file wrapper|office action timeline|claim amendment history|prosecution review)\b/.test(text)},
  {type:'patent_family',test:text=>/\b(patent family|family member|priority chain|continuation|divisional|national phase)\b/.test(text)},
  {type:'novelty',test:text=>/\b(novelty|anticipat(?:e|ed|ion)|single.reference|article 54|35 u\.s\.c\. §?\s*102)\b/.test(text)},
  {type:'inventive_step',test:text=>/\b(inventive step|obviousness|problem.solution|pozzo(?:li)?|graham|ksr|could.would)\b/.test(text)},
  {type:'prior_art',test:text=>/\b(prior art search|search prior art|find prior art|prior-art project)\b/.test(text)},
  {type:'fto',test:text=>/\b(fto|freedom[- ]to[- ]operate)\b/.test(text)},
  {type:'claim_chart',test:text=>/\b(claim chart|infringement chart|map claim|element.?by.?element)\b/.test(text)||(/\b(infring(e|ement))\b/.test(text)&&/\b(claim|product|feature)\b/.test(text))},
  {type:'patent_drafting',test:text=>/\b(draft|write|prepare)\b/.test(text)&&/\bpatent\b/.test(text)&&!/\b(licen[cs]e|assignment|nda|agreement|transaction|due diligence|chain of title|dispute|opposition|family)\b/.test(text)},
  {type:'patentability',test:text=>/\b(patentab\w*|assess patentability|can we patent)\b/.test(text)},
  {type:'evidence_chronology',test:text=>/\b(chronology|timeline|evidence matrix|litigation evidence|dispute matrix)\b/.test(text)},
  {type:'copyright_analysis',test:text=>/\b(copyright|authorship|fair use|fair dealing)\b/.test(text)},
  {type:'ip_transaction',test:text=>/\b(licen[cs]e agreement|assignment agreement|nda|due diligence|chain of title|draft (?:a |an )?(?:license|licence|assignment|nda))\b/.test(text)}
]

export function planLegalTask(instruction,{matterJurisdictions=[]}={}){
  const text=String(instruction||'').trim(),lower=text.toLowerCase()
  const matched=matchers.find(rule=>rule.test(lower))
  const workflow_type=matched?.type||null
  const explicit=resolveJurisdiction(text)?.name
  const jurisdiction=explicit||matterJurisdictions[0]||null
  const mark=text.match(/(?:clear|check whether|clearance for|compare)\s+["“']?([A-Z][A-Z0-9-]{2,})["”']?/i)?.[1]||text.match(/\bmark\s+["“']?([A-Z][A-Z0-9-]{2,})["”']?/i)?.[1]||null
  const product=text.match(/(?:for|of)\s+([A-Z][\w.-]*(?:\s+[A-Z][\w.-]*){0,4})\s+(?:in|against|under)\b/i)?.[1]||null
  const goods=/\bsaas\b/i.test(text)?'Software as a service (SaaS); hosted software platforms':null
  const query=text.match(/\b(?:search|query)\s*[:\-]?\s*(.+)$/i)?.[1]?.trim()||text.match(/\b(?:ti|pa|in)=.+$/i)?.[0]||null
  const requires_matter=Boolean(workflow_type&&workflow_type!=='copyright_analysis'&&workflow_type!=='ip_transaction'&&workflow_type!=='patent_drafting')
  const requires_clarification=Boolean(workflow_type&&['fto','claim_chart','trademark_clearance','official_search'].includes(workflow_type)&&((workflow_type==='trademark_clearance'&&!mark)||(workflow_type==='official_search'&&!query)||(['fto','claim_chart'].includes(workflow_type)&&!jurisdiction))||(workflow_type==='patent_drafting'&&text.length<80))
  const fallback_hint=workflow_type?null:'Ask about patents, trademarks, copyright, transactions, litigation evidence, or upload a document and tell Sally what to do.'
  return{
    workflow_type,
    task_class:workflow_type?TASK_CLASS[workflow_type]:'GENERAL_IP_RESEARCH',
    instruction:text,
    jurisdiction,
    mark,
    product,
    goods,
    query,
    requires_matter,
    requires_clarification,
    fallback_hint
  }
}

export function automationSuggestions(){
  return[
    'Upload a patent PDF, then say: file a dispute',
    'Run an FTO analysis for Product X in India',
    'Check whether NOVARA is clear for SaaS in the EU',
    'Search prior art for this invention',
    'Build the evidence chronology from uploaded documents',
    'Verify the key propositions in this matter',
    'Export the draft opposition as DOCX'
  ]
}
