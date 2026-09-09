import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  FileSearch,
  FileText,
  Filter,
  Flame,
  Globe2,
  Layers,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';

const MODULES = [
  {
    id: 'novelty',
    name: 'Novelty & Prior Art Radar',
    category: 'Patentability',
    badge: 'FLAGSHIP',
    icon: Search,
    description:
      'High-throughput prior art discovery combining BM25 keyword matching with dense embedding semantic retrieval across 100M+ USPTO, EPO, WIPO patents and NPL publications.',
    highlights: [
      'Automatic 35 U.S.C. §§ 102 and 103 risk scoring',
      'Element-by-element feature comparison matrix',
      'Non-patent literature (arXiv, PubMed, IEEE) mining',
      'Prior art clustering & citation velocity tracking',
    ],
    metric: '98.8% Recall @ k',
    speed: '< 2.4s search time',
  },
  {
    id: 'drafting',
    name: 'Patent Drafting & Claims Studio',
    category: 'Prosecution',
    badge: 'AI WORKBENCH',
    icon: FileText,
    description:
      'Precision patent drafting environment designed for patent attorneys. Synthesize robust independent claims, complete dependent claim cascades, and § 112 compliant specifications.',
    highlights: [
      'Antecedent basis and claim dependency validation',
      'Alice/Mayo eligibility (§ 101) shielding safeguards',
      'Technical figure reference numeral synchronization',
      'Export directly to DOCX, USPTO XML, or PDF',
    ],
    metric: '100% Antecedent Accuracy',
    speed: '6x faster first drafts',
  },
  {
    id: 'oa',
    name: 'Office Action & Examiner Dossier',
    category: 'Prosecution',
    badge: 'STRATEGY',
    icon: Scale,
    description:
      'Deconstruct complex USPTO and EPO office actions. Analyze examiner allowance tendencies, uncover successful traversal strategies, and generate persuasive response shells.',
    highlights: [
      'Rejection dissection across §§ 101, 102, 103, and 112',
      'Examiner historical grant rates & interview willingness',
      'Claim scope narrowing simulation against cited art',
      'Interview discussion talking points generator',
    ],
    metric: '4.2x Response Efficiency',
    speed: '< 10s PDF ingestion',
  },
  {
    id: 'fto',
    name: 'Freedom-to-Operate (FTO) Clearance',
    category: 'Clearance',
    badge: 'RISK RADAR',
    icon: ShieldCheck,
    description:
      'Map product features directly to active third-party claims. Identify high-risk patents early in product development and generate actionable design-around strategies.',
    highlights: [
      'Product-to-claim element mapping matrix',
      'Active claim expiration and maintenance fee status',
      'Design-around technical concept suggestions',
      'Formal legal clearance opinion letter templates',
    ],
    metric: 'Zero Overlooked Claims',
    speed: 'Real-time landscape updates',
  },
  {
    id: 'trademark',
    name: 'Trademark Clearance & Intelligence',
    category: 'Trademarks',
    badge: 'GLOBAL CLEARANCE',
    icon: Globe2,
    description:
      'Multi-jurisdiction trademark clearance across USPTO, EUIPO, and Madrid Protocol registers. Detect phonetic, visual, and conceptual similarities under DuPont confusion factors.',
    highlights: [
      'Nice Classification conflict detection (Classes 1–45)',
      'Phonetic and orthographic fuzzy match algorithms',
      'Common law mark and digital brand presence checks',
      'Registrability and likelihood-of-confusion risk index',
    ],
    metric: '94.2% DuPont Correlation',
    speed: '< 1.8s clearance run',
  },
  {
    id: 'claims',
    name: 'Claim Chart & EoU Generator',
    category: 'Litigation',
    badge: 'EVIDENCE',
    icon: FileCheck2,
    description:
      'Generate court-ready Evidence of Use (EoU) and infringement claim charts. Decompose patent claims into constituent limitations and map them to accused technical products.',
    highlights: [
      'Limitation-by-limitation claim chart generation',
      'Product documentation and teardown citation linkage',
      'Prosecution history estoppel and file wrapper audit',
      'IPR petition and invalidity contention assistance',
    ],
    metric: 'Court-Ready Provenance',
    speed: 'Instant chart exports',
  },
  {
    id: 'vault',
    name: 'Matter Knowledge Graph & Vault',
    category: 'Infrastructure',
    badge: 'ENTERPRISE',
    icon: Database,
    description:
      'Centralized, tenant-isolated legal knowledge repository. Ingest client matter documents with automatic cryptographic hashing, vector indexing, and zero-training guarantees.',
    highlights: [
      'Tenant isolation with PostgreSQL Row-Level Security',
      'Cryptographic provenance for every indexed passage',
      'Cross-matter citation and research history persistence',
      'Audit log export and enterprise compliance tracking',
    ],
    metric: 'Zero-Retention Guarantee',
    speed: '48ms hybrid retrieval',
  },
];

const CATEGORIES = ['All', 'Prosecution', 'Patentability', 'Clearance', 'Trademarks', 'Litigation', 'Infrastructure'];

export default function ModulesPage({ onHome, onChat, onAuth, onPricing }) {
  const [selectedCat, setSelectedCat] = useState('All');

  const filteredModules = selectedCat === 'All'
    ? MODULES
    : MODULES.filter((m) => m.category === selectedCat);

  return (
    <div className="sally-home" style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc' }}>
      <SallyTopNav
        activePage="modules"
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
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
            <Layers size={16} />
            <span>INTELLIGENCE MODULES ARCHITECTURE</span>
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
            Specialized legal AI workspaces,{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              engineered for IP practice.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 760, margin: '0 auto', lineHeight: 1.6 }}>
            Every SallyIP module is built specifically for patent attorneys, trademark practitioners, and IP strategists—combining verified legal retrieval with autonomous analytical workflows.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 44 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                background: selectedCat === cat ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedCat === cat ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                color: selectedCat === cat ? '#ffffff' : '#94a3b8',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: 999,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Modules Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: 24,
            marginBottom: 64,
          }}
        >
          {filteredModules.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  background: 'rgba(18, 18, 24, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 20,
                  padding: '28px 28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 10px 25px -10px rgba(0,0,0,0.5)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={22} color="#818cf8" />
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#818cf8',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 6,
                        padding: '3px 8px',
                      }}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 10px' }}>{m.name}</h3>
                  <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>{m.description}</p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                      Key Features
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {m.highlights.map((h, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
                          <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 12, color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14 }}>
                    <span><strong>Benchmarked:</strong> {m.metric}</span>
                    <span style={{ color: '#10b981' }}>{m.speed}</span>
                  </div>

                  <button
                    className="sh-btn-white"
                    onClick={onChat}
                    style={{ width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  >
                    Launch {m.name.split('&')[0]} <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
