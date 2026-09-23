import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VERIFIED_20_DOCUMENTS,
  identifyDocument,
  extractSlots,
  evaluateIntakePhase,
  buildDocumentIntakePrompt,
  isDraftedDocument,
  generateStatutoryDocument
} from '../src/lib/document-intake-coordinator.js'

test('all 20 verified documents exist with complete statutory metadata', () => {
  assert.equal(VERIFIED_20_DOCUMENTS.length, 20)
  for (const doc of VERIFIED_20_DOCUMENTS) {
    assert.ok(doc.number, `Doc ${doc.id} must have a number`)
    assert.ok(doc.name, `Doc ${doc.id} must have a name`)
    assert.ok(doc.statutoryBasis, `Doc ${doc.id} must have a statutoryBasis`)
    assert.ok(doc.coreSlots?.length > 0, `Doc ${doc.id} must have coreSlots`)
    assert.ok(doc.sections?.length > 0, `Doc ${doc.id} must have statutory sections`)
    for (const slot of doc.coreSlots) {
      assert.ok(doc.questions[slot], `Doc ${doc.id} must have question for slot ${slot}`)
    }
  }
})

test('identifies document from user intent for all 20 documents', () => {
  const samples = [
    ['Draft a Utility Patent Application for a drone', 'utility-patent-application'],
    ['File a provisional patent for an agricultural sensor', 'provisional-patent-application'],
    ['Prepare a non-provisional patent application', 'non-provisional-patent-application'],
    ['I want a design patent for my new chair', 'design-patent-application'],
    ['Draft a plant patent application for a new apple cultivar', 'plant-patent-application'],
    ['Prepare a PCT international patent application', 'pct-international-patent-application'],
    ['Enter the US national phase from PCT/US2024/012345', 'national-phase-patent-application'],
    ['Draft a direct European patent application for EPO', 'european-patent-application'],
    ['Prepare a detailed patent specification', 'patent-specification'],
    ['Draft a patent claims set with system and method claims', 'patent-claims-set'],
    ['Draft a patent abstract under 150 words', 'patent-abstract'],
    ['Prepare patent drawings instructions for the illustrator', 'patent-drawings-instructions'],
    ['Capture this idea in an invention disclosure form', 'invention-disclosure-form'],
    ['Prepare a patentability assessment for this AI algorithm', 'patentability-assessment'],
    ['Prepare a patent novelty opinion against reference D1', 'patent-novelty-opinion'],
    ['Conduct an FTO clearance opinion for our new medical pump', 'freedom-to-operate-opinion'],
    ['Prepare a patent invalidity opinion against US 9,876,543', 'patent-invalidity-opinion'],
    ['Prepare a patent landscape report for quantum computing', 'patent-landscape-report'],
    ['Prepare a patent prior-art search report', 'patent-prior-art-search-report'],
    ['Create a patent claim chart for Claim 1 against Reference D1', 'patent-claim-chart']
  ]

  for (const [input, expectedId] of samples) {
    const doc = identifyDocument(input)
    assert.ok(doc, `Failed to identify document from: "${input}"`)
    assert.equal(doc.id, expectedId, `Expected "${expectedId}" from "${input}", got "${doc?.id}"`)
  }
})

test('bare request triggers interview with missing questions', () => {
  const doc = identifyDocument('Draft a Design Patent Application')
  const slots = extractSlots(doc, 'Draft a Design Patent Application', [])
  const intake = evaluateIntakePhase(doc, slots, 'Draft a Design Patent Application', 1)
  assert.equal(intake.phase, 'INTERVIEW')
  assert.ok(intake.nextQuestion.includes('article of manufacture'))
})

test('extra details in prompt are slotted into place', () => {
  const prompt = 'Draft a Utility Patent Application for a wearable heart rate monitor with optical PPG sensor and haptic alerts, invented by Alice Smith in the US'
  const doc = identifyDocument(prompt)
  const slots = extractSlots(doc, prompt, [])
  assert.ok(slots.title || slots.what)
  assert.ok(slots.components)
  assert.equal(slots.jurisdiction, 'US')
  assert.ok(slots.inventors)
})

test('full disclosure or explicit finalize trigger switches to READY_TO_DRAFT', () => {
  const doc = identifyDocument('Create a patent claim chart for Claim 1 against Reference D1')
  const slots = extractSlots(doc, 'Create a patent claim chart for Claim 1 against Reference D1', [])
  const intake = evaluateIntakePhase(doc, slots, 'finalize and draft it', 2)
  assert.equal(intake.phase, 'READY_TO_DRAFT')
})

test('detects drafted document vs chat conversational question', () => {
  assert.equal(isDraftedDocument('What problem does your invention solve?'), false)
  assert.equal(isDraftedDocument('# UTILITY PATENT APPLICATION\n\n## 1. TECHNICAL FIELD\nThe present disclosure...'), true)
  assert.equal(isDraftedDocument('## CLAIMS\n1. A device comprising...'), true)
})

test('generateStatutoryDocument produces valid statutory markdown for all 20 verified documents', async () => {
  const { generateStatutoryDocument } = await import('../src/lib/document-intake-coordinator.js')
  for (const doc of VERIFIED_20_DOCUMENTS) {
    const markdown = generateStatutoryDocument(doc, {
      what: 'an autonomous drone battery swap station',
      problem: 'slow manual battery charging down-times in delivery fleets',
      how: 'a robotic gripper alignment rail and high-current contacts',
      novelty: 'sub-60-second mechanical hot-swap cycle',
      components: 'robotic arm, alignment track, lithium-ion battery bays, and charge manager',
      jurisdiction: 'US'
    }, 'Aman')
    assert.ok(markdown.startsWith(`# ${doc.name.toUpperCase()}`))
    assert.ok(markdown.includes(doc.statutoryBasis))
    assert.ok(isDraftedDocument(markdown), `Generated doc ${doc.id} must be recognized by isDraftedDocument`)
    for (let i = 0; i < doc.sections.length; i++) {
      assert.ok(markdown.includes(`## ${i + 1}. ${doc.sections[i].toUpperCase()}`), `Doc ${doc.id} missing section ${doc.sections[i]}`)
    }
  }
})

test('state isolation prevents cross-task context contamination from prior NDAs or greetings', () => {
  const history = [
    { role: 'user', content: 'Draft a mutual NDA between A Ltd and B Ltd as a Word document' },
    { role: 'assistant', content: '# MUTUAL NON-DISCLOSURE AGREEMENT...' },
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'Hello Aman!' }
  ]
  const currentPrompt = 'Draft a National Phase Patent Application'
  const doc = identifyDocument(currentPrompt, history)
  assert.equal(doc.id, 'national-phase-patent-application')

  const slots = extractSlots(doc, currentPrompt, history)
  assert.equal(slots.what, undefined, 'slots.what must not capture unrelated NDA text')
  assert.equal(slots.pct_number, undefined, 'pct_number must not be fabricated')

  const intake = evaluateIntakePhase(doc, slots, currentPrompt, 4)
  assert.equal(intake.phase, 'INTERVIEW', 'Must remain in INTERVIEW without verified PCT source')
  assert.ok(intake.nextQuestion.includes('PCT international application number'), 'Must ask for PCT number')
})

test('national phase hard gate strictly blocks drafting without PCT application number', () => {
  const doc = identifyDocument('Draft a National Phase Patent Application')
  const slots = extractSlots(doc, 'Draft a National Phase Patent Application', [])
  
  // Even if user commands force draft, hard gate must block
  const intake = evaluateIntakePhase(doc, slots, 'draft it now please', 5)
  assert.equal(intake.phase, 'INTERVIEW')
  assert.ok(intake.nextQuestion.includes('PCT international application number'))
})

test('national phase produces office-specific packages without invented technical facts', async () => {
  const { generateStatutoryDocument } = await import('../src/lib/document-intake-coordinator.js')
  const doc = identifyDocument('Draft a National Phase Patent Application')

  // 1. US National Stage Entry (35 U.S.C. § 371)
  const usSlots = {
    pct_number: 'PCT/US2023/012345',
    target_jurisdiction: 'US'
  }
  const usDoc = generateStatutoryDocument(doc, usSlots, 'Aman')
  assert.ok(usDoc.includes('U.S. NATIONAL STAGE ENTRY SUBMISSION (35 U.S.C. § 371)'))
  assert.ok(usDoc.includes('35 U.S.C. § 371 / 37 CFR §§ 1.495–1.497'))
  assert.ok(usDoc.includes('PCT/US2023/012345'))
  assert.equal(usDoc.includes('Rule 159 EPC'), false, 'US filing must not include EPO Rule 159')
  assert.equal(usDoc.includes('Primary Operating Chassis [10]'), false, 'Must not invent chassis [10]')
  assert.equal(usDoc.includes('1 kHz'), false, 'Must not invent 1 kHz filtering')
  assert.equal(usDoc.includes('closed-loop controller'), false, 'Must not invent closed-loop controller')

  // 2. European Regional Phase Entry (Rule 159 EPC)
  const epSlots = {
    pct_number: 'PCT/EP2022/065432',
    target_jurisdiction: 'EPO'
  }
  const epDoc = generateStatutoryDocument(doc, epSlots, 'Aman')
  assert.ok(epDoc.includes('EUROPEAN REGIONAL PHASE ENTRY FORMALITIES (RULE 159 EPC)'))
  assert.ok(epDoc.includes('Rule 159 EPC / Articles 153 & 78 EPC'))
  assert.ok(epDoc.includes('PCT/EP2022/065432'))
  assert.equal(epDoc.includes('35 U.S.C. § 371'), false, 'EPO filing must not include US 371')
  assert.equal(epDoc.includes('Primary Operating Chassis [10]'), false, 'Must not invent chassis [10]')
})

test('receiving office isolation: PCT/US... does NOT infer target office as US', () => {
  const doc = identifyDocument('Draft a National Phase Patent Application')
  const history = [
    { role: 'user', content: 'Draft a National Phase Patent Application' },
    { role: 'assistant', content: 'What is the PCT international application number?' }
  ]
  const slots = extractSlots(doc, 'PCT/US2023/012345', history)
  assert.equal(slots.pct_number, 'PCT/US2023/012345')
  assert.equal(slots.target_jurisdiction, undefined, 'Must not confuse receiving office US with target office')

  const intake = evaluateIntakePhase(doc, slots, 'PCT/US2023/012345', 2)
  assert.equal(intake.state, 'TARGET_OFFICE_REQUIRED')
  assert.equal(intake.phase, 'INTERVIEW')
  assert.ok(intake.nextQuestion.includes('target national or regional office'))
  assert.equal(intake.nextQuestion.includes('USPTO, EPO, UKIPO'), true)
})

test('frozen failure regression test: observed bad output facts are strictly blocked', async () => {
  const { generateStatutoryDocument } = await import('../src/lib/document-intake-coordinator.js')
  const doc = identifyDocument('Draft a National Phase Patent Application')

  const FROZEN_OBSERVED_FAILURE = [
    'Jane Doe',
    'John Smith',
    '100 Innovation Way',
    'Tech City',
    'WO 2023/135791',
    'US 63/298,411',
    'rain-sensing pad',
    'photovoltaic panel',
    'supercapacitor',
    'capacitive moisture sensor',
    '10 cm and 15 cm',
    '30-minute interval',
    '25% to 40%',
    '48 to 72 hour',
    'motorized valve actuator',
    'Deposit Account No. 12-3456',
    '$900.00',
    'all international requirements have been timely fulfilled'
  ]

  // Turn 1: User provides only PCT number
  const historyTurn1 = [
    { role: 'user', content: 'Draft a National Phase Patent Application' },
    { role: 'assistant', content: 'What is the PCT international application number?' }
  ]
  const slotsTurn1 = extractSlots(doc, 'PCT/US2023/012345', historyTurn1)
  const intakeTurn1 = evaluateIntakePhase(doc, slotsTurn1, 'PCT/US2023/012345', 2)

  // Must NOT enter drafting state
  assert.equal(intakeTurn1.phase, 'INTERVIEW')
  assert.equal(intakeTurn1.state, 'TARGET_OFFICE_REQUIRED')

  // Generate doc under US target with only verified inputs
  const slotsReady = {
    pct_number: 'PCT/US2023/012345',
    target_jurisdiction: 'US',
    operative_document_status: 'PCT Application as Published (Article 21 PCT)'
  }
  const draftedDoc = generateStatutoryDocument(doc, slotsReady, 'Aman')

  for (const forbiddenFact of FROZEN_OBSERVED_FAILURE) {
    assert.equal(
      draftedDoc.toLowerCase().includes(forbiddenFact.toLowerCase()),
      false,
      `Drafted document must not contain hallucinated fact: "${forbiddenFact}"`
    )
    assert.equal(
      intakeTurn1.nextQuestion.toLowerCase().includes(forbiddenFact.toLowerCase()),
      false,
      `Interview prompt must not contain hallucinated fact: "${forbiddenFact}"`
    )
  }

  // Fees and deposit account safety checks
  assert.ok(draftedDoc.includes('CURRENT_FEE_VERIFICATION_REQUIRED'))
  assert.ok(draftedDoc.includes('DEPOSIT ACCOUNT NUMBER — IF APPLICABLE'))
  assert.equal(draftedDoc.includes('$900.00'), false)
  assert.equal(draftedDoc.includes('12-3456'), false)
})

test('Turn 3 gate: "Please draft" does NOT bypass underlying PCT source requirement', () => {
  const doc = identifyDocument('Draft a National Phase Patent Application')
  const history = [
    { role: 'user', content: 'Draft a National Phase Patent Application' },
    { role: 'assistant', content: 'What is the PCT international application number?' },
    { role: 'user', content: 'PCT/US2023/012345' },
    { role: 'assistant', content: 'What is the target national or regional office for this national-phase entry?' }
  ]
  const promptTurn3 = 'USPTO under 35 U.S.C. § 371. The application is as published under Article 21 without amendments. Please draft.'
  const slots = extractSlots(doc, promptTurn3, history)
  
  assert.equal(slots.pct_number, 'PCT/US2023/012345')
  assert.equal(slots.target_jurisdiction, 'US')
  assert.equal(slots.no_amendments, true)
  assert.equal(slots.wo_number, undefined)

  const intake = evaluateIntakePhase(doc, slots, promptTurn3, 4)
  
  // Must remain in INTERVIEW! "Please draft" does not bypass source gate!
  assert.equal(intake.phase, 'INTERVIEW')
  assert.equal(intake.state, 'PCT_SOURCE_DOCUMENT_REQUIRED')
  assert.ok(intake.nextQuestion.includes('WO publication number'))
  assert.ok(intake.recap.some(r => r.includes('USPTO — U.S. National Stage under 35 U.S.C. § 371')))
  assert.ok(intake.recap.some(r => r.includes('Article 21 published international application, with no Article 19 or Article 34 amendments')))
})

test('Turn 4: Providing WO publication number unlocks ready to draft state with strict provenance', async () => {
  const { generateStatutoryDocument } = await import('../src/lib/document-intake-coordinator.js')
  const doc = identifyDocument('Draft a National Phase Patent Application')
  const history = [
    { role: 'user', content: 'Draft a National Phase Patent Application' },
    { role: 'assistant', content: 'What is the PCT international application number?' },
    { role: 'user', content: 'PCT/US2023/012345' },
    { role: 'assistant', content: 'What is the target national or regional office for this national-phase entry?' },
    { role: 'user', content: 'USPTO under 35 U.S.C. § 371. The application is as published under Article 21 without amendments. Please draft.' },
    { role: 'assistant', content: 'To prepare the national-stage package without introducing unsupported subject matter, I need the underlying international application/publication.\n\nPlease provide the WO publication number (e.g. WO 2023/135791) or upload the published PCT application.' }
  ]
  const promptTurn4 = 'WO 2023/135791 A1'
  const slots = extractSlots(doc, promptTurn4, history)

  assert.equal(slots.pct_number, 'PCT/US2023/012345')
  assert.equal(slots.target_jurisdiction, 'US')
  assert.equal(slots.wo_number, 'WO 2023/135791 A1')

  const intake = evaluateIntakePhase(doc, slots, promptTurn4, 6)
  assert.equal(intake.phase, 'READY_TO_DRAFT')
  assert.equal(intake.state, 'READY_TO_DRAFT')

  const docMarkdown = generateStatutoryDocument(doc, slots, 'Aman')

  // Verify all 10 unverified statements are replaced with strict legal provenance notices:
  assert.equal(docMarkdown.includes('Applicant of Record: Aman'), false, 'Must not assume Aman is applicant')
  assert.ok(docMarkdown.includes('[APPLICANT OF RECORD — TO BE VERIFIED'))
  assert.ok(docMarkdown.includes('[PRIORITY CLAIMS — TO BE VERIFIED'))
  assert.ok(docMarkdown.includes('WO 2023/135791 A1'))
  assert.ok(docMarkdown.includes('[INVENTOR DECLARATION STATUS: PENDING / UNEXECUTED'))
  assert.ok(docMarkdown.includes('[POWER OF ATTORNEY: PENDING EXECUTION'))
  assert.ok(docMarkdown.includes('No amendments under PCT Article 19 or 34 have been submitted'))
  assert.ok(docMarkdown.includes('[WRITTEN DESCRIPTION / 35 U.S.C. § 112 SUPPORT'))
  assert.ok(docMarkdown.includes('[INFORMATION DISCLOSURE STATEMENT (IDS)'))
  assert.ok(docMarkdown.includes('[CURRENT_FEE_VERIFICATION_REQUIRED'))
  assert.ok(docMarkdown.includes('[DEPOSIT ACCOUNT NUMBER — IF APPLICABLE'))
})
test('Turn-taking sequence: PCT -> Office -> Title -> Inventor without slot collision', () => {
  const doc = identifyDocument('Draft a National Phase Patent Application')

  // Turn 1 -> Assistant asks for PCT number
  const promptTurn1 = 'Draft a National Phase Patent Application'
  const slotsTurn1 = extractSlots(doc, promptTurn1, [])
  const intakeTurn1 = evaluateIntakePhase(doc, slotsTurn1, promptTurn1, 1)
  assert.equal(intakeTurn1.state, 'PCT_NUMBER_REQUIRED')
  assert.ok(intakeTurn1.formattedResponse.includes('Please provide the PCT international application number'))

  // Turn 2 -> User provides PCT number
  const historyTurn2 = [
    { role: 'user', content: promptTurn1 },
    { role: 'assistant', content: intakeTurn1.formattedResponse }
  ]
  const promptTurn2 = 'PCT/US2023/012345'
  const slotsTurn2 = extractSlots(doc, promptTurn2, historyTurn2)
  assert.equal(slotsTurn2.pct_number, 'PCT/US2023/012345')
  assert.equal(slotsTurn2.target_jurisdiction, undefined, 'Must not infer target office from PCT/US... receiving office or greeting text')
  assert.equal(slotsTurn2.title, undefined)

  const intakeTurn2 = evaluateIntakePhase(doc, slotsTurn2, promptTurn2, 2)
  assert.equal(intakeTurn2.state, 'TARGET_OFFICE_REQUIRED')
  assert.ok(intakeTurn2.formattedResponse.includes('✓ Recorded: PCT International Application Number: PCT/US2023/012345.'))
  assert.ok(intakeTurn2.formattedResponse.includes('What is the target national or regional office'))

  // Turn 3 -> User provides USPTO
  const historyTurn3 = [
    ...historyTurn2,
    { role: 'user', content: promptTurn2 },
    { role: 'assistant', content: intakeTurn2.formattedResponse }
  ]
  const promptTurn3 = 'USPTO'
  const slotsTurn3 = extractSlots(doc, promptTurn3, historyTurn3)
  assert.equal(slotsTurn3.pct_number, 'PCT/US2023/012345')
  assert.equal(slotsTurn3.target_jurisdiction, 'US')
  assert.equal(slotsTurn3.title, undefined, 'Must NOT record USPTO as title')

  const intakeTurn3 = evaluateIntakePhase(doc, slotsTurn3, promptTurn3, 3)
  assert.ok(intakeTurn3.formattedResponse.includes('✓ Recorded: Target Office — United States Patent and Trademark Office (USPTO).'))
  assert.ok(intakeTurn3.formattedResponse.includes('What is the title of the invention?'))

  // Turn 4 -> User provides invention title "JAADUGAR"
  const historyTurn4 = [
    ...historyTurn3,
    { role: 'user', content: promptTurn3 },
    { role: 'assistant', content: intakeTurn3.formattedResponse }
  ]
  const promptTurn4 = 'JAADUGAR'
  const slotsTurn4 = extractSlots(doc, promptTurn4, historyTurn4)
  assert.equal(slotsTurn4.title, 'JAADUGAR')
  assert.equal(slotsTurn4.inventors, undefined)

  const intakeTurn4 = evaluateIntakePhase(doc, slotsTurn4, promptTurn4, 4)
  assert.ok(intakeTurn4.formattedResponse.includes('✓ Recorded: Title of Invention — JAADUGAR.'))
  assert.ok(intakeTurn4.formattedResponse.includes('Next, please provide the inventor name(s)'))
})

test('Turn-taking sequence: EPO dynamic routing, Rule 159 EPC terminology, and regional package drafting', () => {
  const doc = identifyDocument('Draft a National Phase Patent Application')

  // Turn 1 -> User initiates National Phase
  const promptTurn1 = 'Draft a National Phase Patent Application'
  const slotsTurn1 = extractSlots(doc, promptTurn1, [])
  const intakeTurn1 = evaluateIntakePhase(doc, slotsTurn1, promptTurn1, 1)
  assert.equal(intakeTurn1.state, 'PCT_NUMBER_REQUIRED')

  // Turn 2 -> User provides PCT application number
  const historyTurn2 = [
    { role: 'user', content: promptTurn1 },
    { role: 'assistant', content: intakeTurn1.formattedResponse }
  ]
  const promptTurn2 = 'PCT/US2023/012345'
  const slotsTurn2 = extractSlots(doc, promptTurn2, historyTurn2)
  assert.equal(slotsTurn2.pct_number, 'PCT/US2023/012345')
  assert.equal(slotsTurn2.target_jurisdiction, undefined)

  const intakeTurn2 = evaluateIntakePhase(doc, slotsTurn2, promptTurn2, 2)
  assert.equal(intakeTurn2.state, 'TARGET_OFFICE_REQUIRED')

  // Turn 3 -> User provides EPO
  const historyTurn3 = [
    ...historyTurn2,
    { role: 'user', content: promptTurn2 },
    { role: 'assistant', content: intakeTurn2.formattedResponse }
  ]
  const promptTurn3 = 'EPO'
  const slotsTurn3 = extractSlots(doc, promptTurn3, historyTurn3)
  assert.equal(slotsTurn3.target_jurisdiction, 'EPO')

  const intakeTurn3 = evaluateIntakePhase(doc, slotsTurn3, promptTurn3, 3)
  // Must dynamically acknowledge European Patent Office and cite Rule 159 EPC
  assert.ok(intakeTurn3.formattedResponse.includes('European Patent Office (EPO)'))
  assert.ok(intakeTurn3.formattedResponse.includes('Rule 159 EPC'))
  assert.equal(intakeTurn3.formattedResponse.includes('35 U.S.C. § 371'), false)
  assert.ok(intakeTurn3.formattedResponse.includes('What is the title of the invention?'))

  // Turn 4 -> User provides title "Novel Bio-Sensor"
  const historyTurn4 = [
    ...historyTurn3,
    { role: 'user', content: promptTurn3 },
    { role: 'assistant', content: intakeTurn3.formattedResponse }
  ]
  const promptTurn4 = 'Novel Bio-Sensor'
  const slotsTurn4 = extractSlots(doc, promptTurn4, historyTurn4)
  assert.equal(slotsTurn4.title, 'Novel Bio-Sensor')

  const intakeTurn4 = evaluateIntakePhase(doc, slotsTurn4, promptTurn4, 4)
  assert.ok(intakeTurn4.formattedResponse.includes('✓ Recorded: Title of Invention — Novel Bio-Sensor.'))
  // Must refer to European regional-phase application, NOT U.S. national-stage!
  assert.ok(intakeTurn4.formattedResponse.includes('European regional-phase application'))
  assert.equal(intakeTurn4.formattedResponse.includes('U.S.'), false)

  // Turn 5 -> User provides inventor "Dr. Elena Rostova"
  const historyTurn5 = [
    ...historyTurn4,
    { role: 'user', content: promptTurn4 },
    { role: 'assistant', content: intakeTurn4.formattedResponse }
  ]
  const promptTurn5 = 'Dr. Elena Rostova'
  const slotsTurn5 = extractSlots(doc, promptTurn5, historyTurn5)
  assert.equal(slotsTurn5.inventors, 'Dr. Elena Rostova')

  const intakeTurn5 = evaluateIntakePhase(doc, slotsTurn5, promptTurn5, 5)
  assert.ok(intakeTurn5.formattedResponse.includes('✓ Recorded: Inventor — Dr. Elena Rostova.'))
  // Must refer to European regional-phase application
  assert.ok(intakeTurn5.formattedResponse.includes('applicant for the European regional-phase application'))
  assert.equal(intakeTurn5.formattedResponse.includes('U.S.'), false)

  // Turn 6 -> User provides applicant & WO number
  const historyTurn6 = [
    ...historyTurn5,
    { role: 'user', content: promptTurn5 },
    { role: 'assistant', content: intakeTurn5.formattedResponse }
  ]
  const promptTurn6 = 'BioTech GmbH, WO 2023/135791, as published without amendments'
  const slotsTurn6 = extractSlots(doc, promptTurn6, historyTurn6)
  assert.equal(slotsTurn6.target_jurisdiction, 'EPO')
  assert.equal(slotsTurn6.wo_number, 'WO 2023/135791')
  assert.equal(slotsTurn6.no_amendments, true)

  const intakeTurn6 = evaluateIntakePhase(doc, slotsTurn6, promptTurn6, 6)
  assert.equal(intakeTurn6.phase, 'READY_TO_DRAFT')

  // Generate the statutory document: must be European Regional Phase under Rule 159 EPC
  const docMarkdown = generateStatutoryDocument(doc, slotsTurn6, 'Aman')
  assert.ok(docMarkdown.includes('EUROPEAN REGIONAL PHASE ENTRY FORMALITIES (RULE 159 EPC)'))
  assert.ok(docMarkdown.includes('European Patent Office (EPO)'))
  assert.ok(docMarkdown.includes('31-month statutory deadline'))
  assert.ok(docMarkdown.includes('Article 123(2) EPC Strict Safeguard'))
  assert.ok(docMarkdown.includes('Rule 43 EPC'))
  assert.equal(docMarkdown.includes('35 U.S.C. § 371'), false)
})

test('master prompt extracts inventors correctly without falling back to Aman Mishra and includes statutory citations', () => {
  const doc = VERIFIED_20_DOCUMENTS.find(d => d.id === 'provisional-patent-application')
  assert.ok(doc)

  const prompt = `Draft a complete USPTO Provisional Patent Application under 35 U.S.C. § 111(b) and 37 CFR 1.53(c) for an Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station.

Title: Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station
Problem: Commercial autonomous drones suffer from battery thermal degradation during rapid charging, prolonged turnaround times during manual battery replacement, and mechanical misalignment during landing on remote docking hubs under gusty crosswind conditions.
How it works: An automated robotic swapping station where an optical alignment dock centers an incoming drone.
Components: Precision optical alignment landing dock; 4-DOF inverted delta robotic manipulator with latch-actuation gripper.
Drawings: FIG. 1 - Isometric overview; FIG. 2 - Cross-sectional view.
Jurisdiction: United States (USPTO)
Inventors: Dr. Marcus Vance, Elena Rostova

All disclosure slots are verified. Go ahead and draft the complete specification into the document panel now.`

  const slots = extractSlots(doc, prompt, [])
  assert.equal(slots.inventors, 'Dr. Marcus Vance, Elena Rostova')
  assert.equal(slots.jurisdiction, 'US')

  // Even if authorName is passed as 'Aman Mishra', inventors must be Dr. Marcus Vance, Elena Rostova
  const generated = generateStatutoryDocument(doc, slots, 'Aman Mishra')
  assert.ok(generated.includes('**Inventors**: Dr. Marcus Vance, Elena Rostova'))
  assert.equal(generated.includes('Aman Mishra'), false)

  // Verify statutory citations and data sources
  assert.ok(generated.includes('USPTO Patent Examination Data System (PEDS)'))
  assert.ok(generated.includes('35 U.S.C. §§ 111(b), 112(a), 119(e)'))
  assert.ok(generated.includes('US 10,858,119 B2'))
  assert.ok(generated.includes('US 11,247,794 B2'))
  assert.ok(generated.includes('STATUTORY SOURCES, PRIOR ART CITATIONS & REGULATORY FOUNDATIONS'))
})

test('Document #008 European Patent Application: full prompt intake, EPC two-part claims, and European statutory citations', () => {
  const doc = VERIFIED_20_DOCUMENTS.find(d => d.id === 'european-patent-application')
  assert.ok(doc)

  const prompt = `Draft a European Patent Application (EPO) under EPC Article 75 and Rules 41-43 EPC for an Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station.

Title: Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station
Technical Field: Automated ground stations for commercial autonomous drone battery replacement and active thermal management
Problem-Solution: Commercial autonomous drones suffer from battery thermal degradation during rapid charging, prolonged turnaround times during manual battery replacement, and mechanical misalignment during landing on remote docking hubs under gusty crosswind conditions.
How it works: An automated robotic swapping station where an optical alignment dock centers an incoming drone. A multi-axis robotic gripper disengages the locking latch of a depleted battery pack and extracts it along a guided track.
Novelty: Closed-loop dielectric fluid immersion heat exchanger directly integrated with a 4-DOF inverted delta robotic manipulator and CAN-bus automated diagnostic handshake interface.
Components: Precision optical alignment landing dock; 4-DOF inverted delta robotic manipulator with latch-actuation gripper; rotating 8-bay indexing battery carousel; closed-loop dielectric fluid immersion heat exchanger; CAN-bus automated diagnostic handshake interface; edge embedded supervisory controller.
Drawings: FIG. 1 - Isometric overview; FIG. 2 - Cross-sectional view.
Jurisdiction: Europe (EPO)
Inventors: Dr. Marcus Vance, Elena Rostova

All disclosure slots are verified. Go ahead and draft the complete European Patent Application into the document panel now.`

  const slots = extractSlots(doc, prompt, [])
  assert.equal(slots.title, 'Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station')
  assert.equal(slots.inventors, 'Dr. Marcus Vance, Elena Rostova')
  assert.ok(slots.novelty.includes('Closed-loop dielectric fluid immersion heat exchanger'))
  assert.ok(slots.problem_solution.includes('battery thermal degradation'))

  const intake = evaluateIntakePhase(doc, slots, prompt, 0)
  assert.equal(intake.phase, 'READY_TO_DRAFT')

  const generated = generateStatutoryDocument(doc, slots, 'Aman Mishra')
  // Verify header and inventors
  assert.ok(generated.includes('# EUROPEAN PATENT APPLICATION'))
  assert.ok(generated.includes('**Inventors**: Dr. Marcus Vance, Elena Rostova'))
  assert.equal(generated.includes('Aman Mishra'), false)

  // Verify European statutory basis and authorities
  assert.ok(generated.includes('European Patent Convention (EPC) Article 75 / Rules 41-43 EPC'))
  assert.ok(generated.includes('European Patent Register (Espacenet)'))
  assert.ok(generated.includes('EP 3 456 789 A1'))
  assert.ok(generated.includes('EP 3 789 012 B1'))

  // Verify Problem-Solution Approach & Two-Part claims
  assert.ok(generated.includes('Rule 42(1)(c) EPC and the Problem-Solution Approach'))
  assert.ok(generated.includes('Formulation of the Objective Technical Problem'))
  assert.ok(generated.includes('**We claim under Rule 43 EPC:**'))
  assert.ok(generated.includes('**characterised in that**'))
  assert.ok(generated.includes('**characterised by the steps of:**'))

  // Verify 9th Section
  assert.ok(generated.includes('## 9. STATUTORY SOURCES, PRIOR ART CITATIONS & REGULATORY FOUNDATIONS'))
  assert.ok(generated.includes('EPC Article 56 & Guidelines for Examination in the EPO (Part G, Chapter VII)'))
})

test('Document #017 Patent Invalidity Opinion: full prompt intake, 11 statutory sections, claim charts, and PTAB forum strategy', () => {
  const prompt = `Prepare a formal Patent Invalidity Opinion under 35 U.S.C. §§ 102, 103, and 112 against US Patent 10,858,119 B2.

Target Patent: US Patent 10,858,119 B2
Title: Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station
Challenged Claims: Claims 1, 5, 8, 12, and 15
Patent Owner: SkyVault Logistics Corp.
Petitioner: AeroMatrix Dynamics Corp.
Prior Art References: EP 3 456 789 A1 (Kowalski et al.), US Patent 9,452,830 B1 (Chen et al.), US Patent Pub. 2018/0297711 A1 (Harrington et al.)
Grounds: 35 U.S.C. § 102 Anticipation, 35 U.S.C. § 103 Obviousness, and 35 U.S.C. § 112 Lack of Written Description
PHOSITA: Master's degree in robotics or mechanical engineering with 3+ years in autonomous UAV docking systems and thermal battery management.
Jurisdiction: United States (USPTO / PTAB / U.S. District Court)`

  const doc = identifyDocument(prompt)
  assert.equal(doc.id, 'patent-invalidity-opinion')
  assert.equal(doc.sections.length, 11)

  const slots = extractSlots(doc, prompt, [])
  assert.ok(slots.target_patent.includes('10,858,119'))
  assert.ok(slots.challenged_claims.includes('Claims 1'))
  assert.ok(slots.prior_art_references.includes('EP 3 456 789 A1'))
  assert.ok(slots.grounds.includes('102'))
  assert.ok(slots.petitioner.includes('AeroMatrix'))

  const intake = evaluateIntakePhase(doc, slots, prompt, 0)
  assert.equal(intake.phase, 'READY_TO_DRAFT')

  const generated = generateStatutoryDocument(doc, slots, 'Aman Mishra')
  assert.ok(generated.startsWith('# PATENT INVALIDITY OPINION'))
  assert.equal(generated.includes('Aman Mishra'), false)
  assert.ok(generated.includes('AeroMatrix Dynamics Corp'))
  assert.ok(generated.includes('SkyVault Logistics Corp'))
  assert.ok(generated.includes('US Patent 10,858,119 B2'))

  // Verify all 11 sections exist
  for (let i = 0; i < doc.sections.length; i++) {
    assert.ok(
      generated.includes(`## ${i + 1}. ${doc.sections[i].toUpperCase()}`),
      `Missing section ${i + 1}: ${doc.sections[i]}`
    )
  }

  // Verify substantive litigation content
  assert.ok(generated.includes('Invalidation Probability Matrix'))
  assert.ok(generated.includes('92% (High)'))
  assert.ok(generated.includes('Element-by-Element Claim Chart: Claim 1 vs. EP 3 456 789 A1 (Kowalski)'))
  assert.ok(generated.includes('KSR Int\'l Co. v. Teleflex Inc.'))
  assert.ok(generated.includes('Phillips v. AWH Corp.'))
  assert.ok(generated.includes('Inter Partes Review (IPR) Petition before PTAB'))
})




