import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../src/lib/auth.js'
import {acceptSuggestedClaimChartRows,createClaimChart,getClaimChart,listClaimChartInputs,reviewClaimChartRow} from '../src/lib/claim-chart-service.js'

export default async function handler(req,res){
  const sql=neon(process.env.DATABASE_URL)
  try{
    const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}})
    if(req.method==='GET'){const chartId=req.query?.chart_id;return res.status(200).json(chartId?await getClaimChart(sql,user.id,chartId):await listClaimChartInputs(sql,user.id,req.query?.matter_id))}
    if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}})
    const body=req.body||{},result=body.action==='review_row'?await reviewClaimChartRow(sql,user.id,body):body.action==='accept_suggestions'?await acceptSuggestedClaimChartRows(sql,user.id,body):await createClaimChart(sql,user.id,body)
    return res.status(body.action==='review_row'||body.action==='accept_suggestions'?200:201).json(result)
  }catch(error){const known=['Matter not found','Patent claim not found','Target name is required','Claim chart not found','Claim chart row not found','Evidence passage not found','Invalid review status','No unreviewed evidence suggestions found'];return res.status(known.includes(error.message)?400:500).json({error:{message:known.includes(error.message)?error.message:'Claim chart operation failed'}})}
}
