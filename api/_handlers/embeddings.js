import { assertEmbeddingAllowed, resolveExecutionMode } from '../../src/lib/provider-policy.js';
import { getSessionUser } from '../../src/lib/auth.js';
import { logSecurityEvent } from '../../src/lib/security.js';
import { neon } from '@neondatabase/serverless';
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  const {input,mode}=req.body||{}
  if(!(typeof input==='string'||Array.isArray(input)))return res.status(400).json({error:{message:'Input must be a string or an array of strings'}})
  if(!process.env.DATABASE_URL){
    return res.status(503).json({error:{message:'Service unavailable: database not configured',code:'NOT_CONFIGURED'}});
  }
  const sql=neon(process.env.DATABASE_URL);
  const user=await getSessionUser(sql,req.headers?.cookie||'').catch(()=>null);
  if(!user||!user.id)return res.status(401).json({error:{message:'Unauthorized',code:'UNAUTHORIZED'}});
  const executionMode = resolveExecutionMode({ mode: mode || process.env.SALLYIP_EXECUTION_MODE });
  try {
    assertEmbeddingAllowed({ model: process.env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free', mode: executionMode });
  } catch (gateError) {
    try { await logSecurityEvent(sql,{userId:user?.id||null,event_type:'provider_policy_rejection',req,action:'embeddings.request',resource:'provider',result:'blocked',severity:'warn',metadata:{mode:executionMode,code:'CONFIDENTIAL_EMBEDDING_BLOCKED'}}); } catch (logErr) { console.error('audit log failed:', logErr.message); }
    return res.status(403).json({error:{message:gateError.message,code:'CONFIDENTIAL_EMBEDDING_BLOCKED',mode:executionMode}});
  }
  if(!process.env.OPENROUTER_EMBEDDING_API_KEY){
    return res.status(503).json({error:{message:'Embedding provider not configured',code:'PROVIDER_NOT_CONFIGURED'}});
  }
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    let response;
    try{
      response=await fetch('https://openrouter.ai/api/v1/embeddings',{
        method:'POST',
        signal:controller.signal,
        headers:{Authorization:`Bearer ${process.env.OPENROUTER_EMBEDDING_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':`https://${req.headers?.host||'sallyip.com'}`,'X-Title':'SallyIP Labs'},
        body:JSON.stringify({model:process.env.SALLYIP_EMBEDDING_MODEL||'liquid/lfm-2.5-embedding-350m:free',input,encoding_format:'float'})
      });
    }finally{clearTimeout(timeout);}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      return res.status(response.status===401||response.status===403?502:response.status).json({error:{message:data?.error?.message||'Embedding provider error',code:'PROVIDER_ERROR'}});
    }
    return res.status(200).json(data)
  }catch(error){
    console.error('embeddings.request failed:',error.message);
    if(error.name==='AbortError')return res.status(504).json({error:{message:'Embedding request timed out',code:'PROVIDER_TIMEOUT'}});
    return res.status(502).json({error:{message:'Embedding provider unavailable',code:'PROVIDER_UNAVAILABLE'}});
  }
}
