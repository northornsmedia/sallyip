// Invention interview engine: stateless analysis of the conversation that tells
// the chat pipeline whether to keep interviewing or start drafting, which
// questions to ask next, and which language register to use. Pure functions,
// derived from user messages every turn — no schema, no stored state.
import { planLegalTask } from './legal-task-planner.js'
import { DRAFT_RESPONSE_CONTRACT } from './patent-draft-service.js'

const PLAIN_QUESTIONS = {
  what: 'What is the invention, in your own words? No patent terminology needed.',
  problem: 'What problem does it solve? What goes wrong with ordinary solutions today?',
  how: 'How does it work? Walk me through what happens when someone uses it.',
  novelty: 'What do you believe is new about it compared with what already exists?',
  components: 'What are the main parts — hardware, software, materials, steps?',
  alternatives: 'Are there other ways it could be built, cheaper versions, or variations?',
  artifacts: 'Do you have any sketches, specs, photos, or documents you can upload?',
}

const ADVANCED_QUESTIONS = {
  what: 'Summarise the invention and its technical field.',
  problem: 'What is the objective technical problem over the closest prior art?',
  how: 'Describe the operating principle and data/material flow.',
  novelty: 'Which features do you consider novel, and over what prior art?',
  components: 'List the structural and functional elements relevant to claim scope.',
  alternatives: 'What alternative embodiments or fallback positions exist?',
  artifacts: 'Are drawings, prototypes, specifications, or test data available for the record?',
}

const SLOT_TESTS = {
  what: (text) => text.length >= 120 || (text.length >= 60 && /(invent|creat|built|design|develop|device|system|apparatus|tool|product|mouse|sensor)/i.test(text)),
  problem: (text) => /(problem|issue|solv|difficult|challenge|pain|slow|expensive|fail|need|wrong|ordinary)/i.test(text),
  how: (text) => text.length >= 40 && /(work|using|uses|through|process|step|sensor|motor|chip|software|algorithm|connect|transmit|detect|measure|when)/i.test(text),
  novelty: (text) => text.length >= 60 && /(new|novel|different|unlike|instead|improv|first|unique|never|ordinary)/i.test(text),
  components: (text) => /(compris|includ|component|part|sensor|motor|battery|circuit|module|hardware|software|unit|material)/i.test(text),
  alternatives: (text) => /(alternative|embodiment|version|option|instead|could also|another way|variation|cheaper)/i.test(text),
  artifacts: (text, attachments) => attachments || /(upload|attach|drawing|sketch|prototype|specification|document|image|file|diagram|photo)/i.test(text),
}

export const SLOT_ORDER = ['what', 'problem', 'how', 'novelty', 'components', 'alternatives', 'artifacts']
const CORE_SLOTS = ['what', 'problem', 'how', 'novelty']
const MAX_QUESTIONS = 3
const MAX_INTERVIEW_TURNS = 4

const ADVANCED_SIGNALS = [/§\s*\d/i, /35\s*U\.?S\.?C/i, /antecedent/i, /prior art/i, /obviousness/i, /enablement/i, /claim \d+/i, /embodiment/i, /written description/i, /office action/i, /MPEP/i, /Alice\/Mayo/i]

export function detectSophistication(messages) {
  const userText = (Array.isArray(messages) ? messages : []).filter(m => m?.role === 'user').map(m => String(m.content || '')).join('\n')
  return ADVANCED_SIGNALS.some(r => r.test(userText)) ? 'advanced' : 'plain'
}

export function analyzeInterview(messages) {
  const userMessages = (Array.isArray(messages) ? messages : []).filter(m => m?.role === 'user')
  const combined = userMessages.map(m => String(m.content || '')).join('\n')
  const attachments = userMessages.some(m => Array.isArray(m.attachments) && m.attachments.length > 0)
  const filled = {}
  for (const slot of SLOT_ORDER) {
    try {
      filled[slot] = Boolean(SLOT_TESTS[slot](combined, attachments))
    } catch {
      filled[slot] = false
    }
  }
  const coreReady = CORE_SLOTS.every(slot => filled[slot])
  const userTurns = userMessages.length
  const sophisticated = detectSophistication(messages)
  const phase = coreReady ? 'ready' : userTurns >= MAX_INTERVIEW_TURNS ? 'ready_partial' : 'interview'
  const bank = sophisticated === 'advanced' ? ADVANCED_QUESTIONS : PLAIN_QUESTIONS
  const nextQuestions = SLOT_ORDER.filter(slot => !filled[slot]).slice(0, MAX_QUESTIONS).map(slot => bank[slot])
  const answeredRecap = SLOT_ORDER.filter(slot => filled[slot])
  return { phase, filled, nextQuestions, answeredRecap, sophisticated, userTurns }
}

export function buildInterviewContract(analysis) {
  const register = analysis.sophisticated === 'advanced'
    ? 'The user is IP-sophisticated: precise claim and patent terminology is acceptable.'
    : 'The user is an ordinary inventor: use SIMPLE plain English. Do NOT use 35 U.S.C. sections, CFR references, antecedent-basis terminology, Alice analysis, or legal jargon unless the user asks.'
  const recap = analysis.answeredRecap.length
    ? `Already established — do NOT ask about these again: ${analysis.answeredRecap.join(', ')}.`
    : 'Nothing established yet — this is the first exchange.'
  return `INVENTION INTERVIEW MODE (highest priority for this answer):
${register}
${recap}
Ask ONLY these follow-up questions, at most three, in your own words: ${analysis.nextQuestions.map((q, i) => `${i + 1}. ${q}`).join(' ')}
Hard rules: perform the task or gather the minimum information to perform it — NEVER respond with a description of Sally's capabilities, workspaces, buttons, or features. Do not mention internal workflow names. Do not invent technical details. Keep the reply short.`
}
export function buildReadyBrief(analysis) {
  return `Disclosure state: established (${analysis.answeredRecap.join(', ') || 'none'})${analysis.phase === 'ready_partial' ? '; PARTIAL — proceed best-effort and mark gaps explicitly' : ''}. Follow the silent internal order (understand → problem → concepts → gaps → embodiments → claim strategy → independent claims → dependent claims → specification → §112 checks → §101 screen) without exposing it. Label user-provided facts vs drafting assumptions vs proposed embodiments requiring confirmation.`
}

// Single entry point for chat pipelines: returns the system-prompt addition
// (or '') for the latest user turn given the full message history.
export function draftGuidanceFor(messages, latest) {
  if (planLegalTask(latest || '', {}).workflow_type !== 'patent_drafting') return ''
  const interview = analyzeInterview(messages)
  if (interview.phase === 'interview') return `\n\n${buildInterviewContract(interview)}`
  return `\n\n${DRAFT_RESPONSE_CONTRACT}\n\n${buildReadyBrief(interview)}`
}
