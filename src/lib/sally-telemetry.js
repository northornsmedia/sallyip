import {neon} from '@neondatabase/serverless'

export async function recordSallyTelemetry(databaseUrl,meta){
  if(!databaseUrl||!meta)return
  const sql=neon(databaseUrl)
  const [request]=await sql`INSERT INTO sally_requests (engines_requested,engines_completed,embedding_dimensions,reranked,synthesis_status,total_latency_ms) VALUES (${meta.engines_requested},${meta.engines_completed},${meta.embedding_dimensions},${meta.reranked},${meta.synthesis_status},${meta.total_latency_ms}) RETURNING id`
  for(const engine of meta.engines||[])await sql`INSERT INTO sally_engine_metrics (request_id,engine_slug,orchestration_weight,status,latency_ms) VALUES (${request.id},${engine.slug},${engine.weight},${engine.status},${engine.latency_ms})`
}

export async function readSallyTelemetry(databaseUrl){
  const sql=neon(databaseUrl)
  const [summary]=await sql`SELECT count(*)::int requests,coalesce(round(avg(total_latency_ms)),0)::int avg_latency_ms,coalesce(round(100.0*avg((engines_completed>0)::int),2),0)::float availability,coalesce(round(avg(engines_completed),2),0)::float avg_engines FROM sally_requests WHERE created_at>now()-interval '24 hours'`
  const engines=await sql`SELECT engine_slug,count(*)::int calls,count(*) FILTER (WHERE status='success')::int successes,coalesce(round(100.0*avg((status='success')::int),2),0)::float availability,coalesce(round(avg(latency_ms)),0)::int avg_latency_ms,max(orchestration_weight)::int weight FROM sally_engine_metrics WHERE created_at>now()-interval '24 hours' GROUP BY engine_slug ORDER BY weight DESC`
  const timeline=await sql`WITH hours AS (SELECT generate_series(date_trunc('hour',now())-interval '23 hours',date_trunc('hour',now()),interval '1 hour') bucket) SELECT hours.bucket,to_char(hours.bucket,'HH24:MI') label,count(r.id)::int requests,coalesce(round(avg(r.total_latency_ms)),0)::int latency_ms,coalesce(round(100.0*avg((r.engines_completed>0)::int),2),0)::float availability FROM hours LEFT JOIN sally_requests r ON r.created_at>=hours.bucket AND r.created_at<hours.bucket+interval '1 hour' GROUP BY hours.bucket ORDER BY hours.bucket`
  return{summary,engines,timeline,generated_at:new Date().toISOString()}
}
