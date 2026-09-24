/**
 * SALLYIP LIVE SEARCH — CROSSREF CONNECTOR
 * CrossRef is the official DOI registration agency for scholarly publications,
 * covering 150M+ peer-reviewed journals, IEEE conferences, and technical specs.
 */

export async function searchCrossRef(query, { limit = 5, timeoutMs = 3500, fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const cleanQ = String(query || '').trim()
    if (!cleanQ) return []

    const url = new URL('https://api.crossref.org/works')
    url.searchParams.set('query', cleanQ)
    url.searchParams.set('rows', String(Math.min(20, Math.max(1, limit))))
    url.searchParams.set('sort', 'relevance')

    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SallyIP/1.0 (https://sallyip.com; mailto:team@sallyip.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[CrossRef] Search failed status: ${response.status}`)
      return []
    }

    const data = await response.json()
    const items = Array.isArray(data?.message?.items) ? data.message.items : []

    return items.map(item => {
      const title = Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled Work')
      const authors = (item.author || [])
        .map(a => [a.given, a.family].filter(Boolean).join(' '))
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')
      const year = item.published?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || null
      const containerTitle = Array.isArray(item['container-title']) ? item['container-title'][0] : (item['container-title'] || 'Scholarly Publisher')
      const doi = item.DOI || null
      const officialUrl = doi ? `https://doi.org/${doi}` : (item.URL || null)
      const cleanAbstract = String(item.abstract || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      return {
        id: `crossref-${doi ? doi.replace(/[^\w-]/g, '_') : Math.random().toString(36).slice(2)}`,
        provider: 'crossref',
        providerName: 'CrossRef Registry',
        title: title || 'Untitled Publication',
        authors: authors || 'Unknown Authors',
        publicationDate: year ? `${year}-01-01` : null,
        publicationYear: year,
        venue: containerTitle,
        citation: `${authors ? authors + ' ' : ''}(${year || 'n.d.'}). "${title}". ${containerTitle}${doi ? `, DOI: ${doi}` : ''}`,
        doi,
        officialUrl,
        abstract: cleanAbstract.slice(0, 1500),
        citationCount: item['is-referenced-by-count'] || 0,
        concepts: Array.isArray(item.subject) ? item.subject.slice(0, 4) : [],
        sourceType: 'peer_reviewed_literature',
        authorityTier: 2,
        relevanceScore: item.score || 0.9,
      }
    })
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[CrossRef] Error:', err.message)
    }
    return []
  } finally {
    clearTimeout(timer)
  }
}
