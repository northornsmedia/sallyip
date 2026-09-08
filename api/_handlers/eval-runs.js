import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { listEvalRuns, runEval } from '../../src/lib/eval-harness.js'
import { requireEditor } from '../../src/lib/security.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    if (req.method === 'GET') return res.status(200).json(await listEvalRuns(sql, { limit: req.query?.limit }))
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    return res.status(201).json(await runEval(sql, user.id, (req.body || {}).name))
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Eval operation failed' } })
  }
}
