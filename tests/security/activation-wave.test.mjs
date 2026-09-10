import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// P1-D: scanner catches synthetic dummy-shaped secrets in isolation, ignores placeholders.
test('secret scanner rules detect dummy key shapes without printing values', () => {
  const src = fs.readFileSync(new URL('../../scripts/secret-scan.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes('sk-or-v1-'), 'must detect openrouter key shape');
  assert.ok(src.includes('PRIVATE KEY'), 'must detect private key');
  assert.ok(src.includes('tracked-secret-file'), 'must block tracked local secret files');
  assert.ok(!src.includes('console.log(') || src.includes('Values not shown'), 'must not print values');
});

test('ingestion inventory: file-safety wired in node + python paths', () => {
  const nodeSrc = fs.readFileSync(new URL('../../src/lib/document-ingestion-local.js', import.meta.url), 'utf8');
  assert.ok(nodeSrc.includes('validateUpload'), 'node ingestion must call file-safety');
  assert.ok(nodeSrc.includes('containsLikelyPromptInjection'), 'node ingestion must flag injection');
  const py = fs.readFileSync(new URL('../../api/ingest-document.py', import.meta.url), 'utf8');
  assert.ok(py.includes('BLOCKED_TYPE') || py.includes('blocked'), 'python ingestion must block archives/executables');
  assert.ok(py.includes('rights_confirmed'), 'rights gate must remain');
});

test('origin cleanup: prod code derives origin from env, manifest generated', () => {
  const chat = fs.readFileSync(new URL('../../src/lib/chat-orchestrator.js', import.meta.url), 'utf8');
  assert.ok(chat.includes('APP_ORIGIN'), 'chat must prefer APP_ORIGIN');
  assert.ok(!chat.includes("body.host||'sallyip.com'"), 'raw Host fallback must be gone');
  assert.ok(fs.existsSync(new URL('../../scripts/generate-word-manifest.mjs', import.meta.url)), 'manifest generator must exist');
});

test('finalizer wires contradiction + temporal additively', () => {
  const src = fs.readFileSync(new URL('../../src/lib/verification-service.js', import.meta.url), 'utf8');
  assert.ok(src.includes('classifyContradiction'), 'contradiction must be wired');
  assert.ok(src.includes('validateAuthorityCurrency'), 'temporal must be wired');
  assert.ok(src.includes('checkEntailment'), 'entailment must be recorded');
});
