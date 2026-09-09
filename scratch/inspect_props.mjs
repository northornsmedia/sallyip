import { extractCitedPropositions } from '../src/lib/benchmark-eval-framework.js';
import { finalizeVerifiedAnswer } from '../src/lib/verification-service.js';

const answers = [
  // Let's test the answer to s101-01 through s101-05
  `"Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]`,
  `Under 35 U.S.C. § 101, whoever invents or discovers a new and useful process or machine "may obtain a patent therefor, subject to the conditions and requirements of this title." [S1]`,
  `The four statutory categories under 35 U.S.C. § 101 are: "process, machine, manufacture, or composition of matter" [S1].`,
  `35 U.S.C. § 101 uses the phrase "Whoever invents or discovers" [S1].`,
  // s101-05 answer generated: let's test what an answer might look like:
  `Yes, 35 U.S.C. § 101 allows a patent for an improvement. Specifically, it covers "any new and useful improvement thereof" [S1].`
];

for (let i = 0; i < answers.length; i++) {
  const ans = answers[i];
  const props = extractCitedPropositions(ans);
  console.log(`\n--- Question ${i + 1} ---`);
  console.log(`Answer: ${ans}`);
  console.log(`Props (${props.length}):`);
  for (const p of props) {
    console.log(` - text: "${p.cleanText}" | cites: [${p.sourceIndices}] | raw: "${p.rawSentence}"`);
  }
}
