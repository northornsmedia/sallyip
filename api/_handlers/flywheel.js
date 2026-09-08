import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { exportGroundingPairs, exportRiskPairs, flywheelCounts } from '../../src/lib/flywheel-export.js'
import { requireEditor } from '../../src/lib/security.js'

const DATASETS = { grounding: exportGroundingPairs, risk: exportRiskPairs }

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })
    try { requireEditor(user) } catch (error) { return res.status(403).json({ error: { message: error.message } }) }
    if (req.method !== 'GET') return res.status(405).json({ error: { message: 'Method not allowed' } })
    const dataset = req.query?.dataset
    if (!dataset) return res.status(200).json(await flywheelCounts(sql, user.id))
    const exporter = DATASETS[dataset]
    if (!exporter) return res.status(400).json({ error: { message: 'Unknown dataset (grounding|risk)' } })
    const jsonl = await exporter(sql, user.id, { limit: req.query?.limit })
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Content-Disposition', `attachment; filename="sallyip-${dataset}.jsonl"`)
    return res.status(200).send(jsonl)
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Export failed' } })
  }
}
