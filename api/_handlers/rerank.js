import { assertRerankAllowed, resolveExecutionMode } from '../../src/lib/provider-policy.js';
import { getSessionUser } from '../../src/lib/auth.js';
import { logSecurityEvent } from '../../src/lib/security.js';
import { neon } from '@neondatabase/serverless';
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  const {query,documents,top_n,mode}=req.body||{}
  if(typeof query!=='string'||!query.trim())return res.status(400).json({error:{message:'Query is required'}})
  if(!Array.isArray(documents)||!documents.length)return res.status(400).json({error:{message:'Documents must be a non-empty array'}})
  const sql=neon(process.env.DATABASE_URL);
  const user=await getSessionUser(sql,req.headers.cookie).catch(()=>null);
  if(!user||!user.id)return res.status(401).json({error:{message:'Unauthorized',code:'UNAUTHORIZED'}});
  const executionMode = resolveExecutionMode({ mode: mode || process.env.SALLYIP_EXECUTION_MODE });
  try {
    assertRerankAllowed({ model: process.env.SALLYIP_RERANK_MODEL||'nvidia/llama-nemotron-rerank-vl-1b-v2:free', mode: executionMode });
  } catch (gateError) {
    try { const sql=neon(process.env.DATABASE_URL); const user=await getSessionUser(sql,req.headers.cookie).catch(()=>null); await logSecurityEvent(sql,{userId:user?.id||null,event_type:'provider_policy_rejection',req,action:'rerank.request',resource:'provider',result:'blocked',severity:'warn',metadata:{mode:executionMode,code:'CONFIDENTIAL_RERANK_BLOCKED'}}).catch(()=>{}); } catch {}
    return res.status(403).json({error:{message:gateError.message,code:'CONFIDENTIAL_RERANK_BLOCKED',mode:executionMode}});
  }
  const safeDocuments=documents.filter(document=>document&&((typeof document.text==='string'&&document.text)||(typeof document.image==='string'&&document.image))).slice(0,100)
  if(!safeDocuments.length)return res.status(400).json({error:{message:'Each document must contain text or image'}})
  try{
    const response=await fetch('https://openrouter.ai/api/v1/rerank',{
      method:'POST',
      headers:{Authorization:`Bearer ${process.env.OPENROUTER_RERANK_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':`https://${req.headers.host}`,'X-Title':'SallyIP Labs'},
      body:JSON.stringify({model:process.env.SALLYIP_RERANK_MODEL||'nvidia/llama-nemotron-rerank-vl-1b-v2:free',query,documents:safeDocuments,top_n:Math.min(Math.max(Number(top_n)||safeDocuments.length,1),safeDocuments.length)})
    })
    const data=await response.json()
    return res.status(response.status).json(data)
  }catch(error){return res.status(500).json({error:{message:error.message}})}
}
