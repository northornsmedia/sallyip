# SallyIP Patent Legal Benchmark: Build Regression Report

**Date:** 2026-09-09  
**Evaluated Model:** `gemini-flash-lite-latest`  
**Benchmark Test Suite:** `dataset.json` (5 questions)  
**Baseline Version:** `v1.0` (Run ID: `f8dfe146-4400-49b9-a206-72c8607622d3`)  

## 1. Five-Dimensional Performance Comparison

| Evaluation Dimension | v1.0 Baseline | Current Build | Delta / Status |
| :--- | :--- | :--- | :--- |
| **1. Authority Retrieval ($R@k$)** | 100% (95/95) | 100.0% (5/5) | PASS |
| **2. Citation Integrity (0-Dangling)** | 100% (95/95) | 100.0% (5/5) | PASS |
| **3. Quotation Fidelity (Exact)** | 72.5% (87/120) | 100.0% (5/5) | PASS |
| **3b. Quotation Missing/Unverified** | 22.5% (27/120) | 0.0% (0/5) | PASS |
| **4. Citation Entailment** | *Added in 5D framework* | 100.0% | PASS |
| **5. Unsupported Proposition Rate** | *Added in 5D framework* | 0.0% | PASS |

## Release decision: PASS

Production release is permitted only when every release gate passes. Substantive legal correctness remains separately practitioner-graded and is not inferred from these metrics.

## 2. Regression Tracking on v1.0 Failure Cases (27 Unverified Quotes)

Every missing quote from v1.0 is preserved as an immutable test case to prevent silent regressions and verify iterative improvements in future releases.

| Key | Question Prompt | v1.0 Status | Current Status |
| :--- | :--- | :--- | :--- |
| `s101-04` | What word does 35 U.S.C. § 101 use regarding the invent... | 1 Missing Quote(s) | ✓ Improved (1 Exact) |
| `s101-07` | What does 35 U.S.C. § 101 state about subject matter co... | 1 Missing Quote(s) | Not Tested |
| `s101-08` | State the statutory term in 35 U.S.C. § 101 for an arti... | 1 Missing Quote(s) | Not Tested |
| `s102b-05` | Explain 35 U.S.C. § 102(b)(1)(B) regarding third-party ... | 1 Missing Quote(s) | Not Tested |
| `s102b-07` | Does the 1-year grace period in 35 U.S.C. § 102(b)(1) a... | 1 Missing Quote(s) | Not Tested |
| `s103-06` | Quote the sentence in 35 U.S.C. § 103: "Patentability s... | 1 Missing Quote(s) | Not Tested |
| `s103-10` | Summarize 35 U.S.C. § 103 in one sentence and quote its... | 1 Missing Quote(s) | Not Tested |
| `s111-09` | Can a provisional application claim the priority of an ... | 1 Missing Quote(s) | Not Tested |
| `s112a-04` | What does 35 U.S.C. § 112(a) say about the best mode of... | 1 Missing Quote(s) | Not Tested |
| `s112a-08` | What three specification qualities are demanded by 35 U... | 1 Missing Quote(s) | Not Tested |

*Note: Showing top 10 of 24 tracked quote failure cases. Full list stored in `benchmarks/v1.0/failures_27_unverified_quotes.json`.*

## 3. Verification Governance

- All benchmark questions in `benchmarks/v1.0/dataset.json` are immutable.
- Citations are enforced structurally by `guardAnswerCitations`.
- Entailment checks verify that cited authority strictly supports attached propositions.
