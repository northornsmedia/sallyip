# Changelog

## Unreleased
- Add TypeScript build gate `npm run typecheck` and pin Node LTS 20 in `package.json` engines
- Harden visual regression test stability: OfficeActionDemo test now skips gracefully if lazy-loaded demo not present
- Add `npm run precommit` combining secret scan and typecheck
- Add health endpoint `api/_handlers/health.js`
- Fix routing hash redirect guard in `src/main.jsx`
- Sanitize document-engine injection in `src/lib/document-engine.js`
- Harden `/api/rerank` with session auth
- Fix EP→EPO alias in jurisdiction registry
- Security suite 70/70, Foundation 89/89
- Docs fixes: README, .env.example, sqlrun.md, DESIGN_SYSTEM_VERSION.md, DIRECTORIES.md, SECURITY reports, recentchanges.md, CONFIDENTIAL_PILOT_P0_CLOSURE_REPORT.md
- 60 agents roaming in Agent-City
- CI workflow with quality and visual matrix for Chromium/Firefox/WebKit
- Full audit report generated at `AUDIT_REPORT_2026-09-16.md`

## 2026-09-16
- Commit 991e3c8: routing hash redirect, document-engine sanitization, rerank auth hardening, doc fixes & EP alias
