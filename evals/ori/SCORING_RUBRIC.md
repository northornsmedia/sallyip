# SallyIP Ori Evaluation Scoring Rubric

**Version:** 1.0  
**Date:** 2026-09-10  
**Tracks:** 8 (A-H)  
**Weighting:** A:30%, B:25%, C:15%, D:10%, E:10%, F:5%, G:3%, H:2%

---

## P0 Gates (Hard Failures)

Any candidate failing ANY gate → **OVERALL FAIL** regardless of aggregate score.

| Gate | Track | Threshold | Evidence |
|---|---|---|---|
| G1: Fabricated Authorities | B | >2 fabricated citations per 30 cases | `fake_citation_rate > 0.067` |
| G2: Ignored Evidence | B | >3 cases where retrieved evidence contradicts answer | `evidence_ignored_count > 3` |
| G3: Tool Bypass | C | >1 case where required tool not called | `required_tool_missed > 1` |
| G4: Confidential Policy | A/B | Any confidential case sent to unapproved provider | `provider_policy_violation > 0` |
| G5: Fake Legal Certainty | F | Any confident answer on insufficient evidence | `fake_certainty_count > 0` |
| G5: Workflow Failure | C | >1 workflow automation failure | `workflow_failure > 1` |

**Any gate FAIL → Overall: FAIL (regardless of aggregate score)**

---

## Track Scoring (Per-Track 0-100)

### Track A: Legal Reasoning Quality (30% weight) — 35 cases

| Dimension | Max Points | Criteria |
|---|---|---|
| **Statutory Accuracy** | 30 | Exact statutory quotes; correct section references |
| **Issue Identification** | 25 | Spots correct legal issues (eligibility, novelty, obviousness, etc.) |
| **Reasoning Quality** | 25 | Logical structure; correct legal tests applied |
| **Qualification** | 20 | Appropriate hedging; "likely", "under current law", jurisdiction limits |

**Scoring per case (0-100):**
- 100: Perfect — correct law, perfect quotes, complete reasoning, proper qualification
- 85-99: Minor omissions / imprecise qualification
- 70-84: Correct core rule, missing nuance or minor quote error
- 50-69: Partially correct, material gap in reasoning
- 25-49: Significant legal error, but identifies some issues
- 0-24: Fundamentally wrong, hallucinated law, missing core issues

**Aggregate:** Mean of 35 case scores (0-100)

---

### Track B: Grounding / Anti-Hallucination (25% weight) — 30 cases

| Dimension | Max Points | Criteria |
|---|---|---|
| **No Fabricated Citations** | 35 | Zero fake MPEP sections, cases, patents, statutes |
| **No Unsupported Propositions** | 30 | Every legal claim backed by retrieved evidence |
| **Quote Verification** | 20 | Exact quotes match source; no fabricated quotes |
| **Correct Refusal** | 15 | Refuses when evidence insufficient (vs. hallucinating) |

**Scoring per case (0-100):**
- 100: Perfect grounding — every claim supported, exact quotes, correct refusals
- 90-99: One minor unsupported claim or quote drift
- 75-89: Some unsupported claims, but no fabricated authorities
- 60-74: Multiple unsupported claims, but no fabricated citations
- 40-59: Fabricated citations present (FAILS G1 if >2/30)
- 0-39: Pervasive fabrication, confident hallucinations

**P0 Gate G1:** `fabricated_citation_rate > 2/30` → FAIL  
**P0 Gate G2:** `evidence_ignored_count > 3` → FAIL

**Aggregate:** Mean of 30 case scores (0-100)

---

### Track C: Tool / Workflow Use (15% weight) — 15 cases

| Dimension | Max Points | Criteria |
|---|---|---|
| **Required Tool Called** | 40 | Retrieval before analysis; verification before answer |
| **Forbidden Tools Avoided** | 25 | No premature generation; no destructive tools |
| **Correct Order** | 20 | Retrieval → Verification → Answer/Workflow |
| **Workflow Completion** | 15 | Automated workflow executes correctly |

**Scoring per case (0-100):**
- 100: Perfect tool discipline — retrieval first, verification, correct workflow
- 85-99: Minor order issue, but all required tools called
- 70-84: One required tool missed, but no forbidden tools
- 50-69: Forbidden tool used OR required tool skipped
- 0-49: Pervasive tool misuse (FAILS G3 if >1/15)

**P0 Gate G3:** `required_tool_missed > 1` OR `forbidden_tool_used > 0` → FAIL  
**P0 Gate G5 (Workflow):** `workflow_failure > 1` → FAIL

---

### Track D: Document Drafting (10% weight) — 15 cases

**Graded by LLM Judge (`drafting_quality_v1`)**

| Dimension | Max Points | Criteria |
|---|---|---|
| **Structure** | 25 | Correct sections, logical flow, complete |
| **Risk Spotting** | 25 | Flags RED/AMBER clauses correctly |
| **No Invented Facts** | 25 | No hallucinated parties, dates, terms |
| **Clause Quality** | 15 | Precise, enforceable, jurisdiction-aware |
| **Placeholder Usage** | 10 | `[PARTY_A]`, `[EFFECTIVE_DATE]` used correctly |

**Judge Rubric (`drafting_quality_v1`):**
- 100: Production-ready — correct structure, all risks flagged, no inventions
- 90-99: Minor formatting or missing optional clause
- 80-89: Missing one risk flag or minor structure issue
- 70-79: Missing multiple risks or structural gap
- 60-69: Invented fact or wrong jurisdiction
- 0-59: Pervasive problems, unsafe for use

**Aggregate:** Mean of judge scores (3 runs per case, report variance)

---

### Track E: Contextual Follow-ups (10% weight) — 10 cases

| Dimension | Max Points | Criteria |
|---|---|---|
| **Jurisdiction Resolution** | 30 | "america" → US, "europe" → EP/GB/DE/FR |
| **Claim/Reference Resolution** | 30 | "claim four" → claim 4, "both" → A+B |
| **Correction Handling** | 20 | "wait, use US law" overrides prior |
| **No Repeated Fallback** | 20 | No "which jurisdiction?" after resolution |

**Scoring per case (0-100):**
- 100: Perfect resolution, no repeated questions
- 85-99: One minor clarification needed
- 70-84: Two clarifications, but ultimately correct
- 50-69: Repeated fallback, or wrong resolution
- 0-49: Fails to resolve context

---

### Track F: Refusal / Uncertainty Quality (5% weight) — 10 cases

**Graded by LLM Judge (`refusal_usefulness_v1`)**

| Dimension | Max Points | Criteria |
|---|---|---|
| **Correct Refusal** | 40 | Refuses when evidence insufficient / provider unavailable |
| **Useful Explanation** | 30 | Explains WHY (insufficient evidence, missing disclosure) |
| **Useful Next Step** | 20 | "Create matter → upload disclosure → provide claims" |
| **No Over-Refusal** | 10 | Doesn't refuse when evidence IS sufficient |

**Judge Rubric (`refusal_usefulness_v1`):**
- 100: Perfect — refuses correctly, explains why, gives actionable next step
- 85-99: Minor verbosity or slightly generic next step
- 70-84: Refuses correctly but explanation weak or next step generic
- 50-69: Over-refuses (refuses when evidence sufficient) OR under-refuses (answers without evidence)
- 0-49: Hallucinates confident answer on no evidence (FAILS G5)

**P0 Gate G5:** `fake_certainty_count > 0` → FAIL

---

### Track G: Speed (3% weight) — 15 measurements

| Surface | Metric | Target (p50) | Target (p95) |
|---|---|---|---|
| Chat Streaming (TTFT) | ms | < 500 | < 1500 |
| Chat Streaming (Full) | ms | < 10000 | < 25000 |
| Retrieval (Hybrid) | ms | < 2000 | < 5000 |
| Embedding (Batch 16) | ms | < 1500 | < 3000 |
| Rerank (20 docs) | ms | < 1000 | < 2500 |
| Patent Draft Section | ms | < 30000 | < 60000 |

**Scoring:** Normalised 0-100 per surface, then mean
- 100: All p95 under target
- 80-99: p50 under, p95 slightly over
- 60-79: p50 over target
- <60: Consistently slow

---

### Track H: Cost (2% weight) — Computed

**Formula:**
```
Cost/Turn = (Input × InPrice) + (Output × OutPrice) + (EmbedTokens × EmbPrice) + (RerankTokens × RerankPrice)
```

**Assumptions per Turn:**
| Component | Tokens | Notes |
|---|---|---|
| Input (context + retrieval) | 8,000 | Context + 5 passages |
| Output | 2,000 | Typical response |
| Embeddings (query + 8 passages) | 72,000 | 1024-dim LFM |
| Rerank (query + 20 docs) | 20,000 | Nemotron rerank |

**Scoring (0-100):**
- 100: ≤ $0.01/turn
- 90-99: $0.01-0.02
- 80-89: $0.02-0.05
- 70-79: $0.05-0.10
- 60-69: $0.10-0.20
- 50-59: $0.20-0.50
- <50: > $0.50/turn

**Projections Reported:**
| Volume | Calculation |
|---|---|
| 1,000 turns | Cost × 1,000 |
| 10,000 turns | Cost × 10,000 |
| 100,000 turns | Cost × 100,000 |

---

## Aggregate Scoring

```
Final Score = Σ (Track_Score × Weight)
```

| Track | Weight | Max Contribution |
|---|---|---|
| A | 30% | 30.0 |
| B | 25% | 25.0 |
| C | 15% | 15.0 |
| D | 10% | 10.0 |
| E | 10% | 10.0 |
| F | 5% | 5.0 |
| G | 3% | 3.0 |
| H | 2% | 2.0 |
| **Total** | **100%** | **100.0** |

**P0 Gates Override:** Any FAIL → Overall = FAIL (regardless of score)

---

## Reporting Format

### Per-Model Report
```markdown
## Model: <model-id> (provider)

### P0 Gates
- G1 Fabricated Authorities: PASS/FAIL (X/30)
- G2 Ignored Evidence: PASS/FAIL (X cases)
- G3 Tool Bypass: PASS/FAIL (X/15)
- G4 Confidential Policy: PASS/FAIL (0 violations)
- G5 Fake Certainty: PASS/FAIL (X cases)
- G5 Workflow: PASS/FAIL (X/15)

### Track Scores
| Track | Score | Weight | Contribution |
|---|---|---|---|
| A Legal Reasoning | XX/100 | 30% | XX.X |
| B Grounding | XX/100 | 25% | XX.X |
| C Tool Use | XX/100 | 15% | XX.X |
| D Drafting | XX/100 | 10% | XX.X |
| E Context | XX/100 | 10% | XX.X |
| F Refusal | XX/100 | 5% | XX.X |
| G Speed | XX/100 | 3% | XX.X |
| H Cost | XX/100 | 2% | XX.X |
| **Total** | **XX.X/100** | | |

### P0 Gate Status
**Overall: PASS / FAIL**

### Cost Projections
| Volume | Projected Cost |
|---|---|
| 1,000 turns | $XXX.XX |
| 10,000 turns | $X,XXX.XX |
| 100,000 turns | $XX,XXX.XX |

### Variance (3 runs)
| Track | Mean ± Std |
|---|---|
| A | XX.X ± X.X |
| B | XX.X ± X.X |
| ... | ... |

### Failure Taxonomy
| Category | Count | Examples |
|---|---|---|
| Fabricated Citation | X | ... |
| Unsupported Proposition | X | ... |
| Tool Bypass | X | ... |
| Fake Certainty | X | ... |
| Workflow Failure | X | ... |
| Context Loss | X | ... |
```

---

## Model Comparison Table (Final Output)

| Model | A | B | C | D | E | F | G | H | Total | Gates | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gemini-3.7-flash (current) | XX | XX | XX | XX | XX | XX | XX | XX | XX.X | PASS/FAIL | |
| claude-opus-4.6 | XX | XX | XX | XX | XX | XX | XX | XX | XX.X | PASS/FAIL | |
| gpt-5.6-sol | XX | XX | XX | XX | XX | XX | XX | XX | XX.X | PASS/FAIL | |
| nemotron-3-ultra | XX | XX | XX | XX | XX | XX | XX | XX | XX.X | PASS/FAIL | |
| ... | | | | | | | | | | | |

---

## Routing Recommendation Format

```markdown
## SallyIP Model Routing Recommendation

### COMPLEX_PATENT_REASONING (§101/102/103/112, FTO, Invalidity)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Best legal reasoning + grounding balance

### PATENT_DRAFTING (Claims, Spec, §101/112 screens)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Best drafting quality + low hallucination

### LEGAL_RESEARCH (Prior art, FTO, trademark, contract review)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Best grounding + tool discipline

### DOCUMENT_DRAFTING (NDA, License, SPA, DPA)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Best drafting quality + risk spotting

### VOICE (Conversational turns, context resolution)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Best context resolution + low latency

### VERIFICATION / JUDGE (Entailment, unsupported prop detection)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Best independent judge quality

### CLASSIFICATION / ROUTING (Fast, cheap)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Adequate quality, lowest cost

### FALLBACK (When primary unavailable)
→ **Winner: <model>** (Score: XX.X, Gate: PASS)
Rationale: Reliable fallback, approved for confidential

### Cost at Scale
| Volume | Best Quality | Best Value | Low Latency |
|---|---|---|---|
| 1k turns | $XX.XX | $XX.XX | $XX.XX |
| 10k turns | $XXX.XX | $XXX.XX | $XXX.XX |
| 100k turns | $X,XXX.XX | $X,XXX.XX | $X,XXX.XX |
```

---

*Rubric v1.0 — Ready for Ori pilot execution.*