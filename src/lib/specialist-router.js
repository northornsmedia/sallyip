const rules = [
  {
    task: "PATENT_FTO",
    test: /\b(fto|freedom to operate|launch|infring(e|ement)|claim chart)\b/i,
    agents: [
      "Sally Patents",
      "Sally Claim Interpretation",
      "Sally Research",
      "Sally Evidence",
      "Sally Strategy",
      "Sally Verification",
    ],
  },
  {
    task: "PATENT_INVENTIVE_STEP",
    test: /\b(inventive step|obviousness|problem.solution|pozzo(?:li)?|graham|ksr|could.would)\b/i,
    agents: [
      "Sally Patents",
      "Sally Claim Interpretation",
      "Sally Research",
      "Sally Evidence",
      "Sally Verification",
    ],
  },
  {
    task: "PATENT_NOVELTY",
    test: /\b(novelty|anticipat(?:e|ed|ion)|single.reference|every (?:claim )?(?:element|limitation)|article 54|35 u\.s\.c\. §?\s*102|synthon)\b/i,
    agents: [
      "Sally Patents",
      "Sally Claim Interpretation",
      "Sally Research",
      "Sally Evidence",
      "Sally Verification",
    ],
  },
  {
    task: "PATENT_RESEARCH",
    test: /\b(patent|prior art|novelty|prosecution|office action|claim\s+\d+)\b/i,
    agents: [
      "Sally Patents",
      "Sally Research",
      "Sally Evidence",
      "Sally Verification",
    ],
  },
  {
    task: "TRADEMARK_INTELLIGENCE",
    test: /\b(translate|translation|transliterat(?:e|ion)|phonetic equivalent|conceptual equivalent|regional meaning|brand slang|multilingual mark|classif(?:y|ication) (?:the |these )?goods|goods (?:and|&) services wording|nice classification|office.accepted wording)\b/i,
    agents: [
      "Sally Trademarks",
      "Sally Translation",
      "Sally Brand Protection",
      "Sally Evidence",
      "Sally Verification",
    ],
  },
  {
    task: "TRADEMARK_CLEARANCE",
    test: /\b(trademark|trade mark|clearance|similar mark|nice class|opposition|passing off|brand protection)\b/i,
    agents: [
      "Sally Trademarks",
      "Sally Brand Protection",
      "Sally Research",
      "Sally Verification",
    ],
  },
  {
    task: "COPYRIGHT_ANALYSIS",
    test: /\b(copyright|authorship|fair use|fair dealing)\b/i,
    agents: ["Sally Copyright", "Sally Research", "Sally Verification"],
  },
  {
    task: "IP_TRANSACTION",
    test: /\b(licen[cs]e|assignment|nda|agreement|transaction|due diligence|chain of title)\b/i,
    agents: [
      "Sally Transactions",
      "Sally Licensing",
      "Sally Drafting",
      "Sally Verification",
    ],
  },
  {
    task: "IP_LITIGATION",
    test: /\b(litigation|claimant|defendant|injunction|damages|evidence|witness|pleading)\b/i,
    agents: [
      "Sally Litigation",
      "Sally Evidence",
      "Sally Strategy",
      "Sally Verification",
    ],
  },
];

const jurisdictions = [
  ["EPO", /\b(epo|epc|article 54|european patent office|problem.solution|comvik)\b/i],
  ["UPC", /\b(upc|unified patent court)\b/i],
  ["EU", /\b(eu|euipo|european union)\b/i],
  ["United Kingdom", /\b(uk|united kingdom|england|wales|ukipo)\b/i],
  ["Germany", /\b(germany|german|de\b)/i],
  ["United States", /\b(us|usa|united states|uspto)\b/i],
  ["India", /\b(india|indian|ip india)\b/i],
  ["Australia", /\b(australia|australian|ipaustralia)\b/i],
];

export function routeSpecialists(
  text,
  { deepResearch = false, matterJurisdictions = [] } = {},
) {
  const matches = rules.filter((rule) => rule.test.test(text));
  const taskClass = matches[0]?.task || "GENERAL_IP_RESEARCH";
  const agents = [
    ...new Set([
      "Sally Orchestrator",
      ...matches.flatMap((item) => item.agents),
      ...(matches.length ? [] : ["Sally Research", "Sally Verification"]),
    ]),
  ];
  const detected = jurisdictions
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
  return {
    task_class: taskClass,
    specialists: agents,
    jurisdictions: [...new Set([...matterJurisdictions, ...detected])],
    research_mode: deepResearch ? "deep" : "quick",
    requires_primary_sources:
      deepResearch ||
      /\b(law|legal test|authority|case|statute|regulation|validity|infringement|opposition|appeal)\b/i.test(
        text,
      ),
    requires_contrary_authority:
      deepResearch ||
      /\b(opinion|risk|litigation|validity|infringement|can we|likelihood)\b/i.test(
        text,
      ),
  };
}

export const specialistRules = rules;
