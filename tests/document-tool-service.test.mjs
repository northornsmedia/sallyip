import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGenerateFileToolCall, classifyDocumentIntent, GENERATE_FILE_TOOL, sanitizeModelResponse, unescapeStringLiteral, validateArtifactContent } from '../src/lib/document-tool-service.js'

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

test('sanitizeModelResponse extracts clean document content from <itool_call_begin> generate_file calls', () => {
  const rawResponse = `I can help you file a trademark in the UK. Let me provide you with a comprehensive document for UK trademark registration.

<itool_call_begin> [generate_file(format='PDF', title='UK Trademark Application Form and Filing Guide', filename='uk_trademark_application.pdf', clean_document_content='# UK TRADEMARK APPLICATION\\n\\n## INTELLECTUAL PROPERTY OFFICE (UK IPO)\\n\\n---\\n\\n## SECTION 1: APPLICANT INFORMATION\\n\\nApplicant Name: [Full legal name of applicant]')]`

  const cleaned = sanitizeModelResponse(rawResponse)
  assert.ok(cleaned.includes('I can help you file a trademark in the UK.'))
  assert.ok(!cleaned.includes('<itool_call_begin>'))
  assert.ok(!cleaned.includes('generate_file('))
  assert.ok(cleaned.includes('# UK TRADEMARK APPLICATION\n\n## INTELLECTUAL PROPERTY OFFICE (UK IPO)'))
  assert.ok(cleaned.includes('Applicant Name: [Full legal name of applicant]'))
  assert.ok(!cleaned.includes('\\n\\n'))
})

test('sanitizeModelResponse extracts JSON tool calls and unescapes newlines', () => {
  const rawResponse = `Here is your requested draft:

<tool_call>
{"name": "generate_file", "arguments": {"clean_document_content": "# Coexistence Agreement\\n\\n1. Scope of use\\n2. Territory"}}
</tool_call>`

  const cleaned = sanitizeModelResponse(rawResponse)
  assert.ok(!cleaned.includes('<tool_call>'))
  assert.ok(!cleaned.includes('generate_file'))
  assert.ok(cleaned.includes('# Coexistence Agreement\n\n1. Scope of use\n2. Territory'))
})

test('sanitizeModelResponse fixes literal \\n escapes in plain responses', () => {
  const rawResponse = `also consider a prior art search.\\n\\n### 3. Choose the Correct Type\\n- Registered Trademark: Requires formal registration.`
  const cleaned = sanitizeModelResponse(rawResponse)
  assert.equal(cleaned, `also consider a prior art search.\n\n### 3. Choose the Correct Type\n- Registered Trademark: Requires formal registration.`)
})

