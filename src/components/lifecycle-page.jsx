import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  FileCheck2,
  FileSearch,
  FileText,
  FolderGit2,
  GitBranch,
  Layers,
  Lightbulb,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';

const LIFECYCLE_STAGES = [
  {
    id: 'intake',
    step: '01',
    title: 'Invention Capture & Intake',
    subtitle: 'From engineering notes to structured legal disclosures',
    icon: Lightbulb,
    badge: 'STAGE 1',
    description:
      'Automatically transform raw engineering notebooks, GitHub pull requests, architecture whitepapers, and recorded inventor interviews into clean, standardized Invention Disclosure Forms (IDFs) with automatic concept tagging.',
    capabilities: [
      'Multi-modal document intake (PDFs, Jupyter notebooks, CAD schematics)',
      'Automated technical novelty extraction and problem-solution mapping',
      'Inventor interview questionnaire synthesis with follow-up prompts',
      'Initial prior art scoping and statutory category identification (§ 101)',
    ],
    deliverables: ['Standardized IDF Package', 'Technical Concept Map', 'Statutory Classification Brief'],
    metric: '< 15 min intake time',
  },
  {
    id: 'novelty',
    step: '02',
    title: 'Prior Art & Novelty Scoping',
    subtitle: 'Global search across USPTO, EPO, WIPO, and non-patent literature',
    icon: Compass,
    badge: 'STAGE 2',
    description:
      'Execute hybrid lexical and dense vector search across 100M+ global patent documents and academic literature. Generate comprehensive novelty matrices with strict 35 U.S.C. §§ 102 and 103 risk grading.',
    capabilities: [
      'Multi-jurisdiction search across US, EP, WO, JP, CN, and KR databases',
      'Non-patent literature (NPL) mining across arXiv, IEEE, and PubMed',
      'Element-by-element prior art mapping with similarity scoring',
      'Graham v. John Deere obviousness factor analysis & secondary considerations',
    ],
    deliverables: ['Patentability Landscape Report', 'Prior Art Feature Matrix', 'Freedom-to-File Recommendation'],
    metric: '98.8% authority recall',
  },
  {
    id: 'drafting',
    step: '03',
    title: 'Specification & Claim Drafting',
    subtitle: 'High-leverage patent drafting grounded in verifiable technical disclosures',
    icon: FileText,
    badge: 'STAGE 3',
    description:
      'Draft robust independent and dependent claims with enforceable breadth. Auto-generate complete patent specifications adhering strictly to 35 U.S.C. § 112 written description and enablement standards.',
    capabilities: [
      'Independent claim architecture with alternative embodiments',
      'Strict antecedent basis tracking and claim dependency validation',
      'Detailed description generation with reference numeral consistency',
      'Alice/Mayo eligibility (§ 101) shielding for software and diagnostic inventions',
    ],
    deliverables: ['Complete Patent Application (Claims + Spec)', 'Antecedent Basis Audit', 'Drawing Briefs'],
    metric: '100% antecedent audit pass',
  },
  {
    id: 'prosecution',
    step: '04',
    title: 'Office Action Response & Examiner Prep',
    subtitle: 'Data-driven prosecution strategy with examiner allowance profiling',
    icon: Scale,
    badge: 'STAGE 4',
    description:
      'Deconstruct USPTO Office Actions in seconds. Pinpoint examiner rejection grounds (§§ 101, 102, 103, 112), simulate claim amendments, and prepare persuasive response arguments backed by relevant Federal Circuit precedent.',
    capabilities: [
      'Automated 102/103 rejection matrix with cited reference rebuttal points',
      'USPTO Art Unit and Examiner allowance trajectory analytics',
      'Claim scope delta analysis showing narrowing vs. prior art coverage',
      'Interview agenda generator with tailored interview talking points',
    ],
    deliverables: ['Office Action Response Shell', 'Examiner Statistical Dossier', 'Claim Amendment Matrix'],
    metric: '4.2x faster response prep',
  },
  {
    id: 'portfolio',
    step: '05',
    title: 'FTO Clearance & Portfolio Operations',
    subtitle: 'Continuous product clearance radar and family tree management',
    icon: FolderGit2,
    badge: 'STAGE 5',
    description:
      'Monitor competitive patent filings and evaluate product roadmaps against active third-party claims. Manage annuity decisions, terminal disclaimer dependencies, and international filing deadlines without human error.',
    capabilities: [
      'Product feature-to-claim clearance matrices (Freedom-to-Operate)',
      'Global patent family priority tree visualization (PCT, Paris Convention)',
      'Maintenance fee & annuity value scoring based on citation velocity',
      'Competitor filing radar alerts on newly published applications',
    ],
    deliverables: ['FTO Risk Opinion Memo', 'Family Tree Status Map', 'Portfolio Value Ranking'],
    metric: 'Zero missed statutory deadlines',
  },
  {
    id: 'enforcement',
    step: '06',
    title: 'Litigation, Evidence of Use & Licensing',
    subtitle: 'Court-ready claim charts, invalidity defenses, and licensing packages',
    icon: ShieldCheck,
    badge: 'STAGE 6',
    description:
      'Generate element-by-element Evidence of Use (EoU) claim charts mapping accused products to patent claims. Prepare comprehensive IPR petition shells and validity defenses supported by indisputable provenance.',
    capabilities: [
      'Element-by-element infringement claim charts with product teardowns',
      'Inter Partes Review (IPR) petition invalidity contention generation',
      'File wrapper estoppel and prosecution history analysis',
      'FRAND licensing valuation and SEP essentiality screening',
    ],
    deliverables: ['Infringement Claim Charts (EoU)', 'IPR Invalidity Contentions', 'Licensing Term Sheet'],
    metric: 'Court-ready citation accuracy',
  },
];

export default function LifecyclePage({ onHome, onChat, onAuth, onPricing }) {
  const [activeStage, setActiveStage] = useState('drafting');
  const stage = LIFECYCLE_STAGES.find((s) => s.id === activeStage) || LIFECYCLE_STAGES[2];

  return (
    <div className="sally-home" style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc' }}>
      <SallyTopNav
        activePage="lifecycle"
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
        {/* Hero */}
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
            <GitBranch size={16} />
            <span>END-TO-END INTELLECTUAL PROPERTY LIFECYCLE</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#ffffff',
              margin: '0 auto 20px',
              maxWidth: 880,
            }}
          >
            Connected intelligence across the{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              entire patent lifecycle.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 740, margin: '0 auto', lineHeight: 1.6 }}>
            SallyIP unifies legal intelligence from early invention disclosure all the way through global prosecution, portfolio management, and federal enforcement.
          </p>
        </div>

        {/* Stage Navigation Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10,
            marginBottom: 36,
          }}
        >
          {LIFECYCLE_STAGES.map((s) => {
            const Icon = s.icon;
            const isSelected = activeStage === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStage(s.id)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.2) 100%)' : 'rgba(18, 18, 24, 0.8)',
                  border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#818cf8' : '#64748b' }}>
                    {s.step}
                  </span>
                  <Icon size={16} color={isSelected ? '#818cf8' : '#94a3b8'} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#ffffff' : '#cbd5e1', lineHeight: 1.3 }}>
                  {s.title.split('&')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Deep Dive */}
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(18, 18, 24, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 24,
            padding: '40px 44px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#818cf8',
                  background: 'rgba(99, 102, 241, 0.15)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                  marginBottom: 10,
                }}
              >
                {stage.badge} · {stage.step} OF 06
              </span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>{stage.title}</h2>
              <p style={{ fontSize: 16, color: '#94a3b8', margin: 0 }}>{stage.subtitle}</p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 4 }}>KEY PERFORMANCE METRIC</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{stage.metric}</div>
            </div>
          </div>

          <p style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 32 }}>
            {stage.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 36 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Core Capabilities
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stage.capabilities.map((c, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 3 }} />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Automated Work Deliverables
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stage.deliverables.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <FileCheck2 size={16} color="#818cf8" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Full audit trail and provenance record attached to all stage outputs.
            </span>
            <button
              className="sh-btn-white"
              onClick={onChat}
              style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600 }}
            >
              Open Studio for {stage.title.split('&')[0]} <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
