// SallyIP 5-Dimensional Legal Grounding Evaluation Framework
// Dimensions:
// 1. Grounding (Authority Retrieval R@k)
// 2. Citation Integrity (Dangling & Validity Guard)
// 3. Quotation Fidelity (Verbatim Quote Verification)
// 4. Citation Entailment (Premise-Hypothesis NLI Support)
// 5. Legal Accuracy & Unsupported Proposition Rate

import { verifyQuote } from './citation-service.js';
import { guardAnswerCitations } from './verification-service.js';

const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');

/**
 * Splits model text into discrete proposition clauses associated with citations.
 * e.g. "A patent grants the right to exclude [S1]. However, it is not an affirmative right [S2]."
 */
export function extractCitedPropositions(text) {
  const noBlockquotes = String(text || '')
    .split(/\n+/)
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  const protectedText = noBlockquotes
    .replace(/U\.S\.C\./gi, 'U_S_C_')
    .replace(/C\.F\.R\./gi, 'C_F_R_')
    .replace(/Fed\.\s*Cir\./gi, 'Fed_Cir_')
    .replace(/e\.g\./gi, 'e_g_')
    .replace(/i\.e\./gi, 'i_e_')
    .replace(/al\./gi, 'al_')
    .replace(/v\./gi, 'v_')
    .replace(/No\./gi, 'No_');

  const rawClauses = protectedText
    .split(/\n+/)
    .flatMap(line => {
      return line.match(/[^.!?]+[.!?]+(?:["'”’]+)?(?:\s*\[S\d+\])*(?:\s+|$)|[^.!?]+$/g) || [line];
    })
    .map(s => s.replace(/U_S_C_/g, 'U.S.C.').replace(/C_F_R_/g, 'C.F.R.').replace(/Fed_Cir_/g, 'Fed. Cir.').replace(/e_g_/g, 'e.g.').replace(/i_e_/g, 'i.e.').replace(/al_/g, 'al.').replace(/v_/g, 'v.').replace(/No_/g, 'No.').trim())
    .filter(s => s.length > 5);

  const propositions = [];
  for (const sentence of rawClauses) {
    const citationMatches = [...sentence.matchAll(/\[S(\d+)\]/g)];
    const cleanText = sentence.replace(/\[S\d+\]/g, '').replace(/^["'“]+|["'”]+$/g, '').trim();
    if (cleanText.length < 8) continue;
    if (/^(yes|no|based on the provided sources|the relevant sentence|according to the|specifically|under the|here is the|summary:?|conclusion:?|note:?)\s*,?$/i.test(cleanText)) continue;
    if (/^#{1,6}\s+/.test(sentence)) continue;

    if (citationMatches.length > 0) {
      const sourceIndices = [...new Set(citationMatches.map(m => parseInt(m[1], 10)))];
      propositions.push({
        sentence,
        cleanText,
        sourceIndices
      });
    } else {
      propositions.push({
        sentence,
        cleanText,
        sourceIndices: []
      });
    }
  }
  return propositions;
}

/**
 * Checks whether premise P entails hypothesis H using LLM NLI evaluation.
 */
export async function verifyEntailment(premise, hypothesis) {
  if (!premise || !hypothesis) {
    return { verdict: 'unsupported', confidence: 1.0, reasoning: 'Empty premise or hypothesis' };
  }

  const prompt = `You are a strict patent law NLI (Natural Language Inference) verifier.
Determine whether the PREMISE from authoritative patent law strictly supports the HYPOTHESIS asserted by an AI assistant.

PREMISE (Statutory Authority):
"""
${premise.slice(0, 1500)}
"""

HYPOTHESIS (Claimed Legal Proposition):
"""
${hypothesis}
"""

Instructions:
1. If the premise logically entails, proves, or directly states the hypothesis, output: ENTAILS
2. If the premise contradicts the hypothesis or the hypothesis makes an assertion contrary to the premise, output: CONTRADICTS
3. If the premise does not provide sufficient proof for the hypothesis (even if premise is related), output: UNSUPPORTED

Respond in JSON format:
{"verdict": "ENTAILS" | "CONTRADICTS" | "UNSUPPORTED", "reason": "brief 1-sentence rationale"}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      return heuristicEntailment(premise, hypothesis);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const v = (parsed.verdict || '').toLowerCase();
    return {
      verdict: v === 'entails' ? 'entails' : v === 'contradicts' ? 'contradicts' : 'unsupported',
      reasoning: parsed.reason || ''
    };
  } catch (e) {
    return heuristicEntailment(premise, hypothesis);
  }
}

/**
 * Heuristic semantic overlap fallback for NLI.
 */
function heuristicEntailment(premise, hypothesis) {
  const pNorm = String(premise || '').toLowerCase();
  const hNorm = String(hypothesis || '').toLowerCase();

  // Verbatim quotes from premise are self-entailing
  const quotes = [...hNorm.matchAll(/"([^"]{8,300})"/g)].map(m => m[1]);
  for (const q of quotes) {
    if (pNorm.includes(q)) return { verdict: 'entails', reasoning: 'Contains verified verbatim statutory passage' };
  }

  const hWords = hNorm.split(/\W+/).filter(w => w.length > 3 && !['that','this','with','from','what','when','where','which','about','would','could','should','there','their','have','does','under','according','statute','section','title','state','states'].includes(w));
  if (hWords.length === 0) return { verdict: 'unsupported', reasoning: 'No content words' };

  let matched = 0;
  for (const w of hWords) {
    const root = w.slice(0, Math.min(w.length, 5));
    if (pNorm.includes(root)) matched++;
  }
  const ratio = matched / hWords.length;
  if (ratio >= 0.50 || pNorm.includes(hNorm.slice(0, 30))) {
    return { verdict: 'entails', reasoning: `Lexical root overlap ${Math.round(ratio * 100)}%` };
  }
  return { verdict: 'unsupported', reasoning: `Insufficient lexical overlap (${Math.round(ratio * 100)}%)` };
}

/**
 * Evaluates a model answer across all 5 dimensions.
 */
export async function evaluateAnswer5D(item, answer, evidence, options = {}) {
  const checkNli = options.checkEntailment !== false;

  // 1. Grounding / Authority Retrieval
  const expectedLocator = item.expect;
  const retrievedExpected = evidence.some(e => e.locator === expectedLocator);

  // 2. Citation Integrity
  const guard = guardAnswerCitations(answer, evidence, {}).guard;
  const danglingCount = guard.dangling.length;
  const validCitationCount = guard.valid.length;
  const citationIntegrityPassed = danglingCount === 0;

  // 3. Quotation Fidelity
  const quoteMatches = [...answer.matchAll(/"([^"]{18,400})"/g)].map(m => m[1]).slice(0, 4);
  let exactQuotes = 0, fuzzyQuotes = 0, missingQuotes = 0;
  const quoteDetails = [];

  for (const q of quoteMatches) {
    let best = 'missing';
    let matchingLocator = null;
    for (const e of evidence) {
      let verdict = 'missing';
      try { verdict = verifyQuote(e.content, q); } catch {}
      if (verdict === 'exact') { best = 'exact'; matchingLocator = e.locator; break; }
      if (verdict === 'fuzzy') { best = 'fuzzy'; matchingLocator = e.locator; }
    }
    if (best === 'exact') exactQuotes++;
    else if (best === 'fuzzy') fuzzyQuotes++;
    else missingQuotes++;
    quoteDetails.push({ quote: q, verdict: best, locator: matchingLocator });
  }

  // 4. Citation Entailment
  const propositions = extractCitedPropositions(answer);
  const entailmentDetails = [];
  let entailedCount = 0, contradictedCount = 0, unsupportedCount = 0;
  let uncitedPropositions = 0;

  for (const prop of propositions) {
    if (prop.sourceIndices.length === 0) {
      uncitedPropositions++;
      continue;
    }

    // Check entailment against cited sources
    let propVerdict = 'unsupported';
    let propReason = '';
    for (const sIdx of prop.sourceIndices) {
      const source = evidence[sIdx - 1];
      if (!source) continue;

      if (checkNli) {
        const res = await verifyEntailment(source.content, prop.cleanText);
        if (res.verdict === 'entails') {
          propVerdict = 'entails';
          propReason = res.reasoning;
          break;
        } else if (res.verdict === 'contradicts') {
          propVerdict = 'contradicts';
          propReason = res.reasoning;
        } else if (propVerdict !== 'contradicts') {
          propReason = res.reasoning;
        }
      } else {
        // Fast heuristic
        const res = heuristicEntailment(source.content, prop.cleanText);
        if (res.verdict === 'entails') {
          propVerdict = 'entails';
          break;
        }
      }
    }

    if (propVerdict === 'entails') entailedCount++;
    else if (propVerdict === 'contradicts') contradictedCount++;
    else unsupportedCount++;

    entailmentDetails.push({
      proposition: prop.cleanText,
      sources: prop.sourceIndices,
      verdict: propVerdict,
      reason: propReason
    });
  }

  const totalCitedProps = entailedCount + contradictedCount + unsupportedCount;
  const entailmentRate = totalCitedProps > 0 ? (entailedCount / totalCitedProps) : 1.0;
  const unsupportedPropRate = propositions.length > 0 
    ? ((unsupportedCount + uncitedPropositions) / propositions.length) 
    : 0;

  return {
    key: item.key,
    prompt: item.prompt,
    expect: item.expect,
    dimensions: {
      grounding: {
        retrievedExpected,
        expectedLocator
      },
      citationIntegrity: {
        passed: citationIntegrityPassed,
        validCount: validCitationCount,
        danglingCount,
        danglingLabels: guard.dangling
      },
      quotationFidelity: {
        totalQuotes: quoteMatches.length,
        exact: exactQuotes,
        fuzzy: fuzzyQuotes,
        missing: missingQuotes,
        details: quoteDetails
      },
      citationEntailment: {
        totalCitedPropositions: totalCitedProps,
        entailed: entailedCount,
        contradicted: contradictedCount,
        unsupported: unsupportedCount,
        entailmentRate: Math.round(entailmentRate * 1000) / 1000,
        details: entailmentDetails
      },
      legalAccuracy: {
        totalPropositions: propositions.length,
        uncitedPropositions,
        unsupportedRate: Math.round(unsupportedPropRate * 1000) / 1000
      }
    }
  };
}
