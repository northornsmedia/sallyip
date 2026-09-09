// Entailment validator (§7): does the cited passage actually support the
// proposition? Deterministic lexical signals — no LLM self-grading.
// Verdicts: ENTAILS | PARTIALLY_SUPPORTS | CONTEXT_ONLY | CONTRADICTS | DOES_NOT_SUPPORT
const STOP = new Set('the,a,an,of,to,in,for,and,or,that,this,with,from,what,when,where,which,about,under,shall,may,not,any,all,each,such,other,than,into,over,before,after,between,within,without,its,their,his,her,you,your,are,was,were,has,have,had,does,did,will,would,can,could,should,must,also,only,very,more,most,some,upon,among,along,across,against,although,though,while,until,toward,towards,per,two,one,three,four,five,six,seven,eight,nine,ten,first,second,third,says,said,states,provides,provide,according,including,includes,following,above,below,here,there,their,then,thus,hence,therefore,however,moreover,furthermore,otherwise,whereas,whereby,wherein,hereby,herein,thereof,thereto,hereof,hereunder,thereunder,which,whose,whom,what,whatever,whichever,whoever,whomever,whosever'.split(','))
const NEG = /\b(not|no|never|neither|nor|without|except|unless|prohibit|forbid|deny|denies|denied|reject|rejects|refuse|refuses|fail|fails|lack|lacks|absent|void)\b/i

const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 §.]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
const uniq = (arr) => [...new Set(arr)]

export function checkEntailment(proposition, passageContent) {
  const pWords = uniq(words(proposition))
  const cWords = new Set(words(passageContent))
  if (!pWords.length) return { verdict: 'DOES_NOT_SUPPORT', score: 0, reasons: ['empty proposition'] }
  if (!cWords.size) return { verdict: 'DOES_NOT_SUPPORT', score: 0, reasons: ['empty passage'] }
  const hits = pWords.filter(w => cWords.has(w))
  const coverage = hits.length / pWords.length
  const reasons = [`keyword coverage ${(coverage * 100).toFixed(0)}% (${hits.length}/${pWords.length})`]
  // Section-number anchors must agree when both sides cite them.
  const secOf = (s) => [...String(s || '').matchAll(/§\s*(\d{2,4}[a-z]?)/g)].map(m => m[1])
  const pSecs = secOf(proposition), cSecs = new Set(secOf(passageContent))
  if (pSecs.length && !pSecs.some(s => cSecs.has(s))) {
    reasons.push(`section mismatch (proposition cites §${pSecs.join(', §')}, passage does not contain it)`)
    return { verdict: 'DOES_NOT_SUPPORT', score: Math.round(coverage * 100) / 100, reasons }
  }
  // Negation flip: passage negates what the proposition asserts.
  const pNeg = NEG.test(proposition), cNeg = NEG.test(passageContent)
  if (pNeg !== cNeg && coverage >= 0.3) {
    reasons.push(pNeg ? 'proposition negates what the passage affirms' : 'passage negates what the proposition affirms')
    return { verdict: 'CONTRADICTS', score: Math.round(coverage * 100) / 100, reasons }
  }
  if (coverage >= 0.7) return { verdict: 'ENTAILS', score: Math.round(coverage * 100) / 100, reasons }
  if (coverage >= 0.4) {
    reasons.push('partial term overlap only')
    return { verdict: 'PARTIALLY_SUPPORTS', score: Math.round(coverage * 100) / 100, reasons }
  }
  if (coverage > 0) {
    reasons.push('shared vocabulary but no substantive overlap')
    return { verdict: 'CONTEXT_ONLY', score: Math.round(coverage * 100) / 100, reasons }
  }
  reasons.push('no shared substantive terms')
  return { verdict: 'DOES_NOT_SUPPORT', score: 0, reasons }
}
