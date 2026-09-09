import { useEffect, useState } from 'react'
import {
  FileText, Plus, ShieldCheck, AlertTriangle, CheckCircle2,
  Download, Sparkles, RefreshCw, X, Eye, Lock, Edit3, ChevronRight,
  HelpCircle, Check, BookOpen, Layers
} from 'lucide-react'

export default function PatentDraftingWorkspace({ matterId, onResult, isOpen, onClose }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [generatingSection, setGeneratingSection] = useState('')
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState([])
  const [selected, setSelected] = useState(null)
  const [activeTab, setActiveTab] = useState('101_screen') // '101_screen' | 'claims' | 'sections' | '112_matrix' | 'full_spec'

  // New Draft Form state
  const [newTitle, setNewTitle] = useState('')
  const [filingType, setFilingType] = useState('provisional_111b')
  const [disclosureText, setDisclosureText] = useState('')

  // Section editing state
  const [editingSection, setEditingSection] = useState(null)
  const [sectionContent, setSectionContent] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')

  // Export state
  const [exportFormat, setExportFormat] = useState('docx')
  const [fileUrl, setFileUrl] = useState('')
  const [attorneyNotes, setAttorneyNotes] = useState('')

  useEffect(() => {
    if (isOpen !== undefined) setOpen(isOpen)
  }, [isOpen])

  useEffect(() => {
    if (open) loadDrafts()
  }, [open, matterId])

  const request = async (url, options = {}) => {
    const res = await fetch(url, options)
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || 'Operation failed')
    return data
  }

  const loadDrafts = async () => {
    setBusy(true); setError('')
    try {
      const url = matterId ? `/api/patent-drafts?matter_id=${encodeURIComponent(matterId)}` : '/api/patent-drafts'
      const data = await request(url)
      setDrafts(data.drafts || [])
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const openDraft = async (id) => {
    setBusy(true); setError(''); setFileUrl('')
    try {
      const data = await request(`/api/patent-drafts?id=${encodeURIComponent(id)}`)
      setSelected(data)
      setAttorneyNotes(data.draft?.attorney_review_notes || '')
      setActiveTab('101_screen')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const handleCreateDraft = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return setError('Draft title is required.')
    setBusy(true); setError('')
    try {
      const data = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          matter_id: matterId || null,
          title: newTitle.trim(),
          filing_type: filingType,
          disclosure_text: disclosureText
        })
      })
      setDrafts(prev => [data.draft, ...prev])
      setSelected(data)
      setNewTitle(''); setDisclosureText('')
      onResult?.(`## Patent Draft Created\n\n**${data.draft.title}** initialized as a ${data.draft.filing_type === 'nonprovisional_111a' ? '35 U.S.C. § 111(a) Nonprovisional' : '35 U.S.C. § 111(b) Provisional'} application. § 101 screening ready.`, { task_class: 'PATENT_RESEARCH', source_basis: 'user_supplied' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const run101Screen = async () => {
    if (!selected?.draft) return
    setBusy(true); setError('')
    try {
      const data = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'screen_101',
          draft_id: selected.draft.id,
          disclosure_text: selected.draft.invention_summary
        })
      })
      setSelected(prev => ({ ...prev, draft: { ...prev.draft, screening_results: data.screening } }))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const handleGenerateSection = async (sectionKey) => {
    if (!selected?.draft) return
    setGeneratingSection(sectionKey); setError('')
    try {
      const data = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_section',
          draft_id: selected.draft.id,
          section_key: sectionKey,
          custom_instructions: customInstructions
        })
      })
      setSelected(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.section_key === sectionKey ? data.section : s)
      }))
      setCustomInstructions('')
    } catch (err) { setError(err.message) } finally { setGeneratingSection('') }
  }

  const handleSaveSectionEdit = async () => {
    if (!selected?.draft || !editingSection) return
    setBusy(true); setError('')
    try {
      const data = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_section',
          draft_id: selected.draft.id,
          section_key: editingSection,
          content: sectionContent
        })
      })
      setSelected(prev => ({
        ...prev,
        sections: prev.sections.map(s => s.section_key === editingSection ? data.section : s)
      }))
      setEditingSection(null)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const run112Verify = async () => {
    if (!selected?.draft) return
    setBusy(true); setError('')
    const claims = selected.sections.find(s => s.section_key === 'claims')?.content || ''
    const spec = selected.sections.find(s => s.section_key === 'detailed_description')?.content || ''
    try {
      const data = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_112',
          draft_id: selected.draft.id,
          claims_text: claims,
          spec_text: spec
        })
      })
      setSelected(prev => ({ ...prev, verification_112: data.verification }))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const handleApproveDraft = async () => {
    if (!selected?.draft) return
    setBusy(true); setError('')
    try {
      const data = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          draft_id: selected.draft.id,
          notes: attorneyNotes
        })
      })
      setSelected(prev => ({ ...prev, draft: data.draft }))
      onResult?.(`## Patent Draft Approved by Practitioner\n\n**${data.draft.title}** marked approved for filing preparation. Review notes recorded.`, { task_class: 'PATENT_RESEARCH', source_basis: 'verified' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const handleExportFullSpec = async () => {
    if (!selected?.draft) return
    setBusy(true); setError(''); setFileUrl('')
    try {
      const assembleData = await request('/api/patent-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assemble', draft_id: selected.draft.id })
      })
      const r = await fetch('/api/generate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat,
          title: selected.draft.title,
          content: assembleData.fullDoc
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.message || d?.error || 'File generation failed')
      const url = d.file?.url || d.url
      if (!url) throw new Error('No download URL returned')
      setFileUrl(url)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  if (!open) {
    return null
  }

  const screening = selected?.draft?.screening_results || {}
  const claimsSec = selected?.sections?.find(s => s.section_key === 'claims')
  const detailedSec = selected?.sections?.find(s => s.section_key === 'detailed_description')
  const verification112 = selected?.verification_112

  return (
    <div className="pdwModalBackdrop" onClick={() => { setOpen(false); onClose?.() }}>
      <div className="pdwModalCard" onClick={e => e.stopPropagation()}>
        {/* Workspace Header */}
        <div className="pdwHeader">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">US Patent Drafting Workspace</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  USPTO § 111
                </span>
                {selected?.draft?.is_approved && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Practitioner Approved
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Section-by-section specification drafting with 35 U.S.C. § 101 eligibility and § 112 support verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setOpen(false); onClose?.() }}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="pdwBody">
          {/* Left Sidebar: Projects list */}
          <div className="pdwSidebar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Your Drafts</span>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: '4px', borderRadius: '4px', background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}
                title="New Draft"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {drafts.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: '16px 0', textAlign: 'center' }}>No drafts yet. Create your first draft.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {drafts.map(d => (
                  <button
                    key={d.id}
                    onClick={() => openDraft(d.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: selected?.draft?.id === d.id ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.06)',
                      background: selected?.draft?.id === d.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
                      color: selected?.draft?.id === d.id ? '#a7f3d0' : 'rgba(255,255,255,0.8)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                      <span>{d.filing_type === 'nonprovisional_111a' ? '§ 111(a) Nonprov' : '§ 111(b) Prov'}</span>
                      <span style={{ color: d.is_approved ? '#60a5fa' : '#fbbf24' }}>
                        {d.is_approved ? 'Approved' : d.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Work Area */}
          <div className="pdwMain">
            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!selected ? (
              /* Create New Draft Form */
              <div className="pdwCard">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: '14px', marginBottom: '18px' }}>
                  <Plus className="w-4 h-4" /> Initialize New US Patent Specification
                </div>

                <form onSubmit={handleCreateDraft} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Invention Title</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="e.g., Decentralized Cryptographic Key Recovery Over Ephemeral Channels"
                      className="pdwInput"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Filing Category</label>
                    <div className="pdwGrid2">
                      <button
                        type="button"
                        onClick={() => setFilingType('provisional_111b')}
                        className={`pdwOptionBtn ${filingType === 'provisional_111b' ? 'selected' : ''}`}
                      >
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>Provisional (§ 111(b))</div>
                        <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Establishes 12-month priority date. No claim set required by law, but recommended.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilingType('nonprovisional_111a')}
                        className={`pdwOptionBtn ${filingType === 'nonprovisional_111a' ? 'selected' : ''}`}
                      >
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>Nonprovisional (§ 111(a))</div>
                        <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Full examination application. Requires complete claim set, formal spec, and abstract.</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Invention Disclosure / Technical Notes</label>
                    <textarea
                      rows={6}
                      value={disclosureText}
                      onChange={e => setDisclosureText(e.target.value)}
                      placeholder="Paste your technical invention description, system architecture notes, and novel concepts here. This grounds the AI so it doesn't hallucinate embodiments."
                      className="pdwInput"
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="pdwBtnPrimary"
                  >
                    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Patent Draft Workspace
                  </button>
                </form>
              </div>
            ) : (
              /* Active Draft Workspace */
              <div className="space-y-5">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('101_screen')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      activeTab === '101_screen'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> 1. § 101 Alice Screening
                  </button>

                  <button
                    onClick={() => setActiveTab('claims')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      activeTab === 'claims'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 2. Claims Architect
                  </button>

                  <button
                    onClick={() => setActiveTab('sections')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      activeTab === 'sections'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> 3. Section Generator
                  </button>

                  <button
                    onClick={() => setActiveTab('112_matrix')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      activeTab === '112_matrix'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> 4. § 112 Support Check
                  </button>

                  <button
                    onClick={() => setActiveTab('full_spec')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      activeTab === 'full_spec'
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> 5. Full Spec & Export
                  </button>
                </div>

                {/* Tab 1: § 101 Eligibility Screening */}
                {activeTab === '101_screen' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">35 U.S.C. § 101 Alice / Mayo Eligibility Screen</h3>
                        <p className="text-xs text-white/50">Screens against abstract idea, mental process, and mathematical algorithm rejections before drafting.</p>
                      </div>
                      <button
                        onClick={run101Screen}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                        Re-screen Disclosure
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                        <span className="text-[10px] uppercase text-white/40 font-semibold">Eligibility Risk Level</span>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-lg font-bold uppercase ${
                            screening.riskLevel === 'red' ? 'text-red-400' : screening.riskLevel === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {screening.riskLevel || 'Checked'} Risk
                          </span>
                          <span className="text-xs text-white/40">({screening.riskScore || 15}/100)</span>
                        </div>
                      </div>

                      <div className="col-span-2 p-4 rounded-xl bg-black/30 border border-white/10">
                        <span className="text-[10px] uppercase text-white/40 font-semibold">USPTO 2019 Revised Guidance Analysis</span>
                        <div className="mt-1.5 space-y-1 text-xs text-white/70">
                          <div><strong className="text-white/90">Step 2A (Prong 1):</strong> {screening.aliceProngAnalysis?.step2A_prong1 || 'Evaluating disclosure'}</div>
                          <div><strong className="text-white/90">Step 2A (Prong 2):</strong> {screening.aliceProngAnalysis?.step2A_prong2 || 'Check practical application integration'}</div>
                        </div>
                      </div>
                    </div>

                    {screening.risks && screening.risks.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-white/80">Identified § 101 Risk Categories</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {screening.risks.map((r, i) => (
                            <div key={i} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1">
                              <div className="font-semibold text-red-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" /> {r.category}
                              </div>
                              <p className="text-red-200/70 text-[11px]">{r.detail}</p>
                              {r.flaggedTerms && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {r.flaggedTerms.map((t, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-red-500/20 text-[10px] text-red-200">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {screening.recommendations && screening.recommendations.length > 0 && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                        <h4 className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Recommended Drafting Anchors to Survive § 101
                        </h4>
                        <ul className="list-disc list-inside text-xs text-emerald-200/80 space-y-1">
                          {screening.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Claims Architect */}
                {activeTab === 'claims' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Claims Architect (35 U.S.C. § 112)</h3>
                        <p className="text-xs text-white/50">Draft independent and dependent claims with strict antecedent basis.</p>
                      </div>
                      <button
                        onClick={() => handleGenerateSection('claims')}
                        disabled={generatingSection === 'claims'}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        {generatingSection === 'claims' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Generate Claims Set
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <textarea
                        rows={14}
                        value={claimsSec?.content || ''}
                        onChange={e => {
                          const val = e.target.value
                          setSelected(prev => ({
                            ...prev,
                            sections: prev.sections.map(s => s.section_key === 'claims' ? { ...s, content: val } : s)
                          }))
                        }}
                        placeholder="1. A method for autonomous cryptographic key recovery, comprising: ..."
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40">Words: {claimsSec?.word_count || 0}</span>
                        <button
                          onClick={() => {
                            setEditingSection('claims')
                            setSectionContent(claimsSec?.content || '')
                            handleSaveSectionEdit()
                          }}
                          className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
                        >
                          Save Claims
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Section Generator */}
                {activeTab === 'sections' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <h3 className="text-sm font-semibold text-white">Section-by-Section Specification Generator</h3>
                      <p className="text-xs text-white/50">Each USPTO section runs inside an isolated 350–850 token budget so nothing truncates.</p>
                    </div>

                    <div className="space-y-3">
                      {selected.sections.map(sec => (
                        <div key={sec.id} className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-white/40">
                                Part {sec.order_index}
                              </span>
                              <h4 className="text-xs font-semibold text-white">{sec.heading}</h4>
                              {sec.content ? (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> {sec.word_count} words
                                </span>
                              ) : (
                                <span className="text-[10px] text-white/30">Empty</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingSection(sec.section_key)
                                  setSectionContent(sec.content || '')
                                }}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-[11px] flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleGenerateSection(sec.section_key)}
                                disabled={generatingSection === sec.section_key}
                                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] border border-emerald-500/30 flex items-center gap-1"
                              >
                                {generatingSection === sec.section_key ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                {sec.content ? 'Regenerate' : 'Generate'}
                              </button>
                            </div>
                          </div>

                          {editingSection === sec.section_key ? (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <textarea
                                rows={8}
                                value={sectionContent}
                                onChange={e => setSectionContent(e.target.value)}
                                className="w-full p-2.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingSection(null)}
                                  className="px-3 py-1 rounded text-xs text-white/50 hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveSectionEdit}
                                  className="px-3 py-1 rounded bg-emerald-500 text-black font-semibold text-xs"
                                >
                                  Save Section
                                </button>
                              </div>
                            </div>
                          ) : sec.content ? (
                            <div className="p-3 rounded-lg bg-black/50 text-xs text-white/70 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] border border-white/5">
                              {sec.content.slice(0, 400)}
                              {sec.content.length > 400 && '...'}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 4: § 112 Support Check */}
                {activeTab === '112_matrix' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <div>
                        <h3 className="text-sm font-semibold text-white">35 U.S.C. § 112 Support & Antecedent Basis Matrix</h3>
                        <p className="text-xs text-white/50">Cross-checks every claim limitation against the Detailed Description to prevent § 112(a)/(b) rejections.</p>
                      </div>
                      <button
                        onClick={run112Verify}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                        Verify Support
                      </button>
                    </div>

                    {verification112?.issues && verification112.issues.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Antecedent & Enablement Gaps ({verification112.issues.length})
                        </h4>
                        <div className="space-y-1.5">
                          {verification112.issues.map((issue, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                              <span className="font-bold text-amber-400">Claim {issue.claimNumber}:</span>
                              <span>{issue.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {verification112?.matrix && (
                      <div className="p-4 rounded-xl bg-black/40 border border-white/10 overflow-x-auto">
                        <table className="w-full text-left text-xs text-white/70">
                          <thead>
                            <tr className="border-b border-white/10 text-white/40 uppercase text-[10px]">
                              <th className="py-2">Claim #</th>
                              <th className="py-2">Claim Limitation / Noun</th>
                              <th className="py-2">Specification Support</th>
                              <th className="py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {verification112.matrix.map((row, i) => (
                              <tr key={i}>
                                <td className="py-2 font-mono text-white/50">{row.claimNumber}</td>
                                <td className="py-2 font-medium text-white">{row.limitation}</td>
                                <td className="py-2 text-[11px] text-white/60">{row.note}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    row.status === 'supported' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                  }`}>
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 5: Full Spec & Export */}
                {activeTab === 'full_spec' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Practitioner Review Gate & Export</h3>
                        <p className="text-xs text-white/50">Audit review records, lock approval, and download in official document format.</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={exportFormat}
                          onChange={e => setExportFormat(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs"
                        >
                          <option value="docx">Word (.docx)</option>
                          <option value="pdf">PDF Document (.pdf)</option>
                          <option value="md">Markdown (.md)</option>
                        </select>

                        <button
                          onClick={handleExportFullSpec}
                          disabled={busy}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Download Full Spec
                        </button>
                      </div>
                    </div>

                    {fileUrl && (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                        <span>Specification file is compiled and ready.</span>
                        <a
                          href={fileUrl}
                          download
                          className="px-3 py-1 rounded bg-emerald-400 text-black font-semibold text-xs hover:bg-emerald-300"
                        >
                          Save File
                        </a>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Practitioner Approval Sign-off</span>
                        {selected.draft.is_approved ? (
                          <span className="text-xs text-blue-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4" /> Approved on {new Date(selected.draft.updated_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <button
                            onClick={handleApproveDraft}
                            disabled={busy}
                            className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Sign Off & Approve Draft
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={attorneyNotes}
                        onChange={e => setAttorneyNotes(e.target.value)}
                        placeholder="Practitioner review notes (e.g., Claim 1 verified against prior art, § 101 hardware integration confirmed, ready for client review)."
                        className="w-full p-2 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
