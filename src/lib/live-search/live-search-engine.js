/**
 * SALLYIP LIVE SEARCH ENGINE — MASTER ORCHESTRATOR
 * Multi-layer live data fetching across OpenAlex, arXiv, CrossRef, Europe PMC, and Patents.
 * Layers:
 *   1. Query Analyzer & Concept Decomposer
 *   2. Parallel Multi-Source Dispatcher (OpenAlex + arXiv + CrossRef + Europe PMC + Patents)
 *   3. Cross-Repository Deduplicator & Entity Resolver
 *   4. Technical Domain Re-Ranker
 *   5. Grounded Evidence Bridge
 */

import { analyzeSearchQuery } from './query-analyzer.js'
import { searchOpenAlex } from './providers/openalex-provider.js'
import { searchArxiv } from './providers/arxiv-provider.js'
import { searchCrossRef } from './providers/crossref-provider.js'
import { searchEuropePmc } from './providers/europe-pmc-provider.js'
import { searchPatentsLive } from './providers/patent-search-provider.js'
import { deduplicateCandidates } from './deduplicator.js'
import { reRankCandidates } from './re-ranker.js'
import { transformToEvidencePassages } from './evidence-bridge.js'

export async function executeLiveIpSearch(rawQuery, env = {}, { limit = 8, timeoutMs = 4000, fetchImpl = fetch } = {}) {
  const startTime = Date.now()
  const queryAnalysis = analyzeSearchQuery(rawQuery)
  const coreQuery = queryAnalysis.coreQuery

  if (!coreQuery || coreQuery.length < 2) {
    return {
      queryAnalysis,
      evidencePassages: [],
      rawResults: [],
      metrics: { totalFound: 0, executionTimeMs: 0, providersQueried: [] },
    }
  }

  // Layer 2: Parallel Multi-Provider Dispatch with circuit breakers
  const providerPromises = [
    // 1. OpenAlex (250M+ scientific papers, citations & patents)
    searchOpenAlex(coreQuery, { limit: 6, timeoutMs, fetchImpl })
      .catch(err => { console.warn('[LiveSearch] OpenAlex failed:', err.message); return [] }),

    // 2. arXiv (2.4M+ preprints in AI, CS, physics, and engineering)
    searchArxiv(coreQuery, { limit: 5, timeoutMs, fetchImpl })
      .catch(err => { console.warn('[LiveSearch] arXiv failed:', err.message); return [] }),

    // 3. CrossRef (150M+ peer-reviewed journals, IEEE, and DOIs)
    searchCrossRef(coreQuery, { limit: 5, timeoutMs, fetchImpl })
      .catch(err => { console.warn('[LiveSearch] CrossRef failed:', err.message); return [] }),

    // 4. Patents Layer (USPTO, EPO OPS, or open patent literature)
    searchPatentsLive(coreQuery, env, { limit: 5, timeoutMs, fetchImpl })
      .catch(err => { console.warn('[LiveSearch] Patent search failed:', err.message); return [] }),
  ]

  // If query touches biological, medical, chemistry, or pharma, dispatch Europe PMC
  if (/\b(biotech|gene|crispr|mrna|protein|antibody|pharma|drug|assay|molecule|chemical|polymer)\b/i.test(rawQuery)) {
    providerPromises.push(
      searchEuropePmc(coreQuery, { limit: 5, timeoutMs, fetchImpl })
        .catch(err => { console.warn('[LiveSearch] Europe PMC failed:', err.message); return [] })
    )
  }

  const resultsByProvider = await Promise.all(providerPromises)
  const flatCandidates = resultsByProvider.flat()

  // Layer 3: Cross-source Deduplication
  const deduplicated = deduplicateCandidates(flatCandidates)

  // Layer 4: Technical Domain Re-Ranking
  const reRanked = reRankCandidates(deduplicated, { queryAnalysis, limit })

  // Layer 5: Evidence Bridge to canonical Sally legal passages
  const evidencePassages = transformToEvidencePassages(reRanked)

  const executionTimeMs = Date.now() - startTime

  return {
    queryAnalysis,
    evidencePassages,
    rawResults: reRanked,
    metrics: {
      totalFound: reRanked.length,
      unfilteredCount: flatCandidates.length,
      executionTimeMs,
      providers: [...new Set(reRanked.map(r => r.providerName))],
    },
  }
}
