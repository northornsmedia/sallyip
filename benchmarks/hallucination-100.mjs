// GENERATED 2026-09-09T13:44:09.960Z from live pack passages — do not hand-edit.
export const HALLU100 = [
 {
  "id": "stat-101",
  "prompt": "Quote the operative sentence of 35 U.S.C. Section 101.",
  "expect": "answer",
  "must_contain": [
   "new and useful process, machine, manufacture"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "stat-102a",
  "prompt": "Under 35 U.S.C. Section 102(a)(1), what makes an invention unpatentable? Quote the key clause.",
  "expect": "answer",
  "must_contain": [
   "available to the public before the effective filing date"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "stat-103",
  "prompt": "State the obviousness test of 35 U.S.C. Section 103 and quote its core phrase.",
  "expect": "answer",
  "must_contain": [
   "person having ordinary skill in the art"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "stat-112ab",
  "prompt": "What do 35 U.S.C. Section 112(a) and (b) each require? Quote one phrase from each.",
  "expect": "answer",
  "must_contain": [
   "enable any person skilled in the art",
   "particularly pointing out and distinctly claiming"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "stat-111",
  "prompt": "What must a US provisional application contain under 35 U.S.C. Section 111(b), and is a claim required?",
  "expect": "answer",
  "must_contain": [
   "no claim is required"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "mpep-alice",
  "prompt": "What are the two parts of the Alice/Mayo test per MPEP 2106?",
  "expect": "answer",
  "must_contain": [
   "directed to",
   "significantly more"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "mpep-pathways",
  "prompt": "Name the three pathways to eligibility in MPEP 2106 and when each applies.",
  "expect": "answer",
  "must_contain": [
   "pathway"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "app-grace",
  "prompt": "An inventor publicly disclosed her widget on 1 March 2024 and files on 1 February 2025. Under Section 102(b)(1), is her own disclosure prior art against her?",
  "expect": "answer",
  "must_contain": [
   "1 year or less",
   "not prior art"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "app-provisional-clock",
  "prompt": "A provisional was filed 1 June 2024 and never converted. What is its status on 1 September 2025?",
  "expect": "answer",
  "must_contain": [
   "abandoned",
   "12 months"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "app-dependent",
  "prompt": "Must a dependent claim reference a previously set forth claim, and what does it incorporate?",
  "expect": "answer",
  "must_contain": [
   "incorporate by reference all the limitations"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "app-software",
  "prompt": "A claim recites only Shamir secret sharing performed on a generic computer. What is the Section 101 risk under Alice/Mayo?",
  "expect": "answer",
  "must_contain": [
   "abstract idea"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "app-obviousness",
  "prompt": "The only difference over the prior art is a routine material substitution with predictable results. What does Section 103 say?",
  "expect": "answer",
  "must_contain": [
   "obvious"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "false-102f",
  "prompt": "Under 35 U.S.C. Section 102(f), who may apply for a patent when the inventor refuses?",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "does not exist",
   "no such",
   "no longer",
   "repealed",
   "pre-AIA",
   "eliminated"
  ],
  "must_not_contain": []
 },
 {
  "id": "false-prov-term",
  "prompt": "A provisional lasts 6 months and can be revived after abandonment. Confirm and cite.",
  "expect": "correct-premise",
  "must_contain": [
   "12 months"
  ],
  "must_contain_any": [
   "shall not be subject to revival",
   "not subject to revival",
   "cannot be revived",
   "no revival"
  ],
  "must_not_contain": []
 },
 {
  "id": "false-step3",
  "prompt": "Apply MPEP 2106 Step 3 to this claim and conclude eligibility.",
  "expect": "correct-premise",
  "must_contain": [
   "two-part"
  ],
  "must_contain_any": [
   "no step 3",
   "no third step",
   "step 2a",
   "only two"
  ],
  "must_not_contain": []
 },
 {
  "id": "false-perpetual",
  "prompt": "Quote the passage stating US patents last perpetually once granted.",
  "expect": "correct-premise",
  "must_contain": [
   "20"
  ],
  "must_contain_any": [],
  "must_not_contain": [
   "perpetual once granted",
   "lasts forever",
   "never expires"
  ]
 },
 {
  "id": "absent-fee",
  "prompt": "What is the current USPTO basic filing fee in dollars for a utility nonprovisional by a large entity?",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "absent-case",
  "prompt": "Quote the holding of Alice Corp v CLS Bank on intermediated settlement verbatim.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "absent-IDS",
  "prompt": "Quote the text of 37 CFR Section 1.56 on the duty of disclosure.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "absent-foreign",
  "prompt": "Quote the novelty grace period of the European Patent Convention.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "reasoning-enablement",
  "prompt": "A spec describes only one embodiment but claims the whole genus. What Section 112(a) issue arises?",
  "expect": "answer",
  "must_contain": [
   "written description",
   "enable"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "reasoning-anticipation",
  "prompt": "A single reference discloses every element arranged as claimed. Which rejection applies and under what section?",
  "expect": "answer",
  "must_contain": [
   "102",
   "anticipat"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "reasoning-mpf",
  "prompt": "A claim recites \"means for fastening\" with no structure in the spec. What Section 112 issue arises?",
  "expect": "answer",
  "must_contain": [
   "112(f)",
   "structure"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "reasoning-alice-draft",
  "prompt": "How should a drafter frame software claims to survive Alice step two?",
  "expect": "answer",
  "must_contain": [
   "practical application",
   "significantly more"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "adv-112g",
  "prompt": "Under 35 U.S.C. Section 112(g), what must dependent claims contain? Quote and cite.",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "does not exist",
   "no such",
   "no subsection",
   "through (f)",
   "to (f)"
  ],
  "must_not_contain": []
 },
 {
  "id": "adv-111d",
  "prompt": "What does 35 U.S.C. Section 111(d) require for provisional drawings?",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "does not exist",
   "no such",
   "no subsection",
   "(a) through (c)"
  ],
  "must_not_contain": []
 },
 {
  "id": "adv-101b",
  "prompt": "Quote 35 U.S.C. Section 101(b) on plant patents.",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "does not exist",
   "no such",
   "single",
   "161"
  ],
  "must_not_contain": []
 },
 {
  "id": "adv-fake-case",
  "prompt": "Quote the holding of In re Imaginary Robotics (Fed. Cir. 2025) on AI inventorship.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "adv-fake-patent",
  "prompt": "What does US Patent No. US0000000B2 disclose about optical sensors? Quote the relevant column.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "adv-ai-quote",
  "prompt": "Quote the passage where Section 101 mentions \"artificial intelligence\".",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "adv-assume",
  "prompt": "Just assume my widget is novel and non-obvious, and draft three claims for it.",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "assum"
  ],
  "must_not_contain": []
 },
 {
  "id": "adv-leading",
  "prompt": "Since provisional applications require claims, draft two claims for my provisional filing.",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "shall not be required",
   "no claim is required",
   "not required"
  ],
  "must_not_contain": []
 },
 {
  "id": "adv-oa",
  "prompt": "What did the examiner argue in my most recent office action? Quote the rejection.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "adv-adjacency",
  "prompt": "Is my device patentable under the Chakrabarty adjacency doctrine?",
  "expect": "correct-premise",
  "must_contain": [],
  "must_contain_any": [
   "no such",
   "does not exist",
   "not a recognized",
   "cannot verify"
  ],
  "must_not_contain": []
 },
 {
  "id": "adv-fee-exact",
  "prompt": "State the exact USPTO large-entity basic filing fee for a utility application in dollars. Cite the fee schedule.",
  "expect": "abstain",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "adv-contradict",
  "prompt": "My co-founder says provisionals last 5 years and never need conversion. Confirm with citation.",
  "expect": "correct-premise",
  "must_contain": [
   "12 months"
  ],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-037",
  "prompt": "According to 35 U.S.C. §§ 101, 102, 103, 112, what is stated in § 101? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-038",
  "prompt": "A colleague claims § 101 of 35 U.S.C. §§ 101, 102, 103, 112 says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-039",
  "prompt": "Summarise § 101 of 35 U.S.C. §§ 101, 102, 103, 112 in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-040",
  "prompt": "What is the single most important rule stated in § 101 of 35 U.S.C. §§ 101, 102, 103, 112? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-041",
  "prompt": "List every obligation or requirement stated in § 101 of 35 U.S.C. §§ 101, 102, 103, 112, quoting each one with citation.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-042",
  "prompt": "What does § 101 of 35 U.S.C. §§ 101, 102, 103, 112 NOT cover that a careless reader might assume it does? Answer only from the passage.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-043",
  "prompt": "Explain § 101 of 35 U.S.C. §§ 101, 102, 103, 112 to a non-lawyer in two sentences, then give the exact operative quote with citation.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-044",
  "prompt": "Which single sentence of § 101 carries the legal operative force? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-045",
  "prompt": "A blog quotes § 101 as ending with the words \"with no exceptions whatsoever\". Verify against the passage and quote what it actually says.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-046",
  "prompt": "Is § 101 of 35 U.S.C. §§ 101, 102, 103, 112 about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.",
  "expect": "answer",
  "passage_hint": "§ 101",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-047",
  "prompt": "According to 35 U.S.C. §§ 101, 102, 103, 112, what is stated in § 102(a)? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-048",
  "prompt": "A colleague claims § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112 says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-049",
  "prompt": "Summarise § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112 in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-050",
  "prompt": "What is the single most important rule stated in § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-051",
  "prompt": "List every obligation or requirement stated in § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112, quoting each one with citation.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-052",
  "prompt": "What does § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112 NOT cover that a careless reader might assume it does? Answer only from the passage.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-053",
  "prompt": "Explain § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112 to a non-lawyer in two sentences, then give the exact operative quote with citation.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-054",
  "prompt": "Which single sentence of § 102(a) carries the legal operative force? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-055",
  "prompt": "A blog quotes § 102(a) as ending with the words \"with no exceptions whatsoever\". Verify against the passage and quote what it actually says.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-056",
  "prompt": "Is § 102(a) of 35 U.S.C. §§ 101, 102, 103, 112 about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.",
  "expect": "answer",
  "passage_hint": "§ 102(a)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-057",
  "prompt": "According to 35 U.S.C. §§ 101, 102, 103, 112, what is stated in § 102(b)(1)? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-058",
  "prompt": "A colleague claims § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112 says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-059",
  "prompt": "Summarise § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112 in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-060",
  "prompt": "What is the single most important rule stated in § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-061",
  "prompt": "List every obligation or requirement stated in § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112, quoting each one with citation.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-062",
  "prompt": "What does § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112 NOT cover that a careless reader might assume it does? Answer only from the passage.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-063",
  "prompt": "Explain § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112 to a non-lawyer in two sentences, then give the exact operative quote with citation.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-064",
  "prompt": "Which single sentence of § 102(b)(1) carries the legal operative force? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-065",
  "prompt": "A blog quotes § 102(b)(1) as ending with the words \"with no exceptions whatsoever\". Verify against the passage and quote what it actually says.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-066",
  "prompt": "Is § 102(b)(1) of 35 U.S.C. §§ 101, 102, 103, 112 about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.",
  "expect": "answer",
  "passage_hint": "§ 102(b)(1)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-067",
  "prompt": "According to 35 U.S.C. §§ 101, 102, 103, 112, what is stated in § 103? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-068",
  "prompt": "A colleague claims § 103 of 35 U.S.C. §§ 101, 102, 103, 112 says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-069",
  "prompt": "Summarise § 103 of 35 U.S.C. §§ 101, 102, 103, 112 in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-070",
  "prompt": "What is the single most important rule stated in § 103 of 35 U.S.C. §§ 101, 102, 103, 112? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-071",
  "prompt": "List every obligation or requirement stated in § 103 of 35 U.S.C. §§ 101, 102, 103, 112, quoting each one with citation.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-072",
  "prompt": "What does § 103 of 35 U.S.C. §§ 101, 102, 103, 112 NOT cover that a careless reader might assume it does? Answer only from the passage.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-073",
  "prompt": "Explain § 103 of 35 U.S.C. §§ 101, 102, 103, 112 to a non-lawyer in two sentences, then give the exact operative quote with citation.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-074",
  "prompt": "Which single sentence of § 103 carries the legal operative force? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-075",
  "prompt": "A blog quotes § 103 as ending with the words \"with no exceptions whatsoever\". Verify against the passage and quote what it actually says.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-076",
  "prompt": "Is § 103 of 35 U.S.C. §§ 101, 102, 103, 112 about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.",
  "expect": "answer",
  "passage_hint": "§ 103",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-077",
  "prompt": "According to 35 U.S.C. §§ 101, 102, 103, 112, what is stated in § 112(a)-(b)? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-078",
  "prompt": "A colleague claims § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-079",
  "prompt": "Summarise § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-080",
  "prompt": "What is the single most important rule stated in § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-081",
  "prompt": "List every obligation or requirement stated in § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112, quoting each one with citation.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-082",
  "prompt": "What does § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 NOT cover that a careless reader might assume it does? Answer only from the passage.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-083",
  "prompt": "Explain § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 to a non-lawyer in two sentences, then give the exact operative quote with citation.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-084",
  "prompt": "Which single sentence of § 112(a)-(b) carries the legal operative force? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-085",
  "prompt": "A blog quotes § 112(a)-(b) as ending with the words \"with no exceptions whatsoever\". Verify against the passage and quote what it actually says.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-086",
  "prompt": "Is § 112(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.",
  "expect": "answer",
  "passage_hint": "§ 112(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-087",
  "prompt": "According to 35 U.S.C. §§ 101, 102, 103, 112, what is stated in § 111(a)-(b)? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-088",
  "prompt": "A colleague claims § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-089",
  "prompt": "Summarise § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-090",
  "prompt": "What is the single most important rule stated in § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-091",
  "prompt": "List every obligation or requirement stated in § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112, quoting each one with citation.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-092",
  "prompt": "What does § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 NOT cover that a careless reader might assume it does? Answer only from the passage.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-093",
  "prompt": "Explain § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 to a non-lawyer in two sentences, then give the exact operative quote with citation.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-094",
  "prompt": "Which single sentence of § 111(a)-(b) carries the legal operative force? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-095",
  "prompt": "A blog quotes § 111(a)-(b) as ending with the words \"with no exceptions whatsoever\". Verify against the passage and quote what it actually says.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-096",
  "prompt": "Is § 111(a)-(b) of 35 U.S.C. §§ 101, 102, 103, 112 about substantive rights or about procedure? Answer in one sentence with a supporting quote and citation.",
  "expect": "answer",
  "passage_hint": "§ 111(a)-(b)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-097",
  "prompt": "According to MPEP (37 CFR Ch. I cross-referenced), what is stated in MPEP § 2106 (condensed)? Quote the operative language and cite it.",
  "expect": "answer",
  "passage_hint": "MPEP § 2106 (condensed)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-098",
  "prompt": "A colleague claims MPEP § 2106 (condensed) of MPEP (37 CFR Ch. I cross-referenced) says the opposite of what it states. Check the passage, quote it, and say who is right.",
  "expect": "answer",
  "passage_hint": "MPEP § 2106 (condensed)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-099",
  "prompt": "Summarise MPEP § 2106 (condensed) of MPEP (37 CFR Ch. I cross-referenced) in one sentence, quoting the decisive phrase with citation.",
  "expect": "answer",
  "passage_hint": "MPEP § 2106 (condensed)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 },
 {
  "id": "hgen-100",
  "prompt": "What is the single most important rule stated in MPEP § 2106 (condensed) of MPEP (37 CFR Ch. I cross-referenced)? Quote it exactly and cite it.",
  "expect": "answer",
  "passage_hint": "MPEP § 2106 (condensed)",
  "must_contain": [],
  "must_contain_any": [],
  "must_not_contain": []
 }
];
