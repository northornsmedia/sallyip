import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:{message:'Method not allowed'}})
  const sql=neon(process.env.DATABASE_URL)
  try{const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}});const id=req.query?.id;if(!id)return res.status(400).json({error:{message:'File id is required'}});const [file]=await sql`SELECT filename,mime_type,size_bytes,content FROM generated_files WHERE id=${id} AND user_id=${user.id} LIMIT 1`;if(!file)return res.status(404).json({error:{message:'File not found'}});res.setHeader('Content-Type',file.mime_type);res.setHeader('Content-Length',String(file.size_bytes));res.setHeader('Content-Disposition',`attachment; filename="${file.filename.replace(/["\r\n]/g,'_')}"`);return res.status(200).send(Buffer.from(file.content))}catch(error){return res.status(500).json({error:{message:'Could not download this file'}})}
}
