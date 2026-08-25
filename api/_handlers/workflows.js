import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {runAutomatedLegalWorkflow} from '../../src/lib/workflow-orchestrator.js'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  try{const sql=neon(process.env.DATABASE_URL),user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}});const body=req.body||{},result=await runAutomatedLegalWorkflow(sql,user.id,{matterId:body.matter_id,conversationId:body.conversation_id,instruction:body.instruction,matterJurisdictions:body.matter_jurisdictions||[]});return res.status(result?200:422).json(result||{error:{message:'No automated Phase 1 workflow matched this instruction'}})}catch(error){return res.status(400).json({error:{message:error.message||'Automated workflow failed'}})}
}
