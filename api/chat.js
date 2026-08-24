import {orchestrateSally} from '../src/lib/sally-orchestrator.js'
import {recordSallyTelemetry} from '../src/lib/sally-telemetry.js'
import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../src/lib/auth.js'

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
  try{
    const sql=neon(process.env.DATABASE_URL)
    const user=await getSessionUser(sql,req.headers.cookie)
    if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    const result=await orchestrateSally(req.body?.messages||[],process.env,`https://${req.headers.host}`)
    await recordSallyTelemetry(process.env.DATABASE_URL,result.meta).catch(()=>{})
    return res.status(200).json({id:`sally-${Date.now()}`,object:'chat.completion',model:'sallyip/4.1-pro',choices:[{index:0,message:{role:'assistant',content:result.answer},finish_reason:'stop'}],sally_meta:result.meta})
  }catch(error){return res.status(503).json({error:{message:error.message}})}
}
