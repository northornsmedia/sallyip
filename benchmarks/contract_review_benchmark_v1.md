# Contract review benchmark v1 (rule-based screening — NOT certified analysis)

11 cases. Each: input clause -> expected risk_level + required human-review flag.
Method under test: `screenContract` (regex signals, labelled RULE_BASED_SCREENING).

| id | category | clause excerpt | expected | must_flag_human |
|---|---|---|---|---|
| liability-01 | liability | Liability is unlimited in all respects | red | yes |
| indemnity-01 | indemnity | Licensor shall provide unlimited indemnity for all claims | red | yes |
| ip-own-01 | IP ownership | All foreground IP is hereby assigned to the Company | amber/green* | yes (review assignment scope) |
| assign-01 | assignment | Neither party may assign without prior written consent | green | no |
| license-01 | licensing | Exclusive worldwide licence for all fields | amber | yes |
| conf-01 | confidentiality | Receiving party shall keep Confidential Information strictly confidential for 5 years | green | no |
| warranty-01 | warranties | Licensor warrants title and non-infringement to its knowledge | amber | yes |
| term-01 | termination | Either party may terminate for convenience on 30 days notice | amber | yes |
| gov-01 | governing law | Governed by the laws of England and Wales | green | no |
| dp-01 | data protection | Processor shall process personal data only on documented instructions | green | no |
| aidata-01 | AI/data-use | Provider may use Customer Data to train models | red | yes |

*ip-own-01: regex layer under-detects assignment risk — known gap, tracked as P1. Do not certify until model-assisted + playbook layers are benchmarked.
Run: `node --test tests/security/contract-screening.test.mjs` (part of Phase 12 suite).
