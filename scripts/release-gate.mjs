#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const sampleArg = args.find(a => a.startsWith('--sample=') || a === '-s') || '--sample';
const sampleVal = args[args.indexOf(sampleArg) + 1] || '5';

console.log('\n===============================================================');
console.log('       SALLYIP VERIFIED REASONING ENGINE — CI RELEASE GATE    ');
console.log('===============================================================\n');

// Stage 1: Verification, Adversarial, and Permanent Failure Regression Test Suites
console.log('▶ [Stage 1/2] Executing Verification & Adversarial Test Suites...');

const testResult = spawnSync('npm', ['run', 'test:verification'], {
  cwd: rootDir,
  shell: true,
  stdio: 'inherit'
});

if (testResult.status !== 0) {
  console.error('\n❌ RELEASE GATE FAILED: Stage 1 test suite exited with error.');
  process.exit(1);
}
console.log('\n✔ Stage 1 passed: All verification & regression tests OK.\n');

// Stage 2: 5D Benchmark Quality Gate Evaluation
console.log(`▶ [Stage 2/2] Executing 5-Dimensional Benchmark Gate (Sample: ${sampleVal})...`);

const benchArgs = ['--env-file=.env.local', 'scripts/run-benchmark.mjs', '--sample', sampleVal];
const benchResult = spawnSync('node', benchArgs, {
  cwd: rootDir,
  shell: true,
  stdio: 'inherit'
});

if (benchResult.status !== 0) {
  console.error('\n❌ RELEASE GATE FAILED: Stage 2 benchmark 5D thresholds violated.');
  process.exit(1);
}

console.log('\n===============================================================');
console.log('   ✔ ALL RELEASE GATES PASSED — SALLYIP ENGINE CERTIFIED');
console.log('===============================================================\n');
process.exit(0);
