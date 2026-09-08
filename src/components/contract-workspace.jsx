import { useEffect, useState } from 'react'
import { FileText, Plus, ShieldCheck, X } from 'lucide-react'

export default function ContractWorkspace({ matterId, onResult }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [contracts, setContracts] = useState([])
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', template_slug: 'nda-mutual', variables: {} })
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [exportFormat, setExportFormat] = useState('docx')
  const [fileUrl, setFileUrl] = useState('')

  useEffect(() => { if (open) { loadContracts(); loadTemplates() } }, [open])
  const request = async (url, options) => { const r = await fetch(url, options); const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || 'Contract operation failed'); return d }
  const loadContracts = async () => { setBusy(true); setError(''); try { setContracts((await request('/api/contracts')).contracts || []) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  const loadTemplates = async () => { try { setTemplates((await request('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'templates' }) })).templates || []) } catch {} }
  const openDetail = async (id) => { setBusy(true); setError(''); setFileUrl(''); setEditing(false); try { const d = await request(`/api/contracts?id=${encodeURIComponent(id)}`); setSelected(d); setEditContent(d.content || '') } catch (e) { setError(e.message) } finally { setBusy(false) } }

  const activeTemplate = templates.find(t => t.slug === form.template_slug)
  const setVar = (k, v) => setForm(f => ({ ...f, variables: { ...f.variables, [k]: v } }))

  const create = async (e) => {
    e.preventDefault()
    if (!matterId && !form.title) return setError('Select a matter first.')
    setBusy(true); setError('')
    try {
      const d = await request('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', matter_id: matterId || null, title: form.title || activeTemplate?.title || 'Contract', template_slug: form.template_slug, variables: form.variables }) })
      setContracts(c => [d.contract, ...c]); setSelected(d); setEditContent(d.content || ''); setForm(f => ({ ...f, title: '', variables: {} }))
      onResult?.(`## Contract drafted\n\n**${d.contract.title}** v${d.contract.active_version} created from \`${form.template_slug}\`. Run Review to flag risks before export.`, { task_class: 'CONTRACT_DRAFT', source_basis: 'user_supplied' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const review = async () => {
    if (!selected?.contract) return
    setBusy(true); setError('')
    try {
      const d = await request('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review', contract_id: selected.contract.id }) })
      setSelected(d)
      const red = d.clauses.filter(c => c.risk_level === 'red').length, amber = d.clauses.filter(c => c.risk_level === 'amber').length
      onResult?.(`## Contract review — ${d.contract.title}\n\n${d.clauses.length} clauses: ${red} red, ${amber} amber. ${red + amber ? 'Resolve flagged clauses before signing.' : 'No high-risk language detected (keyword screen only — lawyer review still required).'}`, { task_class: 'CONTRACT_REVIEW', source_basis: 'user_supplied' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const saveEdit = async () => {
    if (!selected?.contract || editContent.trim().length < 20) return setError('Content is too short.')
    setBusy(true); setError('')
    try {
      const d = await request('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', contract_id: selected.contract.id, content: editContent }) })
      setSelected(d); setEditing(false)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const doExport = async () => {
    if (!selected?.contract) return
    setBusy(true); setError(''); setFileUrl('')
    try {
      const r = await fetch('/api/generate-file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: exportFormat, title: selected.contract.title, content: selected.content }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.message || d?.error || 'Export failed')
      const url = d.file?.url || d.url
      if (!url) throw new Error('No download returned')
      setFileUrl(url)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const close = () => { setOpen(false); setSelected(null); setEditing(false); setError(''); setFileUrl('') }
  const riskColor = (r) => r === 'red' ? '#c0392b' : r === 'amber' ? '#b7791f' : '#1e8449'

  return <><div className="familyLaunch"><button onClick={() => setOpen(true)}><FileText />Contracts</button></div>{open && <div className="ipToolOverlay" onMouseDown={e => e.target === e.currentTarget && close()}><section className="ipToolModal familyModal"><header><div><span>SALLY CONTRACTS / DRAFT · REVIEW · EXPORT</span><h2>{selected?.contract ? selected.contract.title : 'Draft from template'}</h2></div><button type="button" onClick={close}><X /></button></header>
    {!selected ? <>
      <form onSubmit={create}>
        <div className="ipToolGrid"><label>Template<select value={form.template_slug} onChange={e => setForm({ ...form, template_slug: e.target.value, variables: {} })}>{templates.map(t => <option key={t.slug} value={t.slug}>{t.title} ({t.contract_type})</option>)}</select></label><label>Title (optional)<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={activeTemplate?.title} /></label></div>
        {(activeTemplate?.variables || []).map(k => <label key={k}>{k}<input required value={form.variables[k] || ''} onChange={e => setVar(k, e.target.value)} /></label>)}
        <footer><span><ShieldCheck />Draft only — not legal advice</span><button disabled={busy}>{busy ? 'Drafting…' : 'Draft contract'}</button></footer>
      </form>
      <div className="familyLinks">{contracts.map(c => <article key={c.id}><span>{c.contract_type} · v{c.active_version}</span><b>{c.title}</b><small>{c.status}</small><button type="button" onClick={() => openDetail(c.id)}>Open</button></article>)}{!contracts.length && !busy && <div className="claimChartEmpty">No contracts yet. Draft your first from a template above.</div>}</div>
    </> : <>
      <div className="familyMeta"><span>{selected.contract.contract_type}</span><span>v{selected.contract.active_version}</span><span>{selected.contract.status}</span><span>{selected.clauses.length} clauses reviewed</span></div>
      {editing
        ? <><label>Content (Markdown)<textarea rows={14} value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%' }} /></label><div className="familyActions"><button type="button" onClick={() => { setEditing(false); setEditContent(selected.content) }}>Cancel</button><button type="button" disabled={busy} onClick={saveEdit}><Plus />{busy ? 'Saving…' : 'Save as new version'}</button></div></>
        : <><div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #ddd', padding: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>{selected.content}</div>
          <div className="familyLinks">{selected.clauses.map(c => <article key={c.ordinal}><span style={{ color: riskColor(c.risk_level), fontWeight: 700 }}>{c.risk_level.toUpperCase()}</span><b>{c.ordinal}. {c.heading}</b>{c.note && <small>{c.note}</small>}</article>)}{!selected.clauses.length && <div className="claimChartEmpty">Not reviewed yet — run Review to flag risks.</div>}</div>
          <div className="familyActions"><button type="button" onClick={() => setSelected(null)}>Back</button><button type="button" disabled={busy} onClick={review}>{busy ? 'Reviewing…' : 'Run review'}</button><button type="button" onClick={() => setEditing(true)}>Edit</button></div>
          <div className="ipToolGrid"><label>Export format<select value={exportFormat} onChange={e => setExportFormat(e.target.value)}><option value="docx">Word (.docx)</option><option value="pdf">PDF</option><option value="md">Markdown</option></select></label><label>&nbsp;<button type="button" disabled={busy} onClick={doExport}>{busy ? 'Exporting…' : 'Export file'}</button></label></div>
          {fileUrl && <p><a href={fileUrl} download>Download {exportFormat.toUpperCase()}</a></p>}</>}
    </>}
    {error && <div className="ipToolError">{error}</div>}
  </section></div>}</>
}
