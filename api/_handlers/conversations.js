import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {logSecurityEvent} from '../../src/lib/security.js'

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie)
    if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    if(req.method==='GET'){
      const conversations=await sql`SELECT id,title,model,matter_id,created_at,updated_at FROM conversations WHERE user_id=${user.id} ORDER BY updated_at DESC`
      const messages=conversations.length?await sql`SELECT id,conversation_id,role,content,attachments,artifact,provenance,created_at FROM messages WHERE conversation_id = ANY(${conversations.map(item=>item.id)}::uuid[]) ORDER BY created_at ASC`:[]
      await logSecurityEvent(sql,{userId:user.id,event_type:'conversations_list',req,action:'list',resource:'conversation',result:'ok',severity:'info',metadata:{count:conversations.length}}).catch(()=>{});
      return res.status(200).json(conversations.map(conversation=>({...conversation,messages:messages.filter(message=>message.conversation_id===conversation.id)})))
    }
    if(req.method==='POST'){
      const {id,title='New conversation',messages=[]}=req.body||{}
      if(!id)return res.status(400).json({error:{message:'Conversation id is required'}})
      const existing=await sql`SELECT id FROM conversations WHERE id=${id} AND user_id=${user.id}`
      if(!existing.length){
        await sql`INSERT INTO conversations (id,user_id,title) VALUES (${id},${user.id},${title})`
        await logSecurityEvent(sql,{userId:user.id,event_type:'conversation_create',req,action:'create',resource:'conversation',resource_id:id,result:'ok',severity:'info',metadata:{title}}).catch(()=>{});
      }else{
        await sql`UPDATE conversations SET title=${title},updated_at=now() WHERE id=${id} AND user_id=${user.id}`
        await logSecurityEvent(sql,{userId:user.id,event_type:'conversation_update',req,action:'update',resource:'conversation',resource_id:id,result:'ok',severity:'info',metadata:{title}}).catch(()=>{});
      }
      await sql`DELETE FROM messages WHERE conversation_id=${id}`
      for(const message of messages){if(['user','assistant','system'].includes(message.role)&&message.content)await sql`INSERT INTO messages (conversation_id,role,content,attachments,artifact,provenance) VALUES (${id},${message.role},${message.content},${JSON.stringify(Array.isArray(message.attachments)?message.attachments:[])}::jsonb,${message.artifact?JSON.stringify(message.artifact):null}::jsonb,${JSON.stringify(message.provenance||{})}::jsonb)`}
      return res.status(200).json({ok:true})
    }
    if(req.method==='DELETE'){
      const id=req.query?.id
      if(!id)return res.status(400).json({error:{message:'Conversation id is required'}})
      await sql`DELETE FROM conversations WHERE id=${id} AND user_id=${user.id}`
      await logSecurityEvent(sql,{userId:user.id,event_type:'conversation_delete',req,action:'delete',resource:'conversation',resource_id:id,result:'ok',severity:'info'}).catch(()=>{});
      return res.status(200).json({ok:true})
    }
    return res.status(405).json({error:{message:'Method not allowed'}})
  }catch(error){return res.status(500).json({error:{message:error.message}})}
}
