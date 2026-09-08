import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { requireEditor } from '../../src/lib/security.js'
import { createReviewTable, getReviewTable, listReviewTables, runReviewTable } from '../../src/lib/vault-review-service.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    if (req.method === 'GET') {
      if (req.query?.id) return res.status(200).json(await getReviewTable(sql, user.id, req.query.id))
      return res.status(200).json(await listReviewTables(sql, user.id, req.query?.matter_id || null))
    }
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    const body = req.body || {}
    if ((body.action || 'create') === 'create') return res.status(201).json(await createReviewTable(sql, user.id, body))
    if (body.action === 'run') return res.status(200).json(await runReviewTable(sql, user.id, body.table_id))
    return res.status(400).json({ error: { message: 'Unknown review-table action' } })
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Review table operation failed' } })
  }
}
