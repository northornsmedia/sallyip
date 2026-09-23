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
import ModernGradientFooter from './modern-gradient-footer';

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
  {
    id: 'copyright',
    name: 'Copyright Clearance & Digital Assets',
    category: 'Copyrights',
    badge: 'MEDIA & CODE',
    icon: Sparkles,
    description:
      'Multi-prong copyright clearance, software license audits, authorship provenance, and statutory fair-use risk assessments across creative works and digital assets.',
    highlights: [
      'Four-factor statutory fair-use risk breakdown',
      'Open-source license compliance & attribution tracking',
      'DMCA safe harbor audits & notice evaluation',
      'Copyright registration preparation & deposit cataloging',
    ],
    metric: '100% Attribution Traceability',
    speed: '< 2.1s asset scan',
  },
];

const CATEGORIES = ['All', 'Prosecution', 'Patentability', 'Clearance', 'Trademarks', 'Copyrights', 'Litigation', 'Infrastructure'];

export default function ModulesPage({
  onHome,
  onChat,
  onAuth,
  onPricing,
  onBenchmarks,
  onLifecycle,
  onPerformance,
  onSecurity,
  onNavigate,
}) {
  const [selectedCat, setSelectedCat] = useState('All');

  const filteredModules = selectedCat === 'All'
    ? MODULES
    : MODULES.filter((m) => m.category === selectedCat);

  const handleNav = (target) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      if (target === 'home') onHome ? onHome() : (window.location.hash = 'home');
      else if (target === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
      else if (target === 'benchmarks') onBenchmarks ? onBenchmarks() : (window.location.hash = 'benchmarks');
      else if (target === 'lifecycle') onLifecycle ? onLifecycle() : (window.location.hash = 'lifecycle');
      else if (target === 'performance') onPerformance ? onPerformance() : (window.location.hash = 'performance');
      else if (target === 'security') onSecurity ? onSecurity() : (window.location.hash = 'security');
      else if (target === 'chat') onChat ? onChat() : (window.location.hash = 'chat');
      else if (target === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
      else window.location.hash = target;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif' }}>
      <SallyTopNav
        activePage="modules"
        onNavigate={handleNav}
        onOpenChat={() => handleNav('chat')}
        onOpenAuth={() => handleNav('auth')}
      />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(70px, 9vh, 110px) clamp(20px, 3.5vw, 48px) 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 960, margin: '0 auto clamp(44px, 5vh, 60px)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0d0e14',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 9999,
              padding: '6px 16px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#a1a1aa',
              marginBottom: 20,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            <Layers size={13} style={{ color: '#10b981' }} />
            <span>INTELLIGENCE MODULES ARCHITECTURE</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(38px, 5vw, 68px)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              color: '#ffffff',
              margin: '0 auto 20px',
            }}
          >
            Specialized IP AI Workspaces,
            <br />
            Engineered for Full Practice.
          </h1>

          <p style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', color: '#9496a1', maxWidth: 760, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Every SallyIP module is built specifically for patent counsel, trademark attorneys, and copyright practitioners—combining verified legal retrieval with autonomous analytical workflows across all intellectual property domains.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleNav('chat')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 46,
                padding: '0 28px',
                background: '#ffffff',
                color: '#000000',
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Launch Studio <ArrowRight size={15} />
            </button>
            <button
              onClick={() => handleNav('pricing')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 46,
                padding: '0 26px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 500,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
              }}
            >
              View Pricing & Plans
            </button>
          </div>
        </div>

        {/* Workspaces Visual Proof Showcase */}
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto 52px',
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: '#08090d',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              padding: '12px 20px',
              background: '#0d0e14',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27272a' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27272a' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27272a' }} />
            </div>
            <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'ui-monospace, monospace' }}>
              Specialist Legal Workspaces · 8 Shipped Modules
            </span>
            <span style={{ fontSize: 11, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Verified In-Product
            </span>
          </div>
          <picture>
            <source srcSet="/shots/sallyip-workspaces.webp" type="image/webp" />
            <img
              src="/shots/sallyip-workspaces.png"
              alt="Specialist Legal Workspaces modal showing 8 modules"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                imageRendering: '-webkit-optimize-contrast',
              }}
              loading="eager"
              decoding="async"
            />
          </picture>
          <div
            style={{
              padding: '12px 22px',
              background: '#090a0f',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: '#94a3b8',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>US Patent Drafter, Contract Review, Playbooks Desk, FTO, Claim Chart Builder, Prior Art, Trademark Intelligence & Knowledge Graph.</span>
            <button
              onClick={() => handleNav('chat')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Open Workspaces <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 44 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  background: isSelected ? 'rgba(255, 255, 255, 0.12)' : '#08090d',
                  border: isSelected ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 9999,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? '#ffffff' : '#8e8e99',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Modules Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
            marginBottom: 'clamp(48px, 6vh, 80px)',
          }}
        >
          {filteredModules.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{
                  background: '#08090d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 20,
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} color="#10b981" />
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: '#a1a1aa',
                        background: '#0e1017',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '4px 10px',
                        borderRadius: 9999,
                      }}
                    >
                      {m.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', margin: '0 0 8px' }}>{m.name}</h3>
                  <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>{m.description}</p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 16, marginBottom: 20 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {m.highlights.map((h, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                          <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>{m.metric}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.speed}</div>
                  </div>
                  <button
                    onClick={() => handleNav('chat')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 9999,
                      padding: '7px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Open <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Modern Gradient Footer */}
      <ModernGradientFooter
        onDemoClick={() => handleNav('chat')}
        onNavigate={handleNav}
      />
    </div>
  );
}
