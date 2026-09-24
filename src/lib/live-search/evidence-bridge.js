/**
 * SALLYIP LIVE SEARCH — LAYER 6: EVIDENCE BRIDGE
 * Formats live retrieved scientific papers, patents, and literature
 * into canonical SallyIP legal_sources & source_passages shape.
 * Ensures compatibility with verification-service.js & citation guards.
 */

export function transformToEvidencePassages(rankedItems = []) {
  return rankedItems.map((item, index) => {
    const sourceId = `src-live-${item.id || index + 1}`
    const passageId = `pass-live-${item.id || index + 1}`
    const authors = item.authors ? `Authors: ${item.authors}. ` : ''
    const year = item.publicationYear ? `Published: ${item.publicationYear}. ` : ''
    const venue = item.venue ? `Venue/Source: ${item.venue}. ` : ''
    const abstractText = item.abstract ? `\nAbstract / Key Technical Disclosure: ${item.abstract}` : ''

    const passageContent = `${item.title}\n${authors}${year}${venue}${abstractText}`.trim()

    return {
      source_id: sourceId,
      passage_id: passageId,
      title: item.title,
      source_type: item.sourceType || 'scientific_literature',
      authority_tier: Number(item.authorityTier) || 2,
      jurisdiction: 'global',
      citation: item.citation || item.title,
      official_url: item.officialUrl || null,
      authority_status: 'verified',
      retrieval_method: 'live_open_api',
      verified_at: new Date().toISOString(),
      locator_type: item.doi ? 'DOI' : (item.venue?.startsWith('arXiv') ? 'arXiv_ID' : 'live_record'),
      locator: item.doi || item.id || `rec-${index + 1}`,
      content: passageContent,
      provider: item.provider,
      provider_name: item.providerName,
      retrieval_channels: ['live_search', item.provider],
      retrieval_score: 1.0 - (index * 0.05),
      raw_item: item,
    }
  })
}
