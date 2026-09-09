import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, finalizeVerifiedAnswer } from '../src/lib/verification-service.js';
import { evaluateAnswer5D } from '../src/lib/benchmark-eval-framework.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
const evidence = await retrieveHybridEvidence(sql, user.id, null, 'According to 35 U.S.C. § 101, can a composition of matter be patented? Quote the relevant sentence.', { limit: 6, packCodes: ['US'] });

const rawAnswer = `Yes, a composition of matter can be patented under 35 U.S.C. § 101 [S1].

The relevant sentence from 35 U.S.C. § 101 states: "Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]`;

const finalized = finalizeVerifiedAnswer(rawAnswer, evidence, { requires_primary_sources: true }, { highRisk: true });
console.log('--- FINALIZED ANSWER ---');
console.log(finalized.answer);
console.log('--- QUOTE AUDIT ---');
console.log(finalized.guard.quotes);

const item = { key: 's101-05', prompt: 'According to 35 U.S.C. § 101, can a composition of matter be patented? Quote the relevant sentence.', expect: '§ 101' };
const eval5D = await evaluateAnswer5D(item, finalized.answer, evidence, { checkEntailment: false });
console.log('--- 5D EVAL ---');
console.log(JSON.stringify(eval5D.dimensions, null, 2));
