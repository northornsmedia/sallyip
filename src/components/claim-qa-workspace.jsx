import { useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { auditClaims } from '../lib/claim-qa-service.js'

export default function ClaimQaWorkspace({ isOpen, onClose, onResult }) {
  const [claimsText, setClaimsText] = useState('')
  const [specText, setSpecText] = useState('')
  const [result, setResult] = useState(null)

  const run = (e) => {
    e.preventDefault()
    const r = auditClaims(claimsText, { specText })
    setResult(r)
    onResult?.(`## Claim QA audit\n\n${r.claims.length} claim(s): **${r.score.errors} errors**, **${r.score.warnings} warnings**.${r.score.errors ? ' Fix errors before filing.' : ' No blocking errors.'}`, { task_class: 'CLAIM_QA', source_basis: 'user_supplied' })
  }

  if (!isOpen) return null
  return <div className="ipToolOverlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}><section className="ipToolModal familyModal"><header><div><span>SALLY QA / ONE-CLICK CLAIM AUDIT</span><h2>Audit claims</h2></div><button type="button" onClick={onClose}><X /></button></header>
    <form onSubmit={run}>
      <label>Claims (numbered)<textarea required rows={8} value={claimsText} onChange={e => setClaimsText(e.target.value)} placeholder={'1. A widget comprising...\n2. The widget of claim 1, wherein...'} /></label>
      <label>Specification (optional, enables support checks)<textarea rows={4} value={specText} onChange={e => setSpecText(e.target.value)} placeholder="Paste specification paragraphs…" /></label>
      <footer><span><ShieldCheck />Runs instantly in your browser — nothing uploaded</span><button>Audit claims</button></footer>
    </form>
    {result && <div style={{ marginTop: 10 }}>
      <div className="familyMeta"><span>{result.claims.length} claims</span><span>{result.score.errors} errors</span><span>{result.score.warnings} warnings</span></div>
      <div className="familyLinks">{result.findings.map((f, i) => <article key={i}><span style={{ color: f.severity === 'error' ? '#c0392b' : f.severity === 'warning' ? '#b7791f' : '#1e8449' }}>{f.severity.toUpperCase()}</span><b>{f.check}{f.claim_number ? ` · claim ${f.claim_number}` : ''}</b><small>{f.message}{f.suggestion ? ` — ${f.suggestion}` : ''}</small></article>)}{!result.findings.length && <div className="claimChartEmpty">✓ Clean — no QA findings.</div>}</div>
    </div>}
  </section></div>
}
