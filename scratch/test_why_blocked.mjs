import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, buildPropositionEvidenceGraph } from '../src/lib/verification-service.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Test', ARRAY['US']) RETURNING id`;
const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.', { limit: 6, minOverlap: 0, packCodes: ['US'] });
await sql`DELETE FROM matters WHERE id=${matter.id}`;

const raw = '"process, machine, manufacture, or composition of matter" [S1]';
const graph = buildPropositionEvidenceGraph(raw, evidence, { requires_primary_sources: true });
console.log('graph props:', graph.propositions);
console.log('evidence tiers:', evidence.map(e => ({ title: e.title, tier: e.tier, authority_tier: e.authority_tier })));
