import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { logSecurityEvent, requireEditor } from '../../src/lib/security.js'
import { buildPlaybookInstruction, createPlaybook, getPlaybook, listPlaybooks, updatePlaybook } from '../../src/lib/playbook-service.js'
import { runAutomatedLegalWorkflow } from '../../src/lib/workflow-orchestrator.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    if (req.method === 'GET') {
      if (req.query?.id) return res.status(200).json(await getPlaybook(sql, user.id, req.query.id))
      return res.status(200).json(await listPlaybooks(sql, user.id))
    }
    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    const body = req.body || {}
    const action = body.action || 'create'
    if (action === 'create') return res.status(201).json(await createPlaybook(sql, user.id, body))
    if (action === 'update') return res.status(200).json(await updatePlaybook(sql, user.id, body.playbook_id, body))
    if (action === 'run') {
      const { playbook } = await getPlaybook(sql, user.id, body.playbook_id)
      const instruction = buildPlaybookInstruction(playbook, body.variables || {})
      const result = await runAutomatedLegalWorkflow(sql, user.id, {
        matterId: body.matter_id,
        conversationId: body.conversation_id,
        instruction,
        matterJurisdictions: body.matter_jurisdictions || (playbook.default_jurisdiction ? [playbook.default_jurisdiction] : []),
      })
      if (result?.run_id) {
        const [v] = await sql`SELECT max(version) AS version FROM legal_playbook_versions WHERE playbook_id=${playbook.id}`
        await sql`UPDATE legal_workflow_runs SET playbook_id=${playbook.id}, playbook_version=${v?.version || 1} WHERE id=${result.run_id}`
      }
      await logSecurityEvent(sql, { userId: user.id, event_type: 'playbook_run', req, metadata: { playbook_id: playbook.id } })
      return res.status(result ? 200 : 422).json(result || { error: { message: 'Playbook did not match an automated workflow' } })
    }
    return res.status(400).json({ error: { message: 'Unknown playbook action' } })
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Playbook operation failed' } })
  }
}
