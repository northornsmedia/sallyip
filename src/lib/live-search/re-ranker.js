/**
 * SALLYIP LIVE SEARCH — LAYER 5: DOMAIN RE-RANKER
 * Re-ranks de-duplicated candidates using technical concept overlap,
 * publication dates, authority tiers, and disclosure completeness.
 */

export function reRankCandidates(candidates = [], { queryAnalysis, limit = 8 } = {}) {
  const keywords = queryAnalysis?.keywords || []
  const yearFilter = queryAnalysis?.yearFilter || null

  const scored = candidates.map(item => {
    let score = 0

    // 1. Keyword overlap (Title weight: 3x, Abstract weight: 1.5x)
    const titleLower = String(item.title || '').toLowerCase()
    const abstractLower = String(item.abstract || '').toLowerCase()
    let titleMatches = 0
    let abstractMatches = 0

    for (const kw of keywords) {
      if (titleLower.includes(kw)) titleMatches++
      if (abstractLower.includes(kw)) abstractMatches++
    }

    const keywordScore = (titleMatches * 3.0) + (abstractMatches * 1.5)
    score += Math.min(30, keywordScore * 4)

    // 2. Completeness bonus (has substantial abstract)
    if (item.abstract && item.abstract.length > 200) {
      score += 15
    } else if (item.abstract && item.abstract.length > 80) {
      score += 8
    }

    // 3. Citation count authority bonus
    const cites = item.citationCount || 0
    if (cites > 100) score += 12
    else if (cites > 20) score += 8
    else if (cites > 5) score += 4

    // 4. Authority Tier weighting (Tier 1 patents/statutes: +20, Tier 2 peer-reviewed: +14, Tier 3 preprints: +10)
    if (item.authorityTier === 1) score += 20
    else if (item.authorityTier === 2) score += 14
    else score += 10

    // 5. Year Filter constraint / recency scoring
    const pubYear = item.publicationYear
    if (pubYear && yearFilter) {
      if (yearFilter.direction === 'before' && pubYear <= yearFilter.year) {
        score += 15
      } else if (yearFilter.direction === 'after' && pubYear >= yearFilter.year) {
        score += 15
      } else if (yearFilter.direction === 'exact' && pubYear === yearFilter.year) {
        score += 20
      } else {
        score -= 25 // Penalize if outside requested cutoff date
      }
    } else if (pubYear) {
      // Gentle recency bias if no explicit cutoff requested
      const currentYear = new Date().getFullYear()
      const age = Math.max(0, currentYear - pubYear)
      if (age <= 5) score += 8
      else if (age <= 10) score += 4
    }

    // 6. Provider baseline
    score += (item.relevanceScore || 0.5) * 10

    return {
      ...item,
      rankingScore: Number(score.toFixed(2)),
    }
  })

  // Sort descending by ranking score
  scored.sort((a, b) => b.rankingScore - a.rankingScore)

  return scored.slice(0, limit)
}
