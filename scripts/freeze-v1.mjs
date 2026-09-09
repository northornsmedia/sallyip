// Freeze SallyIP Grounding Benchmark v1.0
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { BENCHMARK_100 } from './grounding-benchmark-100.mjs';

const RUN_ID = 'f8dfe146-4400-49b9-a206-72c8607622d3';
const DIR = path.resolve(process.cwd(), 'benchmarks/v1.0');

async function freeze() {
  fs.mkdirSync(DIR, { recursive: true });

  // 1. Freeze dataset
  const datasetPath = path.join(DIR, 'dataset.json');
  fs.writeFileSync(datasetPath, JSON.stringify(BENCHMARK_100, null, 2), 'utf8');
  console.log(`[1] Frozen dataset (${BENCHMARK_100.length} questions): ${datasetPath}`);

  // 2. Fetch and freeze golden run from Neon DB
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT id, user_id, name, metrics, created_at FROM eval_runs WHERE id = ${RUN_ID}`;
  if (!rows.length) {
    throw new Error(`Run ID ${RUN_ID} not found in database!`);
  }
  const run = rows[0];
  const goldenPath = path.join(DIR, 'golden_run.json');
  fs.writeFileSync(goldenPath, JSON.stringify(run, null, 2), 'utf8');
  console.log(`[2] Frozen golden run (ID: ${RUN_ID}): ${goldenPath}`);

  // 3. Freeze practitioner scorecard
  const sourceScorecard = path.resolve(process.cwd(), 'eval_scorecard_sample_25.md');
  const targetScorecard = path.join(DIR, 'scorecard_sample_25.md');
  if (fs.existsSync(sourceScorecard)) {
    fs.copyFileSync(sourceScorecard, targetScorecard);
    console.log(`[3] Frozen 25-question scorecard: ${targetScorecard}`);
  }

  // 4. Extract the 27 unverified quote cases as permanent regression targets
  const allRows = run.metrics?.rows || [];
  const failures = allRows
    .filter(r => r.status === 'scored' && r.quotes?.missing > 0)
    .map(r => ({
      key: r.key,
      prompt: r.prompt,
      expectedAuthority: r.expect,
      recalled: r.recalled,
      unverifiedQuotes: r.quotes.details.filter(q => q.verdict === 'missing'),
      answer: r.answer
    }));

  const failuresPath = path.join(DIR, 'failures_27_unverified_quotes.json');
  fs.writeFileSync(failuresPath, JSON.stringify({
    totalFailureCases: failures.length,
    description: "Regression evaluation set extracted from SallyIP Grounding Benchmark v1.0 missing quotes",
    cases: failures
  }, null, 2), 'utf8');
  console.log(`[4] Frozen ${failures.length} quote failure regression cases: ${failuresPath}`);

  // 5. Freeze manifest
  const manifest = {
    benchmarkVersion: "v1.0",
    name: "SallyIP Grounding Benchmark v1.0 (Golden Baseline)",
    runId: RUN_ID,
    frozenDate: run.created_at || new Date().toISOString(),
    totalQuestions: BENCHMARK_100.length,
    model: "gemini-flash-lite-latest",
    summary: run.metrics?.summary,
    files: {
      dataset: "dataset.json",
      goldenRun: "golden_run.json",
      practitionerScorecard: "scorecard_sample_25.md",
      quoteFailureCases: "failures_27_unverified_quotes.json"
    }
  };
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[5] Frozen manifest.json with summary:`, run.metrics?.summary);
}

freeze().catch(console.error);
