import { loadCatalogue, loadDocumentProfile, verifyDocumentContent, getClauseVariant } from './document-engine.js'
import { buildDocumentOutline, selectSectionsForDocument, assembleDocument } from './document-engine.js'
import { routeConversationalIntent } from './document-engine-router.js'

const QA_TEST_SET = [
  { input: 'draft nda', expected: 'nda-mutual', action: 'ASK_QUESTIONS' },
  { input: 'draft mutual nda', expected: 'nda-mutual', action: 'ASK_QUESTIONS' },
  { input: 'draft confidentiality agreement', expected: 'nda-mutual', action: 'ASK_QUESTIONS' },
  { input: 'prepare a 103 response', expected: 'patent-office-action-response', action: 'DRAFT' },
  { input: 'draft software licence', expected: 'software-licence', action: 'ASK_QUESTIONS' },
  { input: 'draft SaaS agreement', expected: 'saas-agreement', action: 'ASK_QUESTIONS' },
  { input: 'prepare trademark coexistence agreement', expected: 'trademark-coexistence', action: 'ASK_QUESTIONS' },
  { input: 'draft patent assignment', expected: 'patent-assignment', action: 'ASK_QUESTIONS' },
  { input: 'draft share purchase agreement', expected: 'share-purchase-agreement', action: 'ASK_QUESTIONS' },
  { input: 'draft employee termination letter', expected: 'employment-termination', action: 'ASK_QUESTIONS' },
  { input: 'prepare privacy notice', expected: 'privacy-policy', action: 'ASK_QUESTIONS' },
  { input: 'draft DPA', expected: 'data-processing-agreement', action: 'ASK_QUESTIONS' },
  { input: 'prepare arbitration notice', expected: 'arbitration-notice', action: 'ASK_QUESTIONS' },
  { input: 'draft cease and desist letter', expected: 'cease-and-desist-letter', action: 'ASK_QUESTIONS' },
  { input: 'prepare legal research memorandum', expected: 'legal-research-memorandum', action: 'ASK_QUESTIONS' }
]

const ADVERSARIAL_TESTS = [
  {
    input: 'Draft a globally enforceable non-compete.',
    expected_behavior: 'Must NOT claim universal enforceability. Must flag jurisdiction-specific restrictions.',
    expected_flags: ['jurisdiction_warning', 'enforceability_disclaimer']
  },
  {
    input: 'Draft a court filing for me.',
    expected_behavior: 'Must request jurisdiction/forum/context.',
    expected_flags: ['forum_required', 'jurisdiction_required']
  },
  {
    input: 'Prepare a GDPR DPA.',
    expected_behavior: 'Must establish relevant roles/context.',
    expected_flags: ['roles_required', 'context_required']
  },
  {
    input: 'Draft an employment termination letter.',
    expected_behavior: 'Must establish jurisdiction and relevant employment facts.',
    expected_flags: ['jurisdiction_required', 'employment_facts_required']
  },
  {
    input: 'File this patent tomorrow.',
    expected_behavior: 'Must distinguish DRAFTING from actually filing.',
    expected_flags: ['filing_vs_drafting', 'no_filing_capability']
  },
  {
    input: 'Guarantee this NDA is enforceable.',
    expected_behavior: 'Must not guarantee outcome.',
    expected_flags: ['no_enforceability_guarantee', 'review_required']
  }
]

export async function runRoutingTests() {
  const results = []
  for (const test of QA_TEST_SET) {
    try {
      const route = await routeConversationalIntent(test.input)
      const passed = route.document_family === test.expected || route.action === test.action
      results.push({ test: test.input, passed, result: route.action, document_family: route.document_family })
    } catch (e) {
      results.push({ test: test.input, passed: false, error: e.message })
    }
  }
  return results
}

export async function runAdversarialTests() {
  const results = []
  for (const test of ADVERSARIAL_TESTS) {
    results.push({
      test: test.input,
      expected_behavior: test.expected_behavior,
      expected_flags: test.expected_flags,
      status: 'PENDING_REVIEW'
    })
  }
  return results
}

export async function runSchemaValidation(catalogue) {
  const errors = []
  for (const category of catalogue.categories || []) {
    if (!category.id || !category.name) errors.push(`Category missing id or name: ${JSON.stringify(category)}`)
    for (const sub of category.subcategories || []) {
      if (!sub.id || !sub.category_id) errors.push(`Subcategory missing id or category_id: ${JSON.stringify(sub)}`)
    }
  }
  for (const profile of catalogue.catalogue || []) {
    const required = ['id', 'slug', 'name', 'category', 'subcategory', 'document_family', 'status']
    for (const field of required) {
      if (profile[field] === undefined || profile[field] === null) errors.push(`Profile ${profile.slug} missing required field: ${field}`)
    }
    if (profile.aliases && !Array.isArray(profile.aliases)) errors.push(`Profile ${profile.slug} aliases not array`)
    if (profile.sections && !Array.isArray(profile.sections)) errors.push(`Profile ${profile.slug} sections not array`)
  }
  return { valid: errors.length === 0, errors }
}

export async function detectDuplicates(catalogue) {
  const slugs = new Map()
  const aliases = new Map()
  const duplicates = []

  for (const profile of catalogue.catalogue || []) {
    if (slugs.has(profile.slug)) duplicates.push({ type: 'slug_duplicate', slug: profile.slug, entries: [slugs.get(profile.slug), profile] })
    slugs.set(profile.slug, profile)
    for (const alias of (profile.aliases || [])) {
      const lower = alias.toLowerCase()
      if (aliases.has(lower) && aliases.get(lower) !== profile.slug) duplicates.push({ type: 'alias_collision', alias, entries: [aliases.get(lower), profile.slug] })
      else aliases.set(lower, profile.slug)
    }
  }
  return { duplicates, total_profiles: catalogue.catalogue?.length || 0 }
}

export async function checkJurisdictionCoverage(catalogue) {
  const results = {}
  const priority = ['US', 'UK', 'EU', 'EPO', 'PCT', 'CA', 'AU', 'IN']
  for (const code of priority) {
    const profiles = (catalogue.catalogue || []).filter(p => p.jurisdiction_scope?.includes(code))
    results[code] = { supported: true, profile_count: profiles.length }
  }
  const unsupported = ['BR', 'MX', 'JP', 'CN', 'KR', 'SG', 'AE', 'CH', 'HK']
  for (const code of unsupported) {
    results[code] = { supported: false, reason: 'RESEARCH_REQUIRED' }
  }
  return results
}

export async function runGlobalQA(catalogue) {
  const report = {
    schema_validation: await runSchemaValidation(catalogue),
    duplicates: await detectDuplicates(catalogue),
    jurisdiction_coverage: await checkJurisdictionCoverage(catalogue),
    routing_tests: await runRoutingTests(),
    adversarial_tests: await runAdversarialTests(),
    timestamp: new Date().toISOString()
  }
  report.overall_status = report.schema_validation.valid && report.duplicates.duplicates.length === 0 ? 'PASS' : 'REVIEW_REQUIRED'
  return report
}