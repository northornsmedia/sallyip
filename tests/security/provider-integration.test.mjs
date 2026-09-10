import test from 'node:test';
import assert from 'node:assert/strict';

// P0-A runtime call-graph proof: CONFIDENTIAL_IP / HIGHLY_CONFIDENTIAL can NEVER reach :free.
test('CONFIDENTIAL_IP chat fails closed without approved provider and never fetches', async () => {
  const { orchestrateSally } = await import('../../src/lib/sally-orchestrator.js');
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => { calls.push(args); throw new Error('must not fetch'); };
  try {
    await assert.rejects(
      () => orchestrateSally([{ role: 'user', content: 'unpublished invention XYZ' }], { SALLYIP_EXECUTION_MODE: 'CONFIDENTIAL_IP' }, 'https://test.invalid', {}),
      (e) => e.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE'
    );
    assert.equal(calls.length, 0, 'no provider fetch may occur on fail-closed path');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('HIGHLY_CONFIDENTIAL blocks even conditionally-approved Gemini without explicit primary approval', async () => {
  const { orchestrateSally } = await import('../../src/lib/sally-orchestrator.js');
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => { calls.push(args); throw new Error('must not fetch'); };
  try {
    await assert.rejects(
      () => orchestrateSally([{ role: 'user', content: 'trade secret' }], { SALLYIP_EXECUTION_MODE: 'HIGHLY_CONFIDENTIAL', GEMINI_API_KEY: 'x' }, 'https://test.invalid', {}),
      (e) => e.code === 'CONFIDENTIAL_PROVIDER_UNAVAILABLE'
    );
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('CONFIDENTIAL_IP retrieval degrades to lexical-only without embedding fetch', async () => {
  const { retrieveHybridEvidence } = await import('../../src/lib/verification-service.js');
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => { calls.push(args); return { ok: false, status: 403, json: async () => ({}) }; };
  const fakeSql = (strings, ...values) => {
    const q = strings.join(' ');
    if (q.includes('legal_sources')) return Promise.resolve([]);
    return Promise.resolve([]);
  };
  try {
    const out = await retrieveHybridEvidence(fakeSql, 'u1', 'm1', 'composition of matter', {
      embeddingKey: 'k', embeddingModel: 'liquid/lfm-2.5-embedding-350m:free', mode: 'CONFIDENTIAL_IP',
    });
    assert.ok(Array.isArray(out));
    assert.ok(calls.length === 0, 'free embedding endpoint must not be called for confidential retrieval');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('embeddings/rerank handlers reject confidential free-model calls with 403', async () => {
  const emb = (await import('../../api/_handlers/embeddings.js')).default;
  const rer = (await import('../../api/_handlers/rerank.js')).default;
  const res = (code) => ({ code, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
  process.env.SALLYIP_EXECUTION_MODE = 'CONFIDENTIAL_IP';
  process.env.SALLYIP_EMBEDDING_MODEL = 'liquid/lfm-2.5-embedding-350m:free';
  process.env.SALLYIP_RERANK_MODEL = 'nvidia/llama-nemotron-rerank-vl-1b-v2:free';
  const r1 = res(); await emb({ method: 'POST', body: { input: 'secret invention' } }, r1);
  assert.equal(r1.code, 403);
  const r2 = res(); await rer({ method: 'POST', body: { query: 'secret', documents: [{ text: 'passage' }] } }, r2);
  assert.equal(r2.code, 403);
  delete process.env.SALLYIP_EXECUTION_MODE;
});
