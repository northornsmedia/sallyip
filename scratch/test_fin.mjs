import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, finalizeVerifiedAnswer, buildPropositionEvidenceGraph, guardAnswerCitations } from '../src/lib/verification-service.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Test', ARRAY['US']) RETURNING id`;
const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.', { limit: 6, minOverlap: 0, packCodes: ['US'] });
await sql`DELETE FROM matters WHERE id=${matter.id}`;

const text = '"process, machine, manufacture, or composition of matter" [S1]';
const citationGuard = guardAnswerCitations(text, evidence, { requires_primary_sources: true });
console.log('citationGuard answer:\n', citationGuard.answer);
const gBefore = buildPropositionEvidenceGraph(citationGuard.answer, evidence, { requires_primary_sources: true });
console.log('gBefore props:', gBefore.propositions);

const res = finalizeVerifiedAnswer(raw, evidence, { requires_primary_sources: true }, { highRisk: true });
console.log('final res:', res.answer);
console.log('final stats:', res.guard?.stats);
console.log('verification_graph:', JSON.stringify(res.guard?.verification_graph, null, 2));
