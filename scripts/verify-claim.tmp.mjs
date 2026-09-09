import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const b = await sql`SELECT id, name, created_at FROM patentbench_runs ORDER BY created_at DESC LIMIT 8`;
console.log('BENCH:' + JSON.stringify(b.map(r => r.id.slice(0, 8) + '|' + r.name)));
const e = await sql`SELECT id, name, created_at FROM eval_runs ORDER BY created_at DESC LIMIT 8`;
console.log('EVAL:' + JSON.stringify(e.map(r => r.id.slice(0, 8) + '|' + r.name)));
const target = await sql`SELECT id FROM patentbench_runs WHERE id='f8dfe146-4400-49b9-a206-72c8607622d3'`;
console.log('CLAIMED_RUN_EXISTS:' + (target.length > 0));
