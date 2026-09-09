const stem = term => String(term || '').toLowerCase().replace(/(?:ing|ed|es|s)$/, '')
const searchTerms=text=>[...new Set((String(text||'').toLowerCase().match(/[a-z0-9][a-z0-9-]{3,}/g)||[]))].slice(0,12)
const normalized=text=>String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()

const line = 'Yes, 35 U_S_C_ § 101 allows patents for new and useful improvements of existing machines. The statutory phrase is "any new and useful improvement thereof" [S1].'
const complete = [
  {
    title: '35 U.S.C. § 101 Inventions Patentable',
    locator: '35 U.S.C. § 101',
    content: 'Whoever invents or discovers any new and useful process, machine, manufacture, or composition of matter, or any new and useful improvement thereof, may obtain a patent therefor, subject to the conditions and requirements of this title.'
  }
];

const rawSentences = line.split(/(?<=[.!?])\s+/)
const processedSentences = rawSentences.map((sent, sIdx) => {
  if (/\[S\d+\]/.test(sent)) return sent
  if (/\b(process|machine|manufacture|composition of matter|improvement|patentable|patent|prior art|effective filing date|grace period|obvious|person having ordinary skill|enablement|written description|best mode|particularly pointing out|dependent form|step 2a|step 2b|significantly more|judicial exception|whoever|invents|discovers|title|section|statute|u_s_c_|mpep)\b/i.test(sent)) {
    for (let i = 0; i < complete.length; i++) {
      const s = complete[i]
      const sourceText = `${s.title} ${s.locator} ${s.content}`.toLowerCase()
      const sourceStems = new Set((sourceText.match(/[a-z0-9]+/g) || []).map(stem))
      const terms = searchTerms(sent)
      const matchCount = terms.filter(t => sourceStems.has(stem(t)) || sourceText.includes(t.toLowerCase())).length
      if (matchCount >= 2 || normalized(s.content).includes(normalized(sent.slice(0, 30)))) {
        return `${sent.replace(/[.!?]+$/, '')} [S${i + 1}].`
      }
    }
  }
  // If next sentence has [S#], inherit it
  const next = rawSentences[sIdx + 1]
  const nextCite = next ? next.match(/\[S(\d+)\]/) : null
  if (nextCite && sent.length > 15) {
    return `${sent.replace(/[.!?]+$/, '')} ${nextCite[0]}.`
  }
  return sent
})

console.log(processedSentences.join(' '))
