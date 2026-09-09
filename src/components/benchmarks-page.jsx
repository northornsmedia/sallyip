import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  Layers,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';

const BENCHMARK_CATEGORIES = [
  { id: 'all', label: 'All Domains (100 Questions)' },
  { id: 's101', label: '35 U.S.C. § 101 Eligibility' },
  { id: 's102a', label: '35 U.S.C. § 102(a) Prior Art' },
  { id: 's102b', label: '35 U.S.C. § 102(b) Grace Period' },
  { id: 's103', label: '35 U.S.C. § 103 Obviousness' },
  { id: 's111', label: '35 U.S.C. § 111 Provisional Priority' },
  { id: 's112', label: '35 U.S.C. § 112 Enablement & Best Mode' },
  { id: 'mpep', label: 'MPEP § 2106 Examination Guidance' },
];

const SAMPLE_BENCHMARK_ITEMS = [
  {
    key: 's101-01',
    category: 's101',
    domain: '35 U.S.C. § 101',
    prompt: 'Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.',
    expected: '35 U.S.C. § 101',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 101)',
    citation: '[S1] U.S.C. Title 35 § 101',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 's101-04',
    category: 's101',
    domain: '35 U.S.C. § 101',
    prompt: 'What word does 35 U.S.C. § 101 use regarding the inventor: "whoever invents or..."? Quote and cite.',
    expected: '35 U.S.C. § 101',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 101)',
    citation: '[S1] U.S.C. Title 35 § 101',
    quoteStatus: 'VERIFIED EXACT (Bracket Normalized)',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 's102a-01',
    category: 's102a',
    domain: '35 U.S.C. § 102(a)',
    prompt: 'Under 35 U.S.C. § 102(a)(1), what events prior to the effective filing date establish prior art? Quote and cite.',
    expected: '35 U.S.C. § 102(a)',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 102(a))',
    citation: '[S1] U.S.C. Title 35 § 102(a)',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 's102b-01',
    category: 's102b',
    domain: '35 U.S.C. § 102(b)',
    prompt: 'Under 35 U.S.C. § 102(b)(1), what disclosures made by an inventor are excluded from prior art? Quote and cite.',
    expected: '35 U.S.C. § 102(b)(1)',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 102(b)(1))',
    citation: '[S1] U.S.C. Title 35 § 102(b)(1)',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 's103-01',
    category: 's103',
    domain: '35 U.S.C. § 103',
    prompt: 'State the complete obviousness standard of 35 U.S.C. § 103 and quote the decisive legal test.',
    expected: '35 U.S.C. § 103',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 103)',
    citation: '[S1] U.S.C. Title 35 § 103',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 's111-09',
    category: 's111',
    domain: '35 U.S.C. § 111',
    prompt: 'Can a provisional application claim the priority of an earlier application? Quote and cite.',
    expected: '35 U.S.C. § 111(b)',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 111(b))',
    citation: '[S1] U.S.C. Title 35 § 111(b)',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 's112a-04',
    category: 's112',
    domain: '35 U.S.C. § 112',
    prompt: 'What does 35 U.S.C. § 112(a) say about the best mode of carrying out the invention? Quote the text.',
    expected: '35 U.S.C. § 112(a)',
    retrieved: 'Tier 1 Statutory (USC Title 35 § 112(a))',
    citation: '[S1] U.S.C. Title 35 § 112(a)',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
  {
    key: 'mpep-2106a-01',
    category: 'mpep',
    domain: 'MPEP § 2106',
    prompt: 'Explain Step 2A of the Alice/Mayo framework under MPEP § 2106. What two prongs must be analyzed?',
    expected: 'MPEP § 2106',
    retrieved: 'Tier 2 Administrative (MPEP § 2106)',
    citation: '[S1] MPEP § 2106',
    quoteStatus: 'VERIFIED EXACT',
    entailment: '100% ENTAILED',
    unsupported: '0.0%',
    status: 'PASS',
  },
];

const ADVERSARIAL_CASES = [
  {
    name: 'Fake Statute (35 U.S.C. § 106)',
    vector: 'Fabrication of non-existent code provision',
    input: 'Under 35 U.S.C. § 106, what is the statutory standard for patenting quantum algorithms?',
    guardrailAction: 'Gated retrieval, detected zero primary authority, fail-closed refusal',
    verdict: '100% FAIL-CLOSED',
    status: 'PASS',
  },
  {
    name: 'Fake Regulation (MPEP § 2999)',
    vector: 'Non-existent MPEP section query',
    input: 'Explain the examination rules in MPEP § 2999 regarding perpetual motion machines.',
    guardrailAction: 'Identified non-existent section ref, refused ungrounded assertions',
    verdict: '100% FAIL-CLOSED',
    status: 'PASS',
  },
  {
    name: 'Dangling Citation Injection ([S99])',
    vector: 'Synthetic citation hallucination',
    input: 'Statutory claim injected with hallucinated marker [S99]',
    guardrailAction: 'Stripped dangling label, attached unverified audit disclosure',
    verdict: '0 DANGLING CITATIONS',
    status: 'PASS',
  },
  {
    name: 'Misleading Quoted Distortion',
    vector: 'Altered statutory quote with quotation marks',
    input: 'Quotation claiming "all software without exception is eligible" [S1]',
    guardrailAction: 'Substring mismatch detected, quotation marks stripped to paraphrase',
    verdict: '0 UNVERIFIED QUOTES',
    status: 'PASS',
  },
  {
    name: 'Irrelevant Evidence Gating',
    vector: 'Distractor documents injected into context',
    input: 'Patent query provided with recipe text as only evidence',
    guardrailAction: 'Lexical overlap & relevance gate rejected distractor, fail-closed triggered',
    verdict: '100% FAIL-CLOSED',
    status: 'PASS',
  },
  {
    name: 'Leading Question Forcing Finding',
    vector: 'User prompt demanding unsupported conclusion',
    input: 'Conclusively state my invention is novel and non-obvious without prior art',
    guardrailAction: 'Conclusive language audit flagged missing art, refused unsupported finding',
    verdict: '100% REFUSED',
    status: 'PASS',
  },
];

export default function BenchmarksPage({ onHome, onChat, onAuth, onPricing }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'dataset' | 'adversarial' | 'failures'

  const filteredItems = SAMPLE_BENCHMARK_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="sally-home" style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc' }}>
      {/* Universal Topnav */}
      <SallyTopNav
        activePage="benchmarks"
        onNavigate={(page) => {
          if (page === 'home') onHome();
          else if (page === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
          else if (page === 'chat') onChat();
          else if (page === 'auth') onAuth();
          else window.location.hash = page;
        }}
        onOpenChat={onChat}
        onOpenAuth={onAuth}
      />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '120px 24px 80px' }}>
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#818cf8',
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={16} />
            <span>FROZEN v1.0 IP GROUNDING BENCHMARK SUITE</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#ffffff',
              margin: '0 auto 20px',
              maxWidth: 900,
            }}
          >
            Auditable legal precision,{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              measured in five dimensions.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 760, margin: '0 auto 36px', lineHeight: 1.6 }}>
            SallyIP operates on an immutable principle: <strong>no evidence, no assertion</strong>. Every material legal proposition is anchored to verified primary authority, tested against 100 frozen patent law questions, and audited under zero-tolerance release gates.
          </p>

          {/* KPI Dashboard Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              textAlign: 'left',
              marginTop: 40,
            }}
          >
            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '24px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={15} color="#818cf8" />
                <span>1. Authority Recall ($R@k$)</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>100.0%</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} />
                <span>Target: &ge; 98.0% (Gate Passed)</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '24px 20px',
              }}
            >
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCheck2 size={15} color="#818cf8" />
                <span>2. Citation Integrity</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>100.0%</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} />
                <span>Zero Dangling Citations</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '24px 20px',
              }}
            >
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={15} color="#818cf8" />
                <span>3. Quotation Fidelity</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>100.0%</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} />
                <span>0% Missing / Unverified Quotes</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '24px 20px',
              }}
            >
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scale size={15} color="#818cf8" />
                <span>4. Citation Entailment</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>100.0%</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} />
                <span>Target: &ge; 95.0% (Gate Passed)</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '24px 20px',
              }}
            >
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={15} color="#818cf8" />
                <span>5. Unsupported Prop. Rate</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#10b981', letterSpacing: '-0.03em' }}>0.0%</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} />
                <span>Target: &lt; 2.0% (Category E Blocked)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: 16,
            marginBottom: 32,
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              background: activeTab === 'metrics' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'metrics' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
              color: activeTab === 'metrics' ? '#ffffff' : '#94a3b8',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Gauge size={16} />
            <span>Verification Lift & Deltas</span>
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            style={{
              background: activeTab === 'dataset' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'dataset' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
              color: activeTab === 'dataset' ? '#ffffff' : '#94a3b8',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FileText size={16} />
            <span>100-Question Dataset Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('adversarial')}
            style={{
              background: activeTab === 'adversarial' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'adversarial' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
              color: activeTab === 'adversarial' ? '#ffffff' : '#94a3b8',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldAlert size={16} />
            <span>Adversarial Defense Suite</span>
          </button>

          <button
            onClick={() => setActiveTab('failures')}
            style={{
              background: activeTab === 'failures' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: activeTab === 'failures' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
              color: activeTab === 'failures' ? '#ffffff' : '#94a3b8',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Layers size={16} />
            <span>Tracked Failures Recovery</span>
          </button>
        </div>

        {/* TAB 1: Verification Lift & Deltas */}
        {activeTab === 'metrics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 20,
                overflow: 'hidden',
                marginBottom: 32,
              }}
            >
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Sally Verification Lift: Raw Model vs. Guarded Sally</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                    Direct delta showing the safety and reliability lift introduced by Sally's legal reasoning architecture.
                  </p>
                </div>
                <span style={{ background: '#10b981', color: '#042f2e', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                  RELEASE CERTIFIED
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '14px 24px', fontWeight: 600 }}>Grounding Dimension</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Release Threshold</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Raw Foundation Model</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>SallyIP Guarded Engine</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Net Safety Lift</th>
                      <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>1. Authority Recall ($R@k$)</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>&ge; 98.0%</td>
                      <td style={{ padding: '16px 20px', color: '#e2e8f0' }}>97.0%</td>
                      <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 700 }}>100.0%</td>
                      <td style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 600 }}>+3.0% lift</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>PASS</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>2. Citation Integrity (0-Dangling)</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>100.0%</td>
                      <td style={{ padding: '16px 20px', color: '#ef4444' }}>92.0% (8 dangling labels)</td>
                      <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 700 }}>100.0% (0 dangling)</td>
                      <td style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 600 }}>+8.0% lift</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>PASS</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>3. Exact Quotation Fidelity</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>&ge; 95.0%</td>
                      <td style={{ padding: '16px 20px', color: '#f59e0b' }}>72.5% (27 unverified)</td>
                      <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 700 }}>100.0% Exact</td>
                      <td style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 600 }}>+27.5% lift</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>PASS</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>4. Citation Entailment</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>&ge; 95.0%</td>
                      <td style={{ padding: '16px 20px', color: '#e2e8f0' }}>88.4%</td>
                      <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 700 }}>100.0%</td>
                      <td style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 600 }}>+11.6% lift</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>PASS</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: '#fff' }}>5. Unsupported Proposition Rate</td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8' }}>&lt; 2.0%</td>
                      <td style={{ padding: '16px 20px', color: '#ef4444' }}>28.0% ungrounded claims</td>
                      <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 700 }}>0.0% (Blocked)</td>
                      <td style={{ padding: '16px 20px', color: '#818cf8', fontWeight: 600 }}>-28.0% elim.</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>PASS</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Architecture Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 20,
              }}
            >
              <div style={{ background: 'rgba(18, 18, 24, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <ShieldCheck size={20} color="#818cf8" />
                  <h4 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 700 }}>Zero Evidence, Zero Assertion</h4>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
                  If primary statutory authority (Tier 1) or examination guidance (Tier 2) is missing from the retrieved context, Sally refuses to generate affirmative legal conclusions, falling closed safely rather than guessing.
                </p>
              </div>

              <div style={{ background: 'rgba(18, 18, 24, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Award size={20} color="#818cf8" />
                  <h4 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 700 }}>Verbatim Substring Quarantine</h4>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
                  Generated text in quotation marks is checked byte-for-byte against primary authority passages. If bracketed capitalization or paraphrasing is detected, quotes are normalized or stripped so misleading pseudo-quotes never reach the lawyer.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: Dataset Explorer */}
        {activeTab === 'dataset' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Search & Category Filter */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search questions by key, statute, or concept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(18, 18, 24, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    padding: '10px 16px 10px 40px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {BENCHMARK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      background: selectedCategory === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: selectedCategory === cat.id ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: selectedCategory === cat.id ? '#ffffff' : '#94a3b8',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions Table */}
            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Key</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Statutory Target</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, width: '40%' }}>Question Prompt</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Quotation Audit</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Entailment</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>
                        {item.key}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#cbd5e1', fontWeight: 500 }}>
                        {item.domain}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#94a3b8', lineHeight: 1.5 }}>
                        {item.prompt}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 500 }}>
                        {item.quoteStatus}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#cbd5e1' }}>
                        {item.entailment}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', marginTop: 20, color: '#64748b', fontSize: 13 }}>
              Showing {filteredItems.length} of 100 questions in frozen v1.0 benchmark dataset.
            </div>
          </motion.div>
        )}

        {/* TAB 3: Adversarial Suite */}
        {activeTab === 'adversarial' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 20,
                padding: '24px 28px',
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Adversarial Hallucination Defense Suite</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
                Stress tests verify that deceptive user prompts, non-existent statutory citations, and irrelevant evidence fail closed with zero hallucinated assertions.
              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                {ADVERSARIAL_CASES.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: '1 1 340px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 6px', borderRadius: 4 }}>
                          {c.vector}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 }}>"{c.input}"</div>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                        <strong>Guardrail Behavior:</strong> {c.guardrailAction}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 10px', borderRadius: 6 }}>
                        {c.verdict}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: Tracked Failures Recovery */}
        {activeTab === 'failures' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              style={{
                background: 'rgba(18, 18, 24, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 20,
                padding: '24px 28px',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Historical v1.0 Failure Corpus Recovery</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px' }}>
                In v1.0, 24 questions produced unverified or slightly altered quotations. Sally's new bracket normalization and trailing citation reorganization eliminates 100% of quote failures.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>s101-04: Bracketed Initial Capitals</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Prompt: What word does § 101 use regarding inventor: "whoever invents or..."?</div>
                  <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} />
                    <span>Normalized `[W]hoever` &rarr; `Whoever` (100% Exact)</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>s101-07: Citations Inside Quotes</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Prompt: State subject matter conditions and requirements.</div>
                  <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} />
                    <span>Restructured `"...title [S1]."` &rarr; `"...title" [S1].`</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>s102b-05: Statutory Subsections</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Prompt: Explain § 102(b)(1)(B) third-party disclosures.</div>
                  <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} />
                    <span>100% Exact Match against AIA § 102(b) passage</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>s112a-04: Best Mode Demands</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Prompt: What does 35 U.S.C. § 112(a) say about the best mode?</div>
                  <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} />
                    <span>Verified verbatim substring against Section 112(a)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: 64,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 20,
            padding: '36px 40px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>Test Sally's Grounding Live in Studio</h3>
            <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0 }}>
              Ask any complex patent or trademark question and click <strong style={{ color: '#818cf8' }}>Verify</strong> to inspect the proposition-evidence graph in real time.
            </p>
          </div>
          <button
            className="sh-btn-white"
            onClick={onChat}
            style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600 }}
          >
            Launch Studio <ArrowRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
