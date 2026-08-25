import {createHash, randomBytes, timingSafeEqual} from 'node:crypto'
import {neon} from '@neondatabase/serverless'

const COOKIE='brain_admin'
const TTL_MS=8*3600*1000 // 8-hour admin session

const sha256=value=>createHash('sha256').update(value).digest('hex')

function safeEqual(a,b){
  const bufA=Buffer.from(String(a)),bufB=Buffer.from(String(b))
  return bufA.length===bufB.length&&timingSafeEqual(bufA,bufB)
}

export function checkAdminCredentials(env,username,password){
  const expectedUser=env.BRAIN_ADMIN_USERNAME||'admin'
  const expectedPass=env.BRAIN_ADMIN_PASSWORD
  if(!expectedPass)return false
  if(!safeEqual(sha256(username),sha256(expectedUser)))return false
  return safeEqual(sha256(password),sha256(expectedPass))
}

export async function createAdminSession(databaseUrl,username){
  const token=randomBytes(32).toString('base64url')
  const sql=neon(databaseUrl)
  await sql`INSERT INTO brain_state (key,value) VALUES (${`admin_session:${sha256(token)}`},${JSON.stringify({username,expires_at:new Date(Date.now()+TTL_MS).toISOString()})}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`
  return{token,cookie:`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_MS/1000}`}
}

export function adminCookieHeader(cookieHeader){
  return Object.fromEntries((cookieHeader||'').split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(v=>v.length===2))[COOKIE]||null
}

export async function verifyAdminSession(databaseUrl,cookieHeader){
  const token=adminCookieHeader(cookieHeader)
  if(!token)return null
  try{
    const sql=neon(databaseUrl)
    const [row]=await sql`SELECT value FROM brain_state WHERE key=${`admin_session:${sha256(token)}`}`
    const session=row?.value
    if(!session||new Date(session.expires_at)<new Date())return null
    return session
  }catch{return null}
}

export async function destroyAdminSession(databaseUrl,cookieHeader){
  const token=adminCookieHeader(cookieHeader)
  if(!token)return
  try{
    const sql=neon(databaseUrl)
    await sql`DELETE FROM brain_state WHERE key=${`admin_session:${sha256(token)}`}`
  }catch{}
}

export const clearAdminCookie=`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`

// ---- Brain observatory queries for the /accessadmin visualizer ----

export async function brainOverview(databaseUrl){
  const sql=neon(databaseUrl)
  const [totals]=await sql`SELECT count(*)::int total_requests,coalesce(round(avg(total_latency_ms)),0)::int avg_latency_ms,coalesce(sum((rescue_used)::int),0)::int rescues,coalesce(round(avg(engines_completed::float/nullif(engines_requested,0))*100),0)::int engine_success_pct FROM brain_wire_traces WHERE created_at>now()-interval '24 hours'`
  const engines=await sql`SELECT engine_slug,base_weight,coalesce(round((0.55+0.45*(successes::float/nullif(successes+failures,0)))*(case when successes+failures>0 then greatest(500,latency_sum_ms/(successes+failures)) else 4000 end)/4000.0*base_weight)::numeric(10,2)::float,base_weight::float) adaptive_weight,successes,failures,fast_fails,timeouts,latency_sum_ms,tokens_generated,last_success_at,last_failure_at FROM brain_engine_stats ORDER BY base_weight DESC`
  const recentTraces=await sql`SELECT id,created_at,conversation_id,task_class,prompt_excerpt,answer_excerpt,total_latency_ms,engines_completed,engines_requested,primary_engine,rescue_used,events FROM brain_wire_traces ORDER BY created_at DESC LIMIT 25`
  const [activity]=await sql`SELECT count(*)::int events_last_hour FROM brain_events WHERE created_at>now()-interval '1 hour'`
  return{totals,engines,recent_traces:recentTraces,activity}
}

export async function brainTrace(databaseUrl,id){
  const sql=neon(databaseUrl)
  const [trace]=await sql`SELECT * FROM brain_wire_traces WHERE id=${id}`
  return trace||null
}
