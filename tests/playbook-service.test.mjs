import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlaybookInstruction, PLAYBOOK_TYPES, validatePlaybookDefinition } from '../src/lib/playbook-service.js'

test('playbook types cover IP workflows plus contracts', () => {
  assert.ok(PLAYBOOK_TYPES.includes('fto'))
  assert.ok(PLAYBOOK_TYPES.includes('trademark_clearance'))
  assert.ok(PLAYBOOK_TYPES.includes('contract_review'))
})

test('playbook definition requires instruction template', () => {
  assert.throws(() => validatePlaybookDefinition({}, 'fto'), /instruction_template/)
  assert.throws(() => validatePlaybookDefinition({ instruction_template: 'short' }, 'fto'), /min 10/)
})

test('playbook instruction fills variables and rejects missing', () => {
  const playbook = { definition: { instruction_template: 'Run FTO for {{product}} in {{jurisdiction}}.' } }
  assert.equal(buildPlaybookInstruction(playbook, { product: 'Product X', jurisdiction: 'India' }), 'Run FTO for Product X in India.')
  assert.throws(() => buildPlaybookInstruction(playbook, { product: 'X' }), /Missing playbook variables/)
})
