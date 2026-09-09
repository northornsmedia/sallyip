import { neon } from '@neondatabase/serverless'
import { getSessionUser } from '../../src/lib/auth.js'
import { logSecurityEvent, requireEditor } from '../../src/lib/security.js'
import {
  createPatentDraft,
  getPatentDraft,
  listPatentDrafts,
  updateDraftSection,
  generateDraftSection,
  screenSubjectMatter101,
  verifyClaimSupport112,
  assembleFullSpecification
} from '../../src/lib/patent-drafting-service.js'

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL)
  try {
    const user = await getSessionUser(sql, req.headers.cookie)
    if (!user) return res.status(401).json({ error: { message: 'Not authenticated' } })

    if (req.method === 'GET') {
      const draftId = req.query?.id
      if (draftId) {
        const data = await getPatentDraft(sql, user.id, draftId)
        return res.status(200).json(data)
      }
      const matterId = req.query?.matter_id
      const data = await listPatentDrafts(sql, user.id, matterId)
      return res.status(200).json(data)
    }

    if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })

    const body = req.body || {}
    const action = body.action || 'create'

    try { requireEditor(user) } catch (err) { return res.status(403).json({ error: { message: err.message } }) }

    if (action === 'create') {
      const draft = await createPatentDraft(sql, user.id, body)
      await logSecurityEvent(sql, { userId: user.id, event_type: 'patent_draft_created', req, metadata: { draft_id: draft.draft.id } })
      return res.status(201).json(draft)
    }

    if (action === 'screen_101') {
      const screening = screenSubjectMatter101(body.disclosure_text || '')
      if (body.draft_id) {
        await sql`UPDATE patent_drafts SET screening_results=${JSON.stringify(screening)}::jsonb, updated_at=now() WHERE id=${body.draft_id} AND user_id=${user.id}`
      }
      return res.status(200).json({ screening })
    }

    if (action === 'generate_section') {
      const section = await generateDraftSection(process.env, sql, user.id, {
        draftId: body.draft_id,
        sectionKey: body.section_key,
        customInstructions: body.custom_instructions
      })
      return res.status(200).json({ section })
    }

    if (action === 'update_section') {
      const section = await updateDraftSection(sql, user.id, body.draft_id, body.section_key, body.content, body.review_notes)
      return res.status(200).json({ section })
    }

    if (action === 'verify_112') {
      const verification = verifyClaimSupport112(body.claims_text || '', body.spec_text || '')
      if (body.draft_id) {
        await sql`UPDATE patent_drafts SET support_matrix=${JSON.stringify(verification.matrix)}::jsonb, updated_at=now() WHERE id=${body.draft_id} AND user_id=${user.id}`
      }
      return res.status(200).json({ verification })
    }

    if (action === 'assemble') {
      const { draft, sections } = await getPatentDraft(sql, user.id, body.draft_id)
      const fullDoc = assembleFullSpecification(draft, sections)
      return res.status(200).json({ fullDoc, title: draft.title, filing_type: draft.filing_type })
    }

    if (action === 'approve') {
      const [draft] = await sql`
        UPDATE patent_drafts 
        SET is_approved=true, status='approved', attorney_review_notes=${body.notes || null}, updated_at=now()
        WHERE id=${body.draft_id} AND user_id=${user.id}
        RETURNING *
      `
      await logSecurityEvent(sql, { userId: user.id, event_type: 'patent_draft_approved', req, metadata: { draft_id: body.draft_id } })
      return res.status(200).json({ draft })
    }

    return res.status(400).json({ error: { message: `Unknown action: ${action}` } })
  } catch (error) {
    return res.status(400).json({ error: { message: error.message || 'Patent drafting operation failed' } })
  }
}
