import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGenerateFileToolCall, classifyDocumentIntent, GENERATE_FILE_TOOL, validateArtifactContent } from '../src/lib/document-tool-service.js'

test('bare PDF request resolves as an artifact export', () => {
  const intent = classifyDocumentIntent('PDF please')
  assert.equal(intent.intent, 'EXPORT_DOCUMENT')
  assert.equal(intent.format, 'pdf')
  assert.equal(intent.references_artifact, true)
  assert.equal(intent.requires_document_content, false)
})

test('previous agreement export preserves the selected version', () => {
  const intent = classifyDocumentIntent('Make the previous agreement a Word document')
  const call = buildGenerateFileToolCall(intent, { id: 'art-1', version: 2, title: 'IP Licence', document_type: 'agreement' })
  assert.equal(call.name, 'generate_file')
  assert.equal(call.arguments.format, 'docx')
  assert.equal(call.arguments.artifact_version, 2)
  assert.equal(call.arguments.content, undefined)
})

test('draft and export requires new clean document content', () => {
  const intent = classifyDocumentIntent('Create a trademark coexistence agreement as PDF')
  assert.equal(intent.intent, 'EXPORT_DOCUMENT')
  assert.equal(intent.requires_document_content, true)
})

test('tool contract exposes only supported semantic formats', () => {
  assert.deepEqual(GENERATE_FILE_TOOL.formats, ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'md'])
})

test('artifact validation rejects capability and manual-export chatter', () => {
  assert.throws(() => validateArtifactContent("I can't directly generate a PDF; copy this into Microsoft Word."), /capability/i)
  assert.equal(validateArtifactContent('# Agreement\nThe parties agree as follows.'), '# Agreement\nThe parties agree as follows.')
})
