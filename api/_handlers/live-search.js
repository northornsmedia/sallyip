import { executeLiveIpSearch } from '../../src/lib/live-search/live-search-engine.js'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  try {
    let query = ''
    let limit = 8

    if (req.method === 'POST') {
      const body = req.body || {}
      query = body.query || body.q || ''
      limit = Number(body.limit) || 8
    } else {
      const url = new URL(req.url, 'http://localhost')
      query = url.searchParams.get('q') || url.searchParams.get('query') || ''
      limit = Number(url.searchParams.get('limit')) || 8
    }

    if (!query.trim()) {
      return res.status(400).json({ error: { message: 'A search query is required' } })
    }

    const searchResult = await executeLiveIpSearch(query, process.env, { limit })

    return res.status(200).json({
      query,
      analysis: searchResult.queryAnalysis,
      metrics: searchResult.metrics,
      results: searchResult.rawResults,
      evidence_passages: searchResult.evidencePassages,
    })
  } catch (error) {
    console.error('[live-search handler error]:', error)
    return res.status(500).json({ error: { message: error.message || 'Live search error' } })
  }
}
