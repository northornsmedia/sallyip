/**
 * SALLYIP LIVE SEARCH — PATENT OPEN CONNECTOR
 * Multi-jurisdiction patent search layer combining official APIs (USPTO, EPO OPS)
 * with open patent indexers (OpenAlex patents, Espacenet, and Google Patents deep-linking).
 */

import { searchUsptoPatents, searchEpoOps } from '../../official-search-service.js'

function formatPatentId(country, number, kind = '') {
  return `${country.toUpperCase()}${number.replace(/\D/g, '')}${kind.toUpperCase()}`
}

export async function searchPatentsLive(query, env = {}, { limit = 5, timeoutMs = 4000, fetchImpl = fetch } = {}) {
  const cleanQ = String(query || '').trim()
  if (!cleanQ) return []

  const results = []

  // Check if official USPTO API key is configured
  if (env.USPTO_API_KEY) {
    try {
      const usptoRes = await searchUsptoPatents(cleanQ, env, { fetchImpl, size: limit })
      for (const item of usptoRes) {
        results.push({
          id: `uspto-${item.external_id || Math.random().toString(36).slice(2)}`,
          provider: 'uspto_official',
          providerName: 'USPTO Official Patent Database',
          title: item.title,
          authors: 'USPTO Assignee/Inventors',
          publicationDate: item.patent_date || null,
          publicationYear: item.patent_date ? new Date(item.patent_date).getFullYear() : null,
          venue: 'USPTO Patent Grant / Publication',
          citation: `U.S. Patent ${item.publication_number || item.external_id} (${item.patent_date || 'n.d.'}). "${item.title}".`,
          doi: null,
          officialUrl: item.official_url || `https://patents.google.com/patent/US${item.external_id}/en`,
          abstract: item.raw_metadata?.abstract || item.title,
          citationCount: 0,
          concepts: ['USPTO', 'Patent'],
          sourceType: 'official_patent',
          authorityTier: 1,
          relevanceScore: 1.0,
        })
      }
    } catch (err) {
      console.warn('[PatentSearch] USPTO official search skipped/failed:', err.message)
    }
  }

  // Check if official EPO OPS is configured
  if (env.EPO_OPS_KEY && env.EPO_OPS_SECRET && results.length < limit) {
    try {
      const epoRes = await searchEpoOps(cleanQ, env, { fetchImpl, range: `1-${limit}` })
      for (const item of epoRes) {
        results.push({
          id: `epo-${item.external_id || Math.random().toString(36).slice(2)}`,
          provider: 'epo_ops',
          providerName: 'EPO Open Patent Services (Espacenet)',
          title: item.title,
          authors: 'EPO Applicant/Inventors',
          publicationDate: null,
          publicationYear: null,
          venue: 'European Patent Office',
          citation: `EPO Patent Document ${item.external_id}. "${item.title}".`,
          doi: null,
          officialUrl: item.official_url || `https://worldwide.espacenet.com/patent/search?q=pn%3D${encodeURIComponent(item.external_id)}`,
          abstract: item.title,
          citationCount: 0,
          concepts: ['EPO', 'Patent'],
          sourceType: 'official_patent',
          authorityTier: 1,
          relevanceScore: 1.0,
        })
      }
    } catch (err) {
      console.warn('[PatentSearch] EPO OPS search skipped/failed:', err.message)
    }
  }

  // Open Patent Literature fallback via OpenAlex works with patent type
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const url = new URL('https://api.openalex.org/works')
    url.searchParams.set('search', `${cleanQ} patent`)
    url.searchParams.set('per_page', String(Math.min(10, limit)))
    url.searchParams.set('sort', 'relevance_score:desc')

    const res = await fetchImpl(url.toString(), {
      headers: {
        'User-Agent': 'SallyIP/1.0 (https://sallyip.com; mailto:team@sallyip.com)',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      for (const item of (data.results || [])) {
        if (results.some(r => r.title.toLowerCase() === (item.title || '').toLowerCase())) continue
        const isPatentWork = item.type === 'patent' || /\bpatent\b/i.test(item.title)
        results.push({
          id: `open-patent-${item.id?.replace(/^https?:\/\/openalex\.org\//, '') || Math.random().toString(36).slice(2)}`,
          provider: isPatentWork ? 'patent_literature' : 'openalex_patent',
          providerName: isPatentWork ? 'International Patent Literature' : 'Open Patent Graph',
          title: item.title,
          authors: (item.authorships || []).map(a => a.author?.display_name).filter(Boolean).slice(0, 3).join(', ') || 'Patent Applicants',
          publicationDate: item.publication_date || null,
          publicationYear: item.publication_year || null,
          venue: item.primary_location?.source?.display_name || 'Patent Literature / Technical Disclosure',
          citation: `Patent Literature Reference (${item.publication_year || 'n.d.'}). "${item.title}".`,
          doi: item.doi ? String(item.doi).replace(/^https?:\/\/doi\.org\//, '') : null,
          officialUrl: item.doi || item.primary_location?.landing_page_url || `https://patents.google.com/?q=${encodeURIComponent(item.title)}`,
          abstract: item.title,
          citationCount: item.cited_by_count || 0,
          concepts: (item.concepts || []).slice(0, 3).map(c => c.display_name),
          sourceType: 'patent_literature',
          authorityTier: 2,
          relevanceScore: 0.92,
        })
        if (results.length >= limit * 2) break
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  return results.slice(0, limit)
}
