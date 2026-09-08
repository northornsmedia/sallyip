import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { requireEditor } from '../../src/lib/security.js'
import { listAnswerCitations, recordAnswerCitations, verifyQuote } from '../../src/lib/citation-service.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    if (req.method === 'GET') {
      return res.status(200).json(await listAnswerCitations(sql, user.id, {
        conversation_id: req.query?.conversation_id || null,
        agent_run_id: req.query?.agent_run_id || null,
        matter_id: req.query?.matter_id || null,
      }))
    }
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
    const body = req.body || {}
    if ((body.action || 'record') === 'verify') {
      if (!body.passage_id) throw new Error('passage_id is required')
      const [p] = await sql`SELECT sp.content FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.passage_id} AND s.user_id=${user.id}`
      if (!p) throw new Error('Source passage not found')
      return res.status(200).json({ match_status: verifyQuote(p.content, body.quote || '') })
    }
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    return res.status(201).json(await recordAnswerCitations(sql, user.id, body))
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Citation operation failed' } })
  }
}
