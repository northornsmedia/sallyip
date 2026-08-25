import {neon} from '@neondatabase/serverless'
import {getSessionUser} from '../src/lib/auth.js'
import {providerStatus} from '../src/lib/official-search-service.js'
import {runOfficialSearch} from '../src/lib/official-search-persistence.js'

export default async function handler(req,res){const sql=neon(process.env.DATABASE_URL);try{const user=await getSessionUser(sql,req.headers.cookie);if(!user)return res.status(401).json({error:{message:'Not authenticated'}});if(req.method==='GET')return res.status(200).json({providers:providerStatus(process.env)});if(req.method!=='POST')return res.status(405).json({error:{message:'Method not allowed'}});try{return res.status(200).json(await runOfficialSearch(sql,user.id,req.body||{},process.env))}catch(error){return res.status(error.code==='PROVIDER_NOT_CONFIGURED'?503:error.code?.startsWith('INVALID')||error.code==='MATTER_NOT_FOUND'?400:502).json({error:{code:error.code||'SEARCH_FAILED',message:error.message},search_run_id:error.searchRunId})}}catch(error){return res.status(500).json({error:{message:'Official search is temporarily unavailable'}})}}
