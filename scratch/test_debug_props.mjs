import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, buildPropositionEvidenceGraph } from '../src/lib/verification-service.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Test', ARRAY['US']) RETURNING id`;
const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.', { limit: 6, minOverlap: 0, packCodes: ['US'] });
await sql`DELETE FROM matters WHERE id=${matter.id}`;

// What was the model's actual answer in run-full-100-dual-eval?
// Let's test what an answer with an introductory phrase looks like:
const rawAnswer = 'According to 35 U.S.C. § 101:\n\n"Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]';
const graph = buildPropositionEvidenceGraph(rawAnswer, evidence, { requires_primary_sources: true });
console.log('Graph propositions:', graph.propositions);
