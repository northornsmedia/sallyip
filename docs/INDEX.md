# Docs index — source of truth map

Read in this order. When two docs disagree, the HIGHER item wins (newer gate evidence beats older wave snapshots, which are frozen history).

1. `README.md` — setup, DB, tests, gates (start here for boot).
2. `CONFIDENTIAL_PILOT_P0_CLOSURE_REPORT.md` — newest gate verdict (`CONFIDENTIAL_PILOT_BLOCKED`) + remaining blockers.
3. `SECURITY_ACTIVATION_REPORT.md` — live-evidence wave snapshot + §19 delta to the P0 Closure.
4. `SECURITY_IMPLEMENTATION_LOG.md` — hardening-window record + §13 link-forward (frozen history, annotated where stale).
5. `docs/security-architecture.md` — control design. `docs/runtime-security-evidence.md` — live evidence. `docs/provider-confidentiality-policy.md` — which models may see what (binding for confidential work).
6. `docs/P0-7-production-migration-plan.md` — path to prod (migrations incl. 055, roles, staging proofs).
7. `docs/production-readiness.md`, `docs/verification-architecture-audit.md`, `docs/phase-1-automation-audit.md` — readiness + audit state.
8. `sqlrun.md` — exact migration chain (042→055, duplicate-048 note, env keys).
9. `.env.example` — all 30+ env keys with placeholders (copy to `.env.local`; never commit real values).
10. `DIRECTORIES.md` — submissions + canonical blurb. `DESIGN_SYSTEM_VERSION.md` — frozen marketing system + known drift.
11. `recentchanges.md` — changelog (history frozen; new waves append at bottom).
12. `docs/document-engine/` — drafting system: `DOCUMENT_PROGRAMME_MASTER_REPORT.md`, `CANONICAL_TAXONOMY.md`, `COMPLETE_DOCUMENT_CATALOGUE.md`, then `training/` per-workflow reports.
13. `docs/voice/` — voice runtime (architecture, barge-in, security, acceptance).
14. `benchmarks/` + `evals/` — eval methodology, baselines, failure triage (do not edit frozen sets).
15. `seo/` — SEO plans + wave reports. `frontend/ENTERPRISE_REDESIGN_REPORT.md` — marketing build notes.
16. `database/security_model.md` — RLS design for 055.

Historical reports (`seo/WAVE*_REPORT.md`, `benchmarks/*report*.md`, `docs/document-engine/training/*`) are records — read, don't rewrite. Append new waves as new files.
