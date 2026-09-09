import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, finalizeVerifiedAnswer, buildPropositionEvidenceGraph } from '../src/lib/verification-service.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Test', ARRAY['US']) RETURNING id`;
const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.', { limit: 6, minOverlap: 0, packCodes: ['US'] });
await sql`DELETE FROM matters WHERE id=${matter.id}`;

const raw = '"process, machine, manufacture, or composition of matter" [S1]';
const res = finalizeVerifiedAnswer(raw, evidence, { requires_primary_sources: true }, { highRisk: true });
console.log('FINAL ANSWER:\n', res.answer);
console.log('STATS:\n', res.guard.stats);

// Test classification logic
const cleanGuarded = res.answer.replace(/^>.*$/gm, '').trim();
const isPureRefusal = cleanGuarded === 'This legal query cannot be answered with sufficient certainty from verified primary legal authorities.' || cleanGuarded.length === 0;
console.log('Clean guarded:', cleanGuarded);
console.log('isPureRefusal:', isPureRefusal);
