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

const METRICS = [
  { label: 'Hybrid Vector Search', value: '48ms', sub: 'Neon Postgres + pgvector', icon: Database, color: '#818cf8' },
  { label: 'P50 Inference Latency', value: '840ms', sub: 'Sub-second first token', icon: Zap, color: '#10b981' },
  { label: 'P95 Complex Reasoning', value: '1.42s', sub: 'Full 5D verification graph', icon: Clock, color: '#f59e0b' },
  { label: 'Infrastructure Uptime', value: '99.98%', sub: 'High-availability SLA', icon: Server, color: '#6366f1' },
  { label: 'Cache Efficiency Lift', value: '42%', sub: 'Prompt KV cache hit rate', icon: Cpu, color: '#c084fc' },
  { label: 'Zero-Dangling Integrity', value: '100.0%', sub: 'Zero unanchored labels', icon: ShieldCheck, color: '#10b981' },
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

export default function PerformancePage({ onHome, onChat, onAuth, onPricing }) {
  return (
    <div className="sally-home" style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc' }}>
      <SallyTopNav
        activePage="performance"
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
            <Activity size={16} />
            <span>ENTERPRISE INFERENCE & RETRIEVAL LATENCY</span>
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
            Sub-second legal verification,{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              without compromising rigor.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 760, margin: '0 auto', lineHeight: 1.6 }}>
            SallyIP pairs custom fine-tuned weights with distributed hybrid vector infrastructure, delivering real-time citation validation and quote verification at enterprise scale.
          </p>
        </div>

        {/* Live Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 56,
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
                  background: 'rgba(18, 18, 24, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{m.label}</span>
                  <Icon size={18} color={m.color} />
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>{m.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{m.sub}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Tier Architecture */}
        <div
          style={{
            background: 'rgba(18, 18, 24, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 56,
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>Authority Tier Retrieval Performance</h3>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 28px' }}>
            Retrieved passages are partitioned into hierarchical tiers to ensure binding primary law governs reasoning over administrative guidance and secondary treatises.
          </p>

          <div style={{ display: 'grid', gap: 16 }}>
            {TIERS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 14,
                  padding: '20px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ flex: '1 1 400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: 4 }}>
                      {t.tier}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}><strong>Sources:</strong> {t.authorities}</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{t.description}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Index Retrieval</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{t.sla}</div>
                  <div style={{ fontSize: 11, color: '#818cf8', marginTop: 4 }}>{t.priority}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Cluster Status */}
        <div
          style={{
            background: 'rgba(18, 18, 24, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '32px 36px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Global Dedicated Clusters</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>All inference clusters operational with live regional failover.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              All Systems Operational
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {CLUSTERS.map((c, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{c.region}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginTop: 10 }}>
                  <span>Latency: <strong style={{ color: '#cbd5e1' }}>{c.latency}</strong></span>
                  <span>Load: <strong style={{ color: '#cbd5e1' }}>{c.load}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
