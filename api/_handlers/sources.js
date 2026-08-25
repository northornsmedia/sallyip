import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    const body=req.body||{};const [matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${user.id}`;if(!matter)return res.status(404).json({error:{message:'Matter not found'}})
    const [source]=await sql`INSERT INTO legal_sources(user_id,matter_id,title,source_type,authority_tier,jurisdiction,citation,official_url,issuing_body,authority_status,retrieval_method) VALUES(${user.id},${matter.id},${body.title},${body.source_type||'document'},${Math.min(5,Math.max(1,Number(body.authority_tier)||5))},${body.jurisdiction||null},${body.citation||null},${body.official_url||null},${body.issuing_body||null},${body.authority_status||'unknown'},${body.retrieval_method||'uploaded'}) RETURNING *`
    const passages=[];for(const item of (Array.isArray(body.passages)?body.passages:[]).slice(0,500)){if(!String(item.content||'').trim())continue;const [passage]=await sql`INSERT INTO source_passages(source_id,locator_type,locator,content) VALUES(${source.id},${item.locator_type||'paragraph'},${String(item.locator||'unknown')},${String(item.content).slice(0,20000)}) RETURNING *`;passages.push(passage)}
    return res.status(201).json({source,passages})
  }catch(error){return res.status(500).json({error:{message:'Source ingestion failed'}})}
}
