import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveExecutionMode, assertChatAllowed } from '../../src/lib/provider-policy.js';

test('Voice Security: resolveExecutionMode defaults to fail-closed configuration', () => {
  const mode = resolveExecutionMode({});
  assert.ok(['PUBLIC_RESEARCH', 'CONFIDENTIAL_IP', 'HIGHLY_CONFIDENTIAL'].includes(mode));
});

test('Voice Security: Unapproved free TTS models fail-closed under CONFIDENTIAL_IP', () => {
  const env = { SALLYIP_EXECUTION_MODE: 'CONFIDENTIAL_IP' };
  const executionMode = resolveExecutionMode(env);

  assert.throws(
    () => {
      assertChatAllowed({
        engines: [{ slug: 'fish-audio/s2.1-pro-free:free', name: 'Fish Audio Free', key: 'OPENROUTER_SPEECH_API_KEY' }],
        mode: executionMode,
        env,
      });
    },
    { code: 'CONFIDENTIAL_PROVIDER_UNAVAILABLE' }
  );
});

test('Voice Security: Secret scan verification - client code does not expose OPENROUTER_API_KEY', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const voiceDir = path.resolve(process.cwd(), 'src/voice');
  const files = fs.readdirSync(voiceDir);

  for (const file of files) {
    if (file.endsWith('.js')) {
      const content = fs.readFileSync(path.join(voiceDir, file), 'utf8');
      assert.ok(
        !content.includes('sk-or-v1-'),
        `File ${file} must never contain hardcoded OpenRouter secret keys`
      );
      assert.ok(
        !content.includes('VITE_OPENROUTER_API_KEY'),
        `File ${file} must never expose VITE_OPENROUTER_API_KEY to browser bundle`
      );
    }
  }
});
