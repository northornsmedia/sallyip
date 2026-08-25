import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../src/lib/auth.js'

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    const body=req.body||{}
    if(req.method==='GET'){
      const matterId=req.query?.matter_id;const [matter]=await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${user.id}`;if(!matter)return res.status(404).json({error:{message:'Matter not found'}})
      const entities=await sql`SELECT * FROM ip_entities WHERE matter_id=${matter.id} AND user_id=${user.id} ORDER BY updated_at DESC`
      const relationships=await sql`SELECT * FROM ip_relationships WHERE matter_id=${matter.id} AND user_id=${user.id} ORDER BY created_at DESC`
      return res.status(200).json({entities,relationships})
    }
    if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
    const [matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${user.id}`;if(!matter)return res.status(404).json({error:{message:'Matter not found'}})
    if((body.action||'create_entity')==='create_entity'){
      const [entity]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${user.id},${matter.id},${body.entity_type},${body.canonical_identifier||null},${body.name},${body.jurisdiction||null},${JSON.stringify(body.data||{})}::jsonb,${body.source_status||'user_supplied'}) RETURNING *`
      return res.status(201).json({entity})
    }
    const [from]=await sql`SELECT id FROM ip_entities WHERE id=${body.from_entity_id} AND matter_id=${matter.id} AND user_id=${user.id}`;const [to]=await sql`SELECT id FROM ip_entities WHERE id=${body.to_entity_id} AND matter_id=${matter.id} AND user_id=${user.id}`
    if(!from||!to)return res.status(404).json({error:{message:'Graph entity not found'}})
    const [relationship]=await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,confidence) VALUES(${user.id},${matter.id},${from.id},${body.relationship_type},${to.id},${JSON.stringify(body.data||{})}::jsonb,${body.confidence??null}) ON CONFLICT(from_entity_id,relationship_type,to_entity_id) DO UPDATE SET data=excluded.data,confidence=excluded.confidence RETURNING *`
    return res.status(201).json({relationship})
  }catch(error){return res.status(500).json({error:{message:'IP graph operation failed'}})}
}
