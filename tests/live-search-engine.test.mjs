import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSearchQuery } from '../src/lib/live-search/query-analyzer.js'
import { deduplicateCandidates } from '../src/lib/live-search/deduplicator.js'
import { reRankCandidates } from '../src/lib/live-search/re-ranker.js'
import { transformToEvidencePassages } from '../src/lib/live-search/evidence-bridge.js'
import { executeLiveIpSearch } from '../src/lib/live-search/live-search-engine.js'

test('live search query analyzer extracts intent, filters fluff, and captures year cutoffs', () => {
  const query = 'can you please search prior art for drone dynamic battery swapping before 2021'
  const analysis = analyzeSearchQuery(query)

  assert.equal(analysis.primaryIntent, 'PRIOR_ART_SEARCH')
  assert.equal(analysis.yearFilter?.year, 2021)
  assert.equal(analysis.yearFilter?.direction, 'before')
  assert.ok(analysis.keywords.includes('drone'))
  assert.ok(analysis.keywords.includes('battery'))
  assert.ok(analysis.keywords.includes('swapping'))
  // Fluff words stripped
  assert.ok(!analysis.keywords.includes('please'))
  assert.ok(!analysis.keywords.includes('search'))
})

test('live search deduplicator merges identical DOIs and fuzzy title duplicates', () => {
  const candidates = [
    {
      title: 'Automated Drone Battery Swapping Station',
      doi: '10.1016/j.drone.2020.01',
      abstract: 'Short summary',
      citationCount: 10,
    },
    {
      title: 'Automated Drone Battery Swapping Station', // Duplicate DOI
      doi: '10.1016/j.drone.2020.01',
      abstract: 'Much longer and comprehensive technical disclosure with claims',
      citationCount: 15,
    },
    {
      title: 'Automated Drone Battery Swapping Station for Delivery', // Fuzzy duplicate
      abstract: 'Delivery drone docking and exchange',
      citationCount: 5,
    },
    {
      title: 'Solid State Lithium Electrolyte Membrane', // Distinct item
      doi: '10.1038/nature1234',
      abstract: 'Novel ceramic electrolyte',
      citationCount: 80,
    },
  ]

  const deduplicated = deduplicateCandidates(candidates)
  assert.equal(deduplicated.length, 2)
  assert.equal(deduplicated[0].abstract, 'Much longer and comprehensive technical disclosure with claims')
  assert.equal(deduplicated[0].citationCount, 15)
  assert.equal(deduplicated[1].title, 'Solid State Lithium Electrolyte Membrane')
})

test('live search re-ranker rewards keyword overlap and date cutoff compliance', () => {
  const queryAnalysis = {
    keywords: ['drone', 'battery', 'swapping'],
    yearFilter: { year: 2022, direction: 'before' },
  }

  const candidates = [
    {
      title: 'Drone battery swapping infrastructure',
      abstract: 'Automated battery exchange mechanism for UAVs',
      publicationYear: 2020,
      authorityTier: 2,
      citationCount: 50,
    },
    {
      title: 'Autonomous vehicle routing without drones',
      abstract: 'General logistics and trucking',
      publicationYear: 2019,
      authorityTier: 2,
      citationCount: 10,
    },
    {
      title: 'Drone battery swapping published late',
      abstract: 'Recent 2025 technology',
      publicationYear: 2025, // Fails cutoff
      authorityTier: 2,
      citationCount: 5,
    },
  ]

  const ranked = reRankCandidates(candidates, { queryAnalysis, limit: 3 })
  assert.equal(ranked[0].title, 'Drone battery swapping infrastructure')
  assert.ok(ranked[0].rankingScore > ranked[1].rankingScore)
  assert.ok(ranked[0].rankingScore > ranked[2].rankingScore)
})

test('evidence bridge converts live candidates into verified canonical Sally legal sources', () => {
  const items = [
    {
      id: 'openalex-W12345',
      provider: 'openalex',
      providerName: 'OpenAlex Global Graph',
      title: 'Optimization of battery swapping infrastructure',
      authors: 'Jane Doe, John Smith',
      publicationYear: 2021,
      venue: 'IEEE Transactions on Automation',
      citation: 'Doe & Smith (2021). Optimization of battery swapping.',
      doi: '10.1109/TASE.2021.123',
      officialUrl: 'https://doi.org/10.1109/TASE.2021.123',
      abstract: 'Detailed technical disclosure of automated battery exchange.',
      authorityTier: 2,
    },
  ]

  const passages = transformToEvidencePassages(items)
  assert.equal(passages.length, 1)
  const p = passages[0]
  assert.equal(p.source_id, 'src-live-openalex-W12345')
  assert.equal(p.passage_id, 'pass-live-openalex-W12345')
  assert.equal(p.authority_status, 'verified')
  assert.equal(p.authority_tier, 2)
  assert.equal(p.retrieval_method, 'live_open_api')
  assert.equal(p.jurisdiction, 'global')
  assert.ok(p.content.includes('Optimization of battery swapping infrastructure'))
  assert.ok(p.content.includes('Authors: Jane Doe, John Smith'))
})
