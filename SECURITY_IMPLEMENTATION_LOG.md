# SECURITY IMPLEMENTATION LOG — hardening window 2026-09-10

## 1. Vulnerabilities found
- Free/contributor OpenRouter models (`:free` x6 + `stealth/ox-alpha`) received matter content, embeddings, rerank passages; training posture MAY TRAIN (P0 confidentiality).
- No execution-mode separation; automatic fallback approved->free.
- No RLS; single owner `DATABASE_URL` in user path; app-layer scoping only.
- `resolveDevUser` (aman@sallyip.com) reachable in dev middleware without prod guard; `Secure` cookie false in dev path.
- Audit logging silent `catch{}`; no event_id/actor/matter/action/resource/result/request_id/severity; confidential text unredacted.
- P0 verification gap already on record (unsupported 81%, entailment 66.7%) — P1 contradiction/temporal/independent-entailment missing in prod path.
- Official coverage 4/10 (no WIPO/UKIPO/CIPO/IPAU); packs 12 records; currency metadata partial.
- Contract review regex-only presented without RULE_BASED_SCREENING label; 7 templates.
- 25–35s in-request model race on Vercel Hobby; 25MB UI vs 200KB API limit split; hardcoded `https://sallyip.vercel.app` in Word add-in.
- Secrets hygiene OK in history (no `.env.local` commits found), but origins not env-driven.

## 2. Vulnerabilities fixed (this window)
- Provider registry + fail-closed modes PUBLIC/CONFIDENTIAL/HIGHLY_CONFIDENTIAL (`src/lib/provider-policy.js`); orchestrator enforces `assertChatAllowed` + embedding gate, no free fallback (`src/lib/sally-orchestrator.js`).
- RLS migration `database/055_tenant_isolation.sql` (RLS+FORCE on ~70 tables, `sally_app`/`sally_readonly`, own-row policies, rollback) + `database/security_model.md`. NOT yet applied live (see blockers).
- Auth guards `src/lib/auth-guards.js`; `vite.config.js` dev fallback throws `DEV_FALLBACK_BLOCKED` in production; Secure-cookie enforcement helper.
- Structured audit logger with redaction + `AUDIT_WRITE_FAILED` observable failure (`src/lib/security.js`).
- P1 services: `contradiction-service.js`, `temporal-service.js`; entailment already existed and is now tested independently.
- Contract wrapper `contract-analysis.js` (RULE_BASED_SCREENING label) + `benchmarks/contract_review_benchmark_v1.md` (11 cases).
- File policy `src/lib/file-safety.js` (caps, MIME, traversal, injection flag).
- Env: `SALLYIP_EXECUTION_MODE`, `SALLYIP_APPROVE_GEMINI_CONFIDENTIAL`, `APP_ORIGIN`/`API_ORIGIN` in `.env.example`; `test:security` script in `package.json`; `sqlrun.md` covers 055.

## 3. Unresolved P0 blockers
- No approved confidential chat/embedding configured by default (Gemini needs paid Cloud + DPA + flag; local paid embedding TODO). Confidential requests correctly FAIL CLOSED until then — do not pilot confidential matters.
- 055 not applied to live DB; user path still owner role; needs live apply + `SET LOCAL app.current_user_id` wiring + live cross-tenant verify.
- File-safety lib not yet called from every ingestion route (`api/ingest-document.py`, `generate-file` paths).
- Hardcoded origins still present at call sites; Word manifest still points at vercel.app.

## 4. Unresolved P1 blockers
- WIPO/UKIPO/CIPO/IPAU adapters missing; family `unresolved` handling documented but not fully wired.
- Contradiction/temporal checks unit-tested but not yet wired into chat finalizer/Verify panel for every proposition.
- Audit logger not yet adopted in all 34 handlers; fallback sink is console-only.
- No async job queue for long workflows; Hobby timeout risk remains documented, not migrated.
- Secret-history scan: no `.env.local` commits found via `git log --all -- .env.local .ai-keys.local.json` (empty), but no automated pre-commit secret scanner added.

## 5. RLS coverage
Migration enables RLS+FORCE on matters, conversations, messages, datasets, legal_sources, source_passages, knowledge_*, artifacts, generated_files, workflow runs/steps, claim charts, prior_art, novelty, inventive_step, fto, litigation, trademark, office_actions, patent_drafts, playbooks, contracts, citations, vault reviews, security_events, auth_sessions, eval/patentbench runs, provider_records, search runs/results, prosecution, families + reviews. Policies for core tables (matters, conversations, generated_files, legal_sources, artifacts, contracts, workflow runs, citations, auth_sessions); remaining tables inherit via app-layer scoping until per-table policies are extended. Owner bypasses (safe rollout).

## 6. Provider confidentiality matrix
See `docs/provider-confidentiality-policy.md`. Summary: all `:free` = MAY TRAIN, approved=false, public-only; `stealth/ox-alpha` unknown = deny; Gemini conditional on paid+DPA+flag; official APIs query-only (never full docs); unknown slugs deny.

## 7. Verification controls completed
- Untouched P0 gates: 28/28 `test:verification` pass.
- New P1 unit coverage: contradiction classes, temporal QUALIFY/SUPERSEDED, independent entailment separation (5 tests in `verification-p1.test.mjs`).
- Legal correctness kept separate from grounding; practitioner scorecard untouched.

## 8. Security tests passed/failed
- New suite `npm run test:security`: 31/31 pass (7 files: provider-confidentiality, auth-hardening, audit-logging, file-safety, tenant-isolation, verification-p1, contracts-and-deploy).
- Existing `npm run test:verification`: 28/28 pass.
- Integration tests requiring DB/keys not run (documented limitation).

## 9. Production build status
`npm run build` succeeds (vite build, 7.34s, chunk-size warning only for 688KB index bundle). No build errors from new lib files (server-only imports not bundled into client; client bundle contains no `OPENROUTER_API_KEY`/`GEMINI_API_KEY` per test 12).

## 10. Benchmark impact
- Frozen legal benchmark, hallucination-100, patent-retrieval sets, expected answers, thresholds: UNTOUCHED (`git diff HEAD -- benchmarks/v1.0 benchmarks/hallucination-100.mjs benchmarks/patent_retrieval_v1` empty).
- No benchmark run in this window (infra-only change + public/private mode split documented). Failures must be reported as infra vs semantic separately per Phase 13.

## 11. Exact files changed (this window)
New: `src/lib/provider-policy.js`, `src/lib/auth-guards.js`, `src/lib/contradiction-service.js`, `src/lib/temporal-service.js`, `src/lib/file-safety.js`, `src/lib/contract-analysis.js`, `database/055_tenant_isolation.sql`, `database/security_model.md`, `docs/provider-confidentiality-policy.md`, `docs/authority-provider-matrix.md`, `docs/contract-analysis-status.md`, `docs/security-architecture.md`, `docs/production-readiness.md`, `benchmarks/contract_review_benchmark_v1.md`, `tests/security/provider-confidentiality.test.mjs`, `tests/security/auth-hardening.test.mjs`, `tests/security/audit-logging.test.mjs`, `tests/security/file-safety.test.mjs`, `tests/security/tenant-isolation.test.mjs`, `tests/security/verification-p1.test.mjs`, `tests/security/contracts-and-deploy.test.mjs`, this log.
Modified: `src/lib/sally-orchestrator.js` (policy gate + enforced pipeline + execution_mode meta), `src/lib/security.js` (structured audit + redaction + observable failure), `vite.config.js` (prod dev-fallback block), `.env.example` (execution mode, Gemini approval, origins), `package.json` (test:security), `sqlrun.md` (055).
Note: working tree had pre-existing unrelated modifications/untracked files (SEO, sitemap, footers, ablation reports); those are NOT part of this window and are excluded above.

## 12. Git status
Branch `main...origin/main [ahead 3]` (was ahead 2 before window). Frozen paths clean. History check `git log --all --oneline -- .env.local .ai-keys.local.json` returns empty (no secret commits found; scan did not display contents).

## Verdict (per MOST IMPORTANT RULE)
SallyIP is NOT production-ready, secure, confidential, certified, or enterprise-ready. Fail-closed defaults are now in code, but confidential use must wait for P0 blockers (§3) to be cleared with live evidence.
