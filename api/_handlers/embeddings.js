import { assertEmbeddingAllowed, resolveExecutionMode } from '../../src/lib/provider-policy.js';
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  const {input,mode}=req.body||{}
  if(!(typeof input==='string'||Array.isArray(input)))return res.status(400).json({error:{message:'Input must be a string or an array of strings'}})
  const executionMode = resolveExecutionMode({ mode: mode || process.env.SALLYIP_EXECUTION_MODE });
  try {
    assertEmbeddingAllowed({ model: process.env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free', mode: executionMode });
  } catch (gateError) {
    return res.status(403).json({error:{message:gateError.message,code:'CONFIDENTIAL_EMBEDDING_BLOCKED',mode:executionMode}});
  }
  try{
    const response=await fetch('https://openrouter.ai/api/v1/embeddings',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENROUTER_EMBEDDING_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':`https://${req.headers.host}`,'X-Title':'SallyIP Labs'},
      body:JSON.stringify({model:process.env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free',input,encoding_format:'float'})
    })
    const data=await response.json()
    return res.status(response.status).json(data)
  }catch(error){return res.status(500).json({error:{message:error.message}})}
}
