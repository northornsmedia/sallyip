import { test } from "bun:test";
import { rankedModels } from "ori/eval";

test("resolve candidate models", async () => {
  const slugs = [
    "gemini-3.7-flash",
    "anthropic/claude-opus-4.6",
    "openai/gpt-5.6-sol",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "google/gemini-3.7-flash",
  ];

  const ranked = await rankedModels({ slugs });
  console.log(`Resolved ${ranked.length}/${5} models:`);
  for (const m of ranked) {
    console.log(`✓ ${m.slug} - ${m.provider} - $${m.promptPrice}/1M in, $${m.completionPrice}/1M out - ${m.contextLength} ctx`);
  }
  
  // Check for missing
  const resolved = new Set(ranked.map(m => m.slug));
  const missing = ["gemini-3.7-flash", "anthropic/claude-opus-4.6", "openai/gpt-5.6-sol", "nvidia/nemotron-3-ultra-550b-a55b:free", "google/gemini-3.7-flash"]
    .filter(s => !resolved.has(s));
  if (missing.length) {
    console.log("MISSING:", missing.join(", "));
  }
});