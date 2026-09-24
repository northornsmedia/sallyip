/**
 * SALLYIP LIVE SEARCH — ARXIV CONNECTOR
 * Real-time preprint search across 2.4M+ papers in Computer Science,
 * Artificial Intelligence, Electrical Engineering, Physics, and Biotech.
 */

import { XMLParser } from 'fast-xml-parser'

const array = v => (v == null ? [] : Array.isArray(v) ? v : [v])
const text = v => (typeof v === 'object' ? (v?.['#text'] ?? v?.$t ?? '') : v ?? '')

export async function searchArxiv(query, { limit = 5, timeoutMs = 3500, fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const cleanQ = String(query || '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!cleanQ) return []

    const url = new URL('https://export.arxiv.org/api/query')
    url.searchParams.set('search_query', `all:${cleanQ}`)
    url.searchParams.set('start', '0')
    url.searchParams.set('max_results', String(Math.min(20, Math.max(1, limit))))
    url.searchParams.set('sortBy', 'relevance')
    url.searchParams.set('sortOrder', 'descending')

    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SallyIP/1.0 (https://sallyip.com; mailto:team@sallyip.com)',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[arXiv] Search failed status: ${response.status}`)
      return []
    }

    const xml = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      attributeNamePrefix: '@_',
    })
    const parsed = parser.parse(xml)
    const feed = parsed?.feed || parsed
    const entries = array(feed?.entry)

    return entries.map(entry => {
      const rawTitle = text(entry?.title).replace(/\s+/g, ' ').trim()
      const rawSummary = text(entry?.summary).replace(/\s+/g, ' ').trim()
      const published = text(entry?.published) || ''
      const updated = text(entry?.updated) || ''
      const pubYear = published ? new Date(published).getFullYear() : null
      const authors = array(entry?.author)
        .map(a => text(a?.name))
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')
      const arxivId = text(entry?.id).replace(/^https?:\/\/arxiv\.org\/abs\//, '')
      const officialUrl = text(entry?.id) || `https://arxiv.org/abs/${arxivId}`
      const category = entry?.primary_category?.['@_term'] || entry?.category?.['@_term'] || 'cs.AI'

      return {
        id: `arxiv-${arxivId || Math.random().toString(36).slice(2)}`,
        provider: 'arxiv',
        providerName: 'arXiv Preprints (Cornell)',
        title: rawTitle || 'Untitled arXiv Paper',
        authors: authors || 'Unknown Authors',
        publicationDate: published.split('T')[0] || (pubYear ? `${pubYear}-01-01` : null),
        publicationYear: pubYear,
        venue: `arXiv:${arxivId} [${category}]`,
        citation: `${authors ? authors + ' ' : ''}(${pubYear || 'n.d.'}). "${rawTitle}". arXiv:${arxivId}`,
        doi: null,
        officialUrl,
        abstract: rawSummary.slice(0, 1500),
        citationCount: 0,
        concepts: [category],
        sourceType: 'scientific_preprint',
        authorityTier: 3,
        relevanceScore: 0.95,
      }
    })
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[arXiv] Error:', err.message)
    }
    return []
  } finally {
    clearTimeout(timer)
  }
}
