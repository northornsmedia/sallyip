# Security architecture (hardening window)

## Trust boundaries
Client (Vite SPA, no secrets) -> Vercel serverless (`api/_handlers/*`, auth-checked) -> Neon Postgres (RLS) -> external providers (gated by `provider-policy.js`).

## Confidentiality (P0)
- Default `CONFIDENTIAL_IP`, fail-closed. Free `:free` models blocked for matter content, embeddings, rerank.
- `src/lib/sally-orchestrator.js`: `assertChatAllowed` + embedding gate; `enforcedPipeline` only.
- Keys separated per engine. See `docs/provider-confidentiality-policy.md`.

## Tenant isolation
- App-layer `user_id`/`matter_id` scoping everywhere + new DB-layer RLS (`database/055_tenant_isolation.sql`).
- Roles: `sally_app` (own rows via `app.current_user_id`), `sally_readonly`, owner bypasses RLS (existing deploy unaffected until app switches role).
- Grants documented in migration; rollback included. Model: `database/security_model.md`.

## Auth
- scrypt passwords, 30-day sessions, login throttle 10/10min (`src/lib/security.js`, `src/lib/auth.js`).
- `resolveDevUser` (aman@sallyip.com) DEV-ONLY; throws `DEV_FALLBACK_BLOCKED` in production (`vite.config.js`, `src/lib/auth-guards.js`).
- Cookies: HttpOnly, SameSite=Lax, Secure required in production.

## Audit logging
- Structured events: event_id, timestamp, actor, org, matter, action, resource, result, request_id, severity.
- Confidential fields redacted (`redactConfidential`), long strings truncated.
- Write failure throws `AUDIT_WRITE_FAILED` + console fallback sink (observable, not silent).

## Verification (no weakening)
- P0 gates intact (28/28 `test:verification` pass).
- P1 added: `contradiction-service.js` (NO/POTENTIAL/MATERIAL/RESOLVED/UNRESOLVED, material must surface), `temporal-service.js` (QUALIFY when currency unknown; SUPERSEDED flagged), `entailment-service.js` independent check (ENTAILS/PARTIAL/CONTEXT_ONLY/CONTRADICTS/UNSUPPORTED).
- Legal correctness stays separate from grounding; practitioner hooks preserved.

## Files / resilience
- `src/lib/file-safety.js`: 25MB PDF/doc cap, MIME allowlist, executable/archive block, traversal-safe names, injection flag. Server-side enforcement required at every upload route (wiring TODO tracked in readiness).
- Serverless: 25–35s model budget documented as fragile; target pattern request->job/run->async->persisted result (not yet migrated — see readiness Operational Reliability).
- Env: `APP_ORIGIN`/`API_ORIGIN` replace hardcoded `https://sallyip.vercel.app`; secrets via Vercel env, never bundled (test 12).
