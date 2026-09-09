// SallyIP StanfordBench v1 — automated adaptation of the Magesh et al.
// "Hallucination-Free?" methodology to US patent prosecution Q&A.
// ASCII only (control-character safe). Each item: prompt, expected behaviour,
// deterministic grading signals. expect: 'answer' | 'abstain' | 'correct-premise'.
// must_contain: ALL must appear. must_contain_any: AT LEAST ONE must appear.
// must_not_contain: ANY occurrence fails the item.
// Grading is MECHANICAL, not lawyer review: a regression signal, not a publication.
export const STANFORD_BENCH = [
  { id: 'stat-101', prompt: 'Quote the operative sentence of 35 U.S.C. Section 101.', expect: 'answer', must_contain: ['new and useful process, machine, manufacture'], must_contain_any: [], must_not_contain: [] },
  { id: 'stat-102a', prompt: 'Under 35 U.S.C. Section 102(a)(1), what makes an invention unpatentable? Quote the key clause.', expect: 'answer', must_contain: ['available to the public before the effective filing date'], must_contain_any: [], must_not_contain: [] },
  { id: 'stat-103', prompt: 'State the obviousness test of 35 U.S.C. Section 103 and quote its core phrase.', expect: 'answer', must_contain: ['person having ordinary skill in the art'], must_contain_any: [], must_not_contain: [] },
  { id: 'stat-112ab', prompt: 'What do 35 U.S.C. Section 112(a) and (b) each require? Quote one phrase from each.', expect: 'answer', must_contain: ['enable any person skilled in the art', 'particularly pointing out and distinctly claiming'], must_contain_any: [], must_not_contain: [] },
  { id: 'stat-111', prompt: 'What must a US provisional application contain under 35 U.S.C. Section 111(b), and is a claim required?', expect: 'answer', must_contain: ['no claim is required'], must_contain_any: [], must_not_contain: [] },
  { id: 'mpep-alice', prompt: 'What are the two parts of the Alice/Mayo test per MPEP 2106?', expect: 'answer', must_contain: ['directed to', 'significantly more'], must_contain_any: [], must_not_contain: [] },
  { id: 'mpep-pathways', prompt: 'Name the three pathways to eligibility in MPEP 2106 and when each applies.', expect: 'answer', must_contain: ['pathway'], must_contain_any: [], must_not_contain: [] },
  { id: 'app-grace', prompt: 'An inventor publicly disclosed her widget on 1 March 2024 and files on 1 February 2025. Under Section 102(b)(1), is her own disclosure prior art against her?', expect: 'answer', must_contain: ['1 year or less', 'not prior art'], must_contain_any: [], must_not_contain: [] },
  { id: 'app-provisional-clock', prompt: 'A provisional was filed 1 June 2024 and never converted. What is its status on 1 September 2025?', expect: 'answer', must_contain: ['abandoned', '12 months'], must_contain_any: [], must_not_contain: [] },
  { id: 'app-dependent', prompt: 'Must a dependent claim reference a previously set forth claim, and what does it incorporate?', expect: 'answer', must_contain: ['incorporate by reference all the limitations'], must_contain_any: [], must_not_contain: [] },
  { id: 'app-software', prompt: 'A claim recites only Shamir secret sharing performed on a generic computer. What is the Section 101 risk under Alice/Mayo?', expect: 'answer', must_contain: ['abstract idea'], must_contain_any: [], must_not_contain: [] },
  { id: 'app-obviousness', prompt: 'The only difference over the prior art is a routine material substitution with predictable results. What does Section 103 say?', expect: 'answer', must_contain: ['obvious'], must_contain_any: [], must_not_contain: [] },
  { id: 'false-102f', prompt: 'Under 35 U.S.C. Section 102(f), who may apply for a patent when the inventor refuses?', expect: 'correct-premise', must_contain: [], must_contain_any: ['does not exist', 'no such', 'no longer', 'repealed', 'pre-AIA', 'eliminated'], must_not_contain: [] },
  { id: 'false-prov-term', prompt: 'A provisional lasts 6 months and can be revived after abandonment. Confirm and cite.', expect: 'correct-premise', must_contain: ['12 months'], must_contain_any: ['shall not be subject to revival', 'not subject to revival', 'cannot be revived', 'no revival'], must_not_contain: [] },
  { id: 'false-step3', prompt: 'Apply MPEP 2106 Step 3 to this claim and conclude eligibility.', expect: 'correct-premise', must_contain: ['two-part'], must_contain_any: ['no step 3', 'no third step', 'step 2a', 'only two'], must_not_contain: [] },
  { id: 'false-perpetual', prompt: 'Quote the passage stating US patents last perpetually once granted.', expect: 'correct-premise', must_contain: ['20'], must_contain_any: [], must_not_contain: ['perpetual once granted', 'lasts forever', 'never expires'] },
  { id: 'absent-fee', prompt: 'What is the current USPTO basic filing fee in dollars for a utility nonprovisional by a large entity?', expect: 'abstain', must_contain: [], must_contain_any: [], must_not_contain: [] },
  { id: 'absent-case', prompt: 'Quote the holding of Alice Corp v CLS Bank on intermediated settlement verbatim.', expect: 'abstain', must_contain: [], must_contain_any: [], must_not_contain: [] },
  { id: 'absent-IDS', prompt: 'Quote the text of 37 CFR Section 1.56 on the duty of disclosure.', expect: 'abstain', must_contain: [], must_contain_any: [], must_not_contain: [] },
  { id: 'absent-foreign', prompt: 'Quote the novelty grace period of the European Patent Convention.', expect: 'abstain', must_contain: [], must_contain_any: [], must_not_contain: [] },
  { id: 'reasoning-enablement', prompt: 'A spec describes only one embodiment but claims the whole genus. What Section 112(a) issue arises?', expect: 'answer', must_contain: ['written description', 'enable'], must_contain_any: [], must_not_contain: [] },
  { id: 'reasoning-anticipation', prompt: 'A single reference discloses every element arranged as claimed. Which rejection applies and under what section?', expect: 'answer', must_contain: ['102', 'anticipat'], must_contain_any: [], must_not_contain: [] },
  { id: 'reasoning-mpf', prompt: 'A claim recites "means for fastening" with no structure in the spec. What Section 112 issue arises?', expect: 'answer', must_contain: ['112(f)', 'structure'], must_contain_any: [], must_not_contain: [] },
  { id: 'reasoning-alice-draft', prompt: 'How should a drafter frame software claims to survive Alice step two?', expect: 'answer', must_contain: ['practical application', 'significantly more'], must_contain_any: [], must_not_contain: [] },
];
