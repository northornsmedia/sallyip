# SallyIP Existing Architecture Audit

## Overview
SallyIP is a comprehensive legal technology platform focused on intellectual property (patents, trademarks) with expanding capabilities for commercial contracts, litigation, and regulatory work. The system uses a React frontend with a Neon PostgreSQL backend, deployed on Vercel.

---

## 1. Document Generation System

### Artifacts System (`artifacts.js`, `artifact_versions` table)
- **Purpose**: Persist versioned legal documents with metadata
- **Tables**: `artifacts`, `artifact_versions`
- **Features**:
  - Version control with `active_version` pointer
  - Metadata JSONB (jurisdiction, practice_area, sources)
  - Source tracking via `source_passages` and `legal_sources`
  - Conversation linking via `last_active_artifact_id`
  - Content formats: markdown (default), supports export to DOCX, PDF, MD

### Contract System (`contract-service.js`, `legal_contracts` tables)
- **Purpose**: Template-based contract drafting with clause-level risk review
- **Tables**: `legal_contract_templates`, `legal_contracts`, `legal_contract_versions`, `legal_contract_clauses`
- **Templates**: 8 built-in templates (NDA mutual/unilateral, MSA, SaaS, Employment IP, IP Assignment, IP Licence)
- **Variables**: Mustache-style `{{variable}}` substitution
- **Risk Review**: Keyword-based flagging (RED/AMBER/GREEN) for liability, indemnity, non-compete, auto-renewal
- **Export**: Via `/api/generate-file` to DOCX, PDF, MD

### Patent Drafting Workspace (`patent-drafting-workspace.jsx`, `patent-drafting-service.js`)
- **Purpose**: Section-by-section USPTO patent application drafting
- **Sections**: 7 USPTO sections (Title/Field, Background, Summary, Drawings, Claims, Detailed Description, Abstract)
- **Features**:
  - 35 USC §101 Alice/Mayo screening
  - 35 USC §112 antecedent basis verification
  - Claim parsing and claim tree building
  - Live streaming draft with cursor
  - Section regeneration

### Document Export (`doc-export.js`, `generated-files.js`)
- **Formats**: DOCX, PDF, Markdown
- **Storage**: `generated_files` table with binary content
- **API**: `/api/generate-file` endpoint

---

## 2. Right-Pane Editor / Document Workspace

### DocPanel Component (`doc-panel.jsx`)
- **Purpose**: Right-pane document viewer with live streaming
- **Features**:
  - Markdown rendering with ReactMarkdown
  - Live writing indicator with streaming cursor
  - Export buttons for DOCX/PDF/MD
  - File download history
  - Auto-scroll during live generation

### ContractWorkspace Component (`contract-workspace.jsx`)
- **Purpose**: Modal-based contract drafting UI
- **Flow**: Template selection → Variable input → Draft → Review → Edit → Export
- **Clause View**: Risk-colored clause list (red/amber/green)
- **Edit Mode**: Full markdown editor with version saving

---

## 3. Template System

### Legal Contract Templates (`legal_contract_templates` table)
- **Schema**: slug, title, contract_type, jurisdiction, body_template, variables[]
- **Current Templates** (8):
  1. `nda-mutual` - Mutual NDA (General jurisdiction)
  2. `nda-unilateral` - Unilateral NDA (General)
  3. `msa-services` - Master Services Agreement (General)
  4. `saas-agreement` - SaaS Subscription Agreement (General)
  5. `employment-ip` - Employment Agreement with IP clause (General)
  6. `ip-assignment` - IP Assignment Agreement (General)
  7. `ip-licence` - IP Licence Agreement (General)
- **Limitation**: All marked "General" jurisdiction, minimal clause variants

### Patent Drafting Templates
- **Structure**: `USPTO_SECTIONS` array with 7 sections, token budgets
- **No persistent template storage** - hardcoded in service

---

## 4. Clause System

### Contract Clause Review (`contract-service.js`)
- **Risk Patterns**:
  - RED: unlimited liability, unlimited indemnity, perpetual irrevocable, moral rights waiver, sole discretion
  - AMBER: indemnif, liquidated damages, non-compete, exclusiv, auto-renew, without notice, penal, unilateral, termination for convenience
- **Splitting**: Splits on `## ` markdown headings
- **Output**: Clause array with ordinal, heading, body, risk_level, note

### No Clause Library
- No reusable clause families
- No clause variants by party favorability
- No clause metadata (tags, dependencies, incompatibilities)

---

## 5. Matter Context System

### Matters (`matters` table, `matter-service.js`)
- **Fields**: name, client_name, matter_type, jurisdictions[], description, status
- **Fact Storage**: `matter_facts` (fact_type, label, value, confidence, status)
- **Entities**: `ip_entities` (patent, trademark, party, person, product, argument, evidence, etc.)
- **Relationships**: `ip_relationships` between entities
- **Propositions**: `legal_propositions` with verification status
- **Sources**: `legal_sources` with authority tiers, `source_passages` with locators

### Matter Context Injection (`matter-service.js`)
- `matterContextPrompt()` builds comprehensive context string for LLM
- Includes: facts, entities, relationships, propositions, chronology, evidence matrix, inventive step analyses, FTO projects, trademark intelligence, novelty analyses

---

## 6. Chat Intent Routing

### Specialist Router (`specialist-router.js`)
- **Rules**: 6 regex-based rules for IP tasks:
  - PATENT_FTO, PATENT_INVENTIVE_STEP, PATENT_NOVELTY, PATENT_RESEARCH
  - TRADEMARK_INTELLIGENCE, TRADEMARK_CLEARANCE
  - COPYRIGHT_ANALYSIS, IP_TRANSACTION, IP_LITIGATION
- **Jurisdiction Detection**: 10 jurisdictions via regex
- **Output**: task_class, specialists[], jurisdictions[], research_mode, requires_primary_sources, requires_contrary_authority

### Chat Page Intent Detection (`chat-page.jsx`)
- **Patterns**:
  - `detectDocumentRequest()` - draft/write/prepare + agreement/contract/NDA/patent/etc.
  - `detectRevisionRequest()` - revise/change/replace/amend/edit
  - `detectFileRequest()` - pdf/docx/pptx/xlsx/csv/markdown
  - `isBareFileRequest()` - short format-only requests
  - `referencesPreviousArtifact()` - this/that/previous/above
- **NDA Special Case**: Hardcoded mutual NDA generation in fallback response

### Sally Orchestrator (`sally-orchestrator.js`)
- **Engines**: Gemini 3.7 Flash (primary), Nemotron 3 Ultra/3.5 Lightning (fallbacks)
- **Confidentiality Gates**: Provider policy enforcement (fail-closed for confidential)
- **Streaming**: Chunked token streaming with sanitization
- **Memory**: Full conversation history injection

---

## 7. Generation APIs

### Chat API (`chat.js` handler)
- **Flow**: Authenticate → Route specialists → Orchestrate Sally → Persist artifacts → Return response
- **Artifact Creation**: Auto-creates artifacts from structured responses
- **Matter Integration**: Passes matter_id for context

### Contract API (`contracts.js` handler)
- **Actions**: create, review, update, templates, get
- **Auth**: Requires editor role for write operations

### Artifacts API (`artifacts.js` handler)
- **Actions**: create, restore (version), update
- **Validation**: `validateArtifactContent()` blocks conversational phrases

### Generate File API (`generated-files.js` handler)
- **Download**: Binary file serving with Content-Disposition
- **List**: Paginated file history

---

## 8. Database Models

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Authentication, roles |
| `conversations` | Chat sessions |
| `messages` | Chat messages with provenance JSONB |
| `artifacts` | Document metadata |
| `artifact_versions` | Document content versions |
| `generated_files` | Exported binary files |
| `matters` | Legal matters |
| `matter_facts` | Structured matter facts |
| `ip_entities` | IP entities (patents, TMs, parties, etc.) |
| `ip_relationships` | Entity relationships |
| `legal_sources` | Authority sources |
| `source_passages` | Source excerpts with locators |
| `legal_propositions` | Verified legal propositions |
| `legal_contract_templates` | Contract templates |
| `legal_contracts` | Contract instances |
| `legal_contract_versions` | Contract versions |
| `legal_contract_clauses` | Clause-level risk flags |

### Workflow Tables
- `legal_workflow_runs`, `legal_workflow_steps` - Automation runs
- Patent-specific: `patent_claims`, `patent_claim_elements`, `prior_art_*`, `fto_*`, `inventive_step_*`
- Trademark: `trademark_*`, `trademark_similarity_analyses`
- Litigation: `litigation_issues`, `chronology_events`, `evidence_matrix_items`

---

## 9. Document Persistence

### Artifacts
- Persistent versioned storage
- Linked to conversations and matters
- Metadata: jurisdiction, practice_area, sources[]
- Status: draft, review, approved, final, superseded

### Contracts
- Separate table hierarchy from artifacts
- Template-linked with version history
- Clause-level risk storage

### Generated Files
- Binary storage in database
- Linked to artifacts/versions/conversations
- Direct download via `/api/generated-files?id=`

---

## 10. Export Capabilities

### Formats Supported
- **DOCX**: Primary legal document format
- **PDF**: Final delivery format
- **Markdown**: Source format, version control friendly
- **HTML**: Via markdown rendering
- **Others**: PPTX, XLSX, CSV, JSON, TXT (advertised but limited implementation)

### Export Flow
1. `doc-panel.jsx` or `contract-workspace.jsx` calls `/api/generate-file`
2. `buildExportPayload()` packages doc + format + metadata
3. Server generates file, stores in `generated_files`
4. Returns download URL
5. Client triggers browser download

---

## 11. Jurisdiction Handling

### Jurisdiction Registry (`jurisdiction-registry.js`)
- **Supported**: 250+ ISO country codes via Intl.DisplayNames
- **Aliases**: USA→US, UK→GB, EU→EU, EPO→EPO, etc.
- **Resolution**: `resolveJurisdiction(text)` with word-boundary matching
- **Patent Authorities**: Map of jurisdiction → official office name

### Current Usage
- Contract templates: mostly "General" jurisdiction
- Patent drafting: USPTO-focused (35 USC references)
- Matter jurisdictions: text[] array on matters table
- Specialist routing: detects jurisdiction from query text

### Gaps
- No jurisdiction-specific template variants
- No jurisdiction-aware clause selection
- No filing requirement knowledge base
- Patent drafting only USPTO (no EPO, UK, PCT, etc.)

---

## 12. Verification Integration

### Proposition Verification (`proposition-verification-service.js`, `verification-desk-workspace.jsx`)
- **Propositions**: Legal statements with confidence (high/moderate/low/insufficient)
- **Verification Status**: pending/supported/qualified/rejected
- **Contrary Authority**: Explicit check flag
- **Sources**: Linked to `source_passages` with support_type (supports/contradicts/distinguishes/background)

### Citation Service (`citation-service.js`)
- Legal citation formatting
- Source verification tracking

### Contract Review
- Keyword-based only (not verification-backed)
- No authority citation for risk flags

---

## 13. Existing Contract Analysis

### Contract Service (`contract-service.js`)
- Template variable filling
- Clause splitting and risk flagging
- Review persistence

### Contract Workspace (`contract-workspace.jsx`)
- Template selection UI
- Variable input forms
- Clause review display
- Edit/save/export

### Limitations
- Only 8 templates
- No clause library
- No negotiation positions
- No jurisdictional variants
- Risk flags are keyword-only

---

## 14. Existing Patent Drafting

### Patent Drafting Service (`patent-drafting-service.js`)
- **USPTO Sections**: 7 sections with token budgets
- **§101 Screening**: Alice/Mayo 2-step analysis
- **§112 Verification**: Antecedent basis + written description
- **Claim Parsing**: `patent-claim-service.js` - parses numbered claims into elements
- **Claim Tree**: Dependency graph building

### Patent Drafting Workspace (`patent-drafting-workspace.jsx`)
- Section-by-section UI
- Live streaming draft
- Regeneration per section
- Export integration

### Patent Workflows (`workflow-orchestrator.js`)
- `automateInventionIntake` - 7-part intake analysis
- `automateClaimChart` - AI claim charting
- `automateFto` - Freedom to operate
- `automatePatentability` - Patentability assessment

---

## 15. Existing Workflows

### Workflow Orchestrator (`workflow-orchestrator.js`)
- **Automation Functions**:
  - `automateInventionIntake` - Document classification + extraction
  - `automateClaimChart` - Independent claim mapping
  - `automateFto` - Product feature → claim mapping
  - `automatePatentability` - Prior art project creation
  - `automateTrademarkClearance` - Mark screening
  - `automateNovelty` - Prior art element mapping
  - `automateInventiveStep` - Problem-solution analysis
  - `automateLitigationChronology` - Event timeline

### Workflow Steps
- Persisted in `legal_workflow_steps`
- Source basis tracking (uploaded_document, matter_sources, none)
- Review status: completed, needs_review, skipped

---

## 16. Key Integration Points for New System

### Reuse Opportunities
1. **Artifacts System** - Core document persistence (extend with document_type taxonomy)
2. **Matter Context** - Rich fact/entity storage for pre-draft questions
3. **DocPanel** - Right-pane editor (enhance with outline, clause actions)
4. **Contract Workspace** - Modal drafting pattern (replace with canonical taxonomy-driven)
5. **Export System** - DOCX/PDF/MD generation (extend with more formats)
5. **Specialist Router** - Intent classification (replace with canonical taxonomy router)
6. **Jurisdiction Registry** - Resolution logic (extend with filing requirements)
7. **Verification System** - Proposition verification (integrate with drafting verification)
8. **Workflow Orchestrator** - Automation patterns (integrate with drafting workflows)

### Gaps to Fill
1. **Canonical Document Taxonomy** - No unified document type system
2. **Clause Intelligence** - No clause library with variants
3. **Jurisdiction Engine** - No jurisdiction-specific templates/requirements
4. **Conversational Routing** - No taxonomy-aware disambiguation
5. **Drafting UX** - Section actions (regenerate, replace clause, alternatives, explain, verify)
6. **Document Profiles** - Structured metadata per document type
7. **Matter-Aware Drafting** - Pre-fill from matter facts/entities
8. **Quality Gates** - AVAILABLE/BETA/RESEARCH_ONLY/PLANNED status system

---

## 17. Security & Compliance

### Provider Policy (`provider-policy.js`)
- **Execution Modes**: STANDARD, CONFIDENTIAL_IP, HIGHLY_CONFIDENTIAL
- **Fail-Closed**: Confidential content blocks unapproved providers
- **Model Registry**: Approved models per mode

### Security Features
- RLS (Row Level Security) via Neon
- Tenant isolation
- Audit logging (`logSecurityEvent`)
- Role-based access (researcher/editor/owner)
- File safety validation

### Confidential Pilot Block
- `CONFIDENTIAL_PILOT_BLOCKED` flag respected
- No changes to provider policy without security gate

---

## 18. Benchmarks (Frozen - DO NOT MODIFY)

### Benchmark Assets
- `benchmarks/v1.0` - Frozen benchmark suite
- `hallucination-100` - Hallucination test set
- `patent_retrieval_v1` - Patent retrieval benchmarks
- `pipeline-owned benchmark assets` - Internal benchmarks

### Test Files (Representative)
- `patent-draft.test.mjs`, `patent-drafting-workspace.test.mjs`
- `contract-service.test.mjs`, `contract-workspace.test.mjs`
- `specialist-router.test.mjs`
- `doc-panel.test.mjs`
- `verification-desk-workspace.test.mjs`

---

## Summary: What Works Well
✅ Artifact versioning and persistence
✅ Matter context with facts/entities/relationships
✅ Right-pane document viewer with live streaming
✅ Export to DOCX/PDF/MD
✅ Patent drafting (USPTO sections, §101/§112 checks)
✅ Contract template system with variable substitution
✅ Clause-level risk flagging (keyword-based)
✅ Specialist routing for IP tasks
✅ Conversation memory and context injection
✅ Security gates and audit logging

## Summary: What Needs Building
❌ Canonical document taxonomy (category→family→type→variant→jurisdiction)
❌ Clause library with variants (NEUTRAL/CUSTOMER_FRIENDLY/SUPPLIER_FRIENDLY/etc.)
❌ Jurisdiction-specific templates and filing requirements
❌ Conversational router using canonical taxonomy
❌ Document profiles with pre-draft questions, section structure, clause families
❌ Drafting UX: regenerate section, insert/replace clause, alternatives, explain, verify
❌ Matter-aware pre-fill (KNOWN/INFERRED/UNKNOWN distinction)
❌ Quality gates (AVAILABLE/BETA/RESEARCH_ONLY/PLANNED)
❌ Comprehensive domain coverage (Agents 2-8 domains)
❌ Adversarial safety tests