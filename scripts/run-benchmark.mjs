// Versioned SallyIP Benchmark Runner & Regression Report Generator
// Evaluates models/retrieval against frozen test sets across the 5 Grounding Dimensions.
// Usage: node --env-file=.env.local scripts/run-benchmark.mjs [--benchmark benchmarks/v1.0/dataset.json] [--baseline benchmarks/v1.0/golden_run.json] [--sample 25]

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { finalizeVerifiedAnswer, retrieveHybridEvidence } from '../src/lib/verification-service.js';
import { evaluateAnswer5D } from '../src/lib/benchmark-eval-framework.js';

const MODEL = process.env.SALLYIP_PRIMARY_MODEL || 'gemini-flash-lite-latest';
const API = (process.env.SALLYIP_PRIMARY_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const BENCHMARK_FILE = getArg('--benchmark', path.resolve(process.cwd(), 'benchmarks/v1.0/dataset.json'));
const BASELINE_FILE = getArg('--baseline', path.resolve(process.cwd(), 'benchmarks/v1.0/golden_run.json'));
const SAMPLE_LIMIT = parseInt(getArg('--sample', '0'), 10); // 0 means all

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
            { role: 'system', content: `You are Sally, a verification-first IP legal AI. You strictly follow the verification-first protocol:\n1. Answer ONLY using the retrieved sources below.\n2. Every material factual and legal assertion must be immediately followed by its supporting source citation [S1], [S2].\n3. Verbatim quotations MUST be exact substrings from the source passages without alterations, bracketed letters, or ellipses inside quotes. Always place citations OUTSIDE quotation marks (e.g. "exact text" [S1]).\n4. If the retrieved sources do not contain the answer, state: "I could not verify this proposition from the available authorities." Never invent authorities, dates, or sections.\n\nSOURCES:\n${context}` },
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

async function run() {
  console.log(`\n===============================================================`);
  console.log(`  SallyIP Versioned Benchmark Runner`);
  console.log(`  Benchmark Suite: ${BENCHMARK_FILE}`);
  console.log(`  Baseline:        ${BASELINE_FILE}`);
  console.log(`  Evaluating:      ${MODEL}`);
  console.log(`===============================================================\n`);

  if (!fs.existsSync(BENCHMARK_FILE)) {
    throw new Error(`Benchmark dataset not found at ${BENCHMARK_FILE}`);
  }
  let dataset = JSON.parse(fs.readFileSync(BENCHMARK_FILE, 'utf8'));
  if (SAMPLE_LIMIT > 0) {
    dataset = dataset.slice(0, SAMPLE_LIMIT);
  }

  let baseline = null;
  if (fs.existsSync(BASELINE_FILE)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  }

  const sql = neon(process.env.DATABASE_URL);
  const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`;
  const [matter] = await sql`INSERT INTO matters(user_id, name, jurisdictions) VALUES(${user.id}, 'Versioned Benchmark Run', ARRAY['US']) RETURNING id`;

  const results = [];
  let idx = 0;

  for (const item of dataset) {
    idx++;
    process.stdout.write(`[${String(idx).padStart(3, ' ')}/${dataset.length}] ${item.key.padEnd(16)}: retrieving... `);
    const evidence = await retrieveHybridEvidence(sql, user.id, matter.id, item.prompt, { limit: 6, minOverlap: 0, packCodes: ['US'] });
    process.stdout.write(`asking ${MODEL}... `);
    const generated = await ask(item.prompt, evidence);
    const error = generated.error || null;
    const answer = generated.answer ? finalizeVerifiedAnswer(generated.answer, evidence, { requires_primary_sources: true }, { highRisk: true }).answer : '';

    if (error || !answer) {
      console.log(`ERROR ${error}`);
      results.push({ key: item.key, status: 'error', error });
      continue;
    }

    // 5-Dimensional evaluation (using fast heuristic for CLI throughput, or NLI if enabled)
    const eval5D = await evaluateAnswer5D(item, answer, evidence, { checkEntailment: false });
    eval5D.status = 'scored';
    eval5D.answer = answer;
    results.push(eval5D);

    const d = eval5D.dimensions;
    console.log(
      `[${String(idx).padStart(3, ' ')}/${dataset.length}] ${item.key.padEnd(16)}: ` +
      `grounded=${d.grounding.retrievedExpected ? '✓' : '✗'} ` +
      `cited=${d.citationIntegrity.validCount} ` +
      `dangling=${d.citationIntegrity.danglingCount} ` +
      `quotes=${d.quotationFidelity.exact}E/${d.quotationFidelity.fuzzy}F/${d.quotationFidelity.missing}M ` +
      `entail=${d.citationEntailment.entailmentRate * 100}%`
    );
  }

  await sql`DELETE FROM matters WHERE id=${matter.id}`;

  // Aggregate Metrics Across 5 Dimensions
  const scored = results.filter(r => r.status === 'scored');
  const n = scored.length;

  const totalGrounded = scored.filter(r => r.dimensions.grounding.retrievedExpected).length;
  const zeroDangling = scored.filter(r => r.dimensions.citationIntegrity.danglingCount === 0).length;
  
  const qTotals = scored.reduce((acc, r) => {
    const q = r.dimensions.quotationFidelity;
    return {
      total: acc.total + q.totalQuotes,
      exact: acc.exact + q.exact,
      fuzzy: acc.fuzzy + q.fuzzy,
      missing: acc.missing + q.missing
    };
  }, { total: 0, exact: 0, fuzzy: 0, missing: 0 });

  const avgEntailment = scored.reduce((sum, r) => sum + r.dimensions.citationEntailment.entailmentRate, 0) / (n || 1);
  const avgUnsupported = scored.reduce((sum, r) => sum + r.dimensions.legalAccuracy.unsupportedRate, 0) / (n || 1);
  const rates = {
    authority_recall: n ? totalGrounded / n : 0,
    citation_integrity: n ? zeroDangling / n : 0,
    exact_quote: qTotals.total ? qTotals.exact / qTotals.total : 0,
    missing_quote: qTotals.total ? qTotals.missing / qTotals.total : 0,
    citation_entailment: avgEntailment,
    unsupported_proposition: avgUnsupported
  };
  const releaseGates = {
    benchmark_completion: n === dataset.length,
    citation_integrity: rates.citation_integrity === 1,
    authority_recall: rates.authority_recall >= .98,
    exact_quote_verification: rates.exact_quote >= .95,
    citation_entailment: rates.citation_entailment >= .95,
    unsupported_proposition_rate: rates.unsupported_proposition < .02
  };

  const currentSummary = {
    total_evaluated: dataset.length,
    scored: n,
    authority_retrieval_rate: n ? `${(totalGrounded / n * 100).toFixed(1)}% (${totalGrounded}/${n})` : '0%',
    zero_dangling_rate: n ? `${(zeroDangling / n * 100).toFixed(1)}% (${zeroDangling}/${n})` : '0%',
    quote_fidelity: {
      total: qTotals.total,
      exact_rate: qTotals.total ? `${(qTotals.exact / qTotals.total * 100).toFixed(1)}% (${qTotals.exact}/${qTotals.total})` : '0%',
      fuzzy_rate: qTotals.total ? `${(qTotals.fuzzy / qTotals.total * 100).toFixed(1)}% (${qTotals.fuzzy}/${qTotals.total})` : '0%',
      unsupported_rate: qTotals.total ? `${(qTotals.missing / qTotals.total * 100).toFixed(1)}% (${qTotals.missing}/${qTotals.total})` : '0%'
    },
    citation_entailment_rate: `${(avgEntailment * 100).toFixed(1)}%`,
    unsupported_proposition_rate: `${(avgUnsupported * 100).toFixed(1)}%`,
    rates,
    release_gates: releaseGates,
    release_status: Object.values(releaseGates).every(Boolean) ? 'PASS' : 'BLOCKED'
  };

  console.log(`\n===============================================================`);
  console.log(`  BENCHMARK 5D EVALUATION COMPLETE`);
  console.log(`===============================================================`);
  console.log(`  1. Authority Retrieval (R@k):     ${currentSummary.authority_retrieval_rate}`);
  console.log(`  2. Citation Validity (0-Dangling):${currentSummary.zero_dangling_rate}`);
  console.log(`  3. Quotation Fidelity:            ${currentSummary.quote_fidelity.exact_rate} Exact, ${currentSummary.quote_fidelity.fuzzy_rate} Fuzzy, ${currentSummary.quote_fidelity.unsupported_rate} Missing`);
  console.log(`  4. Citation Entailment Rate:      ${currentSummary.citation_entailment_rate}`);
  console.log(`  5. Unsupported Proposition Rate:  ${currentSummary.unsupported_proposition_rate}`);
  console.log(`  RELEASE:                           ${currentSummary.release_status}`);
  console.log(`===============================================================\n`);

  // Generate Regression Report against Baseline
  const reportMd = generateRegressionReport({
    datasetFile: BENCHMARK_FILE,
    baseline,
    current: currentSummary,
    results
  });

  const reportPath = path.resolve(process.cwd(), 'benchmarks/regression_report_latest_vs_v1.0.md');
  fs.writeFileSync(reportPath, reportMd, 'utf8');
  console.log(`Generated regression report: ${reportPath}\n`);

  return { currentSummary, reportPath };
}

function generateRegressionReport({ datasetFile, baseline, current, results }) {
  const baseSummary = baseline?.metrics?.summary || {};
  let md = `# SallyIP Patent Legal Benchmark: Build Regression Report\n\n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}  \n`;
  md += `**Evaluated Model:** \`${MODEL}\`  \n`;
  md += `**Benchmark Test Suite:** \`${path.basename(datasetFile)}\` (${current.total_evaluated} questions)  \n`;
  md += `**Baseline Version:** \`v1.0\` (Run ID: \`${baseline?.id || 'N/A'}\`)  \n\n`;

  md += `## 1. Five-Dimensional Performance Comparison\n\n`;
  md += `| Evaluation Dimension | v1.0 Baseline | Current Build | Delta / Status |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  md += `| **1. Authority Retrieval ($R@k$)** | ${baseSummary.authority_recall_rate || 'Not recorded'} | ${current.authority_retrieval_rate} | ${current.release_gates.authority_recall ? 'PASS' : 'FAIL'} |\n`;
  md += `| **2. Citation Integrity (0-Dangling)** | ${baseSummary.zero_dangling_rate || 'Not recorded'} | ${current.zero_dangling_rate} | ${current.release_gates.citation_integrity ? 'PASS' : 'FAIL'} |\n`;
  md += `| **3. Quotation Fidelity (Exact)** | ${baseSummary.quote_verification?.exact_rate || 'Not recorded'} | ${current.quote_fidelity.exact_rate} | ${current.release_gates.exact_quote_verification ? 'PASS' : 'FAIL'} |\n`;
  md += `| **3b. Quotation Missing/Unverified** | ${baseSummary.quote_verification?.unsupported_rate || 'Not recorded'} | ${current.quote_fidelity.unsupported_rate} | Tracked separately |\n`;
  md += `| **4. Citation Entailment** | *Added in 5D framework* | ${current.citation_entailment_rate} | ${current.release_gates.citation_entailment ? 'PASS' : 'FAIL'} |\n`;
  md += `| **5. Unsupported Proposition Rate** | *Added in 5D framework* | ${current.unsupported_proposition_rate} | ${current.release_gates.unsupported_proposition_rate ? 'PASS' : 'FAIL'} |\n\n`;
  md += `## Release decision: ${current.release_status}\n\n`;
  md += `Production release is permitted only when every release gate passes. Substantive legal correctness remains separately practitioner-graded and is not inferred from these metrics.\n\n`;
  const errors=results.filter(result=>result.status==='error');
  if(errors.length){
    md += `### Benchmark execution failures\n\n`;
    for(const error of errors)md += `- \`${error.key}\`: ${error.error}\n`;
    md += `\nExecution failures block release and are not removed from the denominator.\n\n`;
  }

  md += `## 2. Regression Tracking on v1.0 Failure Cases (27 Unverified Quotes)\n\n`;
  md += `Every missing quote from v1.0 is preserved as an immutable test case to prevent silent regressions and verify iterative improvements in future releases.\n\n`;

  // Check the v1.0 failure cases if baseline rows exist
  const baseFailures = baseline?.metrics?.rows?.filter(r => r.status === 'scored' && r.quotes?.missing > 0) || [];
  if (baseFailures.length > 0) {
    md += `| Key | Question Prompt | v1.0 Status | Current Status |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    baseFailures.slice(0, 10).forEach(bf => {
      const cur = results.find(r => r.key === bf.key);
      const curExact = cur?.dimensions?.quotationFidelity?.exact || 0;
      const curMissing = cur?.dimensions?.quotationFidelity?.missing || 0;
      const statusText = cur ? (curExact > 0 ? `✓ Improved (${curExact} Exact)` : `${curMissing} Missing`) : 'Not Tested';
      md += `| \`${bf.key}\` | ${bf.prompt.slice(0, 55)}... | ${bf.quotes.missing} Missing Quote(s) | ${statusText} |\n`;
    });
    md += `\n*Note: Showing top 10 of ${baseFailures.length} tracked quote failure cases. Full list stored in \`benchmarks/v1.0/failures_27_unverified_quotes.json\`.*\n\n`;
  }

  md += `## 3. Verification Governance\n\n`;
  md += `- All benchmark questions in \`benchmarks/v1.0/dataset.json\` are immutable.\n`;
  md += `- Citations are enforced structurally by \`guardAnswerCitations\`.\n`;
  md += `- Entailment checks verify that cited authority strictly supports attached propositions.\n`;

  return md;
}

if (process.argv[1]?.endsWith('run-benchmark.mjs')) {
  run().then(({ currentSummary }) => {
    if (currentSummary.release_status !== 'PASS') {
      console.error(`\n❌ Release Gate Failed. Status: ${currentSummary.release_status}`);
      process.exit(1);
    }
    console.log('\n✔ All 5D release gates passed.');
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
