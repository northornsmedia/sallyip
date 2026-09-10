// SallyIP Grounding Benchmark Suite: 100 pack-grounded questions across US patent law.
// Measures citation validity, quote verification, and authority recall,
// and outputs a 25-question practitioner scorecard for substantive legal correctness.
import { neon } from '@neondatabase/serverless';
import { retrieveHybridEvidence, guardAnswerCitations, auditAnswerQuotes } from '../src/lib/verification-service.js';
import fs from 'fs';
import path from 'path';

const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');

export const BENCHMARK_100 = [
  // 1. 35 U.S.C. § 101 (10 questions)
  { key: 's101-01', prompt: 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.', expect: '§ 101' },
  { key: 's101-02', prompt: 'Under 35 U.S.C. § 101, what condition must a new and useful process or machine satisfy to obtain a patent? Quote and cite.', expect: '§ 101' },
  { key: 's101-03', prompt: 'Does 35 U.S.C. § 101 allow patents for new and useful improvements of existing machines? Quote the statutory phrase.', expect: '§ 101' },
  { key: 's101-04', prompt: 'What word does 35 U.S.C. § 101 use regarding the inventor: "whoever invents or..."? Quote and cite.', expect: '§ 101' },
  { key: 's101-05', prompt: 'According to 35 U.S.C. § 101, can a composition of matter be patented? Quote the relevant sentence.', expect: '§ 101' },
  { key: 's101-06', prompt: 'Quote 35 U.S.C. § 101 on whether an invention must be "useful".', expect: '§ 101' },
  { key: 's101-07', prompt: 'What does 35 U.S.C. § 101 state about subject matter conditions and requirements? Quote and cite.', expect: '§ 101' },
  { key: 's101-08', prompt: 'State the statutory term in 35 U.S.C. § 101 for an article manufactured by human industry.', expect: '§ 101' },
  { key: 's101-09', prompt: 'Under 35 U.S.C. § 101, who may obtain a patent? Quote the opening phrase.', expect: '§ 101' },
  { key: 's101-10', prompt: 'Quote the full text of 35 U.S.C. § 101 in its entirety with official citation [S1].', expect: '§ 101' },

  // 2. 35 U.S.C. § 102(a) Novelty & Prior Art (10 questions)
  { key: 's102a-01', prompt: 'Under 35 U.S.C. § 102(a)(1), what events prior to the effective filing date establish prior art? Quote and cite.', expect: '§ 102(a)' },
  { key: 's102a-02', prompt: 'Does a printed publication anywhere in the world count as prior art under 35 U.S.C. § 102(a)(1)? Quote the text.', expect: '§ 102(a)' },
  { key: 's102a-03', prompt: 'What does 35 U.S.C. § 102(a)(1) state regarding public use or commercial sale? Quote and cite.', expect: '§ 102(a)' },
  { key: 's102a-04', prompt: 'Quote the catch-all phrase in 35 U.S.C. § 102(a)(1): "or otherwise available to..."', expect: '§ 102(a)' },
  { key: 's102a-05', prompt: 'Under 35 U.S.C. § 102(a)(2), when does another patent or published application become prior art? Quote and cite.', expect: '§ 102(a)' },
  { key: 's102a-06', prompt: 'What requirement does 35 U.S.C. § 102(a)(2) impose regarding the names of inventors? Quote the phrase.', expect: '§ 102(a)' },
  { key: 's102a-07', prompt: 'Quote 35 U.S.C. § 102(a) on whether the invention was patented before the effective filing date.', expect: '§ 102(a)' },
  { key: 's102a-08', prompt: 'What is the critical timing benchmark under 35 U.S.C. § 102(a)(1)? Quote the statutory phrase.', expect: '§ 102(a)' },
  { key: 's102a-09', prompt: 'Under 35 U.S.C. § 102(a), does prior public use have to occur in the United States? Quote and cite.', expect: '§ 102(a)' },
  { key: 's102a-10', prompt: 'Quote the introductory words of 35 U.S.C. § 102: "A person shall be entitled to a patent unless..."', expect: '§ 102(a)' },

  // 3. 35 U.S.C. § 102(b)(1) Grace Period & Disclosures (10 questions)
  { key: 's102b-01', prompt: 'Under 35 U.S.C. § 102(b)(1), what disclosures made by an inventor are excluded from prior art? Quote and cite.', expect: '§ 102(b)(1)' },
  { key: 's102b-02', prompt: 'What is the exact grace period window in 35 U.S.C. § 102(b)(1)? Quote the phrase containing "1 year".', expect: '§ 102(b)(1)' },
  { key: 's102b-03', prompt: 'Under 35 U.S.C. § 102(b)(1)(A), what rule applies if a joint inventor made the disclosure? Quote and cite.', expect: '§ 102(b)(1)' },
  { key: 's102b-04', prompt: 'How does 35 U.S.C. § 102(b)(1)(A) treat disclosures derived directly or indirectly from the inventor? Quote and cite.', expect: '§ 102(b)(1)' },
  { key: 's102b-05', prompt: 'Explain 35 U.S.C. § 102(b)(1)(B) regarding third-party disclosures after an inventor disclosure. Quote the rule.', expect: '§ 102(b)(1)' },
  { key: 's102b-06', prompt: 'What phrase in 35 U.S.C. § 102(b)(1)(B) describes the subject matter having been "publicly disclosed by..."? Quote it.', expect: '§ 102(b)(1)' },
  { key: 's102b-07', prompt: 'Does the 1-year grace period in 35 U.S.C. § 102(b)(1) apply to public use by the inventor? Quote and cite.', expect: '§ 102(b)(1)' },
  { key: 's102b-08', prompt: 'Quote 35 U.S.C. § 102(b)(1) on the effective filing date calculation for grace period disclosures.', expect: '§ 102(b)(1)' },
  { key: 's102b-09', prompt: 'Under 35 U.S.C. § 102(b)(1), what term is used for someone who obtained disclosure from the inventor? Quote the phrase.', expect: '§ 102(b)(1)' },
  { key: 's102b-10', prompt: 'Quote the full exception language of 35 U.S.C. § 102(b)(1)(A) verbatim.', expect: '§ 102(b)(1)' },

  // 4. 35 U.S.C. § 103 Obviousness (10 questions)
  { key: 's103-01', prompt: 'State the complete obviousness standard of 35 U.S.C. § 103 and quote the decisive legal test.', expect: '§ 103' },
  { key: 's103-02', prompt: 'Under 35 U.S.C. § 103, from whose perspective is obviousness judged? Quote the statutory definition.', expect: '§ 103' },
  { key: 's103-03', prompt: 'At what point in time is the obviousness determination made under 35 U.S.C. § 103? Quote the text.', expect: '§ 103' },
  { key: 's103-04', prompt: 'What phrase does 35 U.S.C. § 103 use regarding the subject matter being obvious "as a whole"? Quote and cite.', expect: '§ 103' },
  { key: 's103-05', prompt: 'Under 35 U.S.C. § 103, does patentability depend on the manner in which the invention was made? Quote and cite.', expect: '§ 103' },
  { key: 's103-06', prompt: 'Quote the sentence in 35 U.S.C. § 103: "Patentability shall not be negated by..."', expect: '§ 103' },
  { key: 's103-07', prompt: 'What role do the differences between the claimed invention and prior art play in 35 U.S.C. § 103? Quote and cite.', expect: '§ 103' },
  { key: 's103-08', prompt: 'Under 35 U.S.C. § 103, can an invention be obvious even if not identically disclosed under section 102? Quote the phrase.', expect: '§ 103' },
  { key: 's103-09', prompt: 'Quote the exact words in 35 U.S.C. § 103 defining a person having ordinary skill in the art.', expect: '§ 103' },
  { key: 's103-10', prompt: 'Summarize 35 U.S.C. § 103 in one sentence and quote its concluding limitation.', expect: '§ 103' },

  // 5. 35 U.S.C. § 111 Application Filing & Provisionals (10 questions)
  { key: 's111-01', prompt: 'Under 35 U.S.C. § 111(a), what are the required components of a patent application? Quote and cite.', expect: '§ 111(a)-(b)' },
  { key: 's111-02', prompt: 'Does a provisional application under 35 U.S.C. § 111(b) require any claims? Quote the statutory rule.', expect: '§ 111(a)-(b)' },
  { key: 's111-03', prompt: 'Quote 35 U.S.C. § 111(b)(1) regarding drawings in a provisional patent application.', expect: '§ 111(a)-(b)' },
  { key: 's111-04', prompt: 'How long does a US provisional patent application last before abandonment under 35 U.S.C. § 111(b)(5)? Quote the duration.', expect: '§ 111(a)-(b)' },
  { key: 's111-05', prompt: 'Quote the abandonment rule for provisional applications in 35 U.S.C. § 111(b)(5).', expect: '§ 111(a)-(b)' },
  { key: 's111-06', prompt: 'Under 35 U.S.C. § 111(b)(2), is an oath or declaration required in a provisional application? Quote and cite.', expect: '§ 111(a)-(b)' },
  { key: 's111-07', prompt: 'What section of title 35 governs the filing of nonprovisional patent applications? Quote 35 U.S.C. § 111(a).', expect: '§ 111(a)-(b)' },
  { key: 's111-08', prompt: 'Quote 35 U.S.C. § 111(a)(2) on what must accompany the specification and drawings.', expect: '§ 111(a)-(b)' },
  { key: 's111-09', prompt: 'Can a provisional application claim the priority of an earlier provisional application? Quote 35 U.S.C. § 111(b)(7).', expect: '§ 111(a)-(b)' },
  { key: 's111-10', prompt: 'Quote the 12-month pendency limit of provisional patent applications under 35 U.S.C. § 111(b).', expect: '§ 111(a)-(b)' },

  // 6. 35 U.S.C. § 112(a) Specification Requirements (10 questions)
  { key: 's112a-01', prompt: 'What does 35 U.S.C. § 112(a) require the specification to contain? Quote the written description requirement.', expect: '§ 112(a)-(b)' },
  { key: 's112a-02', prompt: 'Quote the enablement requirement of 35 U.S.C. § 112(a): "in such full, clear, concise, and..."', expect: '§ 112(a)-(b)' },
  { key: 's112a-03', prompt: 'Under 35 U.S.C. § 112(a), who must be enabled to make and use the invention? Quote the exact statutory phrase.', expect: '§ 112(a)-(b)' },
  { key: 's112a-04', prompt: 'What does 35 U.S.C. § 112(a) say about the best mode of the invention? Quote the requirement.', expect: '§ 112(a)-(b)' },
  { key: 's112a-05', prompt: 'Quote the standard in 35 U.S.C. § 112(a) concerning "the manner and process of making and using it".', expect: '§ 112(a)-(b)' },
  { key: 's112a-06', prompt: 'Does 35 U.S.C. § 112(a) require enabling both "making" and "using"? Quote the relevant words.', expect: '§ 112(a)-(b)' },
  { key: 's112a-07', prompt: 'Quote 35 U.S.C. § 112(a) regarding the person skilled in the art: "any person skilled in the art to which..."', expect: '§ 112(a)-(b)' },
  { key: 's112a-08', prompt: 'What three specification qualities are demanded by 35 U.S.C. § 112(a) terms: "full, clear, concise..."? Quote.', expect: '§ 112(a)-(b)' },
  { key: 's112a-09', prompt: 'Under 35 U.S.C. § 112(a), at what time must the best mode be contemplated? Quote the phrase.', expect: '§ 112(a)-(b)' },
  { key: 's112a-10', prompt: 'Quote 35 U.S.C. § 112(a) in its entirety with statutory citation [S1].', expect: '§ 112(a)-(b)' },

  // 7. 35 U.S.C. § 112(b) Claims & Definiteness (10 questions)
  { key: 's112b-01', prompt: 'What does 35 U.S.C. § 112(b) mandate that the specification conclude with? Quote the claims requirement.', expect: '§ 112(a)-(b)' },
  { key: 's112b-02', prompt: 'Quote the definiteness standard in 35 U.S.C. § 112(b): "particularly pointing out and distinctly..."', expect: '§ 112(a)-(b)' },
  { key: 's112b-03', prompt: 'Under 35 U.S.C. § 112(b), what must the claims claim? Quote: "the subject matter which the inventor..."', expect: '§ 112(a)-(b)' },
  { key: 's112b-04', prompt: 'Can a specification conclude with only one claim under 35 U.S.C. § 112(b)? Quote the statutory phrase.', expect: '§ 112(a)-(b)' },
  { key: 's112b-05', prompt: 'Quote 35 U.S.C. § 112(b) on the phrase "regards as the invention".', expect: '§ 112(a)-(b)' },
  { key: 's112b-06', prompt: 'What two adverbs define the claiming obligation in 35 U.S.C. § 112(b)? Quote them verbatim.', expect: '§ 112(a)-(b)' },
  { key: 's112b-07', prompt: 'Quote 35 U.S.C. § 112(b) on concluding the specification with "one or more claims".', expect: '§ 112(a)-(b)' },
  { key: 's112b-08', prompt: 'Under 35 U.S.C. § 112(b), who decides what subject matter constitutes the invention? Quote the reference to inventor.', expect: '§ 112(a)-(b)' },
  { key: 's112b-09', prompt: 'Quote the phrase in 35 U.S.C. § 112(b) that forms the statutory basis for claim indefiniteness rejections.', expect: '§ 112(a)-(b)' },
  { key: 's112b-10', prompt: 'State the full text of 35 U.S.C. § 112(b) with formal citation.', expect: '§ 112(a)-(b)' },

  // 8. 35 U.S.C. § 112(d) Dependent Claims (10 questions)
  { key: 's112d-01', prompt: 'What must a dependent claim contain under 35 U.S.C. § 112(d)? Quote the reference to a preceding claim.', expect: '§ 112(a)-(b)' },
  { key: 's112d-02', prompt: 'Under 35 U.S.C. § 112(d), how must a dependent claim specify its scope? Quote the phrase "further limitation".', expect: '§ 112(a)-(b)' },
  { key: 's112d-03', prompt: 'Does a dependent claim incorporate all limitations of the referenced claim under 35 U.S.C. § 112(d)? Quote the rule.', expect: '§ 112(a)-(b)' },
  { key: 's112d-04', prompt: 'Quote 35 U.S.C. § 112(d) on construing a dependent claim to incorporate all limitations.', expect: '§ 112(a)-(b)' },
  { key: 's112d-05', prompt: 'What word does 35 U.S.C. § 112(d) use for claims that refer back: "A claim in..."? Quote the statutory term.', expect: '§ 112(a)-(b)' },
  { key: 's112d-06', prompt: 'Can a claim in dependent form refer to more than one preceding claim? Quote 35 U.S.C. § 112(d) or (e).', expect: '§ 112(a)-(b)' },
  { key: 's112d-07', prompt: 'Quote the exact requirement in 35 U.S.C. § 112(d) that a dependent claim specify a further limitation.', expect: '§ 112(a)-(b)' },
  { key: 's112d-08', prompt: 'Under 35 U.S.C. § 112(d), what is the legal effect of referencing another claim? Quote the statutory sentence.', expect: '§ 112(a)-(b)' },
  { key: 's112d-09', prompt: 'Quote the opening phrase of 35 U.S.C. § 112(d): "A claim in dependent form shall contain..."', expect: '§ 112(a)-(b)' },
  { key: 's112d-10', prompt: 'Summarize 35 U.S.C. § 112(d) in one sentence and quote its key limitation incorporation clause.', expect: '§ 112(a)-(b)' },

  // 9. MPEP § 2106 Eligibility & Step 2A (10 questions)
  { key: 'mpep-2106-01', prompt: 'Describe Step 2A Prong One under MPEP § 2106 and quote the judicial exceptions formulation.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-02', prompt: 'According to MPEP § 2106, what are the three judicial exceptions to patent eligibility? Quote them.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-03', prompt: 'What does MPEP § 2106 Step 2A Prong Two ask about "practical application"? Quote the rule.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-04', prompt: 'Under MPEP § 2106, if a claim integrates an exception into a practical application, is it eligible? Quote and cite.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-05', prompt: 'What are the three groupings of abstract ideas set forth in MPEP § 2106? Quote the mathematical concepts grouping.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-06', prompt: 'Quote MPEP § 2106 on "mental processes" as a category of abstract ideas.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-07', prompt: 'Quote MPEP § 2106 on "certain methods of organizing human activity".', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-08', prompt: 'What does MPEP § 2106 say happens when a judicial exception is not integrated into a practical application? Quote.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-09', prompt: 'Under MPEP § 2106, does an improvement to the functioning of a computer qualify as a practical application? Quote.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106-10', prompt: 'Quote the rule in MPEP § 2106 regarding an extra-solution activity or insignificant post-solution activity.', expect: 'MPEP § 2106 (condensed)' },

  // 10. MPEP § 2106 Step 2B & Adversarial Tests (10 questions)
  { key: 'mpep-2106b-01', prompt: 'Describe Step 2B under MPEP § 2106 and quote the "significantly more" requirement.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-02', prompt: 'What constitutes an "inventive concept" under MPEP § 2106 Step 2B? Quote the definition.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-03', prompt: 'According to MPEP § 2106, do well-understood, routine, and conventional activities satisfy Step 2B? Quote the rule.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-04', prompt: 'Quote the passage stating that software per se with no structural recitation falls outside the statutory categories.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-05', prompt: 'Under MPEP § 2106, does simply saying "apply it" or generic computer implementation satisfy Step 2B? Quote.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-06', prompt: 'Quote MPEP § 2106 on how an examiner must establish that an activity is well-understood, routine, and conventional.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-07', prompt: 'What role does preemption play in the MPEP § 2106 eligibility framework? Quote the relevant sentence.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-08', prompt: 'Quote MPEP § 2106 on whether a specific technological solution can provide an inventive concept.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-09', prompt: 'Under MPEP § 2106, how does Step 2B differ from the obviousness inquiry of 35 U.S.C. § 103? Quote.', expect: 'MPEP § 2106 (condensed)' },
  { key: 'mpep-2106b-10', prompt: 'State the final conclusion rule of MPEP § 2106 when Step 2B is satisfied versus not satisfied. Quote.', expect: 'MPEP § 2106 (condensed)' },
];

async function ask(prompt, evidence) {
  const context = evidence.map((e, i) => `[S${i + 1}] ${e.title} | ${e.citation || ''} | ${e.locator}\n${e.content.slice(0, 1200)}`).join('\n\n');
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          max_tokens: 600,
          messages: [
            { role: 'system', content: `Answer ONLY from the sources below. Cite every material claim as [S1], [S2]. Quote key phrases exactly.\n\nSOURCES:\n${context}` },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal,
      });
      if (res.status === 429 || res.status === 503) {
        clearTimeout(timer);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return { error: `model ${res.status}` };
      const data = await res.json();
      return { answer: data.choices?.[0]?.message?.content || '' };
    } catch (e) {
      if (attempt === 2) return { error: e.message.slice(0, 80) };
      await new Promise(r => setTimeout(r, 1500));
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: 'max_retries_exceeded' };
}

async function runBenchmark(questions = BENCHMARK_100) {
  console.log(`\n======================================================`);
  console.log(`  SallyIP Grounding Benchmark: ${questions.length} Questions`);
  console.log(`  Model: ${MODEL} via ${API}`);
  console.log(`======================================================\n`);

  const sql = neon(process.env.DATABASE_URL);
  const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
  const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Grounding Benchmark 100', ARRAY['US']) RETURNING id`;

  const rows = [];
  const scorecardItems = [];
  const sampleIndices = new Set([
    0, 4, 9, 10, 14, 19, 20, 24, 29, 30, 34, 39, 40, 44, 49,
    50, 54, 59, 60, 64, 69, 70, 74, 79, 80, 84, 89, 90, 94, 99
  ]);

  let idx = 0;
  for (const q of questions) {
    idx++;
    const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, q.prompt, { limit: 6, minOverlap: 0, packCodes: ['US'] });
    const recalled = evidence.some(e => e.locator === q.expect);
    const { answer = '', error = null } = await ask(q.prompt, evidence);

    if (error || !answer) {
      rows.push({ key: q.key, status: 'model_error', error, recalled });
      console.log(`[${String(idx).padStart(3, ' ')}/100] ${q.key.padEnd(16)}: MODEL_ERROR ${error}`);
      continue;
    }

    const guard = guardAnswerCitations(answer, evidence, {}).guard;
    // Convention-aware quote audit (shared lib helper): skips prompt echoes,
    // grounded denials and cross-span extraction garbage; recognises [X]
    // bracket alterations, trailing [S#] inside spans, and `...` ellipsis.
    const audit = auditAnswerQuotes(answer, evidence, { prompt: q.prompt, minLength: 18, maxLength: 400 });
    const auditedQuotes = audit.checked.slice(0, 4);
    let exact = 0, fuzzy = 0, missing = 0;
    const quoteDetails = [];

    for (const s of auditedQuotes) {
      const best = s.status;
      const matchingLocator = s.locator;
      if (best === 'exact') exact++;
      else if (best === 'fuzzy') fuzzy++;
      else missing++;
      quoteDetails.push({ quote: s.quote, verdict: best, locator: matchingLocator });
    }

    const itemResult = {
      index: idx,
      key: q.key,
      prompt: q.prompt,
      expect: q.expect,
      status: 'scored',
      recalled,
      cited: guard.valid.length,
      dangling: guard.dangling.length,
      quotes: { total: auditedQuotes.length, exact, fuzzy, missing, details: quoteDetails },
      answer: answer.slice(0, 500)
    };
    rows.push(itemResult);

    if (sampleIndices.has(idx - 1) && scorecardItems.length < 25) {
      scorecardItems.push({
        num: scorecardItems.length + 1,
        key: q.key,
        prompt: q.prompt,
        expectedAuthority: q.expect,
        recalled,
        answer,
        quotes: quoteDetails,
        validCitations: guard.valid,
        danglingCitations: guard.dangling
      });
    }

    console.log(
      `[${String(idx).padStart(3, ' ')}/100] ${q.key.padEnd(16)}: ` +
      `recalled=${recalled ? '✓' : '✗'} ` +
      `cited=${guard.valid.length} ` +
      `dangling=${guard.dangling.length} ` +
      `quotes=${exact}E/${fuzzy}F/${missing}M`
    );
  }

  const scored = rows.filter(r => r.status === 'scored');
  const qTotals = scored.reduce((a, r) => ({
    exact: a.exact + r.quotes.exact,
    fuzzy: a.fuzzy + r.quotes.fuzzy,
    missing: a.missing + r.quotes.missing,
    total: a.total + r.quotes.total
  }), { exact: 0, fuzzy: 0, missing: 0, total: 0 });

  const totalRecalled = scored.filter(r => r.recalled).length;
  const zeroDangling = scored.filter(r => r.dangling === 0).length;
  const validCited = scored.filter(r => r.cited > 0).length;

  const summary = {
    total_questions: questions.length,
    scored_answers: scored.length,
    authority_recall_rate: scored.length ? `${Math.round(totalRecalled / scored.length * 1000) / 10}% (${totalRecalled}/${scored.length})` : '0%',
    zero_dangling_rate: scored.length ? `${Math.round(zeroDangling / scored.length * 1000) / 10}% (${zeroDangling}/${scored.length})` : '0%',
    answers_with_citations: scored.length ? `${Math.round(validCited / scored.length * 1000) / 10}% (${validCited}/${scored.length})` : '0%',
    quote_verification: {
      total_quotes: qTotals.total,
      exact_rate: qTotals.total ? `${Math.round(qTotals.exact / qTotals.total * 1000) / 10}% (${qTotals.exact}/${qTotals.total})` : '0%',
      fuzzy_rate: qTotals.total ? `${Math.round(qTotals.fuzzy / qTotals.total * 1000) / 10}% (${qTotals.fuzzy}/${qTotals.total})` : '0%',
      unsupported_rate: qTotals.total ? `${Math.round(qTotals.missing / qTotals.total * 1000) / 10}% (${qTotals.missing}/${qTotals.total})` : '0%',
    }
  };

  console.log(`\n======================================================`);
  console.log(`  BENCHMARK SUMMARY (${scored.length}/${questions.length} Scored)`);
  console.log(`======================================================`);
  console.log(`  Zero Dangling Citations: ${summary.zero_dangling_rate}`);
  console.log(`  Authority Recall (R@k):  ${summary.authority_recall_rate}`);
  console.log(`  Quote Verification:      ${summary.quote_verification.exact_rate} Exact, ${summary.quote_verification.fuzzy_rate} Fuzzy, ${summary.quote_verification.unsupported_rate} Missing`);
  console.log(`======================================================\n`);

  // Write evaluation run to DB
  try {
    const [run] = await sql`
      INSERT INTO eval_runs(user_id, name, metrics) 
      VALUES(${user.id}, ${'grounding benchmark 100 (' + MODEL + ')'}, ${JSON.stringify({ summary, rows })}::jsonb) 
      RETURNING id
    `;
    console.log(`Saved evaluation run to DB: ID ${run.id}`);
  } catch (e) {
    console.warn(`Could not save eval_run to DB: ${e.message}`);
  }

  // Cleanup temporary matter
  await sql`DELETE FROM matters WHERE id=${matter.id}`;

  // Write 25-question practitioner scorecard markdown
  const mdScorecard = generateScorecardMarkdown(summary, scorecardItems);
  const scorecardPath = path.resolve(process.cwd(), 'eval_scorecard_sample_25.md');
  fs.writeFileSync(scorecardPath, mdScorecard, 'utf8');
  console.log(`Wrote 25-question practitioner scorecard to: ${scorecardPath}\n`);

  return { summary, scorecardPath };
}

function generateScorecardMarkdown(summary, items) {
  let md = `# SallyIP Practitioner Legal Correctness Scorecard (25-Question Sample)\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}  \n`;
  md += `**Evaluated Model:** \`${MODEL}\`  \n`;
  md += `**Automated Metrics Summary:**  \n`;
  md += `- **Zero Dangling Citations:** ${summary.zero_dangling_rate}  \n`;
  md += `- **Authority Recall Rate:** ${summary.authority_recall_rate}  \n`;
  md += `- **Verbatim Quote Verification:** ${summary.quote_verification.exact_rate} exact (${summary.quote_verification.unsupported_rate} unverified)  \n\n`;
  md += `---\n\n`;
  md += `## Practitioner Grading Instructions\n\n`;
  md += `For each question below, evaluate whether the model's answer is **substantively legally accurate** under US patent law.\n`;
  md += `- **Pass (Correct)**: Correct rule of law, no material misstatements.\n`;
  md += `- **Partial**: Minor inaccuracy or omissions, but core rule is accurate.\n`;
  md += `- **Fail (Misleading/False)**: Incorrect legal rule, hallucinated standard, or invalid interpretation.\n\n`;
  md += `---\n\n`;

  items.forEach((item, i) => {
    md += `### ${i + 1}. [${item.key}] ${item.prompt}\n\n`;
    md += `**Expected Statutory Authority:** \`${item.expectedAuthority}\`  \n`;
    md += `**Authority Retrieved:** ${item.recalled ? '✓ Yes' : '✗ Missed'}  \n`;
    md += `**Valid Citations:** ${item.validCitations.map(c => `[S${c}]`).join(', ') || 'None'}  \n`;
    md += `**Dangling Citations:** ${item.danglingCitations.length ? item.danglingCitations.join(', ') : 'None (0)'}  \n\n`;
    md += `**Model Answer:**\n> ${item.answer.replace(/\n+/g, '\n> ')}\n\n`;
    
    if (item.quotes?.length) {
      md += `**Quote Verification:**\n`;
      item.quotes.forEach(q => {
        md += `- "${q.quote.slice(0, 90)}..." → **${q.verdict.toUpperCase()}** ${q.locator ? `(\`${q.locator}\`)` : ''}\n`;
      });
      md += `\n`;
    }

    md += `**Practitioner Grade:**\n`;
    md += `- [ ] **Pass** (Substantively Correct)\n`;
    md += `- [ ] **Partial** (Minor Inaccuracy)\n`;
    md += `- [ ] **Fail** (Misleading / Incorrect Legal Rule)\n\n`;
    md += `*Notes / Observations:* _____________________________________________________\n\n`;
    md += `---\n\n`;
  });

  return md;
}

if (process.argv[1]?.endsWith('grounding-benchmark-100.mjs')) {
  runBenchmark().catch(console.error);
}
