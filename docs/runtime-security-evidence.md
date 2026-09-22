# Runtime security evidence (activation wave — evidence, not claims)

Allowed statuses: NOT_IMPLEMENTED / IMPLEMENTED / UNIT_VERIFIED / INTEGRATION_VERIFIED / STAGING_VERIFIED / PRODUCTION_VERIFIED / BLOCKED.

| CONTROL | CODE IMPLEMENTED | UNIT TESTED | INTEGRATION TESTED | STAGING VERIFIED | PRODUCTION VERIFIED | EVIDENCE | STATUS |
|---|---|---|---|---|---|---|---|
| Confidential chat boundary | `src/lib/provider-policy.js`, `sally-orchestrator.js` enforcedPipeline | `provider-confidentiality` 7 tests | `provider-integration` mock-fetch 4 tests (zero-fetch proof) | BLOCKED (no staging provider) | BLOCKED | `npm run test:security` 70 pass; live approved provider absent so fail-closed is the verified behavior | INTEGRATION_VERIFIED |
| Confidential embeddings | gates in orchestrator, `verification-service`, `embedding-service`, `api/_handlers/embeddings`, `api/ingest-document.py` | unit + integration (lexical-only, 403s) | mock-fetch: 0 embedding calls for CONFIDENTIAL | BLOCKED | BLOCKED | retrieval degrades, never leaks | INTEGRATION_VERIFIED |
| Confidential rerank | `api/_handlers/rerank` 403 gate | unit + integration | handler 403 test | BLOCKED | BLOCKED | same as embeddings | INTEGRATION_VERIFIED |
| RLS tenant isolation | `database/055_tenant_isolation.sql` | migration static tests | BLOCKED (no staging DB; live owner bypass) | BLOCKED | BLOCKED | `scripts/rls-staging-check.mjs` live read-only 2026-09-10: user=neondb_owner, bypass=true, rls=0, policies=0 | BLOCKED |
| Least-privilege DB role | roles defined, grants documented | static (no SUPERUSER/BYPASSRLS) | BLOCKED (no staging app-role login) | BLOCKED | BLOCKED | runtime still owner `DATABASE_URL`; `DATABASE_URL_APP` absent | BLOCKED |
| Cross-tenant attacks | service scoping + RLS design | substitution unit test | BLOCKED live (needs staging with sally_app) | BLOCKED | BLOCKED | unit proves binding; live proof pending | UNIT_VERIFIED |
| File-safe ingestion | `file-safety.js` wired into `document-ingestion-local.js` + `ingest-document.py` | `file-safety` + `ingestion-routes` 13 tests | node path live-parse test (malformed surfaces) | BLOCKED (python route live-upload not staged) | BLOCKED | 11 attack cases covered at unit; route inventory: 2/2 ingestion paths wired, 39-handler audit separate | INTEGRATION_VERIFIED |
| Origin config | `APP_ORIGIN` prefer + host allowlist, referer env, manifest generator | `activation-wave` origin tests | BLOCKED (prod deploy not reverified) | BLOCKED | BLOCKED | `chat-orchestrator siteUrlFor`, `scripts/generate-word-manifest.mjs`; committed manifest is generated output, reverification pending | IMPLEMENTED |
| Contradiction finalizer | `contradiction-service` + wired into `finalizeVerifiedAnswer` | 5 P1 tests | BLOCKED (no live matter run) | BLOCKED | BLOCKED | additive surfacing; existing 28 verification tests still pass | UNIT_VERIFIED |
| Temporal finalizer | `temporal-service` + wired | same | BLOCKED | BLOCKED | BLOCKED | QUALIFY on unknown/stale; SUPERSEDED flagged | UNIT_VERIFIED |
| Audit coverage | matters + embeddings/rerank rejections + generated-files/workflows/artifacts/sources/conversations (12/39 audited) | audit unit tests | BLOCKED (handler hit-count not staged) | BLOCKED | BLOCKED | inventory: auth, contracts, patent-drafts, playbooks, matters, embeddings, rerank, generated-files, workflows, artifacts, sources, conversations = AUDITED; 27 NOT_AUDITED | IMPLEMENTED |
| Secret scanning | `scripts/secret-scan.mjs` + `secret:scan` | activation test | `node scripts/secret-scan.mjs` clean (this wave) | CI present (`.github/workflows/secret-scan.yml`); pre-commit hook install is manual | BLOCKED | history `git log --all -- .env.local` empty; scanner excludes examples | IMPLEMENTED |
| Official authority | 4 live adapters, honest not-configured | existing `official-search` tests | BLOCKED (no live key rotation test) | BLOCKED | BLOCKED | matrix doc; WIPO/UKIPO/CIPO/IPAU missing by design this wave | IMPLEMENTED |
| Build | Vite | — | `npm run build` clean (local only) | n/a | local only | dist output present | INTEGRATION_VERIFIED |

Rule: a control is PRODUCTION_VERIFIED only with live runtime proof under least-privilege role. None meet that yet.
