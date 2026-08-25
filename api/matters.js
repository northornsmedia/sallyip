import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../src/lib/auth.js'
import {getMatterContext} from '../src/lib/matter-service.js'

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    if(req.method==='GET'){
      if(req.query?.id){const context=await getMatterContext(sql,user.id,req.query.id);if(!context)return res.status(404).json({error:{message:'Matter not found'}});return res.status(200).json(context)}
      const matters=await sql`SELECT id,name,client_name,matter_type,jurisdictions,description,status,created_at,updated_at FROM matters WHERE user_id=${user.id} ORDER BY updated_at DESC`
      return res.status(200).json({matters})
    }
    if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
    const body=req.body||{},action=body.action||'create'
    if(action==='create'){
      const name=String(body.name||'').trim();if(name.length<2)return res.status(400).json({error:{message:'Matter name is required'}})
      const [matter]=await sql`INSERT INTO matters(user_id,name,client_name,matter_type,jurisdictions,description) VALUES(${user.id},${name.slice(0,160)},${body.client_name||null},${body.matter_type||'general_ip'},${Array.isArray(body.jurisdictions)?body.jurisdictions:[]},${body.description||null}) RETURNING *`
      return res.status(201).json({matter})
    }
    const [matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${user.id}`;if(!matter)return res.status(404).json({error:{message:'Matter not found'}})
    if(action==='add_fact'){
      const [fact]=await sql`INSERT INTO matter_facts(matter_id,fact_type,label,value,confidence,status) VALUES(${matter.id},${body.fact_type||'fact'},${String(body.label||'Fact').slice(0,160)},${JSON.stringify(body.value??null)}::jsonb,${body.confidence??null},${body.status||'asserted'}) RETURNING *`
      await sql`UPDATE matters SET updated_at=now() WHERE id=${matter.id}`;return res.status(201).json({fact})
    }
    return res.status(400).json({error:{message:'Unknown matter action'}})
  }catch(error){return res.status(500).json({error:{message:'Matter operation failed'}})}
}
