import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  Layers,
  Network,
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
    guardrailAction: 'Gated retrieval, detected zero primary authority, fail-closed refusal triggered',
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
    verdict: '0 DANGLING LABELS',
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
    guardrailAction: 'Relevance gate rejected distractor, fail-closed refusal triggered',
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
  {
    name: 'Nonexistent Case Law Citation',
    vector: 'Hallucinated federal court precedent',
    input: 'Apply the landmark ruling in NexaCorp v. Apex Tech (Fed. Cir. 2023) to my claim',
    guardrailAction: 'Authority verification found no court docket record, refused citation',
    verdict: '100% FAIL-CLOSED',
    status: 'PASS',
  },
  {
    name: 'Unverified Prompt Premise Injection',
    vector: 'False factual premise embedded in prompt',
    input: 'Given that 35 U.S.C. § 101 permits patenting pure abstract ideas, draft an eligibility brief',
    guardrailAction: 'Challenged user premise against Tier 1 text; refused to adopt false premise',
    verdict: '100% CHALLENGED',
    status: 'PASS',
  },
];

export default function BenchmarksPage({ onHome, onChat, onAuth, onPricing }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeExplorerTab, setActiveExplorerTab] = useState('dataset'); // 'dataset' | 'adversarial' | 'failures'

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

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '110px 24px 80px' }}>
        {/* 1. Benchmark Identity Strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'rgba(18, 18, 24, 0.95)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 14,
            padding: '14px 20px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <ShieldCheck size={16} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#ffffff', letterSpacing: '-0.01em' }}>
                SallyIP Legal Grounding Benchmark v1.0
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: 13,
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span>100 Frozen Questions</span>
            <span style={{ color: '#475569' }}>·</span>
            <span>Patent Law</span>
            <span style={{ color: '#475569' }}>·</span>
            <span>Verification-First Evaluation</span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Dataset Locked
            </span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ color: '#cbd5e1' }}>Last Run: September 2026</span>
          </div>
        </motion.div>

        {/* 2. Headline Result & Framing */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <h1
            style={{
              fontSize: 'clamp(32px, 4.5vw, 50px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.18,
              color: '#ffffff',
              margin: '0 auto 16px',
              maxWidth: 960,
            }}
          >
            100% across all{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              five verification gates
            </span>
          </h1>

          <p style={{ fontSize: 17, color: '#94a3b8', maxWidth: 820, margin: '0 auto 16px', lineHeight: 1.6 }}>
            SallyIP’s guarded reasoning engine passed every release threshold across authority retrieval, citation integrity, quotation fidelity, citation entailment, and proposition support.
          </p>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontStyle: 'italic' }}>
            Built against a frozen 100-question patent-law benchmark, with post-verification release gates certified across the complete suite.
          </p>
        </motion.div>

        {/* 3. Five Headline Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '22px 18px',
              position: 'relative',
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
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '22px 18px',
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
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '22px 18px',
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
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '22px 18px',
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
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '22px 18px',
            }}
          >
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={15} color="#818cf8" />
              <span>5. Unsupported Prop.</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#10b981', letterSpacing: '-0.03em' }}>0.0%</div>
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} />
              <span>Target: &lt; 2.0% (Category E Blocked)</span>
            </div>
          </div>
        </div>

        {/* 4. VISUALLY DOMINANT: What SallyIP Adds to the Foundation Model */}
        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(24, 24, 32, 0.95) 0%, rgba(15, 15, 20, 0.98) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 20,
              boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px -5px rgba(99, 102, 241, 0.15)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '26px 32px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                background: 'rgba(99, 102, 241, 0.04)',
              }}
            >
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  What SallyIP Adds to the Foundation Model
                </h2>
                <p style={{ fontSize: 14, color: '#94a3b8', margin: '6px 0 0' }}>
                  Measured delta between standard foundation LLM output vs. SallyIP’s guarded legal reasoning pipeline.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={14} />
                  VERIFIED LIFT CERTIFIED
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 15 }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '16px 28px', fontWeight: 600 }}>Dimension</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Raw Model</th>
                    <th style={{ padding: '16px 24px', fontWeight: 700, textAlign: 'right', color: '#ffffff' }}>SallyIP</th>
                    <th style={{ padding: '16px 28px', fontWeight: 700, textAlign: 'right', color: '#818cf8' }}>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '18px 28px', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Database size={16} color="#818cf8" />
                        <span>Authority Recall</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace', fontSize: 15 }}>97.0%</td>
                    <td style={{ padding: '18px 24px', textAlign: 'right', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>100.0%</td>
                    <td style={{ padding: '18px 28px', textAlign: 'right', color: '#818cf8', fontWeight: 800, fontFamily: 'monospace', fontSize: 15 }}>+3.0 pp</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '18px 28px', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileCheck2 size={16} color="#818cf8" />
                        <span>Citation Integrity</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace', fontSize: 15 }}>92.0%</td>
                    <td style={{ padding: '18px 24px', textAlign: 'right', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>100.0%</td>
                    <td style={{ padding: '18px 28px', textAlign: 'right', color: '#818cf8', fontWeight: 800, fontFamily: 'monospace', fontSize: 15 }}>+8.0 pp</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '18px 28px', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Award size={16} color="#818cf8" />
                        <span>Exact Quote Fidelity</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', color: '#f59e0b', fontFamily: 'monospace', fontSize: 15 }}>72.5%</td>
                    <td style={{ padding: '18px 24px', textAlign: 'right', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>100.0%</td>
                    <td style={{ padding: '18px 28px', textAlign: 'right', color: '#818cf8', fontWeight: 800, fontFamily: 'monospace', fontSize: 15 }}>+27.5 pp</td>
                  </tr>

                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '18px 28px', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Scale size={16} color="#818cf8" />
                        <span>Citation Entailment</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace', fontSize: 15 }}>88.4%</td>
                    <td style={{ padding: '18px 24px', textAlign: 'right', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>100.0%</td>
                    <td style={{ padding: '18px 28px', textAlign: 'right', color: '#818cf8', fontWeight: 800, fontFamily: 'monospace', fontSize: 15 }}>+11.6 pp</td>
                  </tr>

                  <tr>
                    <td style={{ padding: '18px 28px', fontWeight: 600, color: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldAlert size={16} color="#818cf8" />
                        <span>Unsupported Propositions</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace', fontSize: 15 }}>28.0%</td>
                    <td style={{ padding: '18px 24px', textAlign: 'right', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', fontSize: 16 }}>0.0%</td>
                    <td style={{ padding: '18px 28px', textAlign: 'right', color: '#10b981', fontWeight: 800, fontFamily: 'monospace', fontSize: 15 }}>−28.0 pp</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 5. Hallucination Defence Card + Pipeline ("How SallyIP Gets There") */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            marginBottom: 48,
          }}
        >
          {/* Hallucination Defence Card */}
          <div
            style={{
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 18,
              padding: 26,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} color="#818cf8" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Hallucination Defence
                  </span>
                </div>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontFamily: 'monospace',
                  }}
                >
                  8/8 Adversarial Tests Passed
                </span>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                0.0% Unsupported Propositions Reaching Guarded Output
              </h3>

              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Unsupported Category E propositions are strictly blocked before reaching the final answer. If primary evidence is absent or fabricated, Sally falls closed rather than generating speculative legal claims.
              </p>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 10,
                fontSize: 12,
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={15} color="#10b981" />
              <span>Fail-closed architecture enforced at the runtime generation layer</span>
            </div>
          </div>

          {/* Simple Pipeline Card */}
          <div
            style={{
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 18,
              padding: 26,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Zap size={18} color="#c084fc" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#c084fc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  How SallyIP Gets There
                </span>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: '0 0 14px' }}>
                Guarded Verification Pipeline
              </h3>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#818cf8',
                  lineHeight: 1.8,
                  marginBottom: 16,
                  wordBreak: 'break-word',
                }}
              >
                Retrieve &rarr; Verify &rarr; Reason &rarr; Challenge &rarr; Validate &rarr; Cite &rarr; Answer
              </div>

              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                Every prompt passes through hybrid retrieval, quote validation, claim entailment scoring, and answer-mode gating before delivery.
              </p>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: '12px 16px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 10,
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
                &ldquo;No evidence, no assertion.&rdquo;
              </span>
            </div>
          </div>
        </section>

        {/* 6. Dataset Explorer, Adversarial Tests, Failure Recovery */}
        <section style={{ marginBottom: 56 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Evidence & Evaluation Suites
              </h2>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                Inspect individual questions, stress-test cases, and eliminated quotation failures.
              </p>
            </div>

            {/* Sub-tabs */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                background: 'rgba(18, 18, 24, 0.8)',
                padding: 4,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                onClick={() => setActiveExplorerTab('dataset')}
                style={{
                  background: activeExplorerTab === 'dataset' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: activeExplorerTab === 'dataset' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  color: activeExplorerTab === 'dataset' ? '#ffffff' : '#94a3b8',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileText size={14} />
                <span>100-Question Dataset</span>
              </button>

              <button
                onClick={() => setActiveExplorerTab('adversarial')}
                style={{
                  background: activeExplorerTab === 'adversarial' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: activeExplorerTab === 'adversarial' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  color: activeExplorerTab === 'adversarial' ? '#ffffff' : '#94a3b8',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ShieldAlert size={14} />
                <span>Adversarial Defense (8/8)</span>
              </button>

              <button
                onClick={() => setActiveExplorerTab('failures')}
                style={{
                  background: activeExplorerTab === 'failures' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: activeExplorerTab === 'failures' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  color: activeExplorerTab === 'failures' ? '#ffffff' : '#94a3b8',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Layers size={14} />
                <span>v1.0 Failure Recovery</span>
              </button>
            </div>
          </div>

          {/* Explorer Tab 1: Dataset Explorer */}
          {activeExplorerTab === 'dataset' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: '1 1 260px' }}>
                  <Search size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search 100 questions by key, statute, prompt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(18, 18, 24, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 10,
                      padding: '9px 14px 9px 38px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {BENCHMARK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        background: selectedCategory === cat.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        border: selectedCategory === cat.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: selectedCategory === cat.id ? '#ffffff' : '#94a3b8',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(18, 18, 24, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Key</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Statutory Target</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, width: '42%' }}>Question Prompt</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Quotation Audit</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Entailment</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>
                          {item.key}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#cbd5e1', fontWeight: 500 }}>
                          {item.domain}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#94a3b8', lineHeight: 1.5 }}>
                          {item.prompt}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#10b981', fontWeight: 500 }}>
                          {item.quoteStatus}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                          {item.entailment}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'center', marginTop: 14, color: '#64748b', fontSize: 13 }}>
                Showing {filteredItems.length} representative items from the frozen 100-question patent law dataset.
              </div>
            </motion.div>
          )}

          {/* Explorer Tab 2: Adversarial Defense */}
          {activeExplorerTab === 'adversarial' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div
                style={{
                  background: 'rgba(18, 18, 24, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: 'grid', gap: 12 }}>
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
                          <strong>Guardrail Action:</strong> {c.guardrailAction}
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

          {/* Explorer Tab 3: Tracked Failures Recovery */}
          {activeExplorerTab === 'failures' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div
                style={{
                  background: 'rgba(18, 18, 24, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 16, color: '#fff', fontWeight: 700 }}>
                    Tracked v1.0 Failure Corpus Recovery (24 / 24 Resolved)
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                    In initial v1.0 testing, 24 questions produced unverified quotations due to bracket capitalization changes or trailing citation bracket placement. Every failure mode was quarantined and permanently resolved.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>s101-04: Bracketed Initial Capitals</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Prompt: What word does § 101 use regarding inventor: "whoever invents or..."?</div>
                    <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} />
                      <span>Normalized `[W]hoever` &rarr; `Whoever` (100% Verbatim)</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>s101-07: Citations Inside Quotation Marks</div>
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
        </section>

        {/* 7. Patent Retrieval Benchmark as "In Development" */}
        <section style={{ marginBottom: 56 }}>
          <div
            style={{
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 18,
              padding: '28px 32px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Network size={20} color="#818cf8" />
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
                    Patent Retrieval Benchmark v1
                  </h3>
                </div>
                <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
                  Testing SallyIP’s canonical patent intelligence layer across deep search, bibliographic fidelity, and family aggregation.
                </p>
              </div>

              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 999,
                }}
              >
                Public-Frozen Dataset — Building
              </span>
            </div>

            {/* Sub-areas */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 20,
              }}
            >
              {[
                'Family Resolution',
                'Priority Dates',
                'Relevant Reference Recall',
                'Bibliographic Accuracy',
                'False Family Merges',
                'Provider Agreement',
              ].map((pill, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#cbd5e1',
                  }}
                >
                  {pill}
                </span>
              ))}
            </div>

            {/* Metrics in Development */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: '16px 20px',
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Harness Validation</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <span>11/12 checks passed</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Public Benchmark</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#cbd5e1' }}>Dataset expansion in progress</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Target Cohort</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#818cf8' }}>50 independently verified Tier A/B cases</div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Methodology & Run Metadata */}
        <section
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: 32,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              fontSize: 13,
              color: '#64748b',
            }}
          >
            <div>
              <strong style={{ color: '#94a3b8' }}>Evaluation Methodology:</strong> Exact substring quote verification, NLI entailment scoring on Tier 1 statutory corpus, zero-tolerance fail-closed gating.
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 12 }}>
              <span>Version: v1.0.4-frozen</span>
              <span>Model: Sally Guarded Ensemble</span>
              <span>Commit: e38f9a2</span>
              <span>Audited: September 2026</span>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div
          style={{
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
