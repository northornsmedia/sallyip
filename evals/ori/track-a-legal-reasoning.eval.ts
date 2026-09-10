// SallyIP Ori Pilot Evaluation - Track A Legal Reasoning
// Run with: ori eval --pilot 1 evals/ori/track-a-legal-reasoning.eval.ts

import { test, describe } from "bun:test";
import { setupAgent, setupJudge, pilotCases } from "ori/eval";

const cases = [
  {
    id: "patent-101-001",
    prompt: "Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.",
    expected: {
      mustContain: ["Whoever invents or discovers", "process, machine, manufacture, or composition of matter"],
      mustNotContain: ["software per se", "AI models are patentable"],
      requiredCitations: ["§ 101"],
      quoteVerification: "EXACT"
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "patent-102a-001",
    prompt: "Under 35 U.S.C. § 102(a)(1), what events prior to the effective filing date establish prior art? Quote and cite.",
    expected: {
      mustContain: ["patented, described in a printed publication, or in public use, on sale, or otherwise available to the public"],
      requiredCitations: ["§ 102(a)"],
      quoteVerification: "EXACT"
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "patent-103-001",
    prompt: "State the obviousness test of 35 U.S.C. § 103 and quote its core phrase.",
    expected: {
      mustContain: ["obvious to a person having ordinary skill in the art"],
      requiredCitations: ["§ 103"],
      quoteVerification: "EXACT"
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "patent-112a-001",
    prompt: "What does 35 U.S.C. § 112(a) require the specification to contain? Quote the written description requirement.",
    expected: {
      mustContain: ["written description of the invention", "manner and process of making and using it"],
      requiredCitations: ["§ 112(a)"],
      quoteVerification: "EXACT"
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "patent-fto-001",
    prompt: "What are the key steps in a freedom-to-operate analysis for a US product? List the workflow steps.",
    expected: {
      requiredToolSequence: ["retrieveHybridEvidence", "createFtoProject"],
      mustContain: ["product features", "claim construction", "patent search", "mapping", "risk assessment"],
      requiredCitations: ["§ 271", "§ 282"]
    },
    track: "A",
    confidentiality: "CONFIDENTIAL_IP"
  },
  {
    id: "patent-oa-001",
    prompt: "How should one respond to a § 101 rejection under Alice/Mayo? Outline the two-step framework.",
    expected: {
      mustContain: ["Step 2A", "Step 2B", "judicial exception", "significantly more"],
      requiredCitations: ["MPEP § 2106"]
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "trademark-001",
    prompt: "What are the key factors in a trademark likelihood of confusion analysis under the DuPont factors?",
    expected: {
      mustContain: ["similarity of marks", "similarity of goods", "channels of trade", "consumer sophistication"],
      requiredCitations: ["In re E.I. du Pont de Nemours"]
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "contract-001",
    prompt: "What are the key risk flags in an unlimited liability clause in a SaaS agreement?",
    expected: {
      riskFlags: ["unlimited liability", "unlimited indemnification"],
      mustContain: ["unlimited", "liability", "indemnif"],
      riskLevel: "RED"
    },
    track: "A",
    confidentiality: "CONFIDENTIAL_IP"
  },
  {
    id: "patent-101-002",
    prompt: "Can a business method be patented under 35 U.S.C. § 101 after Alice? Quote the relevant framework.",
    expected: {
      mustContain: ["abstract idea", "significantly more", "inventive concept"],
      requiredCitations: ["MPEP § 2106", "Alice Corp. v. CLS Bank"],
      quoteVerification: "EXACT"
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  },
  {
    id: "patent-112d-001",
    prompt: "What must a dependent claim contain under 35 U.S.C. § 112(d)? Quote the statutory reference to a preceding claim.",
    expected: {
      mustContain: ["claim in dependent form", "incorporates by reference", "preceding claim"],
      requiredCitations: ["§ 112(d)"]
    },
    track: "A",
    confidentiality: "PUBLIC_RESEARCH"
  }
];

describe("Track A: Legal Reasoning Quality (Pilot)", () => {
  const agent = setupAgent({
    model: "gemini-3.7-flash",
    temperature: 0.3,
    maxTokens: 4096,
    systemPrompt: `You are an internal reasoning engine inside SallyIP 4.1 Pro. Your public identity is strictly Sally. Never claim another model or provider name. Give accurate, practical intellectual-property research and drafting assistance. Distinguish facts from uncertainty. Return only useful output; never reveal hidden chain-of-thought.

HIGH-FIDELITY CONVERSATION MEMORY & CONTINUOUS CONTEXT RETENTION:
You maintain permanent, active working memory of everything the user said and what you responded throughout this entire conversation.
- Retain all facts: Every invention detail, technical specification, component, mechanism, constraint, goal, and instruction previously disclosed by the user is verified ground truth.
- Never forget or re-ask: Never ask the user to re-state or re-describe information they already provided in prior turns.
- Direct continuity: Seamlessly connect the user's latest message with earlier exchanges. If the user refers to "it", "the device", "my invention", "what I said earlier", "continue", or asks for the next step (e.g. drafting claims, patentability analysis, specification), build directly and precisely upon the accumulated details from the conversation history.

OUTPUT AND ARTIFACT FORMAT: Sally's web application automatically generates downloadable files and artifacts from your response. Always write responses in standard, clean Markdown directly for the user. Never emit internal tool call syntax, pseudo-code functions, XML tags, or raw tokens such as <itool_call_begin>, <itool_call_end>, <tool_call>, or [generate_file(...)]. Do not escape text into single string arguments. Keep conversational chat clear, and structure legal agreements or guides using standard Markdown headings, lists, and tables. Supported downloadable formats handled by the application include PDF, DOCX, PPTX, XLSX, CSV, Markdown, HTML, JSON, and TXT. Never invent download links, never instruct the user to copy content into Word, Google Docs, or another application, and never claim file generation is unavailable. Keep chat text separate from artifact content. Resolve "this", "that", "the document", "the agreement", "the report", "previous draft", and bare requests such as "PDF please" to the active artifact. Existing artifacts must be exported without regeneration unless revisions are explicitly requested. Legal notices are rendered by the application UI and should not be inserted into drafted agreements or artifacts unless the user requests them or they are substantively required.`
  });

  const judge = setupJudge({
    agent: setupAgent({ model: "openai/gpt-5.6-sol" }),
  });

  for (const c of pilotCases(cases, 3)) {
    test.concurrent(`${c.id} — ${c.track}`, async () => {
      const run = await agent.run({
        prompt: c.prompt,
        temperature: 0.3,
        maxTokens: 4096,
      });

      // Legal correctness: judge grades the answer
      const legalScore = await judge.grade({
        prompt: c.prompt,
        answer: run.text,
        criteria: "legal_correctness_v1",
        expected: c.expected,
      });

      // Grounding: exact quote verification
      if (c.expected.quoteVerification === "EXACT" && c.expected.mustContain) {
        for (const phrase of c.expected.mustContain) {
          run.text.toContain(phrase);
        }
      }

      // Forbidden content
      if (c.expected.mustNotContain) {
        for (const phrase of c.expected.mustNotContain) {
          run.text.not.toContain(phrase);
        }
      }

      // Citations
      if (c.expected.requiredCitations) {
        for (const citation of c.expected.requiredCitations) {
          run.text.toContain(citation);
        }
      }

      // Return structured result
      return { id: c.id, track: c.track, legalScore };
    });
  }
});