// Full autonomous workflow demo: matter -> document ingestion -> grounded chat -> PDF export
import {readFile, writeFile} from 'node:fs/promises'
const BASE='http://localhost:5173'
let cookie=''
const api=async(path,body)=>{
  const res=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)})
  const setCookie=res.headers.getSetCookie?.()||[]
  if(setCookie.length)cookie=setCookie.map(c=>c.split(';')[0]).join('; ')
  const text=await res.text()
  try{return{status:res.status,data:JSON.parse(text)}}catch{return{status:res.status,data:text.slice(0,200)}}
}

console.log('STEP 1 — login')
const login=await api('/api/auth',{action:'login',email:'verify@sallyip.test',password:'VerifyTest2026!'})
console.log('  user:',login.data.user?.email||login.data)

console.log('STEP 2 — create matter')
const matter=await api('/api/matters',{action:'create',name:'Project Aurora — Smart Sensor FTO',client_name:'Aurora Robotics GmbH',matter_type:'fto',jurisdictions:['EP','US','IN'],description:'Freedom-to-operate review of the Aurora smart-sensor product line before EU launch.'})
console.log('  matter:',matter.data.matter?.id, matter.data.matter?.name)
const matterId=matter.data.matter.id

console.log('STEP 3 — draft + upload a technical disclosure document into the matter brain')
const doc=`AURORA SENSOR MODULE S2 — TECHNICAL DISCLOSURE (CONFIDENTIAL)

1. Overview
The Aurora S2 sensor module integrates a millimetre-wave radar array with an on-device inference core for touchless gesture control in industrial robots.

2. Key features
- 60 GHz FMCW radar with beam-forming antenna package.
- On-device neural inference at 4 TOPS, no cloud dependency.
- Adaptive calibration loop compensating for metallic enclosures.
- Power envelope under 1.8 W sustained.

3. Prior development timeline
- 2023-02: internal feasibility report on FMCW beam-forming.
- 2023-11: first bench prototype achieving 0.9 m gesture range.
- 2024-06: enclosure-integrated pilot deployed at two beta customers.
- 2025-01: production design freeze for the S2 module.

4. Jurisdictions of interest
Germany (EP), United States (US), India (IN) manufacturing partner sites.`
const docB64=Buffer.from(doc,'utf8').toString('base64')
const ingest=await api('/api/ingest-document',{matter_id:matterId,filename:'aurora-s2-disclosure.txt',data:docB64,rights_confirmed:true,authority_tier:5,source_type:'uploaded_document'})
console.log('  ingested:',ingest.status, JSON.stringify(ingest.data.source||ingest.data))

console.log('STEP 4 — grounded chat against the matter brain')
const chat=await api('/api/chat',{messages:[{role:'user',content:'Summarise the key technical features and the development timeline found in my uploaded disclosure.'}],matter_id:matterId})
const answer=chat.data.choices?.[0]?.message?.content||JSON.stringify(chat.data).slice(0,300)
console.log('  route:',chat.data.sally_meta?.route?.task_class,'| sources retrieved:',chat.data.sally_meta?.verification?.sources_retrieved)
console.log('  answer preview:',answer.slice(0,220).replace(/\n/g,' '))

console.log('STEP 5 — generate a filing-ready PDF from artifact content')
const artifactContent=`# Freedom-to-Operate Summary — Aurora S2

## Scope
Assessment covers EP, US and IN jurisdictions for the Aurora S2 mmWave gesture-sensor module.

## Key product features reviewed
- 60 GHz FMCW radar with beam-forming antenna package.
- On-device neural inference at 4 TOPS.
- Adaptive calibration for metallic enclosures.

## Development evidence
Internal disclosures dated 2023-02 through 2025-01 establish a continuous development record supporting priority arguments.

## Recommended next steps
- Commission EPO OPS and USPTO pre-filing searches per jurisdiction.
- Map reviewed claims against the three key features in the claim chart workspace.
- Re-assess after any new third-party filings surface in official searches.`
const pdf=await api('/api/generate-file',{format:'pdf',title:'FTO Summary — Aurora S2',content:artifactContent,conversation_id:null,matter_id:matterId})
if(pdf.status!==200){console.log('  PDF generation FAILED:',JSON.stringify(pdf.data).slice(0,300));process.exit(1)}
const fileRecord=pdf.data.file||pdf.data.generated_file||pdf.data
console.log('  generated file id:',fileRecord?.id,'| filename:',fileRecord?.filename||fileRecord?.file_name,'| keys:',Object.keys(pdf.data).join(','))

console.log('STEP 6 — download & validate the PDF')
const dl=await fetch(`${BASE}/api/generated-files?id=${fileRecord.id}`,{headers:{cookie}})
const bytes=Buffer.from(await dl.arrayBuffer())
const out='C:/Users/User/AppData/Local/Temp/sallyip-fto-summary.pdf'
await writeFile(out,bytes)
const header=bytes.subarray(0,5).toString()
console.log('  HTTP',dl.status,'| bytes:',bytes.length,'| magic:',header,header==='%PDF-'?'✅ VALID PDF':'❌')
console.log('  saved to:',out)
console.log('\nALL SIX STEPS COMPLETE ✅')
