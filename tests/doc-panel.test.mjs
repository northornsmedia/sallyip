import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExportPayload, DOC_FORMATS } from '../src/lib/doc-export.js'

test('export payload carries title, content and artifact refs', () => {
  const p = buildExportPayload({ title: 'NDA', content: '# Hi', version: 2, artifact: { id: 'a1', version: 2 }, conversationId: 'c1' }, 'docx')
  assert.equal(p.format, 'docx')
  assert.equal(p.title, 'NDA')
  assert.equal(p.artifact_id, 'a1')
  assert.equal(p.artifact_version, 2)
  assert.equal(p.conversation_id, 'c1')
})

test('export payload falls back safely on empty docs', () => {
  const p = buildExportPayload(null, 'pdf')
  assert.equal(p.title, 'SallyIP document')
  assert.equal(p.content, '')
  assert.equal(p.artifact_id, null)
})

test('three download formats offered', () => {
  assert.deepEqual(DOC_FORMATS.map(f => f.id), ['docx', 'pdf', 'md'])
})
