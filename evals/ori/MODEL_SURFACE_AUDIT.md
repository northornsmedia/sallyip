# SallyIP Model Surface Audit

**Date:** 2026-09-10  
**Repository:** SallyIP  
**Ori Version:** 0.14.1+5bb4241 (via `ori.exe` Windows binary)  
**OpenRouter Configuration:** Uses `OPENROUTER_API_KEY` + per-model keys (`GEMINI_API_KEY`, `OPENROUTER_EMBEDDING_API_KEY`, etc.)  
**Provider Pinning:** Model slugs resolved via OpenRouter; provider selection automatic unless `baseUrl` specified  
**Evaluation Harness:** Ori Eval 0.14.1, Bun 1.4.2, Node 24.18.0  
**Environment:** Windows 11, `ori.exe` 0.14.1+5bb4241 (Windows binary from GitHub releases)

---

## 1. Core Chat Orchestration (`src/lib/chat-orchestrator.js`)

**Surface:** Main Sally chat endpoint (`/api/chat`)

| Property | Value |
|---|---|
| **Source File** | `src/lib/chat-orchestrator.js`, `api/_handlers/chat.js` |
| **Entry Point** | `orchestrateChat()` → `orchestrateSally()` |
| **Current Model** | `gemini-3.7-flash` (primary, weight 100) + Nemotron fallbacks |
| **Provider** | OpenRouter (primary via `OPENROUTER_API_KEY`); Gemini via `GEMINI_API_KEY` with custom base URL |
| **Temperature** | 0.3 (hardcoded in `sally-orchestrator.js:359`) |
| **Reasoning Effort** | Not explicitly set; temperature 0.3 implies low randomness |
| **Max Tokens** | 4096 (`SALLYIP_MAX_TOKENS` env, default 4096) |
| **Tools Available** | Matter retrieval (`retrieveHybridEvidence`), verification guards, document tooling, workflow automation |
| **Structured Output** | JSON via `generate-file` tool; markdown for chat |
| **Confidentiality Class** | `CONFIDENTIAL_IP` (default `SALLYIP_EXECUTION_MODE`) |
| **Latency Sensitivity** | High (interactive chat); timeout budget 25-35s |
| **Cost Sensitivity** | High (default free models; paid primary optional) |
| **Execution Modes** | `PUBLIC_RESEARCH`, `CONFIDENTIAL_IP`, `HIGHLY_CONFIDENTIAL` (fail-closed) |

---

## 2. Patent Drafting Service (`src/lib/patent-drafting-service.js`)

**Surface:** Patent section generation (`/api/patent-drafts` action `generate_section`)

| Property | Value |
|---|---|
| **Source File** | `src/lib/patent-drafting-service.js:284` |
| **Entry Point** | `generateDraftSection()` → `orchestrateSally()` |
| **Current Model** | Same engine pipeline as chat (`SALLYIP_PRIMARY_MODEL` or fallback) |
| **Provider** | OpenRouter / Gemini |
| **Temperature** | 0.3 (inherited) |
| **Max Tokens** | 4096 |
| **Tools Available** | None directly; uses retrieved evidence from matter |
| **Structured Output** | Markdown sections (background, claims, description, etc.) |
| **Confidentiality Class** | `CONFIDENTIAL_IP` / `HIGHLY_CONFIDENTIAL` (unpublished invention) |
| **Latency Sensitivity** | Medium (drafting can tolerate 30-60s) |
| **Cost Sensitivity** | Medium (long outputs, section-by-section) |

---

## 3. Hybrid Evidence Retrieval (`src/lib/verification-service.js`)

**Surface:** Evidence retrieval for all legal workflows

| Property | Value |
|---|---|
| **Source File** | `src/lib/verification-service.js:113` |
| **Entry Point** | `retrieveHybridEvidence()` |
| **Models Used** | Embeddings: `liquid/lfm-2.5-embedding-350m:free` (OpenRouter)<br>Reranker: `nvidia/llama-nemotron-rerank-vl-1b-v2:free` (OpenRouter) |
| **Providers** | OpenRouter (all) |
| **Embedding Dim** | 1024 (LFM) |
| **Rerank Model** | `nvidia/llama-nemotron-rerank-vl-1b-v2:free` |
| **Latency Sensitivity** | High (on every chat turn) |
| **Cost Sensitivity** | High (free tier; blocked for `CONFIDENTIAL_IP` mode) |
| **Execution Modes** | `PUBLIC_RESEARCH`: allowed<br>`CONFIDENTIAL_IP`/`HIGHLY_CONFIDENTIAL`: **blocked** (fail-closed) |

---

## 4. Embedding Service (`src/lib/embedding-service.js`)

**Surface:** Document ingestion & knowledge chunk embedding

| Property | Value |
|---|---|
| **Source File** | `src/lib/embedding-service.js`, `api/ingest-document.py` |
| **Entry Point** | `embedKnowledgeSource()` |
| **Model** | `liquid/lfm-2.5-embedding-350m:free` |
| **Provider** | OpenRouter |
| **Batch Size** | 16 chunks (7000 chars each) |
| **Max Chunks** | 512 per source |
| **Latency Sensitivity** | Medium (background job) |
| **Cost Sensitivity** | High (free tier; blocked for confidential) |
| **Execution Modes** | Blocked for `CONFIDENTIAL_IP`/`HIGHLY_CONFIDENTIAL` |

---

## 5. Rerank Service (`api/_handlers/rerank.js`)

**Surface:** Passage reranking API

| Property | Value |
|---|---|
| **Source File** | `api/_handlers/rerank.js`, `src/lib/provider-policy.js` |
| **Model** | `nvidia/llama-nemotron-rerank-vl-1b-v2:free` |
| **Provider** | OpenRouter |
| **Input** | Query + up to 100 documents |
| **Output** | Top-N reranked passages |
| **Latency Sensitivity** | High (on every retrieval) |
| **Execution Modes** | Blocked for confidential modes |

---

## 6. Verification & Entailment (`src/lib/verification-service.js`, `src/lib/entailment-service.js`)

**Surface:** Quote verification, entailment checking, contradiction detection

| Property | Value |
|---|---|
| **Source Files** | `src/lib/citation-service.js`, `src/lib/entailment-service.js`, `src/lib/contradiction-service.js`, `src/lib/temporal-service.js` |
| **Models Used** | Deterministic (no LLM) — lexical + section matching |
| **Models Involved** | None (pure code) |
| **Latency Sensitivity** | Low (fast deterministic checks) |
| **Cost Sensitivity** | None |

---

## 7. Voice Agent (`api/_handlers/voice-*.js`)

**Surface:** Voice speak, transcribe, session management

| Property | Value |
|---|---|
| **Source Files** | `api/_handlers/voice-speak.js`, `voice-transcribe.js`, `voice-session.js`, `voice-cancel.js` |
| **Models** | External TTS/STT (not via OpenRouter) — placeholder handlers |
| **Latency Sensitivity** | **Critical** (<200ms TTFB for conversational) |
| **Confidentiality** | `CONFIDENTIAL_IP` (matter-bound) |
| **Current Status** | Stub handlers; no live model integration yet |

---

## 8. Document Generation (`api/generate-file.py`, `src/lib/document-tool-service.js`)

**Surface:** PDF/DOCX/Markdown generation from artifacts

| Property | Value |
|---|---|
| **Source Files** | `api/generate-file.py`, `src/lib/document-tool-service.js` |
| **Models** | Python script (`create_chat_file.py`) — no LLM; artifact content from LLM |
| **Latency Sensitivity** | Medium |
| **Cost Sensitivity** | Low (no LLM call) |

---

## 9. Benchmark / Evaluation Scripts (`scripts/*.mjs`)

**Surface:** Offline evaluation, grounding probes, ablation studies

| Property | Value |
|---|---|
| **Source Files** | `scripts/stanford-bench-run.mjs`, `measure-grounding.mjs`, `grounding-benchmark-100.mjs`, `run-benchmark.mjs`, `ablation-bench.mjs`, `abigail-subset-run.mjs` |
| **Models** | Configurable via `SALLYIP_PRIMARY_MODEL` / `BENCH_PRIMARY_MODEL` |
| **Providers** | OpenRouter or Gemini (via `GEMINI_API_KEY`) |
| **Purpose** | Offline evaluation, not production surfaces |
| **Latency Sensitivity** | Low (batch) |
| **Cost Sensitivity** | High (large batch runs) |

---

## 10. Contract & Document Analysis (`src/lib/contract-service.js`, `src/lib/contract-analysis.js`)

**Surface:** Contract risk screening, clause segmentation

| Property | Value |
|---|---|
| **Source Files** | `src/lib/contract-service.js`, `src/lib/contract-analysis.js` |
| **Models** | Regex-based (deterministic) — no LLM in production |
| **Model-Assisted** | Gated by `provider-policy.js` — blocked for confidential |
| **Latency Sensitivity** | Low |
| **Cost Sensitivity** | None (regex) |

---

## 11. Specialist Routing & Legal Task Planning (`src/lib/specialist-router.js`, `src/lib/legal-task-planner.js`)

**Surface:** Workflow classification, specialist selection

| Property | Value |
|---|---|
| **Source Files** | `src/lib/specialist-router.js`, `src/lib/legal-task-planner.js` |
| **Models** | Deterministic keyword/regex classification |
| **Latency Sensitivity** | Low (sub-ms) |
| **Cost Sensitivity** | None |

---

## 12. Official Search (`src/lib/official-search-service.js`)

**Surface:** EPO, USPTO, EUIPO, CourtListener API calls

| Property | Value |
|---|---|
| **Source File** | `src/lib/official-search-service.js` |
| **Models** | None (API calls only) |
| **Providers** | EPO OPS, USPTO, EUIPO, CourtListener |
| **Latency Sensitivity** | Medium (external API) |
| **Cost Sensitivity** | API keys required; no LLM cost |

---

## Summary: Model Configuration Matrix

| Surface | Primary Model | Fallback | Embedding | Reranker | Confidentiality Gate |
|---|---|---|---|---|---|
| Chat | `gemini-3.7-flash` | Nemotron 3 Ultra / 3.5 Lightning | LFM-2.5-emb-350m:free | Nemotron rerank:free | Fail-closed |
| Patent Drafting | Same as chat | Same | Same | Same | Fail-closed |
| Retrieval | — | — | LFM-2.5-emb-350m:free | Nemotron rerank:free | **Blocked** for confidential |
| Embeddings | — | — | LFM-2.5-emb-350m:free | — | **Blocked** for confidential |
| Rerank | — | — | — | Nemotron rerank:free | **Blocked** for confidential |
| Voice | TBD (external) | — | — | — | `CONFIDENTIAL_IP` |
| Benchmarks | Configurable | — | Same as chat | Same | N/A (offline) |

---

## Current Model IDs (from `.env.example` & `sally-orchestrator.js`)

| Env Var | Default Value | Purpose |
|---|---|---|
| `SALLYIP_MODEL` | `nvidia/nemotron-3.5-lightning:free` | Legacy single-model fallback |
| `SALLYIP_PRIMARY_MODEL` | (unset → `gemini-3.7-flash`) | Primary chat/drafting |
| `SALLYIP_EMBEDDING_MODEL` | `liquid/lfm-2.5-embedding-350m:free` | Embeddings |
| `SALLYIP_LFM_CHAT_MODEL` | `liquid/lfm-2.5-2.6b:free` | LFM chat auxiliary |
| `SALLYIP_DOTS_MODEL` | `dots-studio/dots-3-note-preview:free` | DOTS auxiliary |
| `SALLYIP_GEMMA_MODEL` | `google/gemma-4-26b-a4b-it:free` | Gemma auxiliary |
| `SALLYIP_RERANK_MODEL` | `nvidia/llama-nemotron-rerank-vl-1b-v2:free` | Reranker |
| `SALLYIP_OX_MODEL` | `stealth/ox-alpha` | Stealth auxiliary |
| `SALLYIP_PRIMARY_MODEL` | configurable | Override primary |

---

## Confidentiality Policy Summary

| Mode | Chat Allowed | Embeddings | Rerank | Notes |
|---|---|---|---|---|
| `PUBLIC_RESEARCH` | ✅ All models | ✅ | ✅ | Public statutes, published patents |
| `CONFIDENTIAL_IP` | ✅ Approved only | ❌ Blocked | ❌ Blocked | Matter content, drafts, NDA |
| `HIGHLY_CONFIDENTIAL` | ✅ Primary only | ❌ Blocked | ❌ Blocked | Unpublished inventions, trade secrets |

**Approved Providers (as of audit):**
- **Gemini 3.7 Flash** — conditional (`SALLYIP_APPROVE_GEMINI_CONFIDENTIAL=1` + paid Cloud + DPA)
- **All `:free` / contributor models** — **DENIED** for confidential (may train)
- **Stealth/OX** — **DENIED** (unknown)

---

## Latency Budgets (Current)

| Surface | Budget | Notes |
|---|---|---|
| Chat (streaming) | 25-35s total | `STRAGGLER_ABORT_MS=25000`, `RACE_TIMEOUT=28000` |
| Retrieval | ~2-3s | Parallel lexical + vector + pack |
| Embedding | ~2s | Batched 16 chunks |
| Rerank | ~1-2s | Up to 100 docs |
| Patent Draft Section | 30-60s | Single section |
| Voice (target) | <200ms TTFB | Not yet implemented |

---

## Cost Profile (Current Free-Tier Defaults)

| Component | Model | Est. Cost/1M tokens | Notes |
|---|---|---|---|
| Chat Primary | `gemini-3.7-flash` | $0 (if free tier) / $1.25/M (paid) | Paid recommended for confidential |
| Chat Fallback | Nemotron 3 Ultra | $0 (free) | May train |
| Embeddings | LFM-2.5-350m | $0 (free) | **Blocked for confidential** |
| Rerank | Nemotron rerank | $0 (free) | **Blocked for confidential** |
| Voice | TBD | TBD | External TTS/STT |

---

## Key Evaluation Questions for Ori

1. **Which model best replaces `gemini-3.7-flash` as primary for complex patent reasoning (§101/102/103/112, FTO, invalidity)?**
2. **Which model best serves patent drafting (claims, description, §101/112 screens)?**
3. **Which model best serves document drafting (NDA, license, SPA, DPA)?**
4. **Which model best serves voice conversational turns (context resolution, low latency)?**
5. **Which model best serves verification/entailment (independent judge)?**
5. **Can any single model cover all surfaces, or is routing required?**
6. **What is the cost/latency/quality tradeoff at 1k/10k/100k turns?**

---

## Files to Create for Ori Evaluation

```
evals/ori/
├── MODEL_SURFACE_AUDIT.md          (this file)
├── METHODOLOGY.md
├── DATASET.md
├── SCORING_RUBRIC.md
├── MODEL_COMPARISON.md
├── MODEL_RECOMMENDATION.md
├── FAILURES.md
├── COST_ANALYSIS.md
├── results/
└── dataset/
    ├── track-a-legal-reasoning.jsonl
    ├── track-b-grounding.jsonl
    ├── track-c-tool-use.jsonl
    ├── track-d-drafting.jsonl
    ├── track-e-context-followup.jsonl
    ├── track-f-refusal.jsonl
    ├── track-g-speed.jsonl
    └── track-h-cost.jsonl
```

---

## Next Steps

1. **Create `evals/ori/METHODOLOGY.md`** — detailed evaluation design
2. **Create `evals/ori/DATASET.md`** — 100-150 case distribution
3. **Create `evals/ori/SCORING_RUBRIC.md`** — weighted rubric with P0 gates
4. **Build dataset** from real SallyIP failure cases + synthetic adversarial
5. **Run Ori pilot** (40 cases, 5-8 models)
6. **Run full finalist evaluation** (100-150 cases, top 2-3 models)
7. **Produce `MODEL_COMPARISON.md` and `MODEL_RECOMMENDATION.md`**

---

*Audit complete. Ready for Ori evaluation design.*