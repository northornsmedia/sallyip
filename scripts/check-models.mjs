// Quick model resolution check - run with ori code
import { candidateModels, rankedModels } from "ori/eval";

async function checkModels() {
  // Our candidate model slugs
  const candidates = [
    "gemini-3.7-flash",
    "anthropic/claude-opus-4.6",
    "openai/gpt-5.6-sol",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "google/gemini-3.7-flash",
  ];

  console.log("Checking model resolution...\n");

  // Try exact slugs
  const ranked = await rankedModels({ slugs: candidates });
  
  console.log(`Resolved ${ranked.length} of ${candidates.length} candidates:\n`);
  
  for (const model of ranked) {
    console.log(`✓ ${model.slug}`);
    console.log(`  Provider: ${model.provider}`);
    console.log(`  Prompt: $${model.promptPrice?.toFixed(6)}/1M`);
    console.log(`  Completion: $${model.completionPrice?.toFixed(6)}/1M`);
    console.log(`  Context: ${model.contextLength?.toLocaleString()}`);
    console.log(`  Intelligence: ${model.intelligenceIndex ?? 'N/A'}`);
    console.log(`  Coding: ${model.codingIndex ?? 'N/A'}`);
    console.log(`  Agentic: ${model.agenticIndex ?? 'N/A'}`);
    console.log(`  Provider ID: ${model.providerId}`);
    console.log("");
  }

  // Check for missing
  const resolved = new Set(ranked.map(m => m.slug));
  const missing = candidates.filter(c => !resolved.has(c));
  if (missing.length) {
    console.log("MISSING:");
    for (const m of missing) console.log(`  ✗ ${m}`);
  }

  // Also check current production model
  console.log("\n--- Checking current production models ---");
  const prodModels = ["gemini-3.7-flash", "nvidia/nemotron-3.5-lightning:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];
  const prodRanked = await rankedModels({ slugs: prodModels });
  for (const m of prodRanked) {
    console.log(`✓ ${m.slug} - ${m.provider} - $${m.promptPrice}/1M in, $${m.completionPrice}/1M out - ${m.contextLength} ctx`);
  }
}

await checkModels();