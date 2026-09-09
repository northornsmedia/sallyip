const stem = term => String(term || '').toLowerCase().replace(/(?:ing|ed|es|s)$/, '')

const complete = [
  {
    title: '35 U.S.C. § 101 Inventions Patentable',
    locator: '35 U.S.C. § 101',
    content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.'
  }
];

const sent = 'Yes, 35 U_S_C_ § 101 allows patents for new and useful improvements of existing machines.';
const terms = ['allows', 'patents', 'useful', 'improvements', 'existing', 'machines'];

const sourceText = `${complete[0].title} ${complete[0].locator} ${complete[0].content}`.toLowerCase();
const sourceStems = new Set(sourceText.match(/[a-z0-9]+/g).map(stem));

const matched = terms.filter(t => sourceStems.has(stem(t)) || sourceText.includes(t.toLowerCase()));
console.log('Stemmed matched terms:', matched);
console.log('Match count:', matched.length);
