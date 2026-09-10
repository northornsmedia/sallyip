# SallyIP Canonical Document Taxonomy

## Version 1.0.0

This is the single source of truth for all document types across the SallyIP Legal Document Intelligence system. Every document record must be traceable to this taxonomy.

---

## Taxonomy Hierarchy

```
CATEGORY
  → SUBCATEGORY
    → DOCUMENT FAMILY
      → DOCUMENT TYPE
        → VARIANT
          → JURISDICTION
```

Every document record supports:

| Field | Description |
|-------|-------------|
| `id` | Unique UUID |
| `slug` | URL-safe identifier |
| `name` | Human-readable name |
| `aliases[]` | Alternative names/search terms |
| `category` | Primary category |
| `subcategory` | Subcategory within category |
| `document_family` | Document family |
| `practice_areas[]` | Practice areas tagged |
| `status` | AVAILABLE, BETA, RESEARCH_ONLY, PLANNED |
| `risk_level` | LOW, MEDIUM, HIGH, VERY_HIGH |
| `jurisdiction_scope[]` | Applicable jurisdictions |
| `jurisdiction_type` | JURISDICTION_AGNOSTIC_STRUCTURE, ADAPTABLE, SPECIFIC, FORUM_SPECIFIC |
| `governing_law_required` | Boolean |
| `party_roles[]` | Required and optional party roles |
| `required_inputs[]` | REQUIRED_BEFORE_DRAFT inputs |
| `optional_inputs[]` | OPTIONAL inputs |
| `matter_inputs[]` | Available from matter context |
| `pre_draft_questions[]` | Questions before drafting |
| `sections[]` | Document section structure |
| `clause_families[]` | Clause families applicable |
| `authority_required` | Authorities needed |
| `verification_required` | Boolean |
| `review_required` | Boolean |
| `output_formats[]` | docx, pdf, md, html, txt, json |
| `related_documents[]` | Related document slugs |
| `source_status` | UNRESEARCHED, STRUCTURED, REVIEWED, PRACTITIONER_REVIEWED |
| `version` | Version string |
| `last_reviewed` | Date of last review |

---

## Status Levels

| Status | Meaning |
|--------|---------|
| **AVAILABLE** | Defined evidence criteria met; fully usable |
| **BETA** | Functioning but needs real-world validation |
| **RESEARCH_ONLY** | Research complete; draftable but needs review |
| **PLANNED** | In development; not yet draftable |

**IMPORTANT**: No document is labeled AVAILABLE simply because an LLM can produce text resembling it. AVAILABLE requires defined evidence criteria.

---

## Source Status

| Source Status | Meaning |
|---------------|---------|
| **UNRESEARCHED** | No research completed |
| **STRUCTURED** | Document structure defined |
| **REVIEWED** | Content reviewed for accuracy |
| **PRACTITIONER_REVIEWED** | Practiced attorney verified |

---

## Risk Levels

| Risk Level | Meaning |
|------------|---------|
| **LOW** | Standard document; minimal risk |
| **MEDIUM** | Some negotiable terms; moderate risk |
| **HIGH** | Complex terms; significant risk; requires lawyer review |
| **VERY_HIGH** | Bet-the-company; regulatory enforcement; requires senior attorney |

---

## Jurisdiction Types

| Type | Meaning |
|------|---------|
| **JURISDICTION_AGNOSTIC_STRUCTURE** | Structure applies everywhere |
| **JURISDICTION_ADAPTABLE** | Adaptable with jurisdiction-specific hooks |
| **JURISDICTION_SPECIFIC** | Requires jurisdiction-specific rules |
| **FORUM_SPECIFIC** | Tied to specific court/tribunal |

---

## Categories

### 1. IP & Innovation (IP_INNOVATION)

**Subcategories**: Patent, Trademark, Copyright, Design Right, Trade Secret, Licensing, IP Enforcement

**Priority**: Deepest coverage initially on Patents and Trademarks

**Drafting Profiles**:
- Patent applications, specifications, claims, amendments
- Office-action responses (§101, §102, §103, §112)
- Prior-art reports, novelty opinions, FTO, invalidity, infringement, claim charts
- Trademark: clearance, search reports, applications, office actions, oppositions, cancellations, coexistence, assignments, licences, UDRP, enforcement

### 2. Contracts & Commercial (COMMERCIAL)

**Subcategories**: NDA, MSA, SaaS, Vendor, Distribution, Partnership, Support SLA

**Reference Implementation**: NDA Family

**NDA Variants**: Mutual, One-way, Employee, Contractor, Investor, M&A, Due Diligence, Technology, Research, Vendor, Data-room, Confidentiality Undertaking

### 3. Corporate & Transactions (CORPORATE)

**Subcategories**: Merger, Acquisition, Financing, Governance, Cap Table, Restructuring

**Documents**: LOIs, term sheets, merger agreements, SPAs, ASAs, joint ventures, SAFEs, convertible notes, term sheets, shareholder agreements, voting agreements, board consents, option plans, credit facilities, guarantees, security, intercreditor

### 4. Employment & HR (EMPLOYMENT)

**Subcategories**: Employment Agreement, Offer, Equity Awards, Policies, Termination, Benefits, Immigration, Contractor

**Jurisdiction-Sensitive**: Employment drafting must respect multi-state requirements. Non-competes, termination laws, and employment regulations vary significantly by jurisdiction.

### 5. Privacy & Data (PRIVACY)

**Subcategories**: Privacy Policy, DPA, Data Sharing, Breach Response, DSAR, International Transfer, AI Governance, Data License

**Frameworks**: GDPR/UK GDPR, CCPA/CPRA, HIPAA/HITECH, GLBA, FERPA, COPPA, VPPA, state biometric laws, EU AI Act, state comprehensive laws

### 6. Technology & AI (TECHNOLOGY)

**Subcategories**: Software Licence, EULA, API Terms, Development, Hosting, Cloud, Escrow, Open Source, AI Agreements

### 7. Litigation & Disputes (LITIGATION)

**Subcategories**: Pleadings, Discovery, Motions, Settlement, Arbitration, Appeal, Enforcement, Mediation

**Court/Tribunal documents require jurisdiction/forum context.**

### 8. Regulatory & Industry (REGULATORY)

**Subcategories**: Filings, Licensing, Compliance, Examinations, Enforcement, Healthcare, Financial, Energy, Telecom, Consumer, Cannabis, Gov Contracting

**High-risk documents default to REVIEW_REQUIRED.**

### 9. Finance (FINANCE)

**Subcategories**: Credit Facility, Loan Agreement, Guarantee, Security, Intercreditor, Venture Finance, Project Finance

### 10. Legal Research & Memos (LEGAL_RESEARCH)

**Subcategories**: Legal Memo, Opinion, Feasibility, Novelty Opinion, Advice Letter, Position Paper, Brief

### 11. Letters & Notices (LETTERS)

**Subcategories**: Cease and Desist, Demand Letter, Litigation Letter, Correspondence, Notice, Form Letter

### 12. Policies & Governance (POLICIES)

**Subcategories**: Employee Handbook, Code of Conduct, Anti-Harassment, Data Policy, Governance, Compliance Framework, Risk Management, Internal Controls

---

## Jurisdiction Coverage

### Priority Jurisdictions (Initial)

| Code | Name | Patent Authority | Trademark Authority |
|------|------|------------------|---------------------|
| US | United States | USPTO | USPTO |
| UK | United Kingdom | UKIPO | UKIPO |
| EU | European Union | EPO | EUIPO |
| EPO | European Patent Office | EPO | n/a |
| PCT | WIPO/PCT | WIPO | Madrid System |
| CA | Canada | CIPO | CIPO |
| AU | Australia | IP Australia | IP Australia |
| IN | India | Indian Patent Office | Trademark Registry India |

### Unsupported (Research Required)

Brazil, Mexico, Japan, China, South Korea, Singapore, UAE, Switzerland, Hong Kong

**Never silently improvise jurisdiction-specific filing requirements.** Where support does not exist, mark as `RESEARCH_REQUIRED`.

---

## Input Classes

| Class | Meaning |
|-------|---------|
| **REQUIRED_BEFORE_DRAFT** | Must be answered before drafting begins |
| **AVAILABLE_FROM_MATTER** | Can be pre-filled from matter context |
| **SAFE_PLACEHOLDER** | Can use placeholder temporarily |
| **OPTIONAL** | Optional; can skip |

---

## Drafting Positions

Clause variants describe drafting positions. They must NOT imply legal correctness or enforceability.

| Position | Meaning |
|----------|---------|
| **NEUTRAL** | Balanced, market-standard |
| **CUSTOMER_FRIENDLY** | Favors the customer/user |
| **SUPPLIER_FRIENDLY** | Favors the supplier/provider |
| **LICENSOR_FRIENDLY** | Favors the licensor |
| **LICENSEE_FRIENDLY** | Favors the licensee |
| **EMPLOYER_FRIENDLY** | Favors the employer |
| **EMPLOYEE_FRIENDLY** | Favors the employee |
| **BUYER_FRIENDLY** | Favors the buyer |
| **SELLER_FRIENDLY** | Favors the seller |

---

## Clause Families

Canonical clause families with hierarchical naming:

```
confidentiality.definition
confidentiality.exclusions
confidentiality.permitted_disclosure
confidentiality.duration

ip.background
ip.foreground
ip.assignment
ip.licence
ip.improvements

liability.cap
liability.exclusions
liability.indirect_loss

indemnity.ip
indemnity.third_party

termination.convenience
termination.cause

data.controller_processor
data.security
data.subprocessors
data.transfers

disputes.courts
disputes.arbitration
disputes.mediation
```

Each clause family supports variants by drafting position.

---

## Document Profiles (Not Just Templates)

For every document, the system models:

| Attribute | Description |
|-----------|-------------|
| **WHAT IT IS** | Definition and purpose |
| **WHEN USED** | Timing and trigger events |
| **WHO USES IT** | Practitioners, parties |
| **PARTY ROLES** | All required and optional roles |
| **REQUIRED FACTS** | Minimum facts to draft |
| **OPTIONAL FACTS** | Nice-to-have facts |
| **JURISDICTION DEPENDENCIES** | How jurisdiction affects structure |
| **PRE-DRAFT QUESTIONS** | Questions asked before drafting |
| **DOCUMENT STRUCTURE** | Sections and clause families |
| **CLAUSE/ARGUMENT FAMILIES** | Reusable clause components |
| **ALTERNATIVE POSITIONS** | Different drafting positions available |
| **NEGOTIATION VARIABLES** | Terms that are negotiable |
| **RISK ISSUES** | Known risk areas |
| **AUTHORITIES REQUIRED** | Statutory/case law citations |
| **VERIFICATION REQUIREMENTS** | What needs to be verified |
| **REVIEW REQUIREMENTS** | Who must review |
| **RELATED DOCUMENTS** | Complementary documents |
| **OUTPUT FORMAT** | Export formats available |

This is **DOCUMENT INTELLIGENCE**, not template dumping.

---

## Document Count Summary

| Category | Subcategories | Document Families | Document Types | AVAILABLE | BETA | RESEARCH_ONLY | PLANNED |
|----------|---------------|-------------------|----------------|-----------|------|---------------|---------|
| IP & Innovation | 7 | 25 | 60 | 3 | 12 | 25 | 20 |
| Contracts & Commercial | 7 | 25 | 50 | 5 | 10 | 15 | 20 |
| Corporate & Transactions | 6 | 20 | 40 | 2 | 8 | 15 | 15 |
| Employment & HR | 8 | 20 | 45 | 2 | 8 | 15 | 20 |
| Privacy & Data | 8 | 20 | 45 | 2 | 8 | 15 | 20 |
| Technology & AI | 9 | 20 | 40 | 2 | 8 | 15 | 15 |
| Litigation & Disputes | 8 | 25 | 50 | 2 | 8 | 20 | 20 |
| Regulatory & Industry | 12 | 30 | 60 | 1 | 5 | 25 | 29 |
| Finance | 7 | 20 | 40 | 1 | 5 | 15 | 19 |
| Legal Research & Memos | 7 | 15 | 30 | 1 | 5 | 12 | 12 |
| Letters & Notices | 6 | 15 | 30 | 2 | 5 | 12 | 11 |
| Policies & Governance | 8 | 15 | 25 | 1 | 3 | 10 | 11 |
| **TOTALS** | **80** | **~150** | **~400** | **~24** | **~80** | **~184** | **~212** |

---

## Alias Resolution

The system must understand aliases for search and conversational routing. Examples:

| Alias | Canonical Document |
|-------|-------------------|
| nda | Non-Disclosure Agreement |
| mutual confidentiality | Mutual NDA |
| 103 response | §103 Office Action Response |
| spa | Share Purchase Agreement |
| patent app | Patent Application |
| tm app | Trademark Application |
| cease & desist | Cease and Desist Letter |
| DPA | Data Processing Agreement |
| privacy notice | Privacy Policy/Notice |
| SaaS agreement | SaaS Subscription Agreement |
| software licence | Software Licence Agreement |
| employment contract | Employment Agreement |
| merger agreement | Share Purchase Agreement (Merger) |
| term sheet | Term Sheet / LOI |
| SAFE | Simple Agreement for Future Equity |
| convertible note | Convertible Note |
| IP assignment | IP Assignment Agreement |
| licence | IP Licence Agreement |
| settlement agreement | Settlement Agreement |
| arbitration notice | Arbitration Notice |
| legal memo | Legal Research Memorandum |
| opinion letter | Legal Opinion |
| FTO analysis | Freedom to Operate Analysis |
| claim chart | Claim Chart |
| novelty opinion | Novelty Opinion |
| office action | Office Action Response |
| trademark clearance | Trademark Clearance Report |
| coexistence agreement | Trademark Coexistence Agreement |
| non-compete | Restrictive Covenant (Non-Compete) |
| separation agreement | Employment Termination/Settlement Agreement |
| EULA | End User Licence Agreement |
| terms of service | Terms of Service / EULA |
| privacy policy | Privacy Notice/Policy |
| data licence | Data Licence Agreement |

---

## Conversational Routing

The system must resolve conversational requests into canonical document types:

- "Draft an NDA" → `document_family = NDA` → ask: Mutual or one-way? Parties? Purpose?
- "Draft a mutual NDA between Company A and Company B" → `document_family = NDA`, `variant = mutual`, `parties = [Company A, Company B]`
- "Draft a response to this §103 rejection" → `document_family = Office Action Response`, `subcategory = Patent`, `section = §103`
- "Prepare a trademark coexistence agreement" → `document_family = Trademark Coexistence Agreement`
- "Draft a software licence" → `document_family = Software Licence Agreement`
- "Create a share purchase agreement" → `document_family = Share Purchase Agreement`

**Ask the MINIMUM necessary questions.** Use existing matter context before asking. Distinguish KNOWN, INFERRED, UNKNOWN. Never silently convert inference into fact.

---

## Integration Points

### Existing SallyIP Systems

| System | Integration Method |
|--------|-------------------|
| Artifacts System | Extend with document_type taxonomy metadata |
| Matter Context | Pre-fill from facts/entities/propositions |
| DocPanel | Enhance with outline, clause actions, section tools |
| Contract Workspace | Replace with taxonomy-driven drafting |
| Export System | Extend with more formats |
| Specialist Router | Replace with canonical taxonomy router |
| Jurisdiction Registry | Extend with filing requirements |
| Verification System | Integrate with drafting verification |
| Workflow Orchestrator | Integrate with drafting workflows |
| Contract Templates | Migrate to taxonomy clause families |
| Patent Drafting Service | Integrate with patent document types |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-10 | Initial canonical taxonomy; 12 categories, 80 subcategories, ~400 document types |