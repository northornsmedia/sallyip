# Outreach Pack: Legal AI Verification — Five Gates Before an Answer

## Subject Line Options
- How verification-first legal AI works: 5 gates, thresholds, refusal as feature
- Legal AI architecture: retrieval thresholds → quote checks → entailment → modes
- Why refusal is a feature: 14 grounded refusals in ABIGAIL, 6 in adversarial

## Outreach Note (110 words)
We published a technical explainer of the five gates between a legal question and a SallyIP answer — and why each gate's output is recorded:

1. **Retrieval with thresholds** — hybrid search; zero results is valid, forces qualification/refusal
2. **Exact-quote verification** — word-for-word check; exact/fuzzy/missing recorded
3. **Citation-integrity guard** — dangling labels removed before display
4. **Entailment grading** — entails/partial/context/contradicts/does-not-support per pair
5. **Answer modes** — VERIFIED / QUALIFIED / RESEARCH REQUIRED, audit-logged

Key differentiator: **Refusal is a designed output**. ABIGAIL subset: 14 grounded refusals where offline evidence couldn't support an answer. Adversarial v1: 6 conservative refusals in 12 live traps. Each refusal logged with the evidence state that caused it.

Thresholds ensure the "honest zero" propagates — no quotes to verify, no labels to guard, straight to QUALIFIED/RESEARCH REQUIRED.

## Research Summary
- **Question**: What does a production verification pipeline look like for legal AI?
- **Method**: Documented 5-gate architecture with measurable outputs at each gate
- **Key finding**: Thresholds + refusal + entailment separation = measurable miss rates (not hidden)
- **Limitations**: Verification proves grounding, not truth; legal correctness needs practitioner grading (PENDING)
- **Why it matters**: Most legal AI hides the "no evidence" case; this makes it the design center.

## Links
- Explainer: https://sallyip.com/legal-ai-verification/
- Methodology: https://sallyip.com/benchmarks/verification-methodology/
- Hallucination benchmark: https://sallyip.com/benchmarks/hallucination/ (refusal telemetry)
- External validation: https://sallyip.com/benchmarks/external-validation/ (ABIGAIL 14 refusals)

## Why You May Care
- Legal AI pipeline architecture
- Refusal as measurable feature
- Entailment grading separation
- Threshold design for honest zero