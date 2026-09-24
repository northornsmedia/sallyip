/**
 * SALLYIP LIVE SEARCH — EUROPE PMC CONNECTOR
 * Real-time biomedical, life sciences, and patent-cited literature.
 * Open REST API with full abstracts, DOIs, PMIDs, and patent citations.
 */

export async function searchEuropePmc(query, { limit = 5, timeoutMs = 3500, fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const cleanQ = String(query || '').trim()
    if (!cleanQ) return []

    const url = new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search')
    url.searchParams.set('query', cleanQ)
    url.searchParams.set('format', 'json')
    url.searchParams.set('pageSize', String(Math.min(20, Math.max(1, limit))))
    url.searchParams.set('resultType', 'core')

    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SallyIP/1.0 (https://sallyip.com; mailto:team@sallyip.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[EuropePMC] Search failed status: ${response.status}`)
      return []
    }

    const data = await response.json()
    const results = Array.isArray(data?.resultList?.result) ? data.resultList.result : []

    return results.map(item => {
      const title = String(item.title || 'Untitled Europe PMC Record').replace(/\.$/, '')
      const authors = item.authorString || 'Unknown Authors'
      const year = item.pubYear ? parseInt(item.pubYear, 10) : null
      const journal = item.journalTitle || 'Biomedical / Life Sciences Journal'
      const doi = item.doi || null
      const pmid = item.pmid || null
      const officialUrl = doi ? `https://doi.org/${doi}` : (pmid ? `https://europepmc.org/article/MED/${pmid}` : `https://europepmc.org/article/${item.source}/${item.id}`)

      return {
        id: `epmc-${item.id || pmid || Math.random().toString(36).slice(2)}`,
        provider: 'europe_pmc',
        providerName: 'Europe PMC / Life Sciences',
        title,
        authors,
        publicationDate: year ? `${year}-01-01` : null,
        publicationYear: year,
        venue: journal,
        citation: `${authors} (${year || 'n.d.'}). "${title}". ${journal}${doi ? `, DOI: ${doi}` : ''}`,
        doi,
        officialUrl,
        abstract: String(item.abstractText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500),
        citationCount: item.citedByCount || 0,
        concepts: ['Life Sciences', 'Biotech', 'Pharmacology'],
        sourceType: 'biomedical_literature',
        authorityTier: 2,
        relevanceScore: 0.9,
      }
    })
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[EuropePMC] Error:', err.message)
    }
    return []
  } finally {
    clearTimeout(timer)
  }
}
