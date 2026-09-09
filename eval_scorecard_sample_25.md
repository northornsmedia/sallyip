# SallyIP Practitioner Legal Correctness Scorecard (25-Question Sample)

**Date:** 2026-09-09  
**Evaluated Model:** `gemini-flash-lite-latest`  
**Automated Metrics Summary:**  
- **Zero Dangling Citations:** 100% (95/95)  
- **Authority Recall Rate:** 100% (95/95)  
- **Verbatim Quote Verification:** 72.5% (87/120) exact (22.5% (27/120) unverified)  

---

## Practitioner Grading Instructions

For each question below, evaluate whether the model's answer is **substantively legally accurate** under US patent law.
- **Pass (Correct)**: Correct rule of law, no material misstatements.
- **Partial**: Minor inaccuracy or omissions, but core rule is accurate.
- **Fail (Misleading/False)**: Incorrect legal rule, hallucinated standard, or invalid interpretation.

---

### 1. [s101-01] Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.

**Expected Statutory Authority:** `§ 101`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> "Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]

**Quote Verification:**
- "Whoever invents or discovers any new and useful process, machine, manufacture, or composit..." → **EXACT** (`§ 101`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 2. [s101-05] According to 35 U.S.C. § 101, can a composition of matter be patented? Quote the relevant sentence.

**Expected Statutory Authority:** `§ 101`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Yes, a composition of matter can be patented under 35 U.S.C. § 101 [S1]. 
> The relevant sentence from the source is: 
> "Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]

**Quote Verification:**
- "Whoever invents or discovers any new and useful process, machine, manufacture, or composit..." → **EXACT** (`§ 101`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 3. [s101-10] Quote the full text of 35 U.S.C. § 101 in its entirety with official citation [S1].

**Expected Statutory Authority:** `§ 101`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> "Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title" [S1].

**Quote Verification:**
- "Whoever invents or discovers any new and useful process, machine, manufacture, or composit..." → **EXACT** (`§ 101`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 4. [s102a-01] Under 35 U.S.C. § 102(a)(1), what events prior to the effective filing date establish prior art? Quote and cite.

**Expected Statutory Authority:** `§ 102(a)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Under 35 U.S.C. § 102(a)(1), the events prior to the effective filing date that establish prior art are when "the claimed invention was patented, described in a printed publication, or in public use, on sale, or otherwise available to the public before the effective filing date of the claimed invention" [S1].

**Quote Verification:**
- "the claimed invention was patented, described in a printed publication, or in public use, ..." → **EXACT** (`§ 102(a)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 5. [s102a-05] Under 35 U.S.C. § 102(a)(2), when does another patent or published application become prior art? Quote and cite.

**Expected Statutory Authority:** `§ 102(a)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Under 35 U.S.C. § 102(a)(2), another patent or published application becomes prior art when it is "a patent issued under section 151, or in an application for patent published or deemed published under section 122(b), in which the patent or application names another inventor and was effectively filed before the effective filing date of the claimed invention" [S1].

**Quote Verification:**
- "a patent issued under section 151, or in an application for patent published or deemed pub..." → **EXACT** (`§ 102(a)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 6. [s102a-10] Quote the introductory words of 35 U.S.C. § 102: "A person shall be entitled to a patent unless..."

**Expected Statutory Authority:** `§ 102(a)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the introductory words of 35 U.S.C. § 102 are: 
> "A person shall be entitled to a patent unless—" [S1]

**Quote Verification:**
- "A person shall be entitled to a patent unless—..." → **EXACT** (`§ 102(a)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 7. [s102b-01] Under 35 U.S.C. § 102(b)(1), what disclosures made by an inventor are excluded from prior art? Quote and cite.

**Expected Statutory Authority:** `§ 102(b)(1)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Under 35 U.S.C. § 102(b)(1), disclosures excluded from prior art include a disclosure "made 1 year or less before the effective filing date" if:
> 1. "the disclosure was made by the inventor or joint inventor" [S1].
> 2. "by another who obtained the subject matter directly or indirectly from the inventor" [S1].
> 3. "if the subject matter had already been publicly disclosed by the inventor" [S1].

**Quote Verification:**
- "made 1 year or less before the effective filing date..." → **EXACT** (`§ 102(b)(1)`)
- "the disclosure was made by the inventor or joint inventor..." → **EXACT** (`§ 102(b)(1)`)
- "by another who obtained the subject matter directly or indirectly from the inventor..." → **EXACT** (`§ 102(b)(1)`)
- "if the subject matter had already been publicly disclosed by the inventor..." → **EXACT** (`§ 102(b)(1)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 8. [s102b-05] Explain 35 U.S.C. § 102(b)(1)(B) regarding third-party disclosures after an inventor disclosure. Quote the rule.

**Expected Statutory Authority:** `§ 102(b)(1)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, 35 U.S.C. § 102(b)(1) covers the "inventor grace period" [S1]. The specific provision regarding third-party disclosures after an inventor disclosure states that a disclosure "shall not be prior art under subsection (a)(1) if... the subject matter had already been publicly disclosed by the inventor" [S1]. 
> Specifically, under 35 U.S.C. § 102(b)(1), a disclosure made "1 year or less before the effective filing date shall not be prior art under subsection (a)(1)" if:
> > "the subject matter had already been publicly disclosed by the inventor." [S1]

**Quote Verification:**
- "inventor grace period..." → **EXACT** (`§ 102(b)(1)`)
- "shall not be prior art under subsection (a)(1) if... the subject matter had already been p..." → **MISSING** 
- "1 year or less before the effective filing date shall not be prior art under subsection (a..." → **EXACT** (`§ 102(b)(1)`)
- "the subject matter had already been publicly disclosed by the inventor...." → **EXACT** (`§ 102(b)(1)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 9. [s102b-10] Quote the full exception language of 35 U.S.C. § 102(b)(1)(A) verbatim.

**Expected Statutory Authority:** `§ 102(b)(1)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the exact text of 35 U.S.C. § 102(b)(1)(A) is not present. However, the source for 35 U.S.C. § 102(b)(1) states the following general rule regarding the inventor grace period:
> > "A disclosure made 1 year or less before the effective filing date shall not be prior art under subsection (a)(1) if the disclosure was made by the inventor or joint inventor, or by another who obtained the subject matter directly or indirectly from the inventor, or if the subject matter had already been publicly disclosed by the inventor." [S1]

**Quote Verification:**
- "A disclosure made 1 year or less before the effective filing date shall not be prior art u..." → **EXACT** (`§ 102(b)(1)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 10. [s103-05] Under 35 U.S.C. § 103, does patentability depend on the manner in which the invention was made? Quote and cite.

**Expected Statutory Authority:** `§ 103`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> No, patentability does not depend on the manner in which the invention was made [S1]. The statute states: "Patentability shall not be negated by the manner in which the invention was made" [S1].

**Quote Verification:**
- "Patentability shall not be negated by the manner in which the invention was made..." → **EXACT** (`§ 103`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 11. [s103-10] Summarize 35 U.S.C. § 103 in one sentence and quote its concluding limitation.

**Expected Statutory Authority:** `§ 103`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> A patent for a claimed invention may not be obtained if the differences between the invention and the prior art would have made it obvious to a person having ordinary skill in the art before the effective filing date [S1], and concludes with the limitation that "[p]atentability shall not be negated by the manner in which the invention was made" [S1].

**Quote Verification:**
- "[p]atentability shall not be negated by the manner in which the invention was made..." → **MISSING** 

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 12. [s111-01] Under 35 U.S.C. § 111(a), what are the required components of a patent application? Quote and cite.

**Expected Statutory Authority:** `§ 111(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Under 35 U.S.C. § 111(a), the required components of a nonprovisional application include:
> * A "specification (§ 112)" [S1]
> * A "drawing (§ 113)" [S1]
> * An "oath/declaration (§ 115)" [S1]
> Additionally, "fee and claims may follow within the prescribed period" [S1].

**Quote Verification:**
- "specification (§ 112)..." → **EXACT** (`§ 111(a)-(b)`)
- "oath/declaration (§ 115)..." → **EXACT** (`§ 111(a)-(b)`)
- "fee and claims may follow within the prescribed period..." → **EXACT** (`§ 111(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 13. [s111-05] Quote the abandonment rule for provisional applications in 35 U.S.C. § 111(b)(5).

**Expected Statutory Authority:** `§ 111(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the exact text regarding the abandonment rule for provisional applications is that a provisional application is "abandoned 12 months after filing if not converted" [S1].

**Quote Verification:**
- "abandoned 12 months after filing if not converted..." → **EXACT** (`§ 111(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 14. [s111-10] Quote the 12-month pendency limit of provisional patent applications under 35 U.S.C. § 111(b).

**Expected Statutory Authority:** `§ 111(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the 12-month limit for provisional applications is described as follows:
> "abandoned 12 months after filing if not converted" [S1]

**Quote Verification:**
- "abandoned 12 months after filing if not converted..." → **EXACT** (`§ 111(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 15. [s112a-01] What does 35 U.S.C. § 112(a) require the specification to contain? Quote the written description requirement.

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> According to 35 U.S.C. § 112(a), the specification must contain "a written description of the invention, and of the manner and process of making and using it, in such full, clear, concise, and exact terms as to enable any person skilled in the art to make and use the same" [S1]. 
> The exact quote for the written description requirement is:
> > **"a written description of the invention"** [S1]

**Quote Verification:**
- "a written description of the invention, and of the manner and process of making and using ..." → **EXACT** (`§ 112(a)-(b)`)
- "a written description of the invention..." → **EXACT** (`§ 112(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 16. [s112a-05] Quote the standard in 35 U.S.C. § 112(a) concerning "the manner and process of making and using it".

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the standard in 35 U.S.C. § 112(a) concerning the manner and process of making and using it requires that the specification shall contain a written description "of the manner and process of making and using it, in such full, clear, concise, and exact terms as to enable any person skilled in the art to make and use the same" [S1].

**Quote Verification:**
- "of the manner and process of making and using it, in such full, clear, concise, and exact ..." → **EXACT** (`§ 112(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 17. [s112a-10] Quote 35 U.S.C. § 112(a) in its entirety with statutory citation [S1].

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> "the specification shall contain a written description of the invention, and of the manner and process of making and using it, in such full, clear, concise, and exact terms as to enable any person skilled in the art to make and use the same" [S1].

**Quote Verification:**
- "the specification shall contain a written description of the invention, and of the manner ..." → **EXACT** (`§ 112(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 18. [s112b-01] What does 35 U.S.C. § 112(b) mandate that the specification conclude with? Quote the claims requirement.

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on 35 U.S.C. § 112(b), the specification must conclude with:
> "one or more claims particularly pointing out and distinctly claiming the subject matter the inventor regards as the invention" [S1].

**Quote Verification:**
- "one or more claims particularly pointing out and distinctly claiming the subject matter th..." → **EXACT** (`§ 112(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 19. [s112b-05] Quote 35 U.S.C. § 112(b) on the phrase "regards as the invention".

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, 35 U.S.C. § 112(b) states that "the specification shall conclude with one or more claims particularly pointing out and distinctly claiming the subject matter the inventor regards as the invention" [S1].

**Quote Verification:**
- "the specification shall conclude with one or more claims particularly pointing out and dis..." → **EXACT** (`§ 112(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 20. [s112b-10] State the full text of 35 U.S.C. § 112(b) with formal citation.

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the text of 35 U.S.C. § 112(b) is:
> "the specification shall conclude with one or more claims particularly pointing out and distinctly claiming the subject matter the inventor regards as the invention (definiteness)." [S1]

**Quote Verification:**
- "the specification shall conclude with one or more claims particularly pointing out and dis..." → **EXACT** (`§ 112(a)-(b)`)

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 21. [s112d-01] What must a dependent claim contain under 35 U.S.C. § 112(d)? Quote the reference to a preceding claim.

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1], [S2]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, there is no mention of 35 U.S.C. § 112(d) or the requirements for a dependent claim. The sources only discuss § 112(a) and § 112(b) [S1], § 111(a) and § 111(b) [S2], along with sections 101, 102, and 103 [S3, S4, S5, S6].

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 22. [s112d-05] What word does 35 U.S.C. § 112(d) use for claims that refer back: "A claim in..."? Quote the statutory term.

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1], [S2], [S4], [S5]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, there is no mention of 35 U.S.C. § 112(d) or the quote "A claim in...". The sources only provide text for 35 U.S.C. § 112(a)-(b) [S1], § 111(a)-(b) [S2], § 101, § 102(a) [S4], and § 103 [S5].

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 23. [s112d-10] Summarize 35 U.S.C. § 112(d) in one sentence and quote its key limitation incorporation clause.

**Expected Statutory Authority:** `§ 112(a)-(b)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1], [S2], [S3]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, there is no mention of 35 U.S.C. § 112(d) (the sources only cover § 112(a)-(b) [S1], § 111(a)-(b) [S2], and § 101/MPEP § 2106 [S3]). Therefore, it cannot be summarized or quoted from the provided texts.

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 24. [mpep-2106-01] Describe Step 2A Prong One under MPEP § 2106 and quote the judicial exceptions formulation.

**Expected Statutory Authority:** `MPEP § 2106 (condensed)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** [S1]  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the MPEP § 2106 text does not explicitly detail "Step 2A Prong One" by that specific name. However, regarding Step 2A, the sources state: 
> * "Step 2A: is the claim directed to a judicial exception (abstract idea, law of nature, natural phenomenon)?" [S1]

**Quote Verification:**
- " by that specific name. However, regarding Step 2A, the sources state: 

* ..." → **MISSING** 

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

### 25. [mpep-2106-05] What are the three groupings of abstract ideas set forth in MPEP § 2106? Quote the mathematical concepts grouping.

**Expected Statutory Authority:** `MPEP § 2106 (condensed)`  
**Authority Retrieved:** ✓ Yes  
**Valid Citations:** None  
**Dangling Citations:** None (0)  

**Model Answer:**
> Based on the provided sources, the three groupings of abstract ideas are not set forth or listed in the provided text of MPEP § 2106. Therefore, the sources do not contain the answer to this question.

**Practitioner Grade:**
- [ ] **Pass** (Substantively Correct)
- [ ] **Partial** (Minor Inaccuracy)
- [ ] **Fail** (Misleading / Incorrect Legal Rule)

*Notes / Observations:* _____________________________________________________

---

