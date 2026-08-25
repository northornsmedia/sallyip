const DEFAULT_MODEL='liquid/lfm-2.5-embedding-350m:free'

async function embedBatch(input,key,model){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000)
  try{const response=await fetch('https://openrouter.ai/api/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':'https://sallyip.com','X-Title':'SallyIP Labs'},body:JSON.stringify({model:model||DEFAULT_MODEL,input,encoding_format:'float'}),signal:controller.signal});if(!response.ok)throw new Error(`Embedding provider returned ${response.status}`);return(await response.json()).data||[]}finally{clearTimeout(timer)}
}

export async function embedKnowledgeSource(sql,sourceId,key,model=DEFAULT_MODEL,{maxChunks=128}={}){
  if(!key)return{embedded:0,status:'not_configured'}
  const chunks=await sql`SELECT id,content FROM knowledge_chunks WHERE source_id=${sourceId} AND embedding IS NULL ORDER BY chunk_index LIMIT ${maxChunks}`
  let embedded=0
  for(let offset=0;offset<chunks.length;offset+=16){const batch=chunks.slice(offset,offset+16),vectors=await embedBatch(batch.map(item=>item.content.slice(0,7000)),key,model);for(let index=0;index<batch.length;index++){const vector=vectors[index]?.embedding;if(!Array.isArray(vector)||vector.length!==1024)continue;const serialized=`[${vector.map(value=>Number(value)||0).join(',')}]`;await sql`UPDATE knowledge_chunks SET embedding=${serialized}::vector,embedding_model=${model} WHERE id=${batch[index].id}`;embedded++}}
  return{embedded,status:embedded===chunks.length?'complete':'partial'}
}
