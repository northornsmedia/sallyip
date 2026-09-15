# SECURITY ACTIVATION REPORT (live-evidence wave)

> Superseded in part by `CONFIDENTIAL_PILOT_P0_CLOSURE_REPORT.md` (70/70 security, 12/35 audit). This file is the live-evidence wave snapshot — history below is frozen; new deltas go in §19.

## 1. P0 before/after
- Providers: before — free models reachable everywhere; after — fail-closed gates on chat/embed/rerank/retrieval/ingestion, mock-proof of zero-fetch on block. Live approved provider still absent, so correct behavior is BLOCKED.
- RLS: before — migration only; after — read-only live proof (owner bypass, 0 RLS) + staging test scaffolding. NOT applied live (deliberate, no blind prod apply).
- Roles: before — owner URL only; after — roles defined + static least-privilege tests, runtime still owner. P0 OPEN.
- Files: before — lib only; after — wired into both ingestion paths + 11 attack tests.
- Origins: before — hardcoded host/referer/manifest; after — APP_ORIGIN + allowlist + manifest generator (manifest.xml still committed; reverification pending).

## 2. Confidential provider status
No approved confidential chat/embedding. Defaults remain `:free` (MAY TRAIN). Gemini NOT auto-approved. `CONFIDENTIAL_PROVIDER_UNAVAILABLE` is the verified live behavior (4/4 integration tests). Approval requires paid project + DPA + flag + key rotation evidence.

## 3. RLS staging/live status
Live read-only (`scripts/rls-staging-check.mjs`, 2026-09-10): user=neondb_owner, bypass=true, rls_tables=0, force=0, app_roles=[], policies=0. Migration 055 inspected, ~70 tables enumerated, least-privilege grants verified statically. No staging DB available; no live apply performed. Status: BLOCKED.

## 4. DB role status
Runtime uses owner `DATABASE_URL`. `sally_app`/`sally_readonly` exist only in migration text. `DATABASE_URL_APP` absent. P0 OPEN.

## 5. Cross-tenant attack results
Unit: attacker user_id binding verified (`tenant-isolation` substitution test). Live adversarial (A cannot read/update/delete B across matter/document/messages/runs/files, API + direct sally_app SQL, FORCE RLS): NOT RUN — no staging role login. Status: UNIT_VERIFIED, integration BLOCKED.

## 6. Ingestion route coverage
34 handlers inventoried: 2 true ingestion paths (node `document-ingestion-local.js`, python `ingest-document.py`) — both now file-safe BEFORE parse/storage. 11 attack cases unit-tested (MIME, spoof, oversize, malformed, zero-byte, unsafe name, traversal, archive, unauthorized matter, replacement scoping via user_id, injection flag). Output-only routes (`generate-file`, `generated-files` download, `flywheel` export) are NOT upload ingestion; download paths remain user-scoped. Target 100% ingestion wired: met at code level; live-upload staging pending.

## 7. Origin cleanup
Classification: VALID_TEST (sandbox-block regex, `https://test.invalid` mocks), VALID_DOC (comments, example, logs), MUST_REPLACE fixed: `chat-orchestrator` host->`siteUrlFor(APP_ORIGIN+allowlist)`, orchestrator default->`APP_ORIGIN`, embed referers->`APP_ORIGIN`, manifest generator added. Remaining: committed `manifest.xml` still contains generated domain (by design until deploy generates it); call-site reverification in prod deploy pending.

## 8/9. Contradiction/temporal finalizer wiring
Both + entailment now run additively inside `finalizeVerifiedAnswer` (surface on MATERIAL/POTENTIAL/UNRESOLVED; QUALIFY on unknown/stale; SUPERSEDED flagged). No gate weakened — 28/28 verification tests still pass. Regression cases (superseded, version, date conflict, unknown version, wrong jurisdiction) covered at unit level; live matter runs pending.

## 10. Audit-handler coverage
6/34 AUDITED (auth, contracts, patent-drafts, playbooks, matters, embeddings/rerank rejections). Missing security-relevant: generated-files, workflows, artifacts, sources, conversations (+23 non-security handlers NOT_APPLICABLE). Threshold 100% NOT MET — gate blocks on this.

## 11. Secret scanning
`scripts/secret-scan.mjs` clean on tracked files (examples excluded, values never printed). History `git log --all -- .env.local .ai-keys.local.json` empty. Gap: no installed pre-commit hook / CI workflow in repo (no `.github`, no `.husky`) — documented, must be added by deployment owner.

## 12/13. Security + integration tests
Security: 50/50 pass (41 prior + 9 ingestion). Verification: 28/28 pass. Integration (mock provider): 4/4 pass with zero-fetch proof. Live DB adversarial: blocked (no staging).

## 14. Build status
`npm run build` clean (7.3s). Client bundle contains no server keys (test 12).

## 15. Confidential pilot gate result
`CONFIDENTIAL_PILOT_BLOCKED` (both with and without live env).
With live env, blocked reasons: approved-chat missing, embedding is `:free`, `bypass=true rls=0 roles=(none) appUrl=false`, no staging proof, audit missing 5 files. Passed: no-free-fallback, ingestion wiring, auth tests, build.

## 16. Remaining blockers
P0: approve+configure paid chat AND embedding with DPA evidence; apply 055 via safe path (backup/restore attested, staging adversarial green) + switch runtime to `DATABASE_URL_APP`; finish audit wiring to 100% relevant; install pre-commit/CI secret scan. P1: WIPO/UKIPO etc (separate track); live contradiction/temporal matter runs; persisted audit DLQ.

## 17. Exact files changed (this wave)
Modified: `src/lib/verification-service.js` (policy+contradiction/temporal/entailment wiring, referer env), `src/lib/embedding-service.js` (policy+referer), `src/lib/sally-orchestrator.js` (default siteUrl env), `src/lib/chat-orchestrator.js` (mode pass-through + siteUrlFor), `src/lib/document-ingestion-local.js` (file-safety+injection flag), `api/ingest-document.py` (confidential embed block + archive/traversal guards), `api/_handlers/embeddings.js` + `rerank.js` (403 policy + rejection audit), `api/_handlers/matters.js` (access/denial audit), `package.json` (secret:scan, extended test:security).
New: `scripts/rls-staging-check.mjs`, `scripts/secret-scan.mjs`, `scripts/generate-word-manifest.mjs`, `scripts/confidential-pilot-gate.mjs`, `tests/security/provider-integration.test.mjs`, `tests/security/rls-staging.test.mjs`, `tests/security/activation-wave.test.mjs`, `tests/security/ingestion-routes.test.mjs`, `docs/runtime-security-evidence.md`, this report.
Prior-wave files reused unchanged: provider-policy, auth-guards, contradiction/temporal/file-safety/contract-analysis, 055 migration, 5 prior docs.

## 18. Git status
Branch `main...origin/main [ahead 3+]` (activation changes add to prior hardening window's dirty tree; pre-existing unrelated SEO/sitemap/footer modifications remain untouched by this wave).
Frozen: `git diff HEAD -- benchmarks/v1.0 benchmarks/hallucination-100.mjs benchmarks/patent_retrieval_v1` empty. No legal benchmark, ABIGAIL, IPBench, CUAD, or practitioner grading modified.

## Verdict
`CONFIDENTIAL_PILOT_BLOCKED` — controls exist and unit/integration evidence is green, but tenant isolation, confidential providers, and full audit coverage lack live runtime proof. Do not admit confidential IP beyond PUBLIC_RESEARCH until the gate passes.

## 19. Delta to P0 Closure (2026-09-15)
- CI now exists (`.github/workflows/secret-scan.yml` + `visual-ci.yml`) — §11's "no `.github`" is stale.
- Audit wiring 6/34 → 12/35; security tests 50/50 → 70/70 (+28/28 verification).
- Word manifest domain is now `https://sallyip.com` via `scripts/generate-word-manifest.mjs` (do not hand-edit `public/word-addin/manifest.xml`).
- BLOCKED reasons unchanged: no approved confidential chat/embedding, RLS not live, app role not runtime, live cross-tenant proof missing.
