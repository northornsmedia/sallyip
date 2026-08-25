import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../src/lib/auth.js'
import { buildGenerateFileToolCall, classifyDocumentIntent, GENERATE_FILE_TOOL, resolveArtifactReference } from '../src/lib/document-tool-service.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
  try {
    const sql = neon(process.env.DATABASE_URL)
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    const body = req.body || {}
    const intent = classifyDocumentIntent(body.message)
    const artifact = intent.references_artifact
      ? await resolveArtifactReference(sql, user.id, body.conversation_id, body)
      : null
    const toolCall = buildGenerateFileToolCall(intent, artifact)
    return res.status(200).json({ intent, tool: GENERATE_FILE_TOOL, tool_call: toolCall, artifact })
  } catch {
    return res.status(500).json({ error: { message: 'Document orchestration failed' } })
  }
}

