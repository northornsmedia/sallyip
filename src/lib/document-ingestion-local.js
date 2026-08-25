import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import path from 'node:path'

const formats={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',csv:'text/csv',md:'text/markdown',txt:'text/plain'}
const parse=payload=>new Promise((resolve,reject)=>{const child=spawn('python',['scripts/parse_legal_document.py'],{cwd:process.cwd(),windowsHide:true});let output='',error='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(output)):reject(new Error(error||'Document parser failed')));child.stdin.end(JSON.stringify(payload))})

export async function ingestDocumentLocal(sql,user,payload){
  const filename=path.basename(String(payload.filename||'')).replace(/[^A-Za-z0-9._ -]+/g,'_').slice(0,180),extension=path.extname(filename).slice(1).toLowerCase()
  if(!formats[extension])throw new Error('Supported formats: PDF, DOCX, TXT, Markdown, CSV and XLSX')
  if(payload.rights_confirmed!==true)throw new Error('Confirm that you are authorised to use this document')
  const bytes=Buffer.from(payload.data||'','base64');if(!bytes.length||bytes.length>12*1024*1024)throw new Error('Document is empty or too large')
  const [matter]=await sql`SELECT id FROM matters WHERE id=${payload.matter_id} AND user_id=${user.id}`;if(!matter)throw new Error('Select a valid matter before uploading')
  const checksum=createHash('sha256').update(bytes).digest('hex'),[duplicate]=await sql`SELECT id,legal_source_id,passage_count FROM knowledge_sources WHERE user_id=${user.id} AND matter_id=${matter.id} AND checksum_sha256=${checksum}`
  if(duplicate)return{success:true,duplicate:true,source:{id:duplicate.id,legal_source_id:duplicate.legal_source_id,name:filename,passage_count:duplicate.passage_count}}
  const parsed=await parse({extension,data:payload.data}),tier=Math.min(5,Math.max(1,Number(payload.authority_tier)||5))
  const [legalSource]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,official_url,authority_status,retrieval_method) VALUES(${user.id},${matter.id},${payload.title||filename},${payload.source_type||'uploaded_document'},${tier},${payload.jurisdiction||null},${payload.citation||null},${payload.official_url||null},'unknown','uploaded') RETURNING id`
  const [source]=await sql`INSERT INTO knowledge_sources(user_id,matter_id,legal_source_id,name,original_filename,mime_type,size_bytes,checksum_sha256,rights_confirmed,status,page_count,passage_count,access_scope) VALUES(${user.id},${matter.id},${legalSource.id},${filename},${filename},${formats[extension]},${bytes.length},${checksum},${Boolean(payload.rights_confirmed)},'ready',${parsed.page_count},${parsed.passage_count},'matter') RETURNING id`
  await sql`INSERT INTO knowledge_source_files(source_id,content) VALUES(${source.id},decode(${payload.data},'base64'))`
  for(let index=0;index<parsed.passages.length;index++){const item=parsed.passages[index],passageChecksum=createHash('sha256').update(item.content).digest('hex');await sql`INSERT INTO source_passages(source_id,locator_type,locator,content,checksum_sha256) VALUES(${legalSource.id},${item.locator_type},${item.locator},${item.content},${passageChecksum})`;await sql`INSERT INTO knowledge_chunks(source_id,chunk_index,page_from,page_to,content,token_estimate) VALUES(${source.id},${index},${item.page_from||null},${item.page_to||null},${item.content},${Math.max(1,Math.floor(item.content.length/4))})`}
  return{success:true,source:{id:source.id,legal_source_id:legalSource.id,name:filename,format:extension,size:bytes.length,page_count:parsed.page_count,passage_count:parsed.passage_count,status:'ready'}}
}
