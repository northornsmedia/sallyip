export const DOC_FORMATS = [
  { id: 'docx', label: 'Word' },
  { id: 'pdf', label: 'PDF' },
  { id: 'md', label: 'Markdown' },
]

export function buildExportPayload(doc, format) {
  return {
    format,
    title: doc?.title || 'SallyIP document',
    content: doc?.content || '',
    artifact_id: doc?.artifact?.id || null,
    artifact_version: doc?.artifact?.version || doc?.version || null,
    conversation_id: doc?.conversationId || null,
  }
}
