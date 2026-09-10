# SallyIP Runtime Validation — Baseline Freeze

## Baseline Information

**Git SHA**: `808fdf88e92207a0c797cef3a812acbf0ecc5bee`
**Date**: 2026-09-10
**Branch**: main
**Status**: Baseline frozen

## Test Counts (All Passing)

| Suite | Tests | Pass | Fail | Duration |
|-------|-------|------|------|----------|
| Foundation | 77 | 77 | 0 | 458ms |
| Python | 12 | 12 | 0 | 2.0s |
| Security | 70 | 70 | 0 | 810ms |
| Build | 1 | 1 | 0 | 5.76s |

**Total**: 159 tests passing

## Build Result

```
vite v6.4.3 building for production...
✓ 2282 modules transformed.
✓ built in 5.76s
```

## Catalogue Counts (Reported)

| Metric | Count |
|--------|-------|
| Categories | 12 |
| Subcategories | 80 |
| Document Families | 150 |
| Document Types | 400 |
| Clause Families | 28 |
| Drafting Positions | 9 |
| Priority Jurisdictions | 8 |
| Unsupported Jurisdictions | 9 |

## Frozen Benchmarks (Unchanged)

- `benchmarks/v1.0`
- `hallucination-100`
- `patent_retrieval_v1`
- `pipeline-owned benchmark assets`

## CONFIDENTIAL_PILOT_BLOCKED

Preserved — no changes to provider policy, tenant isolation, verification, auth, audit, file safety, or citation verification.

## Untracked Files (New Implementation)

```
.opencode/agents/1-document-taxonomy-lead.md
.opencode/agents/2-ip-document-specialist.md
.opencode/agents/3-commercial-contracts-specialist.md
.opencode/agents/4-corporate-ma-finance-specialist.md
.opencode/agents/5-employment-hr-specialist.md
.opencode/agents/6-privacy-data-tech-specialist.md
.opencode/agents/7-litigation-disputes-specialist.md
.opencode/agents/8-regulatory-industry-specialist.md
.opencode/agents/9-document-drafting-engine-ux.md
.opencode/agents/10-qa-legal-safety-orchestration.md
api/documents.js
data/documents/catalogue-summary.json
data/documents/taxonomy-schema.json
data/documents/clause-families.json
data/documents/jurisdiction-engine.json
data/documents/profiles/nda-mutual.json
data/documents/profiles/patent-application.json
docs/document-engine/CANONICAL_TAXONOMY.md
docs/document-engine/EXISTING_ARCHITECTURE.md
docs/document-engine/DOCUMENT_PROGRAMME_MASTER_REPORT.md
src/components/document-engine-workspace.jsx
src/lib/document-engine.js
src/lib/document-engine-router.js
src/lib/document-engine-qa.js
```

## Modified Files (Pre-existing)

Multiple API handlers, components, and config files show modifications — these predate this validation phase.

---

**BASELINE FROZEN. PROCEEDING TO CATALOGUE REALITY AUDIT.**