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
import ModernGradientFooter from './modern-gradient-footer';

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
    shotPng: '/shots/sallyip-chat-actions-focus.png',
    shotWebp: '/shots/sallyip-chat-actions-focus.webp',
    shotCaption: 'SallyIP quick-actions for prior-art search, FTO, and structured intake.',
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
    shotPng: '/shots/sallyip-chat-home.png',
    shotWebp: '/shots/sallyip-chat-home.webp',
    shotCaption: 'SallyIP chat workspace — matter-scoped prior art search and model selection.',
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
    shotPng: '/shots/sallyip-patent-drafting.png',
    shotWebp: '/shots/sallyip-patent-drafting.webp',
    shotCaption: 'US Patent Drafting Workspace — provisional §111(b) and nonprovisional §111(a).',
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
    shotPng: '/shots/sallyip-patent-drafting-focus.png',
    shotWebp: '/shots/sallyip-patent-drafting-focus.webp',
    shotCaption: 'Filing choice & office action response rejection analysis.',
  },
  {
    id: 'portfolio',
    step: '05',
    title: 'FTO, Trademark & Copyright Clearance',
    subtitle: 'Continuous product clearance, brand protection, and asset management',
    icon: FolderGit2,
    badge: 'STAGE 5',
    description:
      'Monitor competitive patent filings, registered marks, and copyright assets against product roadmaps. Manage annuity decisions, trademark renewals, and international filing deadlines without human error.',
    capabilities: [
      'Product feature-to-claim clearance matrices (Freedom-to-Operate)',
      'Global patent family priority tree visualization (PCT, Paris Convention)',
      'Maintenance fee & annuity value scoring based on citation velocity',
      'Competitor filing radar alerts on newly published applications & marks',
    ],
    deliverables: ['FTO Risk Opinion Memo', 'Family Tree Status Map', 'Portfolio Value Ranking'],
    metric: 'Zero missed statutory deadlines',
    shotPng: '/shots/sallyip-workspaces.png',
    shotWebp: '/shots/sallyip-workspaces.webp',
    shotCaption: 'Specialist IP workspaces modal — FTO, trademark clearance, claim charts, and IP tools.',
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
    shotPng: '/shots/sallyip-workspaces.png',
    shotWebp: '/shots/sallyip-workspaces.webp',
    shotCaption: 'Specialist workspaces — Claim Chart Builder, Prior Art, and Knowledge Graph.',
  },
];

export default function LifecyclePage({
  onHome,
  onChat,
  onAuth,
  onPricing,
  onBenchmarks,
  onModules,
  onPerformance,
  onSecurity,
  onNavigate,
}) {
  const [activeStage, setActiveStage] = useState('drafting');
  const stage = LIFECYCLE_STAGES.find((s) => s.id === activeStage) || LIFECYCLE_STAGES[2];

  const handleNav = (target) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      if (target === 'home') onHome ? onHome() : (window.location.hash = 'home');
      else if (target === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
      else if (target === 'benchmarks') onBenchmarks ? onBenchmarks() : (window.location.hash = 'benchmarks');
      else if (target === 'modules') onModules ? onModules() : (window.location.hash = 'modules');
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
        activePage="lifecycle"
        onNavigate={handleNav}
        onOpenChat={() => handleNav('chat')}
        onOpenAuth={() => handleNav('auth')}
      />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(70px, 9vh, 110px) clamp(20px, 3.5vw, 48px) 80px' }}>
        {/* Hero */}
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
            <GitBranch size={13} style={{ color: '#10b981' }} />
            <span>END-TO-END INTELLECTUAL PROPERTY LIFECYCLE</span>
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
            Connected Intelligence Across the
            <br />
            Entire IP Lifecycle.
          </h1>

          <p style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', color: '#9496a1', maxWidth: 760, margin: '0 auto 32px', lineHeight: 1.6 }}>
            SallyIP unifies legal intelligence across Patents, Trademarks, and Copyrights—from early innovation capture all the way through clearance, prosecution, registration, and enforcement.
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
              Explore Pricing & Plans
            </button>
          </div>
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
                  background: isSelected ? 'rgba(255, 255, 255, 0.12)' : '#08090d',
                  border: isSelected ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isSelected ? '#ffffff' : '#64748b',
                    }}
                  >
                    {s.step}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isSelected ? '#34d399' : '#a1a1aa',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {s.badge}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#ffffff' : '#94a3b8', lineHeight: 1.3 }}>
                  {s.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Showcase */}
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: '#08090d',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: ' clamp(24px, 4vw, 44px)',
            marginBottom: 'clamp(48px, 6vh, 80px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                Stage {stage.step} of 06
              </div>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', margin: 0 }}>
                {stage.title}
              </h2>
              <p style={{ fontSize: 15, color: '#94a3b8', margin: '6px 0 0' }}>{stage.subtitle}</p>
            </div>
            <div
              style={{
                background: '#0e1017',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 9999,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                color: '#34d399',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={13} />
              <span>{stage.metric}</span>
            </div>
          </div>

          <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.65, maxWidth: 880, marginBottom: 28 }}>
            {stage.description}
          </p>

          {/* Authentic Product Screenshot Showcase */}
          {stage.shotPng && (
            <div
              style={{
                width: '100%',
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#040508',
                marginBottom: 32,
                boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
              }}
            >
              <picture>
                <source srcSet={stage.shotWebp} type="image/webp" />
                <img
                  src={stage.shotPng}
                  alt={stage.title}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    maxHeight: 440,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    imageRendering: '-webkit-optimize-contrast',
                  }}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <div
                style={{
                  padding: '12px 20px',
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
                <span>{stage.shotCaption}</span>
                <span style={{ color: '#34d399', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em' }}>
                  VERIFIED PRODUCT WORKSPACE
                </span>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
              marginBottom: 36,
            }}
          >
            {/* Core Capabilities */}
            <div
              style={{
                background: '#040508',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 14,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: 16 }}>
                Automated Capabilities
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stage.capabilities.map((cap, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Generated Deliverables */}
            <div
              style={{
                background: '#040508',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 14,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: 16 }}>
                Stage Work-Product Deliverables
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stage.deliverables.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <FileCheck2 size={16} color="#34d399" />
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
              onClick={() => handleNav('chat')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                background: '#ffffff',
                color: '#000000',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Open Studio for {stage.title.split('&')[0]} <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Modern Gradient Footer */}
      <ModernGradientFooter
        onDemoClick={() => handleNav('chat')}
        onNavigate={handleNav}
      />
    </div>
  );
}
