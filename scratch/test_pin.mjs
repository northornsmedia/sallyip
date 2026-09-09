function protectLegalAbbreviations(text) {
  return String(text || '')
    .replace(/U\.S\.C\./gi, 'U_S_C_')
    .replace(/C\.F\.R\./gi, 'C_F_R_')
    .replace(/Fed\.\s*Cir\./gi, 'Fed_Cir_')
    .replace(/v\.\s+/gi, 'v_ ')
    .replace(/e\.g\./gi, 'e_g_')
    .replace(/i\.e\./gi, 'i_e_')
    .replace(/§\s*(\d+)\.([a-z0-9]+)/gi, '§ $1_$2')
}

function unprotectLegalAbbreviations(text) {
  return String(text || '')
    .replace(/U_S_C_/g, 'U.S.C.')
    .replace(/C_F_R_/g, 'C.F.R.')
    .replace(/Fed_Cir_/g, 'Fed. Cir.')
    .replace(/v_\s+/g, 'v. ')
    .replace(/e_g_/g, 'e.g.')
    .replace(/i_e_/g, 'i.e.')
    .replace(/§\s*(\d+)_([a-z0-9]+)/gi, '§ $1.$2')
}

const searchTerms=text=>[...new Set((String(text||'').toLowerCase().match(/[a-z0-9][a-z0-9-]{3,}/g)||[]))].slice(0,12)
const normalized=text=>String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()

const line = `Yes, 35 U.S.C. § 101 allows a patent for an improvement. Specifically, it covers "any new and useful improvement thereof" [S1].`;
const complete = [
  {
    content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.'
  }
];

const protectedOutput = protectLegalAbbreviations(line);
const rawSentences = protectedOutput.split(/(?<=[.!?])\s+/);
const processedSentences = rawSentences.map(sent => {
  if (/\[S\d+\]/.test(sent)) return sent;
  if (/\b(process|machine|manufacture|composition of matter|improvement|patentable|patent|prior art|effective filing date|grace period|obvious|person having ordinary skill|enablement|written description|best mode|particularly pointing out|dependent form|step 2a|step 2b|significantly more|judicial exception|whoever|invents|discovers|title|section|statute|u_s_c_|mpep)\b/i.test(sent)) {
    for (let i = 0; i < complete.length; i++) {
      const s = complete[i];
      const terms = searchTerms(sent);
      const matchCount = terms.filter(t => normalized(s.content).includes(t)).length;
      if (matchCount >= 2 || normalized(s.content).includes(normalized(sent.slice(0, 30)))) {
        return `${sent.replace(/[.!?]+$/, '')} [S${i + 1}].`;
      }
    }
  }
  return sent;
});
const output = unprotectLegalAbbreviations(processedSentences.join(' '));
console.log('Result:');
console.log(output);
