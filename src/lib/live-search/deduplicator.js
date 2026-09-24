/**
 * SALLYIP LIVE SEARCH — LAYER 4: DEDUPLICATOR & ENTITY RESOLUTION
 * Resolves identical publications, preprints, and patents across multiple
 * repositories (OpenAlex, arXiv, CrossRef, Europe PMC, USPTO).
 */

function normalizeTitle(title = '') {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1.split(' ').filter(w => w.length > 2))
  const set2 = new Set(str2.split(' ').filter(w => w.length > 2))
  if (!set1.size || !set2.size) return 0
  let intersection = 0
  for (const token of set1) {
    if (set2.has(token)) intersection++
  }
  const jaccard = intersection / (set1.size + set2.size - intersection)
  const containment = intersection / Math.min(set1.size, set2.size)
  return Math.max(jaccard, containment >= 0.85 ? 0.85 : 0)
}

export function deduplicateCandidates(candidates = []) {
  const seenDois = new Map()
  const seenArxiv = new Map()
  const uniqueItems = []

  for (const item of candidates) {
    if (!item || !item.title) continue

    const doi = item.doi ? item.doi.toLowerCase().trim() : null
    const arxivMatch = (item.venue || item.officialUrl || '').match(/arxiv:(\d{4}\.\d{4,5})/i)
    const arxivId = arxivMatch ? arxivMatch[1] : null
    const normTitle = normalizeTitle(item.title)

    // Check DOI match
    if (doi && seenDois.has(doi)) {
      const existing = seenDois.get(doi)
      // Merge richer abstract or citations
      if ((item.abstract || '').length > (existing.abstract || '').length) existing.abstract = item.abstract
      if ((item.citationCount || 0) > (existing.citationCount || 0)) existing.citationCount = item.citationCount
      continue
    }

    // Check arXiv ID match
    if (arxivId && seenArxiv.has(arxivId)) {
      const existing = seenArxiv.get(arxivId)
      if ((item.abstract || '').length > (existing.abstract || '').length) existing.abstract = item.abstract
      continue
    }

    // Check Title similarity against existing items
    let isFuzzyDuplicate = false
    for (const existing of uniqueItems) {
      const sim = calculateSimilarity(normTitle, normalizeTitle(existing.title))
      if (sim >= 0.82) {
        isFuzzyDuplicate = true
        // Keep the one with the longer abstract / more complete metadata
        if ((item.abstract || '').length > (existing.abstract || '').length) {
          existing.abstract = item.abstract
        }
        if (item.doi && !existing.doi) {
          existing.doi = item.doi
          existing.officialUrl = item.officialUrl
        }
        break
      }
    }

    if (!isFuzzyDuplicate) {
      if (doi) seenDois.set(doi, item)
      if (arxivId) seenArxiv.set(arxivId, item)
      uniqueItems.push(item)
    }
  }

  return uniqueItems
}
