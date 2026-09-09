import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, evidenceRecordIsComplete } from '../src/lib/verification-service.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Test', ARRAY['US']) RETURNING id`;
const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, 'Quote the exact text of 35 U.S.C. § 101', { limit: 2, minOverlap: 0, packCodes: ['US'] });
await sql`DELETE FROM matters WHERE id=${matter.id}`;

console.log('Record keys:', Object.keys(evidence[0]));
console.log('authority_tier:', evidence[0].authority_tier);
console.log('tier:', evidence[0].tier);
console.log('isComplete before fix:', evidenceRecordIsComplete(evidence[0]));
