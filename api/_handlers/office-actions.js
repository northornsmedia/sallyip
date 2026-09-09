import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { createOfficeAction, getOfficeAction, listOfficeActions, proposeAmendment, reviewAmendment } from '../../src/lib/office-action-service.js'
import { requireEditor } from '../../src/lib/security.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    if (req.method === 'GET') {
      if (req.query?.id) return res.status(200).json(await getOfficeAction(sql, user.id, req.query.id))
      return res.status(200).json(await listOfficeActions(sql, user.id, req.query?.matter_id || null))
    }
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    const body = req.body || {}
    if ((body.action || 'create') === 'create') return res.status(201).json(await createOfficeAction(sql, user.id, body))
    if (body.action === 'amend') return res.status(201).json(await proposeAmendment(sql, user.id, body))
    if (body.action === 'review') return res.status(200).json(await reviewAmendment(sql, user.id, body))
    return res.status(400).json({ error: { message: 'Unknown office-action action' } })
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Office action operation failed' } })
  }
}
