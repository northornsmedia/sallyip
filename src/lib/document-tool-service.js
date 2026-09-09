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
const EXPORT_PATTERN = /\b(create|generate|make|export|download|convert|provide|give|turn|draft|write|prepare)\b/i
const DOCUMENT_PATTERN = /\b(draft|write|prepare|create|generate)\b[\s\S]*\b(agreement|contract|memorandum|memo|opinion|letter|report|notice|policy|brief|claim chart|checklist|document|nda|patent application|specification|claims|assignment|licence|license|declaration|petition)\b/i
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)) return null
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

export function unescapeStringLiteral(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
}

export function sanitizeModelResponse(input) {
  if (typeof input !== 'string') return ''
  let text = input.trim()

  // 1. Check for <itool_call_begin> or [generate_file(...) or <tool_call>
  const toolCallMatch = text.match(/<itool_call_begin>[\s\S]*?(?:<itool_call_end>|$)/i) ||
                        text.match(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/i) ||
                        text.match(/\[generate_file\([\s\S]*?\)(?:\]|$)/i)

  if (toolCallMatch) {
    const rawCall = toolCallMatch[0]
    const beforeCall = text.slice(0, toolCallMatch.index).trim()
    const afterCall = text.slice(toolCallMatch.index + rawCall.length).trim()

    let extractedContent = ''

    // Pattern 1: clean_document_content='...' or clean_document_content="..." or content='...'
    const contentArgMatch = rawCall.match(/(?:clean_document_content|content|document_content|text)\s*=\s*(['"])([\s\S]*?)\1(?:\s*,\s*[a-zA-Z_]+\s*=|\s*\)|$)/)

    if (contentArgMatch) {
      extractedContent = unescapeStringLiteral(contentArgMatch[2])
    } else {
      // Pattern 2: JSON payload inside tool_call
      const jsonMatch = rawCall.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          const args = parsed.arguments || parsed.parameters || parsed
          extractedContent = args.clean_document_content || args.content || args.text || ''
        } catch {}
      }
    }

    if (!extractedContent) {
      // Pattern 3: Fallback unclosed string match
      const fallbackMatch = rawCall.match(/(?:clean_document_content|content)\s*=\s*(['"])([\s\S]+)/)
      if (fallbackMatch) {
        let rawExtracted = fallbackMatch[2].replace(/(?:['"]\s*\)?\s*\]?\s*(?:<itool_call_end>)?|\s*\)?\s*\]?)$/, '')
        extractedContent = unescapeStringLiteral(rawExtracted)
      }
    }

    const parts = []
    if (beforeCall) parts.push(beforeCall)
    if (extractedContent) parts.push(extractedContent)
    if (afterCall) parts.push(afterCall)

    text = parts.filter(Boolean).join('\n\n')
  }

  // 2. Strip any remaining leaked tool-call tags or marker tokens
  text = text
    .replace(/<\/?i?tool_call(?:_begin|_end)?>/gi, '')
    .replace(/<\|(?:action_start|action_end|im_start|im_end|thought|action_thought)\b[^>]*>/gi, '')
    .replace(/\[generate_file\([\s\S]*?\)\]/gi, '')

  // 3. Fix unescaped literal `\n` in text that was rendered with literal backslash-n escapes
  if (text.includes('\\n') && !text.includes('```')) {
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
  }

  // 4. Strip leaked internal safety/classifier tags
  text = text.replace(/^(?:User Safety:\s*safe\s*|Safety:\s*safe\s*|Assessment:\s*safe\s*)+/i, '').trim()

  return text.trim()
}
