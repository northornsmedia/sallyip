import { NextResponse } from 'next/server'
import { loadCatalogue, loadDocumentProfile } from '../../../src/lib/document-engine.js'
import { routeConversationalIntent, buildDocumentSearchResults, buildDocumentTree, validateDocumentRequest } from '../../../src/lib/document-engine-router.js'
import { verifyDocumentContent } from '../../../src/lib/document-engine.js'
import { getSessionUser } from '../../../src/lib/auth.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const slug = searchParams.get('slug')
    const query = searchParams.get('q')

    if (action === 'profile' && slug) {
      const profile = await loadDocumentProfile(slug)
      if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      return NextResponse.json({ profile })
    }

    if (action === 'tree') {
      const catalogue = await loadCatalogue()
      const tree = buildDocumentTree(catalogue)
      return NextResponse.json({ tree, categories: catalogue.categories, stats: catalogue.stats })
    }

    if (action === 'search' && query) {
      const catalogue = await loadCatalogue()
      const results = buildDocumentSearchResults(query, catalogue)
      return NextResponse.json({ results, query })
    }

    const catalogue = await loadCatalogue()
    return NextResponse.json({
      categories: catalogue.categories,
      stats: catalogue.stats,
      aliases: Array.from(catalogue.aliases?.entries() || []).slice(0, 50)
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(await import('neon').then(m => m.neon(process.env.DATABASE_URL)), request.headers.cookie)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { action, document_family, answers, jurisdiction, matter_id, content } = body

    if (action === 'route') {
      const matterContext = matter_id ? await loadMatterContext(user.id, matter_id) : {}
      const result = await routeConversationalIntent(body.userInput || '', matterContext)
      return NextResponse.json(result)
    }

    if (action === 'draft') {
      if (!document_family) return NextResponse.json({ error: 'document_family required' }, { status: 400 })
      const profile = await loadDocumentProfile(document_family)
      if (!profile) return NextResponse.json({ error: 'Document profile not found' }, { status: 404 })
      const validated = validateDocumentRequest({ action, document_family, profile, jurisdiction })
      if (!validated.valid) return NextResponse.json({ errors: validated.errors }, { status: 400 })

      const draftPlan = { content: '', profile: profile.slug, sections: profile.sections?.length || 0, jurisdiction, status: 'DRAFTING' }
      return NextResponse.json({ action: 'DRAFTING', document_family, profile, draft_plan: draftPlan })
    }

    if (action === 'verify') {
      const profile = await loadDocumentProfile(content?.profile || body.profile)
      const verification = await verifyDocumentContent(profile, content, jurisdiction)
      return NextResponse.json(verification)
    }

    if (action === 'catalogue') {
      const catalogue = await loadCatalogue()
      return NextResponse.json(catalogue)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function loadMatterContext(userId, matterId) {
  try {
    const sql = (await import('@neondatabase/serverless')).neon(process.env.DATABASE_URL)
    const { matterContextPrompt, getMatterContext } = await import('../../../src/lib/matter-service.js')
    const context = await getMatterContext(sql, userId, matterId)
    return context ? { matter: context.matter, facts: context.facts, entities: context.entities } : {}
  } catch { return {} }
}