import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareChatMessages } from '../src/lib/sally-orchestrator.js'

test('prepareChatMessages creates single system message with memory recap for multi-turn history', () => {
  const messages = [
    { role: 'system', content: 'TASK ROUTE: Patent Drafting' },
    { role: 'user', content: 'draft a patent for our new mouse tech', artifact: { id: '1' } },
    { role: 'assistant', content: 'Tell me what is new and how it works', attachments: ['doc1'] },
    { role: 'user', content: 'it has an optical sensor that tracks on water and 3 thumb buttons' }
  ]

  const prepared = prepareChatMessages(messages)
  assert.equal(prepared[0].role, 'system')
  assert.match(prepared[0].content, /ACTIVE CONVERSATION MEMORY & ACCUMULATED CONTEXT/)
  assert.match(prepared[0].content, /draft a patent for our new mouse tech/)
  assert.match(prepared[0].content, /Tell me what is new and how it works/)
  assert.match(prepared[0].content, /MANDATORY RETENTION RULES/)

  // Exactly 3 dialogue turns: User -> Assistant -> User
  assert.equal(prepared.length, 4) // 1 system + 3 turns
  assert.equal(prepared[1].role, 'user')
  assert.equal(prepared[1].content, 'draft a patent for our new mouse tech')
  assert.equal(prepared[1].artifact, undefined) // stripped extra properties

  assert.equal(prepared[2].role, 'assistant')
  assert.equal(prepared[2].content, 'Tell me what is new and how it works')
  assert.equal(prepared[2].attachments, undefined)

  assert.equal(prepared[3].role, 'user')
  assert.equal(prepared[3].content, 'it has an optical sensor that tracks on water and 3 thumb buttons')
})

test('prepareChatMessages handles single turn cleanly without crashing', () => {
  const messages = [
    { role: 'user', content: 'hello' }
  ]
  const prepared = prepareChatMessages(messages)
  assert.equal(prepared.length, 2)
  assert.equal(prepared[0].role, 'system')
  assert.equal(prepared[1].role, 'user')
  assert.equal(prepared[1].content, 'hello')
})
