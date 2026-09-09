import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie);
    if(!user)return res.status(401).json({error:{message:'Not authenticated'}});
    const id=req.query?.id;
    if(!id){
      if(req.method==='GET'){
        const files=await sql`SELECT id,filename,format,mime_type,size_bytes,artifact_id,artifact_version,conversation_id,created_at FROM generated_files WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 200`;
        return res.status(200).json({files:files.map(f=>({id:f.id,name:f.filename,filename:f.filename,format:f.format,mime_type:f.mime_type,size:f.size_bytes,size_bytes:f.size_bytes,artifact_id:f.artifact_id,artifact_version:f.artifact_version,conversation_id:f.conversation_id,created_at:f.created_at,url:`/api/generated-files?id=${f.id}`}))});
      }
      return res.status(400).json({error:{message:'File id is required'}});
    }
    if(req.method==='DELETE'){
      await sql`DELETE FROM generated_files WHERE id=${id} AND user_id=${user.id}`;
      return res.status(200).json({success:true});
    }
    if(req.method!=='GET')return res.status(405).json({error:{message:'Method not allowed'}});
    const [file]=await sql`SELECT filename,mime_type,size_bytes,content FROM generated_files WHERE id=${id} AND user_id=${user.id} LIMIT 1`;
    if(!file)return res.status(404).json({error:{message:'File not found'}});
    res.setHeader('Content-Type',file.mime_type);
    res.setHeader('Content-Length',String(file.size_bytes));
    res.setHeader('Content-Disposition',`attachment; filename="${file.filename.replace(/["\r\n]/g,'_')}"`);
    return res.status(200).send(Buffer.from(file.content))
  }catch(error){
    return res.status(500).json({error:{message:'File operation failed'}})
  }
}
