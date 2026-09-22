import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, X, ChevronRight, RefreshCw, Clipboard, AlertTriangle, CheckCircle, Loader2, ChevronDown, Wand2, Scale, Shield, Zap } from 'lucide-react'
import { buildExportPayload, DOC_FORMATS } from '../../lib/doc-export.js'
import { loadDocumentProfile, assembleDocument } from '../../lib/document-engine.js'
import { getClauseVariant } from '../../lib/document-engine.js'

export default function DocumentEngineWorkspace({ documentSlug, onClose, onResult, matterContext }) {
  const [profile, setProfile] = useState(null)
  const [outline, setOutline] = useState([])
  const [answers, setAnswers] = useState({})
  const [drafting, setDrafting] = useState(false)
  const [content, setContent] = useState('')
  const [activeSection, setActiveSection] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [exportFormat, setExportFormat] = useState('docx')
  const [fileUrl, setFileUrl] = useState('')
  const [jurisdiction, setJurisdiction] = useState('US')
  const [streaming, setStreaming] = useState(false)
  const [clauseAlternatives, setClauseAlternatives] = useState({})
  const [provenance, setProvenance] = useState({})

  useEffect(() => {
    if (documentSlug) {
      loadProfile(documentSlug)
    }
  }, [documentSlug])

  useEffect(() => {
    if (profile && !drafting) {
      const initialAnswers = {}
      if (matterContext?.matter?.client_name) initialAnswers.party_a = matterContext.matter.client_name
      if (matterContext?.matter?.jurisdictions?.['0']) initialAnswers.governing_law = matterContext.matter.jurisdictions['0']
      setAnswers(initialAnswers)
      buildOutline(profile, initialAnswers)
    }
  }, [profile, matterContext])

  async function loadProfile(slug) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/documents?action=profile&slug=${slug}`)
      const data = await res.json()
      setProfile(data.profile)
      setJurisdiction(data.profile?.jurisdiction_scope?.[0] || 'US')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  function evalShowIfLocal(showIf, ans = {}) {
    if (!showIf) return true
    if (typeof showIf === 'boolean') return showIf
    const s = String(showIf).trim()
    const eq = s.match(/^answers\.([a-zA-Z0-9_]+)\s*(==|!=)\s*['"]([^'"]{0,120})['"]$/)
    if (eq) {
      const val = ans[eq[1]]
      return eq[2] === '==' ? String(val ?? '') === eq[3] : String(val ?? '') !== eq[3]
    }
    const truthy = s.match(/^answers\.([a-zA-Z0-9_]+)$/)
    if (truthy) return Boolean(ans[truthy[1]])
    return true
  }
  function buildOutline(profile, ans) {
    if (!profile) return
    const selected = (profile.sections || []).filter(s => {
      if (!s.show_if) return true
      try { return evalShowIfLocal(s.show_if, ans) } catch { return true }
    }).sort((a, b) => a.order - b.order)
    setOutline(selected.map((s, i) => ({
      ...s,
      index: i,
      status: s.required ? 'REQUIRED' : 'OPTIONAL',
      content: null,
      provenance: 'PLACEHOLDER',
      alternatives: (profile.alternative_positions || []).filter(a => a.section_id === s.id)
    })))
  }

  const startDraft = async () => {
    setDrafting(true)
    setStreaming(true)
    setBusy(true)
    setError('')
    setContent('')
    const outlineContent = profile.sections.map(s => `## ${s.heading}\n\n[Drafting ${s.heading}...]`).join('\n\n')
    setContent(`# ${profile.name}\n\n**Jurisdiction**: ${jurisdiction}\n\n${outlineContent}`)

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', document_family: profile.slug, jurisdiction, answers, matter_id: matterContext?.matter?.id })
      })
      const data = await res.json()
      if (data.draft_plan) {
        await streamDraft(profile, data.draft_plan)
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false); setStreaming(false) }
  }

  async function streamDraft(profile, draftPlan) {
    setContent('')
    let fullContent = `# ${profile.name}\n\n**Jurisdiction**: ${jurisdiction}\n\n`
    for (const section of draftPlan.sections || profile.sections) {
      const sectionContent = await generateSectionContent(section, answers, jurisdiction)
      fullContent += `\n## ${section.heading}\n\n${sectionContent}\n`
      setContent(fullContent)
      await new Promise(r => setTimeout(r, 300))
    }
    setContent(fullContent)
    setProvenance({ generated_by: 'document-engine', profile: profile.slug, jurisdiction, status: 'AI_GENERATED' })
  }

  async function generateSectionContent(section, answers, jurisdiction) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          message: `Draft this section: "${section.heading}" for ${profile.name} in ${jurisdiction}. Use these facts: ${JSON.stringify(answers)}`,
          document_mode: true,
          profile: profile.slug,
          section_id: section.id
        })
      })
      const data = await res.json()
      return data.message || '[Section content pending]'
    } catch { return '[Content generation pending]' }
  }

  const regenerateSection = async (sectionIndex) => {
    const section = outline[sectionIndex]
    if (!section) return
    setBusy(true)
    try {
      const content = await generateSectionContent(section, answers, jurisdiction)
      const newOutline = [...outline]
      newOutline[sectionIndex] = { ...newOutline[sectionIndex], content, provenance: 'AI_GENERATED' }
      setOutline(newOutline)
      let fullContent = `# ${profile.name}\n\n`
      for (const s of newOutline) {
        fullContent += `\n## ${s.heading}\n\n${s.content || '[Pending]'}\n`
      }
      setContent(fullContent)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const replaceClause = (sectionIndex, clauseFamily) => {
    const variants = ['NEUTRAL', 'CUSTOMER_FRIENDLY', 'SUPPLIER_FRIENDLY', 'LICENSOR_FRIENDLY']
    const currentPosition = clauseAlternatives[clauseFamily] || 'NEUTRAL'
    const idx = variants.indexOf(currentPosition)
    const nextPosition = variants[(idx + 1) % variants.length]
    setClauseAlternatives(prev => ({ ...prev, [clauseFamily]: nextPosition }))
  }

  const explainClause = (clauseFamily) => {
    const explanation = {
      'confidentiality.definition': 'Defines the scope of information protected by this agreement. Must be specific enough to be enforceable but broad enough to cover all relevant information.',
      'confidentiality.duration': 'Sets the time period during which confidentiality obligations apply. Market norms typically 24-36 months for commercial NDAs.',
      'ip.background': 'Preserves pre-existing IP rights of each party. Critical to ensure no implied license is created.',
      'liability.cap': 'Limits the maximum damages one party can recover. Often capped at fees paid, with carve-outs for IP, confidentiality, and data breaches.',
      'disputes.courts': 'Determines the forum for dispute resolution. Can specify courts, arbitration, or mediation.'
    }
    return explanation[clauseFamily] || 'Clause explanation coming soon.'
  }

  const flagRisk = (sectionIndex, risk) => {
    const newOutline = [...outline]
    newOutline[sectionIndex] = { ...newOutline[sectionIndex], risk_flags: [...(newOutline[sectionIndex].risk_flags || []), risk] }
    setOutline(newOutline)
    setError(`${risk.description} — Requires lawyer review`)
  }

  const verifyContent = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', profile, jurisdiction, content })
      })
      const data = await res.json()
      return data
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const doExport = async (format) => {
    if (!content?.trim()) return
    setBusy(true)
    try {
      const r = await fetch('/api/generate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildExportPayload({ title: profile?.name || 'Document', content }, format))
      })
      const d = await r.json()
      if (d.file) { setFileUrl(d.file.url) }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  if (busy && !content) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin w-6 h-6" /><span className="ml-2">Loading document engine…</span></div>

  return (
    <aside className="docPanel" style={{ width: 420 }}>
      <div className="docPanelHead">
        <div>
          <strong>{profile?.name || 'Document Engine'}</strong>
          <small style={{ marginLeft: 8 }}>
            {profile?.status} · {jurisdiction} · {outline.filter(s => s.status === 'REQUIRED').length} required sections
          </small>
        </div>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>

      <div className="docPanelBody" style={{ maxHeight: 350, overflow: 'auto' }}>
        {!profile ? (
          <div className="text-center p-4">
            <FileText className="w-8 h-8 mx-auto opacity-30" />
            <p className="mt-2 text-sm opacity-50">Select a document type from the Documents menu</p>
          </div>
        ) : !content ? (
          <div>
            <p className="text-sm mb-3">Ready to draft <strong>{profile.name}</strong></p>
            {outline.length > 0 && (
              <div className="space-y-1 mb-4">
                {outline.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs p-2 rounded hover:bg-slate-100 cursor-pointer" onClick={() => setActiveSection(i)}>
                    {s.status === 'REQUIRED' ? <Shield className="w-3 h-3 text-red-500" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{s.heading}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={startDraft} disabled={drafting} className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {drafting ? <><Loader2 className="animate-spin w-4 h-4 inline mr-1" />Drafting…</> : <><Wand2 className="w-4 h-4 inline mr-1" />Draft Document</>}
            </button>
          </div>
        ) : (
          <div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {streaming && <span className="beebotStreamingCursor" />}
          </div>
        )}
      </div>

      {content && (
        <div className="docPanelFoot">
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => regenerateSection(activeSection)} disabled={busy} title="Regenerate section" className="p-1 rounded hover:bg-slate-100"><RefreshCw className="w-3 h-3" /></button>
            <button onClick={() => replaceClause(activeSection, outline[activeSection]?.clause_families?.[0] || '')} disabled={busy} title="Alternative clause" className="p-1 rounded hover:bg-slate-100"><Scale className="w-3 h-3" /></button>
            <button onClick={() => flagRisk(activeSection, { level: 'MEDIUM', description: 'Flagged by user', mitigation: 'Review required' })} disabled={busy} title="Flag risk" className="p-1 rounded hover:bg-slate-100"><AlertTriangle className="w-3 h-3" /></button>
            <button onClick={() => verifyContent()} disabled={busy} title="Verify" className="p-1 rounded hover:bg-slate-100"><CheckCircle className="w-3 h-3" /></button>
            <button onClick={() => { const sel = window.getSelection().toString(); navigator.clipboard?.writeText(sel || content.slice(0, 200)) }} title="Copy" className="p-1 rounded hover:bg-slate-100"><Clipboard className="w-3 h-3" /></button>
          </div>
          <div className="flex gap-1 mt-2">
            {DOC_FORMATS.map(f => (
              <button key={f.id} onClick={() => doExport(f.id)} disabled={busy} className="text-xs px-2 py-1 border rounded hover:bg-slate-50">{f.label}</button>
            ))}
          </div>
          {fileUrl && <p className="text-xs mt-1"><a href={fileUrl} download>Download {exportFormat.toUpperCase()}</a></p>}
          {error && <div className="docPanelError text-xs mt-1">{error}</div>}
        </div>
      )}
    </aside>
  )
}