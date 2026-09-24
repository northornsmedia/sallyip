/**
 * SALLYIP LIVE SEARCH — OPENALEX CONNECTOR
 * OpenAlex is a fully open catalog of 250M+ scientific papers, preprints,
 * books, dissertations, and international patent literature citations.
 * Completely free, high rate-limit with polite mailto header.
 */

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return ''
  const words = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        words[pos] = word
      }
    }
  }
  return words.filter(Boolean).join(' ')
}

export async function searchOpenAlex(query, { limit = 6, timeoutMs = 3500, fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const cleanQ = String(query || '').trim()
    if (!cleanQ) return []

    const url = new URL('https://api.openalex.org/works')
    url.searchParams.set('search', cleanQ)
    url.searchParams.set('per_page', String(Math.min(25, Math.max(1, limit))))
    url.searchParams.set('sort', 'relevance_score:desc')

    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SallyIP/1.0 (https://sallyip.com; mailto:team@sallyip.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[OpenAlex] Search failed status: ${response.status}`)
      return []
    }

    const data = await response.json()
    const results = Array.isArray(data?.results) ? data.results : []

    return results.map(item => {
      const abstract = reconstructAbstract(item.abstract_inverted_index) || ''
      const authors = (item.authorships || [])
        .map(a => a.author?.display_name)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')
      const doi = item.doi ? String(item.doi).replace(/^https?:\/\/doi\.org\//, '') : null
      const officialUrl = item.doi || item.primary_location?.landing_page_url || item.open_access?.oa_url || `https://openalex.org/${item.id}`
      const venue = item.primary_location?.source?.display_name || item.host_venue?.display_name || 'Academic Literature'
      const year = item.publication_year || (item.publication_date ? new Date(item.publication_date).getFullYear() : null)

      return {
        id: `openalex-${item.id?.replace(/^https?:\/\/openalex\.org\//, '') || Math.random().toString(36).slice(2)}`,
        provider: 'openalex',
        providerName: 'OpenAlex Global Graph',
        title: item.title || 'Untitled Research Work',
        authors: authors || 'Unknown Authors',
        publicationDate: item.publication_date || (year ? `${year}-01-01` : null),
        publicationYear: year,
        venue,
        citation: `${authors ? authors + ' ' : ''}(${year || 'n.d.'}). "${item.title}". ${venue}${doi ? `, DOI: ${doi}` : ''}`,
        doi,
        officialUrl,
        abstract: abstract.slice(0, 1500),
        citationCount: item.cited_by_count || 0,
        concepts: (item.concepts || []).slice(0, 5).map(c => c.display_name),
        sourceType: 'scientific_literature',
        authorityTier: 2,
        relevanceScore: item.relevance_score || 1.0,
      }
    })
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[OpenAlex] Error:', err.message)
    }
    return []
  } finally {
    clearTimeout(timer)
  }
}
