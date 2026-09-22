import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';
import ModernGradientFooter from './modern-gradient-footer';

const METRICS = [
  { label: 'Hybrid Vector Search', value: '48ms', sub: 'Neon Postgres + pgvector', icon: Database, color: '#34d399' },
  { label: 'P50 Inference Latency', value: '840ms', sub: 'Sub-second first token', icon: Zap, color: '#34d399' },
  { label: 'P95 Complex Reasoning', value: '1.42s', sub: 'Full 5D verification graph', icon: Clock, color: '#60a5fa' },
  { label: 'Infrastructure Uptime', value: '99.98%', sub: 'High-availability SLA', icon: Server, color: '#34d399' },
  { label: 'Cache Efficiency Lift', value: '42%', sub: 'Prompt KV cache hit rate', icon: Cpu, color: '#a78bfa' },
  { label: 'Zero-Dangling Integrity', value: '100.0%', sub: 'Zero unanchored labels', icon: ShieldCheck, color: '#34d399' },
];

const TIERS = [
  {
    tier: 'Tier 1',
    name: 'Binding Statutory Law & En Banc Precedent',
    authorities: 'U.S.C. Titles 35, 15, 17; Supreme Court; Federal Circuit En Banc',
    sla: '< 25ms index retrieval',
    priority: 'Absolute Precedence — Binding',
    description: 'Statutes and binding precedent take absolute precedence in all entailment calculations. Answers fail closed if Tier 1 authority contradicts secondary doctrine.',
  },
  {
    tier: 'Tier 2',
    name: 'Official Administrative Guidance & Rules',
    authorities: 'USPTO MPEP, 37 C.F.R., Director Memoranda, PTAB Precedential Decisions',
    sla: '< 45ms vector search',
    priority: 'Administrative Standard',
    description: 'Examination manuals and formal administrative guidance govern prosecution strategy and examiner traversal arguments under Alice/Mayo and KSR standards.',
  },
  {
    tier: 'Tier 3',
    name: 'Secondary Doctrine & Global Patent Corpus',
    authorities: '100M+ USPTO/EPO/WIPO specifications, Chisum on Patents, academic treatises',
    sla: '< 65ms hybrid fusion',
    priority: 'Persuasive / Factual Evidence',
    description: 'Used for prior art comparison, state-of-the-art context, and technical feature similarity mapping. Quoted text is strictly checked against source substrings.',
  },
];

const CLUSTERS = [
  { region: 'US-East (Northern Virginia)', latency: '32ms', status: 'Operational', load: '38%' },
  { region: 'US-West (Oregon)', latency: '44ms', status: 'Operational', load: '41%' },
  { region: 'EU-Central (Frankfurt)', latency: '58ms', status: 'Operational', load: '29%' },
  { region: 'Asia-Pacific (Tokyo)', latency: '72ms', status: 'Operational', load: '33%' },
];

export default function PerformancePage({
  onHome,
  onChat,
  onAuth,
  onPricing,
  onBenchmarks,
  onLifecycle,
  onModules,
  onSecurity,
  onNavigate,
}) {
  const handleNav = (target) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      if (target === 'home') onHome ? onHome() : (window.location.hash = 'home');
      else if (target === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
      else if (target === 'benchmarks') onBenchmarks ? onBenchmarks() : (window.location.hash = 'benchmarks');
      else if (target === 'lifecycle') onLifecycle ? onLifecycle() : (window.location.hash = 'lifecycle');
      else if (target === 'modules') onModules ? onModules() : (window.location.hash = 'modules');
      else if (target === 'security') onSecurity ? onSecurity() : (window.location.hash = 'security');
      else if (target === 'chat') onChat ? onChat() : (window.location.hash = 'chat');
      else if (target === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
      else window.location.hash = target;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif' }}>
      <SallyTopNav
        activePage="performance"
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
            <Activity size={13} style={{ color: '#10b981' }} />
            <span>ENTERPRISE INFERENCE & RETRIEVAL LATENCY</span>
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
            Sub-Second Legal Verification,
            <br />
            Without Compromising Rigor.
          </h1>

          <p style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', color: '#9496a1', maxWidth: 760, margin: '0 auto 32px', lineHeight: 1.6 }}>
            SallyIP pairs custom fine-tuned weights with distributed hybrid vector infrastructure, delivering real-time citation validation and quote verification at enterprise scale.
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

        {/* Live Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginBottom: 'clamp(48px, 6vh, 72px)',
          }}
        >
          {METRICS.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{
                  background: '#08090d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa' }}>{m.label}</span>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} color={m.color} />
                    </div>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em', color: '#ffffff', marginBottom: 4 }}>
                    {m.value}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{m.sub}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Priority Hierarchy & Authority Slicing */}
        <div style={{ marginBottom: 'clamp(48px, 6vh, 72px)' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', margin: '0 0 8px' }}>
              Statutory Authority Precedence Hierarchy
            </h2>
            <p style={{ fontSize: 15, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
              SallyIP resolves citation and entailment conflicts deterministically using strict statutory hierarchy tiers.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TIERS.map((t, i) => (
              <div
                key={t.tier}
                style={{
                  background: '#08090d',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 18,
                  padding: 24,
                  display: 'grid',
                  gridTemplateColumns: '120px 1.5fr 1fr',
                  gap: 20,
                  alignItems: 'center',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.28)',
                      padding: '4px 12px',
                      borderRadius: 9999,
                    }}
                  >
                    {t.tier}
                  </span>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>{t.sla}</div>
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{t.name}</h4>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{t.description}</p>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                  {t.authorities}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Edge Clusters */}
        <div
          style={{
            background: '#08090d',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '36px 40px',
            marginBottom: 'clamp(48px, 6vh, 80px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Global Sovereign Retrieval Clusters</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Multi-region deployment maintaining strict data sovereignty and sub-100ms vector latency.</p>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                padding: '4px 12px',
                borderRadius: 9999,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} /> All Systems Operational
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {CLUSTERS.map((c) => (
              <div
                key={c.region}
                style={{
                  background: '#040508',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{c.region}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                  <span>Latency: <strong style={{ color: '#34d399' }}>{c.latency}</strong></span>
                  <span>Load: <strong style={{ color: '#cbd5e1' }}>{c.load}</strong></span>
                </div>
              </div>
            ))}
          </div>
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
