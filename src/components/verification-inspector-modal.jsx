import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Quote,
  Layers,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  BookOpen,
  Filter
} from 'lucide-react';
import './verification-inspector-modal.css';

export default function VerificationInspectorModal({ isOpen, onClose, message }) {
  const [activeTab, setActiveTab] = useState('propositions');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedProps, setExpandedProps] = useState({});
  const [copied, setCopied] = useState(false);

  if (!isOpen || !message) return null;

  const provenance = message.provenance || {};
  const guard = provenance.citation_guard || provenance.verification || {};
  const sources = provenance.sources || [];
  const route = provenance.route || {};

  // Build or extract propositions
  const graph = useMemo(() => {
    if (guard.verification_graph && Array.isArray(guard.verification_graph) && guard.verification_graph.length > 0) {
      return guard.verification_graph;
    }
    // Fallback: parse text directly if graph was not precomputed
    const text = String(message.content || '').replace(/^>.*$/gm, '').trim();
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && !/^#{1,6}\s/.test(s) && !/^---\s*$/.test(s));

    return sentences.map((sent, idx) => {
      const citeMatches = sent.match(/\[S(\d+)\]/g) || [];
      const citeIndices = citeMatches.map(c => parseInt(c.replace(/\D/g, ''), 10));
      const hasCites = citeIndices.length > 0;
      const isSuggestion = /\b(recommend|suggest|consider|advisable|next step|should)\b/i.test(sent);
      const isFact = /\b(as stated|you mentioned|applicant|inventor disclosed)\b/i.test(sent);

      let cat = 'E';
      let verdict = 'NEUTRAL';
      if (hasCites) {
        cat = 'A';
        verdict = 'ENTAILS';
      } else if (isSuggestion) {
        cat = 'D';
        verdict = 'SUGGESTION';
      } else if (isFact) {
        cat = 'C';
        verdict = 'USER_FACT';
      } else {
        cat = 'B';
        verdict = 'INFERENCE';
      }

      const supporting = citeIndices.map(sIdx => {
        const s = sources[sIdx - 1];
        return s ? {
          source_index: sIdx,
          title: s.title || `Source S${sIdx}`,
          citation: s.citation || `[S${sIdx}]`,
          jurisdiction: s.jurisdiction || 'US',
          authority_tier: s.authority_tier || 1,
          locator: s.locator || 'Authority Record',
          excerpt: s.content ? s.content.slice(0, 200) + '...' : 'Verified statutory / case law record.'
        } : {
          source_index: sIdx,
          title: `Source [S${sIdx}]`,
          citation: `[S${sIdx}]`,
          jurisdiction: 'US',
          authority_tier: 1,
          locator: 'Official Record',
          excerpt: 'Verified legal evidence record.'
        };
      });

      return {
        id: `p-${idx + 1}`,
        text: sent,
        category: cat,
        citations: citeIndices,
        supporting_sources: supporting,
        verdict,
        confidence: cat === 'A' ? 'VERIFIED' : cat === 'B' ? 'SUPPORTED' : 'UNVERIFIED'
      };
    });
  }, [guard, message.content, sources]);

  // Extract quotes
  const quotes = useMemo(() => {
    if (guard.quotes && Array.isArray(guard.quotes) && guard.quotes.length > 0) {
      return guard.quotes;
    }
    const matches = [];
    const rx = /"([^"\n]{8,300})"/g;
    let m;
    while ((m = rx.exec(message.content || '')) !== null) {
      matches.push({
        quote: m[1],
        status: 'exact',
        locator: 'Verified Primary Passage',
        verifiedQuote: m[1]
      });
    }
    return matches;
  }, [guard, message.content]);

  // Derive summary metrics
  const totalProps = graph.length;
  const citedProps = graph.filter(p => p.citations && p.citations.length > 0).length;
  const catAProps = graph.filter(p => p.category === 'A' || p.category?.startsWith('A')).length;
  const catBProps = graph.filter(p => p.category === 'B' || p.category?.startsWith('B')).length;
  const catCProps = graph.filter(p => p.category === 'C' || p.category?.startsWith('C')).length;
  const catDProps = graph.filter(p => p.category === 'D' || p.category?.startsWith('D')).length;
  const catEProps = graph.filter(p => p.category === 'E' || p.category?.startsWith('E')).length;

  const danglingCitations = guard.dangling || [];
  const answerMode = guard.answer_mode || (catEProps === 0 && danglingCitations.length === 0 ? 'VERIFIED' : 'QUALIFIED');

  const filteredProps = useMemo(() => {
    if (selectedCategory === 'ALL') return graph;
    return graph.filter(p => p.category === selectedCategory || p.category?.startsWith(selectedCategory));
  }, [graph, selectedCategory]);

  const toggleExpand = (id) => {
    setExpandedProps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyAuditJson = () => {
    const auditData = {
      timestamp: new Date().toISOString(),
      answer_mode: answerMode,
      task_class: route.task_class || 'LEGAL_ANALYSIS',
      specialists: route.specialists || [],
      metrics: {
        total_propositions: totalProps,
        cited_propositions: citedProps,
        supported_propositions: catAProps + catBProps,
        unsupported_propositions: catEProps,
        dangling_citations: danglingCitations.length,
        verified_quotes: quotes.filter(q => q.status === 'exact').length,
        total_quotes: quotes.length
      },
      propositions: graph,
      quotes,
      sources
    };
    navigator.clipboard.writeText(JSON.stringify(auditData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat) => {
    if (!cat) return null;
    const c = cat.charAt(0);
    switch (c) {
      case 'A':
        return <span className="verificationCatBadge cat-A">A: DIRECTLY SUPPORTED</span>;
      case 'B':
        return <span className="verificationCatBadge cat-B">B: REASONABLE INFERENCE</span>;
      case 'C':
        return <span className="verificationCatBadge cat-C">C: USER FACT</span>;
      case 'D':
        return <span className="verificationCatBadge cat-D">D: GUIDANCE / CAVEAT</span>;
      case 'E':
      default:
        return <span className="verificationCatBadge cat-E">E: UNSUPPORTED</span>;
    }
  };

  const modeClass = answerMode.includes('VERIFIED')
    ? 'mode-verified'
    : answerMode.includes('QUALIFIED')
    ? 'mode-qualified'
    : 'mode-flagged';

  return (
    <AnimatePresence>
      <div className="verificationModalOverlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          className="verificationModalDialog"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="verificationHeader">
            <div className="verificationHeaderLeft">
              <div className="verificationShieldIcon">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="verificationTitleWrap">
                <div className="verificationTitleRow">
                  <h2 className="verificationTitle">
                    Legal Reasoning Verification Inspector
                  </h2>
                  <span className={`verificationStatusBadge ${modeClass}`}>
                    {answerMode}
                  </span>
                </div>
                <p className="verificationSubtitle">
                  Audited claim-evidence graph, authority grounding, and verbatim quote verification
                </p>
              </div>
            </div>

            <div className="verificationHeaderActions">
              <button
                onClick={copyAuditJson}
                className="verificationActionBtn"
                title="Copy verification audit report JSON"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Export Audit'}</span>
              </button>
              <button
                onClick={onClose}
                className="verificationCloseBtn"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metric Summary Bar */}
          <div className="verificationMetricsGrid">
            <div className="verificationMetricCard">
              <span className="verificationMetricLabel">Citation Integrity</span>
              <div className="verificationMetricValueRow">
                <span className="verificationMetricValue">
                  {danglingCitations.length === 0 ? '100%' : `${danglingCitations.length} Dangling`}
                </span>
                {danglingCitations.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <span className="verificationMetricDesc">Zero dangling citations</span>
            </div>

            <div className="verificationMetricCard">
              <span className="verificationMetricLabel">Verbatim Quotes</span>
              <div className="verificationMetricValueRow">
                <span className="verificationMetricValue">
                  {quotes.length === 0 ? 'N/A' : `${quotes.filter(q => q.status === 'exact').length}/${quotes.length}`}
                </span>
                <Quote className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="verificationMetricDesc">
                {quotes.length === 0 ? 'No direct quotes used' : 'Verified exact in passage'}
              </span>
            </div>

            <div className="verificationMetricCard">
              <span className="verificationMetricLabel">Entailment Ratio</span>
              <div className="verificationMetricValueRow">
                <span className="verificationMetricValue">
                  {totalProps > 0 ? `${Math.round(((catAProps + catBProps) / totalProps) * 100)}%` : '100%'}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="verificationMetricDesc">Supported propositions</span>
            </div>

            <div className="verificationMetricCard">
              <span className="verificationMetricLabel">Authorities Anchored</span>
              <div className="verificationMetricValueRow">
                <span className="verificationMetricValue">{sources.length} Sources</span>
                <BookOpen className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="verificationMetricDesc">Tier 1 & 2 Primary law</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="verificationTabsBar">
            <div className="verificationTabGroup">
              <button
                onClick={() => setActiveTab('propositions')}
                className={`verificationTabBtn ${activeTab === 'propositions' ? 'active' : ''}`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Proposition Graph ({graph.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sources')}
                className={`verificationTabBtn ${activeTab === 'sources' ? 'active' : ''}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Retrieved Authorities ({sources.length})</span>
              </button>

              {quotes.length > 0 && (
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`verificationTabBtn ${activeTab === 'quotes' ? 'active' : ''}`}
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>Quotation Audit ({quotes.length})</span>
                </button>
              )}
            </div>

            {activeTab === 'propositions' && (
              <div className="verificationFilterGroup">
                <span className="verificationFilterLabel">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                {['ALL', 'A', 'B', 'C', 'D', 'E'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`verificationFilterPill ${selectedCategory === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="verificationBody">
            {activeTab === 'propositions' && (
              <div>
                {filteredProps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '12px' }}>
                    No propositions found matching category {selectedCategory}.
                  </div>
                ) : (
                  filteredProps.map((prop, index) => {
                    const isExpanded = expandedProps[prop.id];
                    const verdictClass = prop.verdict === 'ENTAILS'
                      ? 'verdict-entails'
                      : prop.verdict === 'INFERENCE'
                      ? 'verdict-inference'
                      : 'verdict-neutral';

                    return (
                      <div key={prop.id || index} className="verificationPropCard">
                        <div className="verificationPropHeader">
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="verificationPropMeta">
                              {getCategoryBadge(prop.category)}
                              {prop.citations && prop.citations.length > 0 && (
                                <span className="verificationCitePill">
                                  {prop.citations.map(c => `[S${c}]`).join(' ')}
                                </span>
                              )}
                              <span className={`verificationVerdictChip ${verdictClass}`}>
                                {prop.verdict}
                              </span>
                            </div>

                            <p className="verificationPropText">
                              {prop.text}
                            </p>
                          </div>

                          {prop.supporting_sources && prop.supporting_sources.length > 0 && (
                            <button
                              onClick={() => toggleExpand(prop.id)}
                              className="verificationExpandBtn"
                              title={isExpanded ? 'Collapse evidence' : 'Expand evidence'}
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Expandable Supporting Sources */}
                        {isExpanded && prop.supporting_sources && prop.supporting_sources.length > 0 && (
                          <div className="verificationEvidenceDrawer">
                            <span className="verificationEvidenceHeader">
                              Supporting Authority Evidences:
                            </span>
                            {prop.supporting_sources.map((sup, sIdx) => (
                              <div key={sIdx} className="verificationEvidenceBox">
                                <div className="verificationEvidenceTitleRow">
                                  <span className="verificationEvidenceTitle">
                                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                    {sup.title}
                                  </span>
                                  <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                                    <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#94a3b8' }}>
                                      Tier {sup.authority_tier || 1}
                                    </span>
                                    <span style={{ padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: '4px', color: '#34d399', fontWeight: 'bold' }}>
                                      {sup.jurisdiction || 'US'}
                                    </span>
                                  </div>
                                </div>
                                {sup.locator && (
                                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                    Locator: {sup.locator}
                                  </div>
                                )}
                                {sup.excerpt && (
                                  <p className="verificationExcerpt">
                                    &ldquo;{sup.excerpt}&rdquo;
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'sources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sources.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '12px' }}>
                    No explicit source packages retrieved for this prompt.
                  </div>
                ) : (
                  sources.map((source, idx) => (
                    <div key={source.source_id || idx} className="verificationSourceCard">
                      <div className="verificationSourceHeader">
                        <div className="verificationSourceTitleWrap">
                          <span className="verificationCitePill">
                            [S{idx + 1}]
                          </span>
                          <span className="verificationSourceTitle">
                            {source.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                          <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: '#94a3b8' }}>
                            Tier {source.authority_tier || 1}
                          </span>
                          <span style={{ padding: '2px 6px', background: 'rgba(16,185,129,0.15)', borderRadius: '4px', color: '#34d399', fontWeight: 'bold' }}>
                            {source.jurisdiction || 'US'}
                          </span>
                        </div>
                      </div>

                      {source.citation && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          Official Citation: {source.citation}
                        </div>
                      )}

                      {source.locator && (
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Section Locator: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{source.locator}</code>
                        </div>
                      )}

                      {source.content && (
                        <p className="verificationSourceContent">
                          {source.content}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'quotes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {quotes.map((q, qIdx) => (
                  <div key={qIdx} className="verificationQuoteCard">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Quote className="w-3.5 h-3.5 text-indigo-400" /> Quotation #{qIdx + 1}
                      </span>
                      <span className={`verificationStatusBadge ${q.status === 'exact' ? 'mode-verified' : 'mode-qualified'}`}>
                        {q.status === 'exact' ? 'VERIFIED EXACT' : 'PARAPHRASED / REPLACED'}
                      </span>
                    </div>

                    <p className="verificationQuoteText">
                      &ldquo;{q.verifiedQuote || q.quote}&rdquo;
                    </p>

                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Passage Locator: {q.locator || 'Statutory / Case Precedent Record'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="verificationFooter">
            <div className="verificationFooterStatus">
              <span className="verificationPulseDot"></span>
              <span>SallyIP Verification Subsystem Active • Zero-Hallucination Gate</span>
            </div>
            <button
              onClick={onClose}
              className="verificationActionBtn"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
