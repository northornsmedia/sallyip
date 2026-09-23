import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env', override: true });
import fs from 'node:fs';
import { orchestrateSally } from '../src/lib/sally-orchestrator.js';

const prompts = [
  {
    id: 1,
    title: "Patent Claim 1 Drafting (Automated Drone Battery Swapping)",
    prompt: "Draft independent Claim 1 in formal USPTO statutory format for an automated drone battery swapping station comprising a robotic gripper, rotating carousel, and thermal management subsystem."
  },
  {
    id: 2,
    title: "Patent Eligibility & Prior Art (Wearable Cardiac AI)",
    prompt: "Evaluate patent eligibility under 35 U.S.C. 101 and novelty under 102 for an edge-computing wearable device that uses on-device neural networks to predict cardiac arrhythmias in real time."
  },
  {
    id: 3,
    title: "Freedom-to-Operate Clearance (Generative AI Legal SaaS)",
    prompt: "Provide a structured 3-step Freedom-to-Operate (FTO) clearance methodology for a SaaS company integrating generative AI models into enterprise legal contract review."
  },
  {
    id: 4,
    title: "Office Action Section 103 Obviousness Defense",
    prompt: "Draft a concise, rigorous responsive argument to overcome a 35 U.S.C. 103 obviousness rejection by demonstrating lack of motivation to combine Reference A (solar power inverter) with Reference B (submersible fluid cooling pump)."
  },
  {
    id: 5,
    title: "Prior Art Search & Invalidation Strategy (Encrypted Biometric WebRTC)",
    prompt: "Formulate an exhaustive prior art search strategy targeting an enterprise patent covering real-time biometric identity verification over encrypted WebRTC channels."
  }
];

const results = [];

console.log('Testing live prompts against Sally orchestrator (NVIDIA NIM)...\n');

for (const p of prompts) {
  console.log(`[${p.id}/5] Testing: ${p.title}...`);
  const start = Date.now();
  try {
    const res = await orchestrateSally(
      [{ role: 'user', content: p.prompt }],
      process.env,
      'http://localhost:5173'
    );
    const duration = Date.now() - start;
    console.log(`   ✅ Success (${duration}ms) via ${res.meta?.primary_engine || 'NVIDIA NIM'}`);
    results.push({
      ...p,
      status: 'success',
      duration_ms: duration,
      engine: res.meta?.primary_engine || 'NVIDIA NIM (meta/llama-3.2-11b-vision-instruct)',
      response: res.answer
    });
  } catch (err) {
    console.error(`   ❌ Failed (${Date.now() - start}ms): ${err.message}`);
    results.push({
      ...p,
      status: 'error',
      duration_ms: Date.now() - start,
      engine: 'NVIDIA NIM',
      response: `Error: ${err.message}`
    });
  }
}

fs.writeFileSync('scratch/prompts_and_responses.json', JSON.stringify(results, null, 2), 'utf8');
console.log('\nAll tests complete! Results saved to scratch/prompts_and_responses.json');
