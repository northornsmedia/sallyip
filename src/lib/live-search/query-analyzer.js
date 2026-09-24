/**
 * SALLYIP LIVE SEARCH — LAYER 1: QUERY ANALYZER
 * Deconstructs user queries to extract clean technical concepts,
 * search intent, date constraints, and IPC/CPC classification hints.
 */

const FLUFF_PATTERNS = [
  /^(can you|could you|please|help me|i want to|i need to|look for|search for|find|check|verify|investigate)\s+/i,
  /^(tell me (if|about)|what is|what are|is there any|are there any)\s+/i,
  /^(prior art (for|on|about)|patents (for|on|about)|literature (for|on|about))\s+/i,
  /^(novelty search (for|on|about)|fto (for|on|about)|trademark (for|on|about))\s+/i,
  /\b(for me|right now|asap|in the database|online|live)\b/gi,
]

const INTENT_INDICATORS = {
  PRIOR_ART: /\b(prior art|anticipat|novelty|obviousness|inventive step|invalidity|state of the art|prior document|earlier publication)\b/i,
  TRADEMARK: /\b(trademark|trade mark|brand name|word mark|logo|nice class|goods and services|euipo|uspto tm|madrid|tess|tsdr)\b/i,
  PATENT_SEARCH: /\b(patent|patented|claim|patentability|specification|assignee|inventor|uspto|epo|wipo|pct|cpc|ipc)\b/i,
  CASE_LAW: /\b(case law|precedent|holding|court|federal circuit|cafc|ptab|district court|supreme court|infringement lawsuit|litigation)\b/i,
  SCIENTIFIC_LITERATURE: /\b(paper|journal|conference|ieee|arxiv|preprint|doi|researcher|study|experiment|benchmark)\b/i,
}

export function analyzeSearchQuery(rawQuery = '') {
  let cleaned = String(rawQuery || '').trim()

  // Detect primary intent
  let primaryIntent = 'GENERAL_IP_RESEARCH'
  if (INTENT_INDICATORS.TRADEMARK.test(cleaned)) {
    primaryIntent = 'TRADEMARK_SEARCH'
  } else if (INTENT_INDICATORS.CASE_LAW.test(cleaned)) {
    primaryIntent = 'CASE_LAW_SEARCH'
  } else if (INTENT_INDICATORS.PRIOR_ART.test(cleaned)) {
    primaryIntent = 'PRIOR_ART_SEARCH'
  } else if (INTENT_INDICATORS.PATENT_SEARCH.test(cleaned)) {
    primaryIntent = 'PATENT_SEARCH'
  } else if (INTENT_INDICATORS.SCIENTIFIC_LITERATURE.test(cleaned)) {
    primaryIntent = 'SCIENTIFIC_LITERATURE_SEARCH'
  }

  // Strip conversational fluff to leave pure search terms
  let coreTerms = cleaned
  for (const pattern of FLUFF_PATTERNS) {
    coreTerms = coreTerms.replace(pattern, ' ').trim()
  }
  coreTerms = coreTerms.replace(/[?!.]+$/, '').replace(/\s+/g, ' ').trim()

  // Extract date / year hints (e.g. "before 2021", "since 2023", "published in 2020")
  let yearCutoff = null
  let yearDirection = null
  const yearMatch = cleaned.match(/\b(before|prior to|until|after|since|from|in)\s+(19\d{2}|20\d{2})\b/i)
  if (yearMatch) {
    const dir = yearMatch[1].toLowerCase()
    const yr = parseInt(yearMatch[2], 10)
    if (['before', 'prior to', 'until'].includes(dir)) {
      yearCutoff = yr
      yearDirection = 'before'
    } else if (['after', 'since', 'from'].includes(dir)) {
      yearCutoff = yr
      yearDirection = 'after'
    } else {
      yearCutoff = yr
      yearDirection = 'exact'
    }
  }

  // Extract patent classification codes (e.g. H04L, G06F 17/00, A61K 31/00)
  const classMatches = [...cleaned.matchAll(/\b([A-H]\d{2}[A-Z]?(?:\s*\d+\/\d+)?)\b/gi)].map(m => m[1].replace(/\s+/g, ''))

  // Extract key technical tokens (minimum 3 chars, filtering standard stop words)
  const stopWords = new Set([
    'what', 'which', 'where', 'when', 'how', 'does', 'that', 'this', 'with', 'from',
    'have', 'been', 'were', 'about', 'there', 'their', 'could', 'should', 'would',
    'system', 'method', 'apparatus', 'device', 'using', 'based', 'invention',
    'please', 'search', 'prior', 'art', 'look', 'find', 'check', 'tell', 'help',
    'patent', 'patents', 'paper', 'papers', 'literature', 'before', 'after', 'since',
  ])
  const keywords = [...new Set(
    (coreTerms.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [])
      .filter(w => !stopWords.has(w) && w.length >= 3)
  )].slice(0, 10)

  return {
    rawQuery,
    coreQuery: coreTerms || cleaned,
    primaryIntent,
    keywords,
    classifications: classMatches,
    yearFilter: yearCutoff ? { year: yearCutoff, direction: yearDirection } : null,
    isBroadSearch: keywords.length <= 2,
    shouldSearchLiterature: ['PRIOR_ART_SEARCH', 'PATENT_SEARCH', 'SCIENTIFIC_LITERATURE_SEARCH', 'GENERAL_IP_RESEARCH'].includes(primaryIntent),
    shouldSearchTrademarks: primaryIntent === 'TRADEMARK_SEARCH',
    shouldSearchCaseLaw: primaryIntent === 'CASE_LAW_SEARCH',
  }
}
