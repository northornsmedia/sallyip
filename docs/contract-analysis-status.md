# Contract analysis status (Phase 8)

Current production logic (`src/lib/contract-service.js:1-9`) is **RULE_BASED_SCREENING** only:
regex RED/AMBER keyword flags + `##` heading split. It is NOT full legal contract analysis and must be labelled as such in UI.

New wrapper: `src/lib/contract-analysis.js` (`screenContract`, `ANALYSIS_LABEL='RULE_BASED_SCREENING'`).
Pipeline target:
1. deterministic signals (kept regex) 2. segmentation 3. model-assisted analysis (GATED by provider-policy — blocked for confidential until approved provider) 4. playbook comparison 5. clause citation 6. risk reasoning 7. human-review flag.

Benchmark: `benchmarks/contract_review_benchmark_v1.md` — 11 cases (liability, indemnity, IP ownership, assignment, licensing, confidentiality, warranties, termination, governing law, data protection, AI/data-use). Known gap: assignment scope under-detected. Do NOT certify until model-assisted + playbook layers are benchmarked.
Tests: `tests/security/contracts-and-deploy.test.mjs`.
