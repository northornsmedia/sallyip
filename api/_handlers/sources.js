import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {getPassage} from '../../src/lib/passage-service.js'
import {logSecurityEvent} from '../../src/lib/security.js'

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    if(req.method==='GET'){
      if(!req.query?.passage_id)return res.status(400).json({error:{message:'passage_id is required'}})
      await logSecurityEvent(sql,{userId:user.id,event_type:'source_passage_read',req,action:'read',resource:'source_passage',resource_id:req.query.passage_id,result:'ok',severity:'info'}).catch(()=>{});
      return res.status(200).json(await getPassage(sql,user.id,req.query.passage_id))
    }
    if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
    const body=req.body||{};const [matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${user.id}`;if(!matter)return res.status(404).json({error:{message:'Matter not found'}})
    const [source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,official_url,issuing_body,authority_status,retrieval_method) VALUES(${user.id},${matter.id},${body.title},${body.source_type||'document'},${Math.min(5,Math.max(1,Number(body.authority_tier)||5))},${body.jurisdiction||null},${body.citation||null},${body.official_url||null},${body.issuing_body||null},${body.authority_status||'unknown'},${body.retrieval_method||'uploaded'}) RETURNING *`
    const passages=[];for(const item of (Array.isArray(body.passages)?body.passages:[]).slice(0,500)){if(!String(item.content||'').trim())continue;const [passage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},${item.locator_type||'paragraph'},${String(item.locator||'unknown')},${String(item.content).slice(0,20000)}) RETURNING *`;passages.push(passage)}
    await logSecurityEvent(sql,{userId:user.id,event_type:'source_create',req,matter_id:matter.id,action:'create',resource:'legal_source',resource_id:source.id,result:'ok',severity:'info',metadata:{source_type:body.source_type||'document',passage_count:passages.length}}).catch(()=>{});
    return res.status(201).json({source,passages})
  }catch(error){
    if(error.message==='Source passage not found')return res.status(404).json({error:{message:error.message}})
    return res.status(500).json({error:{message:'Source ingestion failed'}})
  }
}
