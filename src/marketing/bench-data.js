// Factual benchmark figures — mirrors scripts/seo-data.mjs (single source remains that file).
// Never hand-copy new percentages here; update seo-data.mjs first, then sync.
export const BENCHMARKS = [
  { name: 'Grounding benchmark 100', meta: 'grounding-100 / 2026-09-09 · n=95 · gemini-flash-lite-latest', metrics: 'Authority recall 100% (95/95); Zero dangling citations 100%; Exact-quote 72.5% (87/120); Unverified 22.5% flagged', status: 'VERIFIED_INTERNAL' },
  { name: 'Frozen v1.0 P0 full regression', meta: 'v1.0 frozen · n=100 · 2026-09-09', metrics: 'Authority 98.0% PASS (boundary); Exact-quote 95.8% PASS; Missing-quote 4.2% FAIL; Entailment 66.7% FAIL; Unsupported 81.0% FAIL', status: 'BLOCKED' },
  { name: 'Adversarial v1 (live)', meta: 'adversarial-v1 · n=12 · 2026-09-10', metrics: 'Accurate 50.0% (6/12); Hallucinated 0%; Incomplete 50.0% (conservative abstention)', status: 'VERIFIED_INTERNAL' },
  { name: 'Stanford-style bench v1', meta: 'stanford-bench v1 · n=24 · 2026-09-09', metrics: 'Accurate 58.3% (14/24); Hallucinated 0%; Incomplete 41.7%', status: 'VERIFIED_INTERNAL' },
  { name: 'Ablation: guards vs base', meta: 'ablation 2026-09-10 · n=8 · simulation, 0 live calls', metrics: 'Injected fabrications flagged 100% (4/4) vs substance-only 25% — guard mechanics demo', status: 'VERIFIED_INTERNAL' },
  { name: 'Retrieval bench v1 (offline)', meta: 'patent_retrieval_v1 · 120 checks · 2026-09-10', metrics: 'Checks passed 82.5% (99/120); Family-resolution 0/19 — known metric issue under revision', status: 'PENDING' },
];
