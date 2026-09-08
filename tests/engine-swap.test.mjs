import test from 'node:test'
import assert from 'node:assert/strict'
import { sallyEngineInfo as CHAT_ENGINES, computeAdaptiveWeights, resolveEngines } from '../src/lib/sally-orchestrator.js'

test('default engines unchanged without env config', () => {
  assert.deepEqual(resolveEngines({}).map(e => e.slug), CHAT_ENGINES.map(e => e.slug))
})

test('primary flagship prepends with top weight', () => {
  const engines = resolveEngines({ SALLYIP_PRIMARY_MODEL: 'anthropic/claude-opus-4-6', SALLYIP_PRIMARY_KEY: 'ANTHROPIC_API_KEY' })
  assert.equal(engines[0].slug, 'anthropic/claude-opus-4-6')
  assert.equal(engines[0].key, 'ANTHROPIC_API_KEY')
  assert.ok(engines[0].weight >= 60)
  assert.equal(engines.length, CHAT_ENGINES.length + 1)
})

test('duplicate primary slug is not added twice', () => {
  const engines = resolveEngines({ SALLYIP_PRIMARY_MODEL: CHAT_ENGINES[0].slug })
  assert.equal(engines.length, CHAT_ENGINES.length)
})

test('malformed extra engines never break resolution', () => {
  const engines = resolveEngines({ SALLYIP_EXTRA_ENGINES: 'not-json{{{' })
  assert.equal(engines.length, CHAT_ENGINES.length)
  const withExtra = resolveEngines({ SALLYIP_EXTRA_ENGINES: JSON.stringify([{ slug: 'x/y', weight: 5 }]) })
  assert.equal(withExtra.length, CHAT_ENGINES.length + 1)
  assert.equal(withExtra.at(-1).weight, 5)
})

test('adaptive weights follow the resolved engine set', () => {
  const engines = resolveEngines({ SALLYIP_PRIMARY_MODEL: 'big/model' })
  const weighted = computeAdaptiveWeights(new Map(), engines)
  assert.equal(weighted.length, engines.length)
  assert.equal(weighted[0].slug, 'big/model')
})
