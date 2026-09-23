import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: true });
import { orchestrateSally } from '../src/lib/sally-orchestrator.js';

const showcasePrompts = [
  {
    name: 'Prompt 1: Patent Eligibility & 101/102/103 Analysis',
    prompt: 'Evaluate the patentability under 35 U.S.C. 101 and 102 for an edge-computing wearable device that uses on-device neural networks to predict cardiac arrhythmias in real time.'
  },
  {
    name: 'Prompt 2: Independent Claim Drafting (USPTO style)',
    prompt: 'Draft independent Claim 1 in formal USPTO format for an automated drone battery swapping station comprising a robotic gripper, rotating carousel, and thermal management subsystem.'
  },
  {
    name: 'Prompt 3: Freedom to Operate (FTO) & Risk Assessment',
    prompt: 'Provide a structured 3-step Freedom-to-Operate (FTO) clearance methodology for a SaaS company integrating generative AI models into enterprise legal contract review.'
  }
];

console.log('Testing Showcase Prompts with Live Sally Orchestrator + NVIDIA NIM...\n');

for (const p of showcasePrompts) {
  console.log(`=======================================================`);
  console.log(`Testing: ${p.name}`);
  console.log(`Prompt: "${p.prompt}"`);
  const t0 = Date.now();
  try {
    const res = await orchestrateSally([{ role: 'user', content: p.prompt }], process.env, 'http://localhost:5173');
    const elapsed = Date.now() - t0;
    console.log(`STATUS: ✅ SUCCESS in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`Engine: ${res.meta?.primary_engine}`);
    console.log(`Response Preview (first 250 chars):\n${res.answer.slice(0, 250)}...\n`);
  } catch (err) {
    console.error(`STATUS: ❌ FAILED in ${Date.now() - t0}ms:`, err.message);
  }
}
