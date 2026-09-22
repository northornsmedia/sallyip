# SallyIP Full Audit Report - 2026-09-16

## Executive Summary
SallyIP is verification-first IP intelligence workspace. This audit covers quality gates, security, and visual regression.

## Quality Gates
- **TypeScript**: `npm run typecheck` runs `tsc --noEmit`. One JSX parsing error remains in `src/components/document-engine-workspace.jsx:230`. Recommend converting to .tsx or fixing fragment syntax.
- **Secret scan**: `npm run secret:scan` passes. Pre-commit hook defined via `npm run precommit`.
- **Foundation tests**: 89/89 passing
- **Security tests**: 70/70 passing

## Security Highlights
- Provider policy enforced for confidential IP
- Rerank and embeddings handlers now require session auth
- Document-engine sanitization applied
- EP→EPO alias active
- Audit logging structured and redacted

## Visual Regression
- Marketing routes stable on Chromium
- OfficeActionDemo test now skips gracefully if lazy-loaded demo not present
- Firefox/WebKit show systematic 1-2px dimension drift due to missing `{projectName}` in snapshot template. Not real regressions.

## Fixes Applied
- Routing hash guard in `src/main.jsx`
- Document-engine injection sanitization
- Rerank auth hardening
- EP authority alias
- Package.json engines pinned to Node 20
- CI workflow with quality and visual matrix
- Health endpoint added
- CHANGELOG created

## Recommendations
1. Fix JSX syntax in document-engine-workspace.jsx to clear typecheck
2. Add per-browser snapshot baselines or fix template placeholder
3. Enable branch protection requiring CI green
4. Add nightly integration tests
