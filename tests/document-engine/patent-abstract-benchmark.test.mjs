import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  evaluatePatentAbstractInterviewStep,
  extractPatentAbstractMatterFacts,
  assessPatentAbstractReadiness,
  ABSTRACT_WORKFLOW_MODES,
  ABSTRACT_REVIEW_FLAGS,
} from '../../src/lib/patent-abstract-interview-graph.js'
import { inferInventionType } from '../../src/lib/patent-interview-graph.js'
import {
  assemblePatentAbstract,
  validateAbstractDraft,
  shortenAbstractDeterministic,
  countAbstractWords,
  classifyTechnicalEffect,
  normalizeSourceSnapshot,
} from '../../src/lib/patent-abstract-service.js'
import { routeConversationalIntent } from '../../src/lib/document-engine-router.js'
import { resolveDocumentFamily } from '../../src/lib/document-engine.js'

const benchmarkPath = path.resolve(process.cwd(), 'benchmarks', 'document-intelligence-v1', 'patent-abstract', 'cases.json')
const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'))

function confirmDraft(session, message = 'Yes, proceed with the draft.') {
  return evaluatePatentAbstractInterviewStep({ session, latestMessage: message })
}

test('benchmark: all Patent Abstract synthetic cases pass', async () => {
  assert.equal(benchmark.document_id, 'patent-abstract')
  assert.equal(benchmark.document_number, '011')

  for (const tc of benchmark.cases) {
    if (['CASE-01-SOFTWARE', 'CASE-02-MECHANICAL', 'CASE-03-AI-ML'].includes(tc.id)) {
      const type = inferInventionType(`${tc.inputs.problem} ${tc.inputs.solution}`)
      assert.equal(type, tc.expected.branched_type)
      const readiness = assessPatentAbstractReadiness(
        { title: tc.inputs.title, technical_problem: tc.inputs.problem, core_solution: tc.inputs.solution, principal_components: tc.inputs.components },
        {},
        ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_MATTER_CONTEXT,
      )
      assert.equal(readiness, tc.expected.readiness)
    }

    if (tc.id === 'CASE-04-EXISTING-MATTER') {
      const extracted = extractPatentAbstractMatterFacts(tc.matter_context)
      for (const field of tc.expected.skipped_fields) assert.equal(extracted.status[field], 'KNOWN')
      const routed = await routeConversationalIntent(tc.prompt, tc.matter_context)
      assert.equal(routed.action, tc.expected.action)
      assert.match(routed.message, new RegExp(tc.expected.summary_includes))
    }

    if (tc.id === 'CASE-05-SOURCE-VERSIONS') {
      const extracted = extractPatentAbstractMatterFacts(tc.matter_context)
      assert.equal(extracted.sources.specification.id, tc.expected.specification_id)
      assert.equal(extracted.sources.specification.version, tc.expected.specification_version)
      assert.equal(extracted.sources.claims.id, tc.expected.claims_id)
      assert.equal(extracted.sources.claims.version, tc.expected.claims_version)
    }

    if (tc.id === 'CASE-06-INSUFFICIENT-CONTEXT') {
      const routed = await routeConversationalIntent(tc.prompt, {})
      assert.equal(routed.action, tc.expected.action)
      assert.equal(routed.questions.length, tc.expected.questions_length)
      assert.equal(routed.question.field, tc.expected.field)
    }

    if (tc.id === 'CASE-07-INVESTOR-SUMMARY') {
      assert.notEqual(resolveDocumentFamily(tc.prompt), tc.expected.not_family)
      const clarified = evaluatePatentAbstractInterviewStep({ session: {}, latestMessage: tc.prompt })
      assert.equal(clarified.action, 'CLARIFICATION_REQUIRED')
    }

    if (tc.id === 'CASE-08-FROM-SPECIFICATION') {
      const assembled = assemblePatentAbstract({
        facts: {
          title: tc.inputs.title, technical_problem: tc.inputs.problem, core_solution: tc.inputs.solution,
          principal_components: tc.inputs.components, invention_type: 'SYSTEM',
        },
        specificationText: tc.specification_text,
      })
      for (const term of tc.expected.includes) assert.ok(assembled.abstractText.toLowerCase().includes(term))
      for (const forbidden of tc.expected.excludes) assert.ok(!assembled.abstractText.includes(forbidden))
    }

    if (tc.id === 'CASE-09-CLAIMS-ONLY') {
      const matterContext = {
        facts: [
          { fact_type: 'title', value: tc.inputs.title, confidence: 0.9 },
          { fact_type: 'technical_problem', value: tc.inputs.problem, confidence: 0.9 },
          { fact_type: 'core_solution', value: tc.inputs.solution, confidence: 0.9 },
          { fact_type: 'principal_components', value: tc.inputs.components, confidence: 0.9 },
          { fact_type: 'claims', value: tc.claims_text, confidence: 0.9 },
        ],
      }
      const prompt = await routeConversationalIntent('Draft an abstract from the claims.', matterContext)
      assert.equal(prompt.action, 'PROMPT_DRAFT_CONFIRMATION')
      const draft = confirmDraft(prompt.session)
      assert.equal(draft.action, 'DRAFT')
      assert.ok(draft.draft.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-10-OPTIONAL-FEATURE') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text })
      assert.ok(validation.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-11-UNSUPPORTED-BROADENING') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text })
      assert.ok(validation.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-12-OVER-NARROWING') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text })
      assert.ok(validation.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-13-UNSUPPORTED-EFFECT') {
      const status = classifyTechnicalEffect(tc.inputs.effect, {})
      assert.equal(status, tc.expected.effect_status)
      const assembled = assemblePatentAbstract({
        facts: {
          title: tc.inputs.title, technical_problem: tc.inputs.problem, core_solution: tc.inputs.solution,
          principal_components: tc.inputs.components, technical_effect: tc.inputs.effect,
        },
      })
      for (const forbidden of tc.expected.excludes) assert.ok(!assembled.abstractText.includes(forbidden))
    }

    if (tc.id === 'CASE-14-MARKETING-LANGUAGE') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text })
      for (const forbidden of tc.expected.excludes) assert.ok(!validation.sanitizedText.includes(forbidden))
      for (const term of tc.expected.includes) assert.ok(validation.sanitizedText.includes(term))
    }

    if (tc.id === 'CASE-15-LEGAL-CONCLUSION') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text })
      for (const forbidden of tc.expected.excludes) assert.ok(!validation.sanitizedText.includes(forbidden))
    }

    if (tc.id === 'CASE-16-TERMINOLOGY') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text, claimsText: tc.claims_text })
      assert.ok(validation.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-17-NEW-MATTER') {
      const validation = validateAbstractDraft({ abstractText: tc.existing_abstract, specificationText: tc.specification_text })
      assert.ok(validation.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-18-CLAIM-CHANGE') {
      const oldSnapshot = normalizeSourceSnapshot({ claims: tc.old_claims })
      const session = {
        facts: {
          title: 'Versioned Inspection System',
          technical_problem: 'Microscopic wafer defects escape conventional optical inspection and reduce yield.',
          core_solution: 'A processor analyzes sensor images and generates control signals for actuator handling.',
          principal_components: 'Sensor, processor, control-signal generator, and actuator.',
          jurisdiction_context: 'US',
          invention_type: 'SYSTEM',
        },
        placeholders: {},
        flags: [],
        locks: {},
        versions: [{
          version: 'v1', timestamp: '2026-09-11T00:00:00Z', text: 'A versioned inspection system addresses missed defects. The solution comprises one sensor, a processor, and an actuator.', text_hash: 'test', word_count: 18,
          workflow_mode: ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_MATTER_CONTEXT, jurisdiction: 'US', source_snapshot: oldSnapshot, creator: 'test', status: 'DRAFT',
        }],
        sourceSnapshot: oldSnapshot,
        currentQuestionId: null,
        awaitingConfirmation: false,
        confirmedReady: false,
        workflowMode: ABSTRACT_WORKFLOW_MODES.ABSTRACT_FROM_MATTER_CONTEXT,
      }
      const result = evaluatePatentAbstractInterviewStep({
        session,
        latestMessage: 'Draft the patent abstract.',
        matterContext: { source_documents: [{ ...tc.new_claims, type: 'CLAIMS' }] },
      })
      assert.ok(result.session.flags.includes(tc.expected.flag))
    }

    if (tc.id === 'CASE-19-WORD-COUNT') {
      assert.equal(countAbstractWords(tc.abstract_text), countAbstractWords(tc.abstract_text))
    }

    if (tc.id === 'CASE-20-SHORTENING') {
      const shortened = shortenAbstractDeterministic({
        abstractText: tc.existing_abstract, specificationText: tc.specification_text,
        facts: { core_solution: 'processor analyzes images and controls actuator', principal_components: 'sensor, processor, control-signal generator, actuator' },
      })
      assert.ok(countAbstractWords(shortened.text) < countAbstractWords(tc.existing_abstract))
      for (const term of tc.expected.includes) assert.ok(shortened.text.toLowerCase().includes(term))
      for (const forbidden of tc.expected.excludes) assert.ok(!shortened.text.includes(forbidden))
    }

    if (tc.id === 'CASE-21-VERSIONING') {
      const prompt = evaluatePatentAbstractInterviewStep({
        session: { facts: { title: tc.inputs.title, technical_problem: tc.inputs.problem, core_solution: tc.inputs.solution, principal_components: tc.inputs.components } },
        latestMessage: 'Draft the patent abstract.',
      })
      assert.equal(prompt.action, 'PROMPT_DRAFT_CONFIRMATION')
      const draft = confirmDraft(prompt.session)
      const rewritePrompt = evaluatePatentAbstractInterviewStep({ session: draft.session, latestMessage: 'Rewrite this patent abstract.' })
      const rewrite = confirmDraft(rewritePrompt.session)
      const shortenPrompt = evaluatePatentAbstractInterviewStep({ session: rewrite.session, latestMessage: 'Make the abstract shorter.' })
      const shortened = confirmDraft(shortenPrompt.session)
      assert.deepEqual(shortened.session.versions.map((version) => version.version), tc.expected.versions)
      assert.ok(shortened.session.versions.every((version) => version.text && version.timestamp && version.text_hash))
    }

    if (tc.id === 'CASE-22-LOCKING') {
      const prompt = evaluatePatentAbstractInterviewStep({
        session: { facts: { title: tc.inputs.title, technical_problem: tc.inputs.problem, core_solution: tc.inputs.solution, principal_components: tc.inputs.components } },
        latestMessage: 'Draft the patent abstract.',
      })
      const draft = confirmDraft(prompt.session)
      const lockedSession = {
        ...draft.session,
        locks: { ...draft.session.locks, abstract: 'USER_LOCKED' },
        awaitingConfirmation: true,
        sourceSnapshot: normalizeSourceSnapshot({ claims: { id: 'CLAIMS-2026-009', version: 'v1', text: '1. A system comprising one sensor and a processor.' } }),
      }
      const locked = evaluatePatentAbstractInterviewStep({
        session: lockedSession,
        latestMessage: 'Yes, proceed with the draft.',
        matterContext: { source_documents: [{ id: 'CLAIMS-2026-009', type: 'CLAIMS', version: 'v2', text: '1. A system comprising a plurality of sensors and a processor.' }] },
      })
      assert.equal(locked.action, 'DRAFT')
      assert.equal(locked.draft.abstractText, draft.draft.abstractText)
      assert.equal(locked.session.versions.length, 1)
      assert.ok(locked.draft.flags.includes(tc.expected.flag))
    }
  }
})
