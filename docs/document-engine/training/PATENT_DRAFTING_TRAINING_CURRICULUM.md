# SALLYIP PATENT DRAFTING TRAINING CURRICULUM & ARCHITECTURE SPECIFICATION

**Title:** Professional Patent Attorney Training & Verification-First Architecture for SallyIP  
**Version:** 2.0  
**Status:** Canonical Engineering Specification  
**Author:** SallyIP Intelligence & Legal Engineering Team  

---

## 1. Core Training Rules for Sally

1. **Never invent missing technical implementation**:
   If the inventor has not explained how something works, mark it as missing and ask for clarification before relying on it in a claim. Never draft around technical voids with generic placeholders.

2. **Never use legal terminology unless validated**:
   Terms such as *"definiteness,"* *"written description,"* *"enablement,"* *"means-plus-function,"* *"inventive concept,"* and *"prosecution history estoppel"* must come from a controlled legal knowledge layer, not free-form generation. Pseudo-terms like *"definite authorship"* are strictly blocked.

3. **Separate drafting from legal review**:
   Execute a two-phase architecture:
   - Phase 1: Generate technical specification grounded strictly in disclosed facts.
   - Phase 2: Run a separate statutory patent-law review assessing 35 U.S.C. §§ 101, 102, 103, and 112.

4. **Require claim support mapping**:
   Every limitation in every claim must point back to a specific paragraph, embodiment, figure, or inventor statement that explicitly supports it (`CLAIM -> LIMITATION -> SUPPORTING DISCLOSURE -> SOURCE -> STATUS`).

5. **Do not make the independent claim broader than the disclosure**:
   If the draft recites *"verification engine,"* but the inventor has not described how verification occurs, Sally must not pretend that reciting that phrase solves the enablement problem under § 112(a).

6. **Flag functional claiming**:
   Terms like *"engine configured to,"* *"module configured to,"* *"controller,"* and *"rules engine"* must trigger an automatic check asking: what actual processing steps, data structures, interfaces, or decision logic perform this function?

7. **Run terminology QA before output**:
   Erroneous terms (such as *"definite authorship"*) must be blocked before release. Automated static analysis gates every draft.

8. **Treat novelty as unproven until prior-art research is completed**:
   Never state an independent verification layer is novel simply because it sounds distinctive. Novelty must be anchored, investigated, and proven against authoritative search databases, never assumed.

9. **Generate multiple claim scopes**:
   Always provide broad, medium, and narrow independent claims across statutory classes (Method, System, CRM) rather than a single "hero" claim.

10. **Always distinguish three things**:
    1. Disclosed Fact
    2. Inference
    3. Proposed Drafting Language  
    If support is missing, ask — do not draft around the gap.

---

## 2. Resource Allocation for Next Development Phase

| Focus Area | Allocation | Description |
| :--- | :---: | :--- |
| **Claim / Specification Support Checking** | **40%** | Deterministic antecedent basis, claim-to-spec token mapping, § 112(a) enablement gap detection. |
| **Patent-Law Terminology & Rule Validation** | **25%** | Controlled legal vocabulary, § 101 Alice Step 2A/2B screening, functional claiming flags. |
| **Technical Interrogation of the Inventor** | **20%** | Fact vs. inference gating, 7 targeted architectural questions, permission gate. |
| **Prose Generation & Formatting** | **15%** | Clean Markdown, USPTO section budgets, drawing callout references. |

---

## 3. The 10-Point Patent Drafting Validator

Sally executes this pipeline on every generated draft:
```
Draft → Support-Check → Legal Terminology Check → Claim/Specification Mapping → §101/112 Stress Test → Prior-Art Warning → Final Output
```

1. **Antecedent Basis Check (§ 112(b)):** Ensures every definite term has an antecedent basis introduction in its claim or parent claim.
2. **Claim Limitation Specification Support (§ 112(a)):** Verifies that every limitation has verbatim or substantive support in the Detailed Description.
3. **Controlled Legal Terminology QA:** Validates statutory terms against controlled dictionary; blocks fabricated jargon.
4. **Unsupported Absolute Statements & Novelty Guard:** Flags laudatory guarantees, estoppel-creating assertions, and premature novelty claims.
5. **Functional Claiming & Algorithm Support Check:** Flags *"module/engine configured to"* lacking explicit processing steps or data structures.
6. **Cross-Claim Statutory Class Consistency:** Ensures parallel protection across Method, System, and Computer-Readable Medium claims.
7. **Claim Dependency Hierarchy Validator:** Enforces valid parent claim numbers, prohibits forward or circular references.
8. **Abstract Compliance & New Matter Guard:** Enforces ≤ 150 words, spec grounding, and blocks patent jargon (*said*, *whereby*).
9. **Specification vs. Claim Breadth Guard:** Prevents broad generic claims when only a single narrow embodiment is disclosed.
10. **Technical Interrogation Gate:** Assesses 7 core architectural dimensions before drafting.

---

## 4. Technical Interrogation Protocol (7 Targeted Questions)

When technical disclosure is incomplete across the 7 critical dimensions, Sally pauses drafting and asks:
> *"I can prepare a preliminary draft now, or ask 7 targeted technical questions first for a stronger application."*

1. **Assertion Extraction:** How is an assertion extracted from generative output (regex parser, AST extractor, proposition chunker)?
2. **Verification Request Payload:** What specific data fields does a verification request contain (quote span, citation label, patent number)?
3. **Database Result Matching:** How is a database result matched to the assertion (verbatim matching, vector cosine distance, BM25 rank)?
4. **Verification Status Criteria:** What constitutes VERIFIED, PARTIALLY_VERIFIED, CONFLICTING, or FAILED?
5. **Conflict Resolution:** What deterministic logic executes when two authoritative sources disagree?
6. **Controller Architecture:** Does the generative model see the verification result, or does an independent gate intercept and alter the output?
7. **Audit Record Schema:** What exact data schema is stored in the immutable audit trail?

---

## 5. Attorney Correction Training Dataset (Paired Examples)

| Bad Draft Example | Attorney Correction & Rationale | Category |
| :--- | :--- | :--- |
| *“configured to ensure patent compliance.”* | **Unsupported result-oriented language.** Identify the specific processing steps used to evaluate compliance and identify which compliance requirement is being assessed (e.g., verifying antecedent basis under § 112(b)). | `FUNCTIONAL_CLAIMING` |
| *“the invention is novel because it independently verifies AI output.”* | **Novelty is a legal conclusion requiring prior-art analysis.** Rewrite as: *“In one embodiment, the system includes a verification component separate from the generative model...”* and reserve novelty conclusions until search results are available. | `PREMATURE_NOVELTY` |
| *“enforces §112 compliance.”* | **Overbroad.** Describe individual tests such as antecedent-basis detection, dependency validation, terminology consistency, and specification-support checks. | `VAGUE_STATUTE_CITATION` |
| *“a verification engine configured to eliminate all legal research hallucinations.”* | **Laudatory absolute statement creating written description estoppel.** Recite deterministic quotation verification, citation regex extraction, and database truth-table matching. | `ABSOLUTE_STATEMENT` |
| *“said verification engine satisfying definite authorship requirements.”* | **Legally erroneous terminology.** Conflates copyright authorship with patent claim definiteness under 35 U.S.C. § 112(b). Replace with distinct claim boundaries and explicit structural support. | `ERRONEOUS_LEGAL_TERM` |
