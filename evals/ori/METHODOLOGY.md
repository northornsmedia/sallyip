# SallyIP Ori Evaluation Methodology

**Version:** 1.0  
**Date:** 2026-09-10  
**Ori Version:** 0.14.1+5bb4241  
**Harness:** Ori Eval (create-eval skill)  
**Runtime:** `ori.exe` 0.14.1+5bb4241 (Windows), Bun 1.4.2, Node 24.18.0

---

## 1. Evaluation Objective

Determine optimal model routing for SallyIP's legal/IP workloads by evaluating candidate models across 8 tracks against SallyIP's actual workflows, tools, failure cases, and acceptance criteria.

**Primary Question:**
> "Which model gives SallyIP the best legal/IP reasoning quality while maintaining strong grounding, low unsupported-assertion risk, acceptable latency and sustainable cost?"

**Non-Goals:**
- Do NOT optimise for raw benchmark accuracy alone
- Do NOT use a single model for everything if routing is superior
- Do NOT auto-swap production models without explicit approval

---

## 2. Evaluation Tracks (8 Tracks)

Each track is a separate Ori eval file with its own criteria and grading.

| Track | Name | Weight | Cases (Pilot/Full) | Key Metric |
|---|---|---|---|---|
| A | Legal Reasoning Quality | 30% | 12 / 35 | Legal correctness, issue ID, reasoning |
| B | Grounding / Anti-Hallucination | 25% | 12 / 30 | Fabrication rate, unsupported props, refusal |
| C | Tool / Workflow Use | 15% | 6 / 15 | Required tool called, forbidden avoided |
| D | Document Drafting | 10% | 6 / 15 | Structure, risk spotting, no invented facts |
| E | Short Contextual Follow-ups | 10% | 4 / 10 | Context resolution, memory |
| F | Refusal / Uncertainty Quality | 5% | 4 / 10 | Correct refusal, useful explanation |
| G | Speed | 3% | 6 / 15 | p50/p95 latency |
| H | Cost | 2% | N/A (computed) | $/turn, $/1k turns |

**P0 Gates (Any Failure = Overall FAIL):**
- Fabricates authorities above threshold (Track B)
- Repeatedly ignores evidence (Track B)
- Bypasses required tools (Track C)
- Fails confidential-provider policy (Track A/B)
- Produces fake legal certainty (Track F)
- Cannot reliably follow structured workflow (Track C)

---

## 3. Dataset Design

### Source Priority (Highest → Lowest)
1. **Real SallyIP failures** — from `tests/`, `benchmarks/failures/`, `benchmarks/hallucination-100.mjs`, `benchmarks/v1.0`, practitioner scorecard (`eval_scorecard_sample_25.md`)
2. **Adversarial probes** — `scripts/legalbench-probe.mjs`, `scripts/ablation-bench.mjs`
3. **Workflow end-to-end** — real matter contexts from `tests/*.integration.mjs`
4. **Synthetic but realistic** — crafted to match SallyIP prompt templates and tool schemas

### Distribution (Full: 130 cases)

| Track | Pilot (40) | Full (130) | Sources |
|---|---|---|---|
| A — Legal Reasoning | 12 | 35 | §101/102/103/112, FTO, office actions, trademark, contract |
| B — Grounding | 12 | 30 | Fake MPEP/case, unsupported props, quote failures, stale authority |
| C — Tool Use | 6 | 15 | Retrieval before analysis, matter context, workflow automation |
| D — Drafting | 6 | 15 | NDA, license, SPA, patent assignment, DPA, §103 response |
| E — Context Follow-up | 4 | 10 | "america", "claim four", "both", "wait, use US law" |
| F — Refusal | 4 | 10 | Insufficient evidence, nonexistent authority, ambiguous task |
| G — Speed | 6 | 15 | p50/p95 on all surfaces |
| H — Cost | N/A | Computed | Token counts from full runs |

### Case Format (JSONL)
```jsonl
{
  "id": "patent-101-001",
  "track": "A",
  "surface": "chat",
  "prompt": "Quote the exact text of 35 U.S.C. § 101...",
  "context": { "matter_id": "m-xyz", "jurisdictions": ["US"], "deep_research": false },
  "tools_allowed": ["retrieveHybridEvidence"],
  "expected": {
    "must_contain": ["Whoever invents or discovers", "process, machine, manufacture, or composition of matter"],
    "must_refuse": false,
    "required_citations": ["§ 101"],
    "forbidden": ["AI models are patentable"]
  },
  "grading": "exact_match | llm_judge",
  "judge_prompt": "legal_correctness_v1",
  "confidentiality": "CONFIDENTIAL_IP"
}
```

---

## 4. Grading Methodology

### Deterministic Grading (Used Where Possible)
| Check | Method |
|---|---|
| Jurisdiction resolution | Exact match (US, EP, GB, etc.) |
| Required tool called | Boolean (tool call present in trace) |
| Forbidden tool avoided | Boolean (no destructive tool calls) |
| Citation format | Regex `\[S\d+\]` |
| Quote verification | `verifyQuote()` exact match |
| Fake citation detection | Authority lookup in retrieval results |
| Section reference match | `§ \d+` pattern matching |
| Claim number extraction | Integer parsing from follow-up |

### LLM Judge (Qualitative Only)
Used **only** for genuinely qualitative outputs:
- Legal reasoning quality (Track A)
- Document drafting quality (Track D)
- Clarity / explanation usefulness (Track F)

**Judge Configuration (Pinned):**
- **Model:** `openai/gpt-5.6-terra` (or best available at eval time)
- **Provider:** OpenRouter (pinned)
- **Temperature:** 0
- **Rubric:** Fixed per track (versioned)
- **Consistency Check:** Run 3x on same outputs; report variance

**Judge Prompts (Versioned):**
- `legal_correctness_v1` — US patent law practitioner rubric
- `drafting_quality_v1` — Contract/patent document rubric
- `refusal_usefulness_v1` — Helpful explanation without over-refusal

---

## 5. Model Candidate Selection

### Inclusion Criteria
- Available via OpenRouter at eval time
- Supports chat completions + streaming
- Supports tool calling (for Track C)
- Context window ≥ 128k (for long legal contexts)

### Candidate Set (5-8 models)

| Category | Models (Examples) | Rationale |
|---|---|---|
| **Current Production** | `gemini-3.7-flash` (primary), `nvidia/nemotron-3.5-lightning:free` (fallback) | Baseline |
| **Top-Tier Reasoning** | `anthropic/claude-opus-4.6`, `openai/gpt-5.6-sol`, `google/gemini-3.7-flash` | Best legal reasoning |
| **Value/Quality** | `google/gemini-3.7-flash`, `anthropic/claude-fable-5`, `openai/gpt-5.6-terra` | Best quality/cost |
| **Open Weight / Self-Hostable** | `nvidia/nemotron-3-ultra-550b-a55b:free`, `meta-llama/llama-4.1-405b` | Self-host option |
| **Fast/Voice** | `nvidia/nemotron-3.5-lightning:free`, `google/gemma-3-27b-it:free` | Low latency |

**Final Candidate Count:** 5-8 (eliminate clearly poor in pilot)

---

## 6. Normalised Settings

All candidates evaluated with identical settings where possible:

| Setting | Value | Notes |
|---|---|---|
| Temperature | 0.3 | Consistent with SallyIP production |
| Max Tokens | 4096 | Production default |
| System Prompt | SallyIP `INTERNAL_PROMPT` (from `sally-orchestrator.js`) | Exact production prompt |
| Retrieval Context | Same 5-passage fixture for all | Controls retrieval variance |
| Tool Definitions | Exact SallyIP tool schemas | Track C validity |
| Reasoning Effort | Model-native default | Recorded per model |
| Max Turns | 3 (chat), 1 (drafting) | Prevents runaway |

**Model-Specific Overrides (Recorded):**
- Reasoning effort levels (if model supports)
- Thinking tokens budget
- Tool calling format differences

---

## 7. Provider Pinning & Reproducibility

| Element | Policy |
|---|---|
| Provider | OpenRouter (pinned per model) |
| Model ID | Exact slug from OpenRouter catalog |
| Reasoning Setting | Recorded per model |
| Temperature | 0.3 (fixed) |
| Timestamp | ISO 8601 per run |
| Run ID | Ori-generated |
| Ori Version | 0.14.1+5bb4241 |
| Bun Version | 1.4.2 |
| Node Version | 24.18.0 |
| OS | Windows 11 |

**Re-run Policy:**
- Pilot: 1 run per model
- Finalists: 3 runs per model (report variance)
- Report: mean ± std for each metric

---

## 8. Confidentiality Compliance

**CRITICAL:** Evaluation does NOT override SallyIP provider policy.

| Rule | Enforcement |
|---|---|
| No confidential matter data to unapproved providers | Synthetic/redacted cases only |
| No real client secrets in eval | All cases synthetic or public |
| Free `:free` models blocked for confidential tracks | Dataset tagged `confidentiality: CONFIDENTIAL_IP` |
| Provider policy evaluated as Track A case | Model must refuse unapproved provider |

---

## 9. Cost Model

**Cost per Turn =** (Input tokens × input price) + (Output tokens × output price) + (Embedding tokens × embedding price) + (Rerank tokens × rerank price)

**Projection Scenarios:**
| Volume | Description |
|---|---|
| 1,000 turns | Small team / solo practitioner |
| 10,000 turns | Medium firm |
| 100,000 turns | Large firm / enterprise |

**Assumptions:**
- Avg input: 8k tokens (context + retrieval)
- Avg output: 2k tokens
- Embeddings: 1 query + 8 passages per turn
- Rerank: 1 query + 20 passages per turn
- 30% turns use deep research (14 passages)

---

## 10. Evaluation Execution Plan

### Phase 1: Pilot (Week 1)
- 40 cases (stratified)
- 5-8 candidates
- 1 run each
- Eliminate clearly poor (fail P0 gate or bottom 50% aggregate)

### Phase 2: Full Evaluation (Week 2)
- 130 cases
- Top 2-3 finalists
- 3 runs each
- Full track coverage

### Phase 3: Analysis (Week 2-3)
- Aggregate scores
- P0 gate check
- Variance analysis
- Cost projection
- Routing recommendation

---

## 10. Output Artifacts

| File | Description |
|---|---|
| `evals/ori/MODEL_SURFACE_AUDIT.md` | Complete surface inventory |
| `evals/ori/METHODOLOGY.md` | This file |
| `evals/ori/DATASET.md` | Case distribution & sources |
| `evals/ori/SCORING_RUBRIC.md` | Detailed rubrics per track |
| `evals/ori/results/` | Ori raw outputs |
| `evals/ori/MODEL_COMPARISON.md` | Side-by-side comparison table |
| `evals/ori/MODEL_RECOMMENDATION.md` | Final routing recommendation |
| `evals/ori/FAILURES.md` | Per-model failure analysis |
| `evals/ori/COST_ANALYSIS.md` | Cost projections |

---

## 11. Success Criteria

The evaluation succeeds if it produces:
1. **Evidence-backed routing decision** — not popularity ranking
2. **Per-workload winner** — not single global winner
3. **Cost projections** at 1k/10k/100k turns
4. **P0 gate status** for each candidate
4. **Variance bounds** for finalists (3 runs)
5. **Failure taxonomy** — why each model failed where it did

---

*Methodology v1.0 — Ready for Ori pilot execution.*