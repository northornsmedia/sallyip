import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../../src/lib/auth.js'
import {runAutomatedLegalWorkflow} from '../../src/lib/workflow-orchestrator.js'
import {logSecurityEvent} from '../../src/lib/security.js'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  try{
    const sql=neon(process.env.DATABASE_URL),user=await getSessionUser(sql,req.headers.cookie);
    if(!user)return res.status(401).json({error:{message:'Not authenticated'}});
    const body=req.body||{},result=await runAutomatedLegalWorkflow(sql,user.id,{matterId:body.matter_id,conversationId:body.conversation_id,instruction:body.instruction,matterJurisdictions:body.matter_jurisdictions||[]});
    await logSecurityEvent(sql,{userId:user.id,event_type:'workflow_execute',req,matter_id:body.matter_id,action:'execute',resource:'workflow',result:result?'ok':'no_match',severity:'info',metadata:{workflow_type:result?.workflow_type||'none'}}).catch(()=>{});
    return res.status(result?200:422).json(result||{error:{message:'No automated Phase 1 workflow matched this instruction'}})
  }catch(error){
    await logSecurityEvent(sql,{userId:user.id,event_type:'workflow_execute_failed',req,matter_id:error?.matter_id||null,action:'execute',resource:'workflow',result:'error',severity:'error',metadata:{error:String(error?.message||error)}}).catch(()=>{});
    return res.status(400).json({error:{message:error.message||'Automated workflow failed'}})
  }
}
}
