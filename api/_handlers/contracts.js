import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { logSecurityEvent, requireEditor } from '../../src/lib/security.js'
import { createContract, getContract, listTemplates, reviewContract, updateContract } from '../../src/lib/contract-service.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    if (req.method === 'GET') {
      if (req.query?.id) return res.status(200).json(await getContract(sql, user.id, req.query.id))
      if (req.query?.templates !== undefined) return res.status(200).json(await listTemplates(sql))
      const contracts = await sql`SELECT id, title, contract_type, jurisdiction, status, active_version, updated_at FROM legal_contracts WHERE user_id=${user.id} ORDER BY updated_at DESC LIMIT 100`
      return res.status(200).json({ contracts })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
    const body = req.body || {}
    const action = body.action || 'create'
    if (action === 'templates') return res.status(200).json(await listTemplates(sql))
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    if (action === 'create') return res.status(201).json(await createContract(sql, user.id, body))
    if (action === 'review') {
      const result = await reviewContract(sql, user.id, body.contract_id)
      await logSecurityEvent(sql, { userId: user.id, event_type: 'contract_review', req, metadata: { contract_id: body.contract_id } })
      return res.status(200).json(result)
    }
    if (action === 'update') return res.status(200).json(await updateContract(sql, user.id, body.contract_id, body))
    return res.status(400).json({ error: { message: 'Unknown contract action' } })
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Contract operation failed' } })
  }
}
