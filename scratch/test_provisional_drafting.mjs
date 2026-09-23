import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: true });
import fs from 'node:fs';
import { VERIFIED_20_DOCUMENTS, extractSlots, evaluateIntakePhase, buildDocumentIntakePrompt } from '../src/lib/document-intake-coordinator.js';
import { orchestrateSally } from '../src/lib/sally-orchestrator.js';

const doc = VERIFIED_20_DOCUMENTS.find(d => d.id === 'provisional-patent-application');

const masterPrompt = `Draft a complete USPTO Provisional Patent Application under 35 U.S.C. § 111(b) and 37 CFR 1.53(c) for an Automated Drone Battery Swapping and Thermal Conditioning Station.

Title: Automated Drone Battery Swapping and Rapid Thermal Conditioning Ground Station
Problem: Commercial autonomous drones suffer from battery thermal degradation during rapid charging, prolonged turnaround times during manual battery replacement, and mechanical misalignment during landing on remote docking hubs.
How it works: An automated robotic swapping station where an optical alignment dock centers an incoming drone. A multi-axis robotic gripper disengages the locking latch of a depleted battery pack and extracts it along a guided track. The battery pack is transferred into a rotating multi-bay carousel immersed in a closed-loop dielectric liquid cooling chamber. Simultaneously, a pre-conditioned, fully charged battery pack is retrieved from an adjacent bay of the carousel and inserted into the drone chassis, followed by an automated electronic diagnostic handshake.
Components: Precision optical alignment landing dock, 4-DOF inverted delta robotic manipulator with latch-actuation gripper, rotating 8-bay indexing battery carousel, closed-loop dielectric fluid immersion heat exchanger, CAN-bus automated diagnostic handshake interface, and edge embedded supervisory controller.
Jurisdiction: United States (USPTO)
Inventors: Dr. Marcus Vance, Elena Rostova

Draft it now with all 7 statutory sections complete.`;

const slots = extractSlots(doc, masterPrompt, []);
const intake = evaluateIntakePhase(doc, slots, masterPrompt, 0);
console.log('Intake Phase:', intake.phase);
console.log('Filled Slots:', intake.filledSlots);
console.log('Recap:', intake.recap);

const systemDirective = buildDocumentIntakePrompt(doc, intake, slots);
console.log('\n--- System Directive ---');
console.log(systemDirective);

console.log('\n--- Launching Live Draft with Sally Orchestrator ---');
const t0 = Date.now();
try {
  const result = await orchestrateSally(
    [
      { role: 'system', content: systemDirective },
      { role: 'user', content: masterPrompt }
    ],
    process.env,
    'http://localhost:5173'
  );
  const duration = Date.now() - t0;
  console.log(`\n✅ Drafting completed in ${(duration / 1000).toFixed(1)}s!`);
  console.log('Primary Engine:', result.meta?.primary_engine);
  fs.writeFileSync('scratch/full_provisional_draft.md', result.answer, 'utf8');
  console.log('Saved full draft to scratch/full_provisional_draft.md (Length:', result.answer.length, 'chars)');
} catch (err) {
  console.error('❌ Drafting error:', err);
}

