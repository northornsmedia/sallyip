import { useEffect, useState } from 'react'
import { BookTemplate, Play, Plus, X } from 'lucide-react'

const WORKFLOW_TYPES = ['invention_intake','patent_dispute','document_review','official_search','verification_desk','trademark_intelligence','trademark_similarity','trademark_clearance','prosecution_history','patent_family','novelty','inventive_step','prior_art','fto','claim_chart','patentability','evidence_chronology','copyright_analysis','ip_transaction','contract_draft','contract_review']

const emptyForm = { name: '', workflow_type: 'fto', description: '', instruction_template: '', default_jurisdiction: '', checks: '' }

export default function PlaybookWorkspace({ matterId, conversationId, onResult }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [playbooks, setPlaybooks] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [variables, setVariables] = useState('')

  useEffect(() => { if (open) load() }, [open])
  const request = async (url, options) => { const r = await fetch(url, options); const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message || 'Playbook operation failed'); return d }
  const load = async () => { setBusy(true); setError(''); try { setPlaybooks((await request('/api/playbooks')).playbooks || []) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  const openDetail = async (id) => { setBusy(true); setError(''); try { setSelected(await request(`/api/playbooks?id=${encodeURIComponent(id)}`)) } catch (e) { setError(e.message) } finally { setBusy(false) } }

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const data = await request('/api/playbooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: form.name, workflow_type: form.workflow_type, description: form.description, definition: { instruction_template: form.instruction_template, default_jurisdiction: form.default_jurisdiction || null, checks: form.checks.split('\n').map(s => s.trim()).filter(Boolean) } }) })
      setPlaybooks(p => [data.playbook, ...p]); setSelected(data); setForm(emptyForm)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const run = async (e) => {
    e.preventDefault()
    if (!matterId) return setError('Select a matter first.')
    if (!selected?.playbook) return setError('Select a playbook first.')
    setBusy(true); setError('')
    try {
      let vars = {}
      if (variables.trim()) { try { vars = JSON.parse(variables) } catch { throw new Error('Variables must be valid JSON, e.g. {"product":"Product X"}') } }
      const data = await request('/api/playbooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', playbook_id: selected.playbook.id, matter_id: matterId, conversation_id: conversationId || null, variables: vars }) })
      onResult?.(`## Playbook run — ${selected.playbook.name}\n\n${data.summary || 'Workflow completed.'}\n\nRun: \`${data.run_id}\` · Status: ${data.status}`, { task_class: 'PLAYBOOK_RUN', source_basis: 'matter_sources' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const close = () => { setOpen(false); setSelected(null); setError('') }

  return <><div className="familyLaunch"><button onClick={() => setOpen(true)}><BookTemplate />Playbooks</button></div>{open && <div className="ipToolOverlay" onMouseDown={e => e.target === e.currentTarget && close()}><section className="ipToolModal familyModal"><header><div><span>SALLY WORKFLOWS / PLAYBOOKS</span><h2>{selected?.playbook ? selected.playbook.name : 'Reusable legal playbooks'}</h2></div><button type="button" onClick={close}><X /></button></header>
    {!selected ? <>
      <form onSubmit={create}><div className="ipToolGrid"><label>Playbook name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="FTO India standard" /></label><label>Workflow<select value={form.workflow_type} onChange={e => setForm({ ...form, workflow_type: e.target.value })}>{WORKFLOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></label></div>
        <label>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="When to use this playbook" /></label>
        <label>Instruction template<textarea required value={form.instruction_template} onChange={e => setForm({ ...form, instruction_template: e.target.value })} placeholder="Run an FTO analysis for {{product}} in India." /></label>
        <div className="ipToolGrid"><label>Default jurisdiction<input value={form.default_jurisdiction} onChange={e => setForm({ ...form, default_jurisdiction: e.target.value })} placeholder="India / EU / US" /></label><label>Checks (one per line)<input value={form.checks} onChange={e => setForm({ ...form, checks: e.target.value })} placeholder="extract features" /></label></div>
        <footer><span>Versioned on every save</span><button disabled={busy}>{busy ? 'Saving…' : 'Save playbook'}</button></footer></form>
      <div className="familyLinks">{playbooks.map(p => <article key={p.id}><span>{p.workflow_type}</span><b>{p.name}</b><small>v{p.latest_version || 1} · {p.run_count || 0} runs</small><button type="button" onClick={() => openDetail(p.id)}>Open</button></article>)}{!playbooks.length && !busy && <div className="claimChartEmpty">No playbooks yet. Save your first repeatable workflow above.</div>}</div>
    </> : <>
      <div className="familyMeta"><span>{selected.playbook.workflow_type}</span><span>v{selected.versions?.[0]?.version || 1}</span><span>{selected.versions?.length || 1} versions</span></div>
      <p className="officialSearchNote">{selected.playbook.definition?.instruction_template}</p>
      <form onSubmit={run}><label>Variables (JSON)<textarea value={variables} onChange={e => setVariables(e.target.value)} placeholder='{"product":"Product X"}' /></label><div className="familyActions"><button type="button" onClick={() => setSelected(null)}>Back</button><button disabled={busy}><Play />{busy ? 'Running…' : 'Run in this matter'}</button></div></form>
      {selected.versions?.slice(1).length > 0 && <div className="familyLinks">{selected.versions.slice(1, 6).map(v => <article key={v.id}><span>v{v.version}</span><small>{new Date(v.created_at).toLocaleString()}</small></article>)}</div>}
    </>}
    {error && <div className="ipToolError">{error}</div>}
  </section></div>}</>
}
