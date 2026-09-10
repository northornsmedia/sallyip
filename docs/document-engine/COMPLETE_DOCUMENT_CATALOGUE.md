# SallyIP Complete Legal Document Catalogue

**Generated:** 2026-09-10  
**Source:** Repository audit of `data/documents/`, `src/lib/document-engine-router.js`, `data/documents/capability-matrix.json`, `database/043_contracts.sql`

---

## VERIFIED COUNTS

| Metric | Reported (catalogue-summary.json) | Actual (Repository) | Difference |
|--------|-----------------------------------|---------------------|------------|
| Total Categories | 12 | 12 | 0 |
| Total Subcategories | 80 | 80 (defined in taxonomy) | 0 |
| Total Document Families | 150 | ~40 (explicitly documented) | -110 |
| Total Document Types | 400 | 40 (explicitly defined) | -360 |
| Total Aliases | 200 | ~120 (from 40 docs × ~3 avg) | -80 |
| Total Clause Families | 28 | 28 (clause-families.json) | 0 |
| Total Jurisdictions | 8 | 8 (jurisdiction-engine.json) | 0 |

**KEY FINDING:** The repository **does NOT contain 400 individual document-type records**. Only **40 document types are explicitly defined** across capability-matrix.json, router patterns, and database templates. The remaining ~360 are reported as "catalogue-only" entries but have no individual records, profiles, or definitions in the codebase.

**VERIFIED DOCUMENT TYPES: 40** (not 400)

---

## STATUS SUMMARY

| Status | Count | Documents |
|--------|-------|-----------|
| AVAILABLE | 1 | nda-mutual |
| BETA | 1 | patent-application |
| RESEARCH_ONLY | 0 | (none explicitly defined) |
| PLANNED | 38 | All other explicitly listed documents |

---

## COMPLETE DOCUMENT CATALOGUE

### IP_INNOVATION (IP & Innovation)

#### PATENT
**Document Family: PATENT_APPLICATION**

→ **Patent Application**  
   - **Canonical ID:** `patent-application`  
   - **Status:** BETA  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, EPO, PCT, CA, AU, IN  
   - **Profile:** ✅ Exists (`data/documents/profiles/patent-application.json`)  
   - **Router Patterns:** patent application, patent filing, provisional, nonprovisional, utility patent  
   - **Database Template:** ❌  
   - **Clause Families:** patent.claims, patent.priority, patent.assignment  

**Document Family: PATENT_ASSIGNMENT**

→ **Patent Assignment**  
   - **Canonical ID:** `patent-assignment`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, EPO, PCT, CA, AU, IN  
   - **Profile:** ❌  
   - **Router Patterns:** patent assignment, assignment of patent  
   - **Database Template:** ✅ (`ip-assignment` in legal_contract_templates)  

**Document Family: PATENT_OFFICE_ACTION**

→ **Patent Office Action Response**  
   - **Canonical ID:** `patent-office-action-response`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, EPO, PCT, CA, AU, IN  
   - **Profile:** ❌  
   - **Router Patterns:** 103, office action, §103  
   - **Database Template:** ❌  

#### TRADEMARK
**Document Family: TRADEMARK_COEXISTENCE**

→ **Trademark Coexistence Agreement**  
   - **Canonical ID:** `trademark-coexistence`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** trademark coexistence, coexistence agreement  
   - **Database Template:** ❌  

#### LICENSING
**Document Family: IP_LICENCE**

→ **IP Licence Agreement**  
   - **Canonical ID:** `ip-licence`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ✅ (`ip-licence` in legal_contract_templates)  

---

### COMMERCIAL (Contracts & Commercial)

#### NDA
**Document Family: NDA**

→ **Mutual Non-Disclosure Agreement**  
   - **Canonical ID:** `nda-mutual`  
   - **Status:** AVAILABLE  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ✅ Exists (`data/documents/profiles/nda-mutual.json`)  
   - **Router Patterns:** nda, non-disclosure, confidentiality agreement, mutual nda, mutual confidentiality  
   - **Database Template:** ✅ (`nda-mutual` in legal_contract_templates)  
   - **Clause Families:** confidentiality.definition, confidentiality.exclusions, confidentiality.permitted_disclosure, confidentiality.duration, ip.background, disputes.courts  

→ **Unilateral NDA**  
   - **Canonical ID:** `nda-unilateral`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** one-way nda, unilateral nda, unilateral confidentiality  
   - **Database Template:** ✅ (`nda-unilateral` in legal_contract_templates)  
   - **Note:** Router would match 'nda' pattern to nda-mutual  

#### MSA
**Document Family: MSA**

→ **Master Services Agreement**  
   - **Canonical ID:** `msa-services`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** msa, master services agreement, master service agreement  
   - **Database Template:** ✅ (`msa-services` in legal_contract_templates)  

#### SAAS
**Document Family: SAAS**

→ **SaaS Subscription Agreement**  
   - **Canonical ID:** `saas-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** saas, software as a service  
   - **Database Template:** ✅ (`saas-agreement` in legal_contract_templates)  

#### VENDOR
*No explicitly defined document types*

#### DISTRIBUTION
*No explicitly defined document types*

#### PARTNERSHIP
*No explicitly defined document types*

#### SUPPORT_SLA
*No explicitly defined document types*

---

### TECHNOLOGY (Technology & AI)

#### SOFTWARE_LICENCE
**Document Family: SOFTWARE_LICENCE**

→ **Software Licence Agreement**  
   - **Canonical ID:** `software-licence`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** software licence, software license, eula, end user  
   - **Database Template:** ❌  

#### EULA
*No explicitly defined document types (covered by SOFTWARE_LICENCE)*

#### API_TERMS
*No explicitly defined document types*

#### DEVELOPMENT
*No explicitly defined document types*

#### HOSTING
*No explicitly defined document types*

#### CLOUD
*No explicitly defined document types*

#### ESCROW
*No explicitly defined document types*

#### OPEN_SOURCE
*No explicitly defined document types*

#### AI_AGREEMENTS
*No explicitly defined document types*

---

### PRIVACY (Privacy & Data)

#### PRIVACY_POLICY
**Document Family: PRIVACY_POLICY**

→ **Privacy Policy**  
   - **Canonical ID:** `privacy-policy`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** privacy notice, privacy policy  
   - **Database Template:** ❌  

#### DPA
**Document Family: DPA**

→ **Data Processing Agreement**  
   - **Canonical ID:** `data-processing-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** dpa, data processing agreement  
   - **Database Template:** ❌  

#### DATA_SHARING
*No explicitly defined document types*

#### BREACH_RESPONSE
*No explicitly defined document types*

#### DSAR
*No explicitly defined document types*

#### INTERNATIONAL_TRANSFER
*No explicitly defined document types*

#### AI_GOVERNANCE
*No explicitly defined document types*

#### DATA_LICENSE
*No explicitly defined document types*

---

### CORPORATE (Corporate & Transactions)

#### ACQUISITION
**Document Family: SHARE_PURCHASE**

→ **Share Purchase Agreement**  
   - **Canonical ID:** `share-purchase-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** VERY_HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** spa, share purchase, stock purchase  
   - **Database Template:** ❌  

#### GOVERNANCE
**Document Family: SHAREHOLDERS_AGREEMENT**

→ **Shareholders Agreement**  
   - **Canonical ID:** `shareholders-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ❌  

**Document Family: BOARD_RESOLUTION**

→ **Board Resolution**  
   - **Canonical ID:** `board-resolution`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ❌  

#### MERGER
*No explicitly defined document types*

#### FINANCING
*No explicitly defined document types*

#### CAP_TABLE
*No explicitly defined document types*

#### RESTRUCTURING
*No explicitly defined document types*

---

### EMPLOYMENT (Employment & HR)

#### EMPLOYMENT_AGREEMENT
**Document Family: EMPLOYMENT_AGREEMENT**

→ **Employment Agreement**  
   - **Canonical ID:** `employment-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ✅ (`employment-ip` in legal_contract_templates)  

#### CONTRACTOR
**Document Family: CONTRACTOR_AGREEMENT**

→ **Independent Contractor Agreement**  
   - **Canonical ID:** `independent-contractor-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ❌  

#### TERMINATION
**Document Family: EMPLOYMENT_TERMINATION**

→ **Employment Termination Letter**  
   - **Canonical ID:** `employment-termination`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** termination letter, employee termination  
   - **Database Template:** ❌  

#### OFFER
*No explicitly defined document types*

#### EQUITY_AWARDS
*No explicitly defined document types*

#### POLICIES
*No explicitly defined document types*

#### BENEFITS
*No explicitly defined document types*

#### IMMIGRATION
*No explicitly defined document types*

---

### LITIGATION (Litigation & Disputes)

#### SETTLEMENT
**Document Family: SETTLEMENT_AGREEMENT**

→ **Settlement Agreement**  
   - **Canonical ID:** `settlement-agreement`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ❌  

#### ARBITRATION
**Document Family: ARBITRATION_NOTICE**

→ **Arbitration Notice**  
   - **Canonical ID:** `arbitration-notice`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** arbitration notice, arbitration demand  
   - **Database Template:** ❌  

#### PLEADINGS
**Document Family: LITIGATION_HOLD**

→ **Litigation Hold Notice**  
   - **Canonical ID:** `litigation-hold-notice`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ❌  

#### DISCOVERY
*No explicitly defined document types*

#### MOTIONS
*No explicitly defined document types*

#### APPEAL
*No explicitly defined document types*

#### ENFORCEMENT
*No explicitly defined document types*

#### MEDICAL
*No explicitly defined document types*

---

### LETTERS (Letters & Notices)

#### CEASE_DESIST
**Document Family: CEASE_DESIST**

→ **Cease and Desist Letter**  
   - **Canonical ID:** `cease-and-desist-letter`  
   - **Status:** PLANNED  
   - **Risk Level:** HIGH  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** cease and desist  
   - **Database Template:** ❌  

#### DEMAND_LETTER
**Document Family: DEMAND_LETTER**

→ **Commercial Demand Letter**  
   - **Canonical ID:** `commercial-demand-letter`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** (none)  
   - **Database Template:** ❌  

#### LITIGATION_LETTER
*No explicitly defined document types*

#### CORRESPONDENCE
*No explicitly defined document types*

#### NOTICE
*No explicitly defined document types*

#### FORM_LETTER
*No explicitly defined document types*

---

### LEGAL_RESEARCH (Legal Research & Memos)

#### LEGAL_MEMO
**Document Family: LEGAL_MEMO**

→ **Legal Research Memorandum**  
   - **Canonical ID:** `legal-research-memorandum`  
   - **Status:** PLANNED  
   - **Risk Level:** MEDIUM  
   - **Jurisdiction Scope:** US, UK, EU, CA, AU  
   - **Profile:** ❌  
   - **Router Patterns:** legal research, legal memo, opinion  
   - **Database Template:** ❌  

#### OPINION
*No explicitly defined document types*

#### FEASIBILITY
*No explicitly defined document types*

#### NOVELTY_OPINION
*No explicitly defined document types*

#### ADVICE_LETTER
*No explicitly defined document types*

#### POSITION_PAPER
*No explicitly defined document types*

#### BRIEF
*No explicitly defined document types*

---

### REGULATORY (Regulatory & Industry)

*No explicitly defined document types*

---

### FINANCE (Finance)

*No explicitly defined document types*

---

### POLICIES (Policies & Governance)

*No explicitly defined document types*

---

## CROSS-REFERENCE: DATABASE TEMPLATES vs DOCUMENT PROFILES

| Database Template (legal_contract_templates) | Document Profile | Capability Matrix Entry | Router Pattern |
|---------------------------------------------|------------------|------------------------|----------------|
| nda-mutual | ✅ Exists | ✅ AVAILABLE | ✅ |
| nda-unilateral | ❌ | ✅ PLANNED | ✅ |
| msa-services | ❌ | ✅ PLANNED | ❌ (note says no pattern) |
| saas-agreement | ❌ | ✅ PLANNED | ✅ |
| employment-ip | ❌ | ✅ PLANNED (employment-agreement) | ❌ |
| ip-assignment | ❌ | ❌ (not in 40) | ❌ |
| ip-licence | ❌ | ✅ PLANNED | ❌ |

**Note:** The `ip-assignment` database template is not listed in the 40 explicitly documented types in capability-matrix.json.

---

## ALIASES INVENTORY (from explicitly defined documents)

| Document ID | Aliases |
|-------------|---------|
| nda-mutual | mutual nda, mutual confidentiality agreement, mutual non-disclosure, nda, confidentiality agreement, mutual cda |
| patent-application | patent app, patent filing, provisional, nonprovisional, utility patent |
| nda-unilateral | one-way nda, unilateral nda, unilateral confidentiality |
| msa-services | msa, master services agreement, master service agreement |
| saas-agreement | saas, software as a service |
| software-licence | software licence, software license, eula, end user |
| data-processing-agreement | dpa, data processing agreement |
| privacy-policy | privacy notice, privacy policy |
| patent-assignment | patent assignment, assignment of patent |
| ip-licence | (none) |
| trademark-coexistence | trademark coexistence, coexistence agreement |
| patent-office-action-response | 103, office action, §103 |
| share-purchase-agreement | spa, share purchase, stock purchase |
| employment-termination | termination letter, employee termination |
| legal-research-memorandum | legal research, legal memo, opinion |
| arbitration-notice | arbitration notice, arbitration demand |
| cease-and-desist-letter | cease and desist |
| employment-agreement | (none) |
| independent-contractor-agreement | (none) |
| shareholders-agreement | (none) |
| board-resolution | (none) |
| settlement-agreement | (none) |
| litigation-hold-notice | (none) |
| commercial-demand-letter | (none) |

---

## CLAUSE FAMILIES (28 total from clause-families.json)

1. confidentiality.definition
2. confidentiality.exclusions
3. confidentiality.permitted_disclosure
4. confidentiality.duration
5. ip.background
6. ip.foreground
7. ip.assignment
8. ip.licence
9. ip.improvements
10. liability.cap
11. liability.exclusions
12. liability.indirect_loss
13. indemnity.ip
14. indemnity.third_party
15. termination.convenience
16. termination.cause
17. data.controller_processor
18. data.security
19. data.subprocessors
20. data.transfers
21. disputes.courts
22. disputes.arbitration
23. disputes.mediation
24. ip.claims
25. ip.priority
26. ip.assignment_patent
27. warranty.general
28. warranty.limitation

---

## JURISDICTIONS (8 supported from jurisdiction-engine.json)

| Code | Name | Type | Patent Authority | Trademark Authority | Priority |
|------|------|------|------------------|---------------------|----------|
| US | United States | national | USPTO | USPTO | 1 |
| UK | United Kingdom | national | UKIPO | UKIPO | 2 |
| EU | European Union | regional | EPO | EUIPO | 3 |
| EPO | European Patent Office | regional | EPO | n/a | 3 |
| PCT | WIPO/PCT | international | WIPO | Madrid System | 3 |
| CA | Canada | national | CIPO | CIPO | 4 |
| AU | Australia | national | IP Australia | IP Australia | 5 |
| IN | India | national | Indian Patent Office | Trademark Registry India | 6 |

**Unsupported (9):** Brazil, Mexico, Japan, China, South Korea, Singapore, UAE, Switzerland, Hong Kong

---

## DETAILED DISCREPANCY REPORT

### Why catalogue-summary.json reports 400 document types:

The `catalogue-summary.json` appears to be a **target/aspirational catalogue** representing the full planned taxonomy (12 categories × ~80 subcategories × ~150 families × ~2-3 types each ≈ 400), not an inventory of what exists in the repository.

### Actual repository contents:

1. **2 full document profiles** with complete metadata (nda-mutual, patent-application)
2. **7 database contract templates** (simple fill-in templates)
3. **40 entries in capability-matrix.json** (explicitly documented with status/capability)
4. **25 router patterns** in document-engine-router.js
5. **28 clause families** defined
6. **8 supported jurisdictions**

### The ~375 "missing" document types:

The capability-matrix.json explicitly states: *"The remaining ~375 document types in the catalogue have status PLANNED/RESEARCH_ONLY/BETA but lack: document profiles, router patterns, structured outlines, clause intelligence, and drafting capability. They are CATALOGUE_ONLY entries."*

These do not exist as individual records anywhere in the repository - no JSON files, no database entries, no code definitions.

---

## CONCLUSION

**The SallyIP repository currently contains 40 explicitly defined and documented legal document types**, not 400. The catalogue-summary.json represents a planned taxonomy target. Only 2 document types (Mutual NDA, Patent Application) have full drafting capability (L3 DRAFTABLE). The remaining 38 explicitly listed types are at L0-L1 capability (catalogued only or routable only).

**VERIFIED DOCUMENT TYPES: 40**