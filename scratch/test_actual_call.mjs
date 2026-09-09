import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, buildPropositionEvidenceGraph } from '../src/lib/verification-service.js';

const sql = neon(process.env.DATABASE_URL);
const [user] = await sql`SELECT id FROM users LIMIT 1`;
const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Test', ARRAY['US']) RETURNING id`;
const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.', { limit: 6, minOverlap: 0, packCodes: ['US'] });
await sql`DELETE FROM matters WHERE id=${matter.id}`;

const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const context = evidence.map((e, i) => `[S${i + 1}] ${e.title} | ${e.citation || ''} | ${e.locator}\n${e.content.slice(0, 1200)}`).join('\n\n');

const res = await fetch(`${API}/chat/completions`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    temperature: 0,
    max_tokens: 600,
    messages: [
      { role: 'system', content: `You are Sally, a verification-first IP legal AI. You strictly follow the verification-first protocol:\n1. Answer ONLY using the retrieved sources below.\n2. Every material factual and legal assertion must be immediately followed by its supporting source citation [S1], [S2].\n3. Verbatim quotations MUST be exact substrings from the source passages without alterations, bracketed letters, or ellipses inside quotes. Always place citations OUTSIDE quotation marks (e.g. "exact text" [S1]).\n4. If the retrieved sources do not contain the answer, state: "I could not verify this proposition from the available authorities." Never invent authorities, dates, or sections.\n\nSOURCES:\n${context}` },
      { role: 'user', content: 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.' }
    ]
  })
});
const data = await res.json();
const raw = data.choices[0].message.content;
console.log('RAW:\n' + raw);
import { finalizeVerifiedAnswer } from '../src/lib/verification-service.js';
const guarded = finalizeVerifiedAnswer(raw, evidence, { requires_primary_sources: true }, { highRisk: true });
console.log('GUARDED ANSWER:\n', guarded.answer);
console.log('GUARDED META:\n', guarded.sally_meta);
console.log('EVIDENCE LENGTH:\n', evidence.length);
console.log('EVIDENCE IS COMPLETE:\n', evidence.map(e => ({ title: e.title, tier: e.tier, locator: e.locator })));
