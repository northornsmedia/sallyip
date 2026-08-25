const FORMAT_ALIASES = new Map([
  ['pdf', 'pdf'], ['doc', 'docx'], ['docx', 'docx'], ['word', 'docx'],
  ['word document', 'docx'], ['xls', 'xlsx'], ['xlsx', 'xlsx'], ['excel', 'xlsx'],
  ['csv', 'csv'], ['markdown', 'md'], ['md', 'md'], ['txt', 'txt'],
  ['text file', 'txt'],
])

export const GENERATE_FILE_TOOL = Object.freeze({
  name: 'generate_file',
  description: 'Creates a real downloadable file from clean artifact content. Use for PDF, Word, spreadsheet, CSV, Markdown, or text exports. Never invent a link or claim file generation is unavailable.',
  formats: ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'md'],
})

export const FORBIDDEN_ARTIFACT_PHRASES = Object.freeze([
  "i can't directly generate", 'i cannot generate', "i can't create a pdf",
  'i cannot create a pdf', "i'm unable to create", 'unable to provide downloadable',
  'copy and paste this into', 'copy this into word', 'copy this into microsoft word',
  'save this as a pdf', 'save it as a pdf', 'open google docs', 'use google docs',
  'use microsoft word', 'i hope this helps', "let me know if you'd like changes",
])

export function validateArtifactContent(value) {
  const content = String(value || '').trim()
  if (!content) throw new Error('Artifact content is empty')
  if (content.length > 120000) throw new Error('Artifact content is too large')
  const phrase = FORBIDDEN_ARTIFACT_PHRASES.find(item => content.toLowerCase().includes(item))
  if (phrase) throw new Error('Conversational capability text detected in artifact content')
  return content
}

const FILE_PATTERN = /\b(pdf|docx?|word(?: document)?|xlsx?|excel|csv|markdown|md|txt|text file)\b/i
const EXPORT_PATTERN = /\b(create|generate|make|export|download|convert|provide|give|turn)\b/i
const DOCUMENT_PATTERN = /\b(draft|write|prepare|create|generate)\b[\s\S]*\b(agreement|contract|memorandum|memo|opinion|letter|report|notice|policy|brief|claim chart|checklist|document)\b/i
const REVISION_PATTERN = /\b(revise|change|replace|rename|amend|edit|update|remove|add|rewrite|restore)\b/i
const REFERENCE_PATTERN = /\b(this|that|it|previous|above|same|last|document|agreement|report|draft|version)\b/i

export function classifyDocumentIntent(input) {
  const text = String(input || '').trim()
  const fileMatch = text.match(FILE_PATTERN)
  const impliedExport = /\b(downloadable version|turn (?:this|that|it) into (?:a )?document)\b/i.test(text)
  const format = fileMatch ? FORMAT_ALIASES.get(fileMatch[1].toLowerCase()) : impliedExport ? 'pdf' : null
  const requestsExport = Boolean(format && (EXPORT_PATTERN.test(text) || text.split(/\s+/).length <= 6))
  const revision = REVISION_PATTERN.test(text)
  const draft = DOCUMENT_PATTERN.test(text)
  const referencesArtifact = REFERENCE_PATTERN.test(text) || (requestsExport && text.split(/\s+/).length <= 6)
  return {
    intent: requestsExport ? 'EXPORT_DOCUMENT' : revision ? 'EDIT_DOCUMENT' : draft ? 'DRAFT_LEGAL_DOCUMENT' : 'CHAT',
    format: requestsExport ? format : null,
    references_artifact: referencesArtifact,
    requires_document_content: Boolean(draft || (requestsExport && !referencesArtifact)),
    revision,
  }
}

export async function resolveArtifactReference(sql, userId, conversationId, requested = {}) {
  if (!conversationId) return null
  const [conversation] = await sql`
    SELECT id,last_active_artifact_id FROM conversations
    WHERE id=${conversationId} AND user_id=${userId} LIMIT 1`
  if (!conversation) return null
  const artifactId = requested.artifact_id || conversation.last_active_artifact_id
  if (!artifactId) return null
  const [artifact] = await sql`
    SELECT a.id,a.title,a.document_type,a.active_version,a.status,a.jurisdiction,a.practice_area
    FROM artifacts a WHERE a.id=${artifactId} AND a.user_id=${userId} AND a.conversation_id=${conversation.id} LIMIT 1`
  if (!artifact) return null
  const versionNumber = Number(requested.artifact_version || artifact.active_version)
  const [version] = await sql`
    SELECT version,content,content_format,metadata,sources FROM artifact_versions
    WHERE artifact_id=${artifact.id} AND version=${versionNumber} LIMIT 1`
  return version ? { ...artifact, ...version, id: artifact.id } : null
}

export function buildGenerateFileToolCall(intent, artifact) {
  if (intent?.intent !== 'EXPORT_DOCUMENT' || !intent.format || !artifact) return null
  return {
    name: GENERATE_FILE_TOOL.name,
    arguments: {
      format: intent.format,
      title: artifact.title,
      artifact_id: artifact.id,
      artifact_version: artifact.version,
      metadata: {
        document_type: artifact.document_type,
        jurisdiction: artifact.jurisdiction,
        practice_area: artifact.practice_area,
      },
    },
  }
}
