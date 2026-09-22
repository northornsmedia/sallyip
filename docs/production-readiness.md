# Production readiness scorecard (hardening window — NOT production-ready)

Scoring: 0–100 per category, evidence-linked. No category is certified. Overall: advanced prototype with fail-closed defaults newly added; confidential use still blocked by missing approved provider + unwired hardening.

| category | CURRENT | TARGET | BLOCKERS | EVIDENCE | FILES/TESTS |
|---|---|---|---|---|---|
| Confidentiality | 45 | 95 | No approved confidential chat/embedding configured by default; Gemini needs DPA + flag; local embedding TODO | provider-policy defaults deny; orchestrator fail-closed | `src/lib/provider-policy.js`, `sally-orchestrator.js`, `tests/security/provider-confidentiality` |
| Tenant Isolation | 55 | 95 | RLS migration written but NOT yet applied to live DB; app still uses owner URL; needs `SET LOCAL` wiring + live verify | migration + service scoping present | `database/055_tenant_isolation.sql`, `database/security_model.md`, tenant tests |
| Authentication | 70 | 95 | Dev fallback still exists in dev path (guarded); no reset/OAuth audit; needs prod cookie + session rotation review | guards + prod-handler scan pass | `src/lib/auth-guards.js`, `vite.config.js`, auth tests |
| Database Security | 50 | 95 | Owner role in user path; grants not yet executed live; no backup/encryption attestation | migration documents grants/rollback | 055 migration, security_model |
| Model Security | 40 | 95 | All defaults were `:free`; stealth/ox-alpha unknown; rerank/embed leak passages | registry marks free as MAY TRAIN | provider-policy, orchestrator gate |
| Verification | 60 | 90 | P0 release BLOCKED (entailment 66.7%, unsupported 81%, missing quotes 4.2%); P1 services unit-tested AND wired into `finalizeVerifiedAnswer` (additive surfacing); live-matter verification still BLOCKED | frozen reports unchanged | `benchmarks/regression_report_p0_full.md`, `contradiction/temporal/entailment` + tests |
| Authority Coverage | 50 | 90 | WIPO/UKIPO/CIPO/IPAU missing; packs 12 records US/IN/GB only; currency metadata partial | 4 live adapters, honest not-configured | `official-search-service.js`, `docs/authority-provider-matrix.md` |
| Auditability | 65 | 95 | New structured logger not yet called from all handlers; fallback sink is console-only; needs SIEM/persisted DLQ | redaction + failure-code tests pass | `src/lib/security.js`, audit tests |
| Document Security | 55 | 95 | `document-ingestion-local.js` + `ingest-document.py` wired; still needs wiring: `vite.config.js` `/api/generate-file` (spawns `create_chat_file.py` unchecked) + dev-middleware `/api/embeddings|/api/rerank` (hardcoded host, no `assert*Allowed` — handlers ARE gated); 25MB/200KB split documented | unit tests pass | `src/lib/file-safety.js`, file tests |
| Operational Reliability | 40 | 90 | 25–35s in-request model race on Hobby; no job queue; quota blocks seen; Word add-in domain hardcoded | limits documented, async design only | `vite.config.js`, readiness note |
| Benchmark Readiness | 60 | 90 | Frozen sets intact; P0 gate FAILs open-recorded; contract bench v1 unrun-live; ablation is synthetic (0 live calls) | reports + new benchmark file | `benchmarks/*`, `contract_review_benchmark_v1.md` |
| Deployment Hardening | 55 | 95 | `APP_ORIGIN` added but call sites still default to sallyip.com/vercel.app; history secret scan not attested; build verified locally only | env example updated | `.env.example`, `vercel.json`, build log |

P0 blockers (must fix before any confidential pilot): approve+configure paid zero-retention chat AND embedding, apply 055 to live DB + switch user path to `sally_app`, wire file-safety into all ingestion routes, replace hardcoded origins.
P1 blockers: WIPO/UKIPO adapters, contradiction/temporal wiring into finalizer, audit logger adoption in all handlers, async jobs for long workflows, secret-history scan attestation.

Build: `npm run build` — see SECURITY_IMPLEMENTATION_LOG for this window's result. Benchmarks: frozen answers/thresholds untouched.
