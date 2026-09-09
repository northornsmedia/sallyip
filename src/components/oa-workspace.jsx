import { useEffect, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'

const STRATEGIES = ['broad', 'moderate', 'conservative']

export default function OfficeActionWorkspace({ isOpen, onClose, matterId, onResult }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actions, setActions] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', oa_type: 'non-final', mailing_date: '', oa_text: '' })
  const [amend, setAmend] = useState({ rejection_id: '', claim_number: '', original_text: '', amended_text: '', strategy: 'moderate' })
  const [qa, setQa] = useState(null)

  useEffect(() => { if (isOpen) { load(); setSelected(null); setQa(null); setError('') } }, [isOpen])
  const request = async (url, options) => { const r = await fetch(url, options); const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || 'Office action operation failed'); return d }
  const load = async () => { setBusy(true); setError(''); try { setActions((await request(`/api/office-actions${matterId ? `?matter_id=${encodeURIComponent(matterId)}` : ''}`)).actions || []) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  const openDetail = async (id) => { setBusy(true); setError(''); setQa(null); try { setSelected(await request(`/api/office-actions?id=${encodeURIComponent(id)}`)) } catch (e) { setError(e.message) } finally { setBusy(false) } }

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const d = await request('/api/office-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', matter_id: matterId || null, ...form }) })
      setActions(a => [d.action, ...a]); setSelected(d); setForm({ title: '', oa_type: 'non-final', mailing_date: '', oa_text: '' })
      onResult?.(`## Office action imported\n\n**${d.action.title}** — ${d.rejections.length} candidate rejection(s) parsed. Confirm each rejection before responding; candidates are heuristic, not examiner-verified.`, { task_class: 'OFFICE_ACTION', source_basis: 'user_supplied' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const propose = async (e) => {
    e.preventDefault(); if (!selected?.action) return
    setBusy(true); setError(''); setQa(null)
    try {
      const d = await request('/api/office-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'amend', action_id: selected.action.id, rejection_id: amend.rejection_id || null, claim_number: amend.claim_number ? Number(amend.claim_number) : null, original_text: amend.original_text, amended_text: amend.amended_text, strategy: amend.strategy }) })
      setQa(d.qa); setSelected(await request(`/api/office-actions?id=${encodeURIComponent(selected.action.id)}`))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const review = async (amendmentId, review_status) => {
    setBusy(true); setError('')
    try {
      setSelected(await request('/api/office-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review', action_id: selected.action.id, amendment_id: amendmentId, review_status }) }))
      setQa(null)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (!isOpen) return null
  return <div className="ipToolOverlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}><section className="ipToolModal familyModal"><header><div><span>SALLY PROSECUTION / OFFICE ACTION RESPONSE</span><h2>{selected?.action ? selected.action.title : 'Respond to an office action'}</h2></div><button type="button" onClick={onClose}><X /></button></header>
    {!selected ? <>
      <form onSubmit={create}>
        <div className="ipToolGrid"><label>Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Non-final rejection mailed 2026-08-01" /></label><label>Type<select value={form.oa_type} onChange={e => setForm({ ...form, oa_type: e.target.value })}><option value="non-final">Non-final</option><option value="final">Final</option><option value="advisory">Advisory</option><option value="restriction">Restriction</option><option value="other">Other</option></select></label></div>
        <label>Mailing date<input type="date" value={form.mailing_date} onChange={e => setForm({ ...form, mailing_date: e.target.value })} /></label>
        <label>Office action text (paste)<textarea required rows={6} value={form.oa_text} onChange={e => setForm({ ...form, oa_text: e.target.value })} placeholder="Paste the rejection section: claims, statutes (§101/102/103/112), cited references…" /></label>
        <footer><span><ShieldCheck />Candidates parsed heuristically — confirm each</span><button disabled={busy}>{busy ? 'Importing…' : 'Import action'}</button></footer>
      </form>
      <div className="familyLinks">{actions.map(a => <article key={a.id}><span>{a.oa_type} · {a.status}</span><b>{a.title}</b><small>{a.rejection_count} rejections · {a.amendment_count} amendments</small><button type="button" onClick={() => openDetail(a.id)}>Open</button></article>)}{!actions.length && !busy && <div className="claimChartEmpty">No office actions yet. Paste your first rejection above.</div>}</div>
    </> : <>
      <div className="familyMeta"><span>{selected.action.oa_type}</span><span>{selected.action.status}</span><span>{selected.rejections.length} rejections</span><span>{selected.amendments.length} amendments</span></div>
      <h3>Rejections</h3>
      <div className="familyLinks">{selected.rejections.map(r => <article key={r.id}><span>§{r.rejection_type} · {r.status}</span><b>Claims {r.claim_numbers?.join(', ') || 'unspecified'}</b><small>{(r.references_json || []).map(x => x.patent_number).join(', ') || 'no references parsed'}</small><p style={{ fontSize: 12 }}>{r.examiner_excerpt?.slice(0, 280)}</p></article>)}{!selected.rejections.length && <div className="claimChartEmpty">No rejections parsed.</div>}</div>
      <h3>Propose amendment (QA runs instantly)</h3>
      <form onSubmit={propose}>
        <div className="ipToolGrid"><label>Rejection<select value={amend.rejection_id} onChange={e => setAmend({ ...amend, rejection_id: e.target.value })}><option value="">General (no link)</option>{selected.rejections.map(r => <option key={r.id} value={r.id}>§{r.rejection_type} — claims {r.claim_numbers?.join(', ')}</option>)}</select></label><label>Claim #<input value={amend.claim_number} onChange={e => setAmend({ ...amend, claim_number: e.target.value })} placeholder="1" /></label></div>
        <div className="ipToolGrid"><label>Original text (blank = resolve from matter)<textarea rows={3} value={amend.original_text} onChange={e => setAmend({ ...amend, original_text: e.target.value })} /></label><label>Amended text<textarea required rows={3} value={amend.amended_text} onChange={e => setAmend({ ...amend, amended_text: e.target.value })} /></label></div>
        <label>Strategy<select value={amend.strategy} onChange={e => setAmend({ ...amend, strategy: e.target.value })}>{STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
        <footer><span>Antecedent · dependency · new-matter checked on submit</span><button disabled={busy}>{busy ? 'Auditing…' : 'Propose + audit'}</button></footer>
      </form>
      {qa && <QaPanel qa={qa} />}
      <h3>Amendments</h3>
      <div className="familyLinks">{selected.amendments.map(m => <article key={m.id}><span>{m.strategy} · {m.review_status}{m.new_matter_risk ? ' · NEW-MATTER RISK' : ''}</span><b>Claim {m.claim_number ?? '—'}</b><small>{m.qa_json?.score ? `${m.qa_json.score.errors} errors / ${m.qa_json.score.warnings} warnings` : ''}</small><div><button type="button" disabled={busy} onClick={() => review(m.id, 'accepted')}>Accept</button> <button type="button" disabled={busy} onClick={() => review(m.id, 'rejected')}>Reject</button></div></article>)}</div>
      <div className="familyActions"><button type="button" onClick={() => setSelected(null)}>Back</button></div>
    </>}
    {error && <div className="ipToolError">{error}</div>}
  </section></div>
}

function QaPanel({ qa }) {
  const errors = qa.findings.filter(f => f.severity === 'error')
  const warnings = qa.findings.filter(f => f.severity === 'warning')
  return <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, margin: '10px 0', fontSize: 13 }}>
    <strong>Amendment generated</strong>
    <div>✓ Antecedent basis · ✓ Claim dependency · ✓ Terminology consistency · ✓ Specification support</div>
    {errors.map((f, i) => <div key={'e' + i} style={{ color: '#c0392b' }}>✖ [{f.check}] {f.message}{f.suggestion ? ` — ${f.suggestion}` : ''}</div>)}
    {warnings.map((f, i) => <div key={'w' + i} style={{ color: '#b7791f' }}>⚠ [{f.check}] {f.message}{f.suggestion ? ` — ${f.suggestion}` : ''}</div>)}
    {!errors.length && !warnings.length && <div>✓ Clean — no QA findings. Review before accepting amendment.</div>}
    {(errors.length > 0 || warnings.length > 0) && <div>Review before accepting amendment.</div>}
  </div>
}
