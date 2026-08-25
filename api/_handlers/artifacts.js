import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {randomUUID} from 'node:crypto'
import {validateArtifactContent} from '../../src/lib/document-tool-service.js'

const shape=(artifact,version)=>({id:artifact.id,type:'legal_document',title:artifact.title,document_type:artifact.document_type,status:artifact.status,jurisdiction:artifact.jurisdiction,practice_area:artifact.practice_area,version:version.version,content:version.content,content_format:version.content_format,metadata:version.metadata,sources:version.sources,updated_at:artifact.updated_at})

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie)
    if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    if(req.method==='GET'){
      const id=req.query?.id,conversationId=req.query?.conversation_id,requested=Number(req.query?.version||0)
      const [artifact]=id?await sql`SELECT * FROM artifacts WHERE id=${id} AND user_id=${user.id}`:await sql`SELECT a.* FROM conversations c JOIN artifacts a ON a.id=c.last_active_artifact_id WHERE c.id=${conversationId} AND c.user_id=${user.id}`
      if(!artifact)return res.status(404).json({error:{message:'Artifact not found'}})
      const target=requested||artifact.active_version
      const [version]=await sql`SELECT * FROM artifact_versions WHERE artifact_id=${artifact.id} AND version=${target}`
      return res.status(200).json({artifact:shape(artifact,version)})
    }
    if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
    const body=req.body||{},action=body.action||'create'
    let content=String(body.content||'').trim()
    if(action==='create'){
      try{content=validateArtifactContent(content)}catch(error){return res.status(400).json({error:{message:error.message}})}
      const [conversation]=await sql`SELECT id FROM conversations WHERE id=${body.conversation_id} AND user_id=${user.id}`
      if(!conversation)return res.status(404).json({error:{message:'Conversation not found'}})
      const [artifact]=await sql`INSERT INTO artifacts(id,user_id,conversation_id,title,document_type,jurisdiction,practice_area) VALUES (${body.artifact_id||randomUUID()},${user.id},${conversation.id},${String(body.title||'SallyIP document').slice(0,120)},${body.document_type||'legal_document'},${body.metadata?.jurisdiction||null},${body.metadata?.practice_area||'Intellectual Property'}) RETURNING *`
      const [version]=await sql`INSERT INTO artifact_versions(artifact_id,version,content,metadata,sources) VALUES (${artifact.id},1,${content},${JSON.stringify(body.metadata||{})}::jsonb,${JSON.stringify(body.sources||[])}::jsonb) RETURNING *`
      await sql`UPDATE conversations SET last_active_artifact_id=${artifact.id},updated_at=now() WHERE id=${conversation.id}`
      return res.status(201).json({artifact:shape(artifact,version)})
    }
    const [artifact]=await sql`SELECT * FROM artifacts WHERE id=${body.artifact_id} AND user_id=${user.id}`
    if(!artifact)return res.status(404).json({error:{message:'Artifact not found'}})
    if(action==='restore'){
      const [selected]=await sql`SELECT content FROM artifact_versions WHERE artifact_id=${artifact.id} AND version=${Number(body.version)}`
      if(!selected)return res.status(404).json({error:{message:'Artifact version not found'}})
      content=selected.content
    }
    try{content=validateArtifactContent(content)}catch(error){return res.status(400).json({error:{message:error.message}})}
    const [next]=await sql`SELECT coalesce(max(version),0)::int+1 next FROM artifact_versions WHERE artifact_id=${artifact.id}`
    const [version]=await sql`INSERT INTO artifact_versions(artifact_id,version,content,metadata,sources) VALUES (${artifact.id},${next.next},${content},${JSON.stringify(body.metadata||{})}::jsonb,${JSON.stringify(body.sources||[])}::jsonb) RETURNING *`
    const [updated]=await sql`UPDATE artifacts SET active_version=${version.version},title=${String(body.title||artifact.title).slice(0,120)},updated_at=now() WHERE id=${artifact.id} RETURNING *`
    await sql`UPDATE conversations SET last_active_artifact_id=${artifact.id},updated_at=now() WHERE id=${artifact.conversation_id}`
    return res.status(200).json({artifact:shape(updated,version)})
  }catch(error){return res.status(500).json({error:{message:'Artifact operation failed'}})}
}
