import {readSallyTelemetry} from '../../src/lib/sally-telemetry.js'
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:{message:'Method not allowed'}});try{return res.status(200).json(await readSallyTelemetry(process.env.DATABASE_URL))}catch(error){return res.status(500).json({error:{message:error.message}})}}
