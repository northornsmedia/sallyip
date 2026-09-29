# UTILITY PATENT APPLICATION SPECIFICATION — REVISED DRAFT

**Application Serial No.:** USPTO Utility Patent Application  
**Filing Type:** Nonprovisional Application under 35 U.S.C. § 111(a)  
**Title:** System and Method for Verified AI-Assisted Intellectual Property Research and Patent Drafting  
**Inventors:** Aman et al. / SallyIP Engineering Team  
**Reviewer Identity:** Sally (AI IP co-pilot), not a registered attorney  
**Review Standards:** 35 U.S.C. §§ 101, 102, 103, 112 [S2, S3, S5, S6]  
**Answer Mode:** QUALIFIED — Supported by retrieved evidence with limitations noted. Verify material propositions before reliance.  

---

## ATTORNEY REVIEW SUMMARY

### Weaknesses Identified in v1:
- **§ 101:** Claims 1/11 risk being directed to abstract AI management without inventive concept integration under *Alice* Step 2B.
- **§ 112:** "Generative AI engine," "output controller," "authoritative databases," and "rule-based checking" are functional / vague; Claim 6 uses incorrect term "definite authorship" (should be definiteness under § 112(b) or removed).
- **§ 102/103:** Broad generic language ("AI engine + database") is close to existing AI+search tools; novelty must anchor on the independent verification layer operating outside the generative model with automatic gate control before presentation.
- **Claim 11 (medium):** Bare and risks reading on generic computer implementations.

### Corrections Applied in Revised Draft:
1. Replaced "definite authorship" with proper § 112(b) claim definiteness terminology.
2. Added structural specifics to claims:
   - Extraction of citation strings, patent numbers, legal authority references, verbatim quotations, and technical assertions.
   - Assignment of verification statuses (VERIFIED, PARTIALLY_VERIFIED, CONFLICTING, FAILED).
   - Pre-presentation output gating (approve, correct, flag, suppress).
3. Tied § 101 eligibility directly to the specific technical improvement in verifiable patent-drafting reliability.
4. Numbered claims continuously; added dependent claims targeting the verification method and immutable audit trail.

---

## UTILITY PATENT APPLICATION DRAFT

### Abstract
An AI-assisted intellectual property platform includes a generative neural-network engine configured to produce patent-related content and an independent verification engine operatively coupled to the generative engine. The verification engine extracts citation strings, patent numbers, legal-authority references, quotations, and technical assertions from generated output and validates each against authoritative patent, legal, and scientific databases before the content is presented to a user. An output-gating mechanism approves, corrects, flags, or suppresses content based on verification results. Additional modules perform prior-art and novelty searches, claim drafting with dependency, antecedent-basis, and terminology-consistency checking, office-action analysis, and document export, with an audit trail recording sources and verification outcomes.

### Background of the Invention
Generative AI models are increasingly used in patent drafting and legal research. However, these models can produce inaccurate patent citations, unsupported legal statements, fabricated references, and inconsistent claim language. Existing systems generally present model output without independent validation, creating reliability risks for patent practitioners and their clients.

### Brief Summary of the Invention
The invention separates content generation from source verification. A user submits an invention disclosure, patent question, claim set, or other IP input. A generative neural-network engine produces an initial response or draft. A separate verification engine extracts and validates citations, patent numbers, legal-authority references, quotations, and technical assertions against trusted databases. Verification results determine whether content is approved, corrected, flagged, or withheld before presentation. For drafting, rule-based checks analyze claim dependencies, antecedent basis, terminology consistency, and statutory compliance. An audit trail records sources and verification outcomes.

### Detailed Description of Embodiments

#### 1. System Architecture
A networked platform includes:
1. A user interface for submitting invention disclosures and IP instructions;
2. A generative neural-network language model producing initial responses;
3. An independent verification engine, separate from the generative model, extracting and validating statements;
4. Patent and legal database connectors;
5. A citation and quotation validation module;
6. A prior-art and novelty search module;
7. A patent claim drafting module;
8. A claim consistency and antecedent-basis checker;
9. An office-action analysis module;
10. A document generation and export system; and
11. An audit trail recorder.

#### 2. Verification Process
The verification engine operates outside the generative model. It parses generated output to identify citation strings, patent numbers, legal-authority references, quotations, and technical assertions. Each item is checked against one or more trusted databases and assigned a verification status. The output-gating mechanism automatically corrects identified errors, flags content for user review, or suppresses unverified content before presentation.

#### 3. Drafting Checks
Rule-based analysis examines claim dependencies, antecedent basis, terminology consistency, and statutory compliance including definiteness (§ 112(b)), written description, and enablement (§ 112(a)). Office-action analysis compares prior rejections against current claims and specification.

#### 4. Audit Trail
The system records sources consulted, verification results, corrections made, and user actions, creating a traceable record of the drafting process.

#### 5. Areas Requiring Additional Inventor Input (Technical Interrogation)
- Specific database sources and API architectures
- Exact validation rules and confidence thresholds
- Model architecture and training data
- User interface workflows
- Error-correction algorithms and suppression criteria
- Claim dependency analysis algorithms
- Office-action analysis heuristics

---

## CLAIMS (35 U.S.C. § 112)

**1.** A computer-implemented system for verified AI-assisted intellectual property drafting, comprising:
- a user interface configured to receive IP-related input;
- a generative neural-network language model configured to produce initial patent-related content;
- an independent verification engine, separate from the generative neural-network language model, operatively coupled to receive the initial content and configured to extract, from the initial content, at least one of citation strings, patent numbers, legal-authority references, quotations, and technical assertions, and to validate each extracted item against one or more authoritative databases;
- a verification-results store assigning a verification status to each extracted item; and
- an output-gating mechanism configured to control presentation of the initial content to a user based on the verification statuses, the output-gating mechanism being configured to approve, correct, flag, or suppress at least a portion of the initial content before the content is presented to the user.

**2.** The system of claim 1, wherein the one or more authoritative databases include at least one of a patent database, a legal citation database, and a scientific literature database.

**3.** The system of claim 1, further comprising a prior-art and novelty search module configured to perform patentability analysis using validated references.

**4.** The system of claim 1, wherein the output-gating mechanism is configured to automatically correct identified errors, flag content for user review, or withhold unverified content from the output.

**5.** The system of claim 1, further comprising a claim drafting module configured to generate patent claims with automated checking of claim dependencies, antecedent basis, and terminology consistency.

**6.** The system of claim 5, wherein the claim drafting module enforces statutory requirements including claim definiteness under 35 U.S.C. § 112(b), written description under 35 U.S.C. § 112(a), and enablement under 35 U.S.C. § 112(a).

**7.** The system of claim 1, further comprising an office-action analysis module configured to compare prior office actions against current claims and specification to identify allowable and rejected subject matter.

**8.** The system of claim 1, further comprising an audit trail recorder configured to log sources consulted, verification results, corrections applied, and user decisions.

**9.** The system of claim 1, wherein the IP-related input comprises at least one of invention disclosures, patent questions, claim sets, and prior-art references.

**10.** The system of claim 1, wherein the independent verification engine queries the one or more authoritative databases via API connectors and returns verification results prior to presentation of the initial content.

**11.** A computer-implemented method for verified AI-assisted patent drafting, comprising:
- receiving IP-related input from a user;
- generating initial patent-related content using a generative neural-network language model;
- independently extracting, by a verification engine separate from the generative neural-network language model, citation strings, patent numbers, legal-authority references, quotations, and technical assertions from the initial content;
- validating each extracted item against one or more authoritative databases and assigning verification statuses; and
- controlling output presentation based on the verification statuses, the controlling comprising approving, correcting, flagging, or suppressing at least a portion of the initial content before the content is presented to the user.

**12.** The method of claim 11, further comprising performing a prior-art and novelty search using validated references and presenting patentability analysis to the user.

**13.** The method of claim 11, further comprising generating patent claims with automated checking of claim dependencies, antecedent basis, and terminology consistency.

**14.** The method of claim 11, further comprising analyzing office actions by comparing prior rejections against current claims and specification.

**15.** The method of claim 11, further comprising recording an audit trail of sources, verification results, corrections, and user actions.

**16.** A non-transitory computer-readable medium storing instructions that, when executed by a processor, cause the processor to perform the method of claim 11.

---

## SUGGESTED FIGURES
- **FIG. 1:** System architecture diagram — user input → generative model → independent verification engine → authoritative databases → output gate → user interface / document generator.
- **FIG. 2:** Data-flow diagram — invention disclosure through generation, extraction, validation, and export.
- **FIG. 3:** Workflow diagram — verification decision tree (approve / correct / flag / suppress).
- **FIG. 4:** Claim consistency checker — antecedent basis, dependency analysis, and statutory mapping flow.
- **FIG. 5:** Audit trail schema — data structure recording sources, results, proof hashes, and user actions.

---

### Disclaimer
This draft is prepared by Sally, an AI IP co-pilot, and does not constitute legal advice. A registered patent attorney should review claims, specification support, and patentability before filing. Areas flagged above require inventor confirmation.
