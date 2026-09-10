import test from 'node:test';
import assert from 'node:assert/strict';
import { PROVIDER_REGISTRY, getProviderRecord, isEngineApprovedForMode, assertChatAllowed, assertEmbeddingAllowed, assertRerankAllowed, resolveExecutionMode } from '../../src/lib/provider-policy.js';

// 5. confidential matter cannot use free model
test('confidential matter cannot use free model', () => {
  const engines = [{ slug: 'nvidia/nemotron-3.5-lightning:free' }];
  assert.throws(() => assertChatAllowed({ engines, mode: 'CONFIDENTIAL_IP', env: {} }), /fail-closed|CONFIDENTIAL_PROVIDER_UNAVAILABLE/);
});

test('highly confidential fails closed without approved primary', () => {
  const engines = [{ slug: 'gemini-3.7-flash' }];
  assert.throws(() => assertChatAllowed({ engines, mode: 'HIGHLY_CONFIDENTIAL', env: {} }), /fail-closed|CONFIDENTIAL_PROVIDER_UNAVAILABLE/);
});

// 6. provider fallback respects confidentiality
test('provider fallback respects confidentiality: free fallback filtered, no silent downgrade', () => {
  const engines = [
    { slug: 'gemini-3.7-flash' },
    { slug: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  ];
  // Without Gemini approval, confidential must fail closed — not fall back to free.
  assert.throws(() => assertChatAllowed({ engines, mode: 'CONFIDENTIAL_IP', env: {} }), /fail-closed/);
  // PUBLIC_RESEARCH allows all.
  const pub = assertChatAllowed({ engines, mode: 'PUBLIC_RESEARCH', env: {} });
  assert.equal(pub.allowed.length, 2);
  // Approved Gemini passes when explicitly approved.
  const ok = assertChatAllowed({ engines, mode: 'CONFIDENTIAL_IP', env: { SALLYIP_APPROVE_GEMINI_CONFIDENTIAL: '1' } });
  assert.ok(ok.allowed.some((e) => e.slug === 'gemini-3.7-flash'));
  assert.ok(!ok.allowed.some((e) => e.slug.includes(':free')));
});

test('unknown model fails closed for confidential', () => {
  const rec = getProviderRecord('evil/unknown-model');
  assert.equal(rec.approved_for_confidential_ip, false);
  assert.throws(() => assertChatAllowed({ engines: [{ slug: 'evil/unknown-model' }], mode: 'CONFIDENTIAL_IP', env: {} }), /fail-closed/);
});

test('embeddings and rerank blocked for confidential free models', () => {
  assert.throws(() => assertEmbeddingAllowed({ model: 'liquid/lfm-2.5-embedding-350m:free', mode: 'CONFIDENTIAL_IP' }), /fail-closed|CONFIDENTIAL_EMBEDDING_BLOCKED/);
  assert.throws(() => assertRerankAllowed({ model: 'nvidia/llama-nemotron-rerank-vl-1b-v2:free', mode: 'CONFIDENTIAL_IP' }), /fail-closed|CONFIDENTIAL_RERANK_BLOCKED/);
});

test('registry covers all .env.example models', async () => {
  const fs = await import('node:fs');
  const example = fs.readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
  const slugs = [...example.matchAll(/SALLYIP_\w+_MODEL\s*=\s*(\S+)/g)].map((m) => m[1].trim()).filter((s) => s && !s.startsWith('#'));
  for (const slug of slugs) {
    const rec = getProviderRecord(slug);
    assert.ok(rec && rec.slug, `missing registry record for ${slug}`);
    assert.ok('approved_for_confidential_ip' in rec, `missing approval flag for ${slug}`);
  }
  assert.ok(PROVIDER_REGISTRY.length >= 10);
});

test('default execution mode is fail-closed CONFIDENTIAL_IP', () => {
  delete process.env.SALLYIP_EXECUTION_MODE;
  assert.equal(resolveExecutionMode({}), 'CONFIDENTIAL_IP');
});
