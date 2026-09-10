# SallyIP Ori Evaluation Dataset

**Version:** 1.0  
**Date:** 2026-09-10  
**Total Cases:** 130 (Pilot: 40, Full: 130)  
**Format:** JSONL (one case per line)

---

## Distribution Summary

| Track | Name | Pilot | Full | Grading |
|---|---|---|---|---|
| A | Legal Reasoning Quality | 12 | 35 | Mixed (deterministic + LLM judge) |
| B | Grounding / Anti-Hallucination | 12 | 30 | Deterministic + LLM judge |
| C | Tool / Workflow Use | 6 | 15 | Deterministic (tool traces) |
| D | Document Drafting | 6 | 15 | LLM judge |
| E | Contextual Follow-ups | 4 | 10 | Deterministic |
| F | Refusal / Uncertainty | 4 | 10 | LLM judge |
| G | Speed | 6 | 15 | Measured (p50/p95) |
| H | Cost | N/A | Computed | Token accounting |
| **Total** | | **50** | **130** | |

---

## Track A: Legal Reasoning Quality (35 cases)

### Source: SallyIP Frozen Benchmarks + Practitioner Scorecard

| Subcategory | Cases | Source |
|---|---|---|
| §101 Patent Eligibility | 5 | `eval_scorecard_sample_25.md` Q1-3, `benchmarks/v1.0` s101-* |
| §102 Novelty / Prior Art | 6 | `benchmarks/v1.0` s102a-*, s102b-*, practitioner scorecard Q4-9 |
| §103 Obviousness | 4 | `benchmarks/v1.0` s103-*, practitioner scorecard Q10-11 |
| §112 Specification/Claims | 6 | `benchmarks/v1.0` s111-*, s112a-*, s112b-*, s112d-* |
| FTO Analysis | 4 | `scripts/abigail-subset-run.mjs` FTO items, `src/lib/fto-service.js` workflows |
| Office Action Response | 4 | `benchmarks/v1.0` mpep-2106-*, `src/lib/office-action-service.js` |
| Trademark Analysis | 3 | `src/lib/trademark-clearance-service.js`, `trademark-intelligence-service.js` |
| Contract Issue Spotting | 3 | `src/lib/contract-service.js` RED/AMBER patterns |

### Example Case (A-001)
```json
{
  "id": "patent-101-001",
  "track": "A",
  "surface": "chat",
  "prompt": "Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.",
  "context": { "matter_id": "m-patent-001", "jurisdictions": ["US"], "deep_research": false },
  "tools_allowed": ["retrieveHybridEvidence"],
  "expected": {
    "must_contain": ["Whoever invents or discovers", "process, machine, manufacture, or composition of matter"],
    "must_not_contain": ["software per se", "AI models are patentable"],
    "required_citations": ["§ 101"],
    "quote_verification": "EXACT"
  },
  "grading": "deterministic",
  "confidentiality": "PUBLIC_RESEARCH"
}
```

---

## Track B: Grounding / Anti-Hallucination (30 cases)

### Source: SallyIP Failure Corpus + Adversarial Probes

| Subcategory | Cases | Source |
|---|---|---|
| Fake MPEP Section | 4 | `scripts/legalbench-probe.mjs` (adv-102g, adv-112g), `benchmarks/hallucination-100.mjs` |
| Fake Case Citation | 4 | `benchmarks/hallucination-100.mjs` (adv-fake-case), `tests/adversarial-hallucination.test.mjs` |
| Fake Patent | 3 | `benchmarks/hallucination-100.mjs` (adv-fake-patent) |
| Unsupported Proposition | 5 | `benchmarks/regression_report_p0_full.md` (81% unsupported prop rate) |
| Quote Fabrication | 4 | `benchmarks/failures/` (27/120 missing quotes in v1.0) |
| Stale Authority | 3 | `src/lib/temporal-service.js` (superseded guidance) |
| Conflicting Authorities | 3 | `src/lib/contradiction-service.js` (MATERIAL_CONFLICT) |
| Insufficient Evidence Refusal | 4 | `src/lib/verification-service.js` (`INSUFFICIENT_AUTHORITY_MESSAGE`) |

### Example Case (B-001)
```json
{
  "id": "grounding-fake-mpep-001",
  "track": "B",
  "surface": "chat",
  "prompt": "What are the three groupings of abstract ideas set forth in MPEP § 2106? Quote the mathematical concepts grouping.",
  "context": { "matter_id": "m-patent-002", "jurisdictions": ["US"], "deep_research": false },
  "tools_allowed": ["retrieveHybridEvidence"],
  "expected": {
    "must_refuse": true,
    "refusal_reason": "MPEP § 2106 groupings not in retrieved sources",
    "forbidden": ["mathematical concepts", "certain methods of organizing human activity", "mental processes"],
    "required_behavior": "I could not verify this proposition from the available authorities."
  },
  "grading": "deterministic",
  "confidentiality": "PUBLIC_RESEARCH"
}
```

---

## Track C: Tool / Workflow Use (15 cases)

### Source: SallyIP Workflow Automation + Specialist Router

| Subcategory | Cases | Source |
|---|---|---|
| Retrieval Before Analysis | 3 | `src/lib/chat-orchestrator.js:62`, `src/lib/verification-service.js:113` |
| Matter Context Usage | 3 | `src/lib/matter-service.js`, `src/lib/workflow-orchestrator.js` |
| Workflow Automation | 3 | `src/lib/workflow-orchestrator.js`, `tests/workflow-automation.integration.mjs` |
| Verification Before Answer | 3 | `src/lib/verification-service.js:605`, `finalizeVerifiedAnswer` |
| Tool Call Correctness | 3 | `src/lib/document-tool-service.js` (`GENERATE_FILE_TOOL`) |

### Example Case (C-001)
```json
{
  "id": "tool-retrieval-first-001",
  "track": "C",
  "surface": "chat",
  "prompt": "Analyze the novelty of claim 1 of US 10,123,456 against the prior art in my matter.",
  "context": { "matter_id": "m-novelty-001", "jurisdictions": ["US"], "deep_research": true },
  "tools_allowed": ["retrieveHybridEvidence", "createNoveltyAnalysis"],
  "expected": {
    "required_tool_sequence": ["retrieveHybridEvidence", "createNoveltyAnalysis"],
    "forbidden_tools": ["generate_file (before retrieval)"],
    "matter_context_used": true,
    "verification_before_answer": true
  },
  "grading": "deterministic_tool_trace",
  "confidentiality": "CONFIDENTIAL_IP"
}
```

---

## Track D: Document Drafting (15 cases)

### Source: Contract Templates + Patent Drafting Workflows

| Subcategory | Cases | Source |
|---|---|---|
| NDA (Mutual) | 2 | `src/lib/contract-service.js` templates, `database/043_contracts.sql` seeds |
| Software License | 2 | `src/lib/contract-service.js` (license templates) |
| Patent Assignment | 2 | `src/lib/patent-drafting-service.js` (assignment clauses) |
| Trademark Coexistence | 2 | `src/lib/trademark-clearance-service.js` (coexistence agreements) |
| §103 Response | 2 | `src/lib/office-action-service.js` (amendment/response) |
| SaaS Agreement | 2 | `database/043_contracts.sql` (SaaS template) |
| DPA (Data Processing Addendum) | 2 | `src/lib/contract-service.js` (GDPR/privacy) |
| Employment Termination | 1 | `database/043_contracts.sql` (employment template) |

### Example Case (D-001)
```json
{
  "id": "drafting-nda-001",
  "track": "D",
  "surface": "chat",
  "prompt": "Draft a mutual NDA for a patent licensing discussion between a US startup and a Japanese corporation. Include standard IP ownership, confidentiality period, residual knowledge, and governing law clauses.",
  "context": { "matter_id": "m-contract-001", "jurisdictions": ["US", "JP"], "deep_research": false },
  "tools_allowed": ["retrieveHybridEvidence", "generate_file"],
  "expected": {
    "structure": ["Parties", "Confidential Information", "Obligations", "Term", "Governing Law", "Signatures"],
    "required_clauses": ["IP Ownership", "Residual Knowledge", "Confidentiality Period (years)", "Governing Law (US/JP)"],
    "risk_flags": ["Unlimited Liability", "Perpetual Irrevocable", "Sole Discretion"],
    "no_invented_facts": true,
    "placeholder_usage": ["[PARTY_A]", "[PARTY_B]", "[EFFECTIVE_DATE]"]
  },
  "grading": "llm_judge",
  "judge_prompt": "drafting_quality_v1",
  "confidentiality": "CONFIDENTIAL_IP"
}
```

---

## Track E: Contextual Follow-ups (10 cases)

### Source: Sally Voice Context Bugs + Real Conversation Logs

| Subcategory | Cases | Source |
|---|---|---|
| Jurisdiction Resolution | 2 | "america" → US, "europe" → EP/GB/DE/FR |
| Claim Number Resolution | 2 | "claim four" → claim 4, "the second claim" → claim 2 |
| Reference Resolution | 2 | "both" → A + B, "the second reference" → B |
| Correction/Override | 2 | "wait, use US law", "stop, only compare A and B" |
| Affirmation/Negation | 2 | "yes" (continue), "no, the second one" |

### Example Case (E-001)
```json
{
  "id": "context-jurisdiction-001",
  "track": "E",
  "surface": "voice",
  "conversation": [
    { "role": "assistant", "content": "Which jurisdiction should I use for the prior art search?" },
    { "role": "user", "content": "america" }
  ],
  "expected": {
    "resolved_jurisdiction": "US",
    "no_clarification_needed": true,
    "follow_up_action": "proceed with US prior art search"
  },
  "grading": "deterministic",
  "confidentiality": "CONFIDENTIAL_IP"
}
```

---

## Track F: Refusal / Uncertainty Quality (10 cases)

### Source: Verification Gates + Adversarial Probes

| Subcategory | Cases | Source |
|---|---|---|
| Insufficient Evidence | 2 | `src/lib/verification-service.js:8` (`INSUFFICIENT_AUTHORITY_MESSAGE`) |
| Nonexistent Authority | 2 | Fake case/MPEP/patent (Track B overlap) |
| Ambiguous Legal Task | 2 | "Is my invention patentable?" (no disclosure) |
| Unavailable Provider | 2 | `CONFIDENTIAL_PROVIDER_UNAVAILABLE` error |
| Missing Matter Data | 2 | "Analyze claim 1" (no matter_id, no disclosure) |

### Example Case (F-001)
```json
{
  "id": "refusal-insufficient-evidence-001",
  "track": "F",
  "surface": "chat",
  "prompt": "Is my invention patentable? It's a new type of widget with a special spring mechanism.",
  "context": { "matter_id": null, "jurisdictions": ["US"], "deep_research": false },
  "expected": {
    "must_refuse": true,
    "refusal_message_contains": ["cannot verify", "need more information", "disclosure", "matter"],
    "useful_next_step": ["create a matter", "upload disclosure", "provide claim text"],
    "no_hallucinated_analysis": true
  },
  "grading": "llm_judge",
  "judge_prompt": "refusal_usefulness_v1",
  "confidentiality": "PUBLIC_RESEARCH"
}
```

---

## Track G: Speed (15 cases)

### Measured Per Surface (p50/p95)

| Surface | Pilot Runs | Full Runs | Metric |
|---|---|---|---|
| Chat (streaming) | 3 | 10 | TTFT, full response |
| Retrieval | 3 | 5 | end-to-end |
| Embedding | 3 | 5 | batch latency |
| Rerank | 3 | 5 | 20 docs |
| Patent Draft Section | 3 | 5 | section generation |
| Voice (target) | N/A | 5 | TTFT <200ms |

---

## Track H: Cost (Computed)

### Token Accounting Per Turn

| Component | Tokens | Price Source |
|---|---|---|
| Input (context + retrieval) | ~8,000 | Model input price |
| Output | ~2,000 | Model output price |
| Embeddings (query + 8 passages) | ~72,000 | Embedding model price |
| Rerank (query + 20 docs) | ~20,000 | Rerank model price |

**Projection Formula:**
```
Cost/Turn = (8000 × input_price) + (2000 × output_price) + (72000 × embed_price) + (20000 × rerank_price)
```

**Projections:**
| Volume | Calculation |
|---|---|
| 1,000 turns | Cost × 1000 |
| 10,000 turns | Cost × 10000 |
| 100,000 turns | Cost × 100000 |

---

## Dataset Files (to be created)

```
evals/ori/dataset/
├── track-a-legal-reasoning.jsonl      (35 lines)
├── track-b-grounding.jsonl            (30 lines)
├── track-c-tool-use.jsonl             (15 lines)
├── track-d-drafting.jsonl             (15 lines)
├── track-e-context-followup.jsonl     (10 lines)
├── track-f-refusal.jsonl              (10 lines)
├── track-g-speed.jsonl                (15 lines)
└── metadata.json                      (distribution, sources, version)
```

---

## Sources Index

| Source File | Tracks | Notes |
|---|---|---|
| `benchmarks/v1.0/dataset.json` | A, B | 100 frozen questions |
| `benchmarks/hallucination-100.mjs` | B | 100 adversarial items |
| `benchmarks/failures/*.json` | B | Permanent failure registry |
| `eval_scorecard_sample_25.md` | A | Practitioner-graded sample |
| `scripts/legalbench-probe.mjs` | A, B | 12 adversarial items |
| `scripts/ablation-bench.mjs` | B | Synthetic fabrications |
| `tests/*.integration.mjs` | C | Real workflow contexts |
| `database/043_contracts.sql` | D | 7 contract templates |
| `src/lib/contract-service.js` | D | RED/AMBER patterns |
| `src/lib/verification-service.js` | B, C | Gates, guards, messages |
| `src/lib/contradiction-service.js` | B | Conflict detection |
| `src/lib/temporal-service.js` | B | Currency validation |

---

## Pilot Subset (40 cases)

Stratified sample: 10 A, 10 B, 5 C, 5 D, 4 E, 3 F, 3 G

Selected for maximum signal:
- A: 101, 102a, 103, 112a, FTO, OA, trademark, contract
- B: fake MPEP, fake case, fake patent, unsupported prop, quote fabrication, stale, conflict, refusal
- C: retrieval-first, matter-context, workflow-auto, verify-before-answer, tool-correctness
- D: NDA, license, patent assignment, coexistence, §103 response
- E: jurisdiction, claim number, reference, correction
- F: insufficient evidence, nonexistent authority, unavailable provider
- G: chat, retrieval, embedding, rerank, draft section

---

*Dataset v1.0 — Ready for Ori pilot execution.*