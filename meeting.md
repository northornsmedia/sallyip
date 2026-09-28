# SallyIP — Team & Stakeholder Meeting Hub

**Project:** SallyIP (`northornsmedia/sallyip`)  
**Last Updated:** September 28, 2026  
**Status:** Active  
**Document ID:** `meeting.md`

---

## 1. Executive Quick Links & Index

- [Current Meeting Agenda & Notes (September 28, 2026)](#2-executive--technical-steering-sync-september-28-2026)
- [P0 Pilot Infrastructure & Blocker Review](#3-p0-pilot-infrastructure--security-blockers)
- [Commercial & Investor Alignment (Series Seed/A)](#4-commercial--investor-alignment)
- [Product & Engineering Sprint Status](#5-product--engineering-sprint-status)
- [Decisions & Architecture Log](#6-decisions--architecture-log)
- [Action Items & DRI Tracker](#7-action-items--dri-tracker)
- [Meeting Templates for Future Syncs](#8-reusable-meeting-templates)

---

## 2. Executive & Technical Steering Sync (September 28, 2026)

**Date & Time:** September 28, 2026 — 10:00 AM – 11:30 AM EST  
**Location / Link:** Video Conference (Confidential Steering Channel)  
**Attendees:**
- [x] Product & Strategy Lead
- [x] Lead AI Architect / Verification Engineer
- [x] Infrastructure & Security Lead
- [x] Legal & Compliance Counsel

### Meeting Objectives
1. Review and resolve operational blockers for the Enterprise Pilot (`CONFIDENTIAL_PILOT_P0_CLOSURE_REPORT.md`).
2. Finalize preparation for upcoming Seed / Series A investor meetings (`report29.md`).
3. Align on the Q4 roadmap: Word Add-in general availability, official patent authority quotas, and vault retrieval scaling.

---

## 3. P0 Pilot Infrastructure & Security Blockers

> **Current Pilot Readiness Status:** All P0 code implementations complete (70/70 security tests pass, 28/28 verification tests pass). Pilot launch remains **BLOCKED** on cloud provider ops and live staging execution.

| Area | Current State | Required Blocker Resolution | DRI | Target Date |
| :--- | :--- | :--- | :--- | :--- |
| **Confidential LLM Approval** | Free tier `gemini-3.7-flash` blocked by policy for confidential IP. | Execute GCP DPA + Zero-Data-Retention Addendum; set `SALLYIP_APPROVE_GEMINI_CONFIDENTIAL=1`. | Ops / Legal | Oct 02, 2026 |
| **Confidential Embeddings** | Free endpoint `liquid/lfm-2.5-embedding-350m:free` blocked. | Configure dedicated paid embedding endpoint with zero-retention guarantee. | Infrastructure | Oct 03, 2026 |
| **Neon Database RLS** | Migration `055_force_rls.sql` drafted and inspected. | Provision Neon staging branch; execute `scripts/p0-2-staging-rls.mjs` with 9 adversarial checks. | Database Eng | Oct 04, 2026 |
| **Role Separation & Creds** | Single owner string currently configured. | Deploy 3 connection strings (`DATABASE_URL_ADMIN`, `DATABASE_URL_APP`, `DATABASE_URL_READONLY`). | Database Eng | Oct 04, 2026 |
| **Cross-Tenant API Verification** | 8 attack vectors documented in spec. | Run live tenant isolation suite using dual-cookie session simulation. | QA / Security | Oct 06, 2026 |

---

## 4. Commercial & Investor Alignment

**Context:** Target $3.5M – $5.0M Seed / Series A Growth Round (`report29.md`).

### Agenda Discussion Points:
1. **The "Verification-First" Pitch Angle:**
   - Reinforce key differentiator: General LLMs hallucinate 58%–82% in legal domains; SallyIP delivers 0% citation hallucination with exact-quote verification.
   - Demo the Citation Guard and live proposition verification in the Chat & Drafting studio.
2. **Pilot Cohort Economics:**
   - 3 IP boutique law firms + 2 enterprise corporate tech departments queued for onboarding.
   - Target metric: Demonstrate reduction of patent draft turnaround from 25 hours to < 3 hours.
3. **Materials Checklist:**
   - [x] Executive Briefing completed ([`ceo_briefing.md`](file:///c:/Users/User/Sallyip/ceo_briefing.md))
   - [x] Investment Memo completed ([`report29.md`](file:///c:/Users/User/Sallyip/report29.md))
   - [ ] Live Sandbox Demo walkthrough recorded without proprietary client data.
   - [ ] Customer pilot engagement agreements signed with pilot firms.

---

## 5. Product & Engineering Sprint Status

### Recent Ships (Commit `9e024a5` Review)
- **Reusable Legal Playbooks:** Versioned workflow templates for patentability, FTO, and contract analysis.
- **Contract Review & Risk Highlighting:** Automatic detection of uncapped liabilities, non-standard indemnity, and IP assignment clauses.
- **Official Source Expansion:** Added USPTO and CourtListener official API query support with fallback status reporting.
- **Citation Ledger (`044_citation_ledger.sql`):** Pinned citations connected to matters, sources, and exact passage quotes.

### Current Sprint Focus (Ending October 10, 2026)
- [ ] Word Add-in: Refine insertion of generated claim trees and office action amendments into `.docx`.
- [ ] Multi-turn patent claim refactoring with antecedent basis tracking.
- [ ] Trigram search tuning on matter knowledge vaults (>100,000 passages).

---

## 6. Decisions & Architecture Log

| Decision ID | Date | Decision Summary | Rationale / Trade-offs | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-2026-09-01** | 2026-09-08 | Enforce zero-fetch fail-closed policy on free LLM endpoints for confidential matters. | Legal malpractice risk from third-party model training on unfiled patents is unacceptable. | **Active / Enforced** |
| **DEC-2026-09-02** | 2026-09-12 | Require explicit `sally_meta.citation_guard` in API payload for every synthesis response. | Enables frontend UI to visibly tag verified vs. unverified propositions for attorneys. | **Implemented** |
| **DEC-2026-09-03** | 2026-09-28 | Separate Database connection roles (`sally_app` vs `sally_readonly`). | Defense-in-depth: Prevents app-layer SQL injection from escalating to DDL alterations. | **Pending Deployment** |

---

## 7. Action Items & DRI Tracker

| # | Action Item | DRI | Priority | Target Due | Status |
| :-: | :--- | :--- | :-: | :-: | :---: |
| 1 | Finalize GCP Business Associate / Zero-Retention DPA for Gemini Enterprise. | Legal / Ops | **P0** | Oct 02, 2026 | In Progress |
| 2 | Spin up Neon staging branch and run `scripts/p0-2-staging-rls.mjs`. | Database Lead | **P0** | Oct 04, 2026 | Pending |
| 3 | Package interactive investor demo flow based on `report29.md`. | Product Lead | **P1** | Oct 05, 2026 | In Progress |
| 4 | Audit CourtListener API rate limit handling during bulk prior-art searches. | Backend Eng | **P1** | Oct 08, 2026 | Not Started |
| 5 | Verify Microsoft Word Add-in token handling on desktop Office 365. | Frontend Eng | **P2** | Oct 12, 2026 | In Progress |

---

## 8. Reusable Meeting Templates

Use the templates below for rapid documentation of subsequent meetings.

### Template A: Weekly Engineering & Security Standup
```markdown
## Weekly Engineering Standup — [Date]
**Facilitator:** [Name]  
**Attendees:** [List]

### 1. What was completed last week?
- [Item 1]
- [Item 2]

### 2. What is committed for this week?
- [Item 1]
- [Item 2]

### 3. Blockers & Security Audits
- [Blocker / Risk]

### 4. Action Items
- [ ] [Task] — @[Assignee] (Due: [Date])
```

### Template B: Client / Law Firm Pilot Check-in
```markdown
## Pilot Feedback Sync — [Firm / Client Name] — [Date]
**Participants:** [Firm Reps], [SallyIP Reps]

### 1. Pilot Usage Metrics
- Matters opened: [Count]
- Prior art / claim drafting queries run: [Count]
- Time savings reported: [Hours / %]

### 2. Attorney Feedback & Friction Points
- Accuracy / Citation Quality:
- UI / Workflow Feedback:
- Export format issues (USPTO XML / DOCX):

### 3. Feature Requests & Prioritization
- [Feature 1]

### 4. Next Steps
- [ ] [Action] — @[Assignee] (Due: [Date])
```
