import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  EyeOff,
  FileCheck2,
  Key,
  Lock,
  Scale,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';
import ModernGradientFooter from './modern-gradient-footer';

const SECURITY_PILLARS = [
  {
    title: 'Zero-Retention & Zero-Training Policy',
    badge: 'LEGAL PRIVILEGE',
    icon: EyeOff,
    description:
      'Your confidential client disclosures, draft patent claims, trademark filings, copyright works, and litigation work-product are strictly ephemeral. SallyIP never uses customer data to fine-tune or train baseline models.',
    points: [
      'Statutory attorney-client privilege protection under ABA Model Rule 1.6',
      'Ephemeral session processing with automated memory purging',
      'No third-party training data leakage or model knowledge distillation',
      'Formal data processing addendum (DPA) with binding zero-retention terms',
    ],
  },
  {
    title: 'PostgreSQL Row-Level Security (RLS)',
    badge: 'TENANT ISOLATION',
    icon: Database,
    description:
      'Client matters are cryptographically isolated at the database layer. Every query, passage retrieval, and embedding vector lookup is strictly bounded by matter and user tenancy policies.',
    points: [
      'Neon Serverless Postgres with hardware-enforced Row-Level Security',
      'Cross-matter bleeding prevented at SQL query execution level',
      'Granular team permissioning (Partner, Associate, Patent Agent, Reviewer)',
      'Matter vault access revocation effective instantaneously',
    ],
  },
  {
    title: 'End-to-End Cryptographic Encryption',
    badge: 'ENCRYPTION',
    icon: Lock,
    description:
      'Data in transit is protected via TLS 1.3 with Perfect Forward Secrecy. Data at rest is encrypted with AES-256 with optional client-managed encryption keys (BYOK).',
    points: [
      'AES-256 encryption for all stored files, claim charts, and disclosures',
      'TLS 1.3 enforced for all API communication and web socket feeds',
      'Optional AWS KMS / Google Cloud KMS customer-managed keys (BYOK)',
      'Encrypted cold backups stored across geo-redundant sovereign regions',
    ],
  },
  {
    title: 'Forensic Audit Trails & Provenance',
    badge: 'EVIDENCE INTEGRITY',
    icon: FileCheck2,
    description:
      'Every document, prior art reference, and office action uploaded to SallyIP is stamped with a SHA-256 cryptographic hash, ensuring an unbreakable chain of custody for court proceedings.',
    points: [
      'Immutable SHA-256 checksums on all ingested legal files',
      'Full timestamped audit log of every query, view, and export action',
      'Exportable JSON compliance certificates for federal litigation filings',
      'USPTO 37 C.F.R. § 1.68 and § 11.106 compliance verification',
    ],
  },
];

const CERTIFICATIONS = [
  { name: 'SOC 2 Type II Certified', desc: 'Audited security, availability, and confidentiality controls.' },
  { name: 'ISO 27001 Aligned', desc: 'International standard for information security management systems.' },
  { name: 'GDPR & CCPA Compliant', desc: 'Comprehensive data privacy rights and EU data residency support.' },
  { name: 'HIPAA Capable', desc: 'Business Associate Agreement (BAA) available for biotech/pharma clients.' },
];

export default function SecurityPage({ onHome, onChat, onAuth, onPricing, onBenchmarks, onNavigate }) {
  const handleNavChat = () => {
    if (onNavigate) onNavigate('chat');
    else if (onChat) onChat();
    else window.location.hash = 'chat';
  };

  const handleNavAuth = () => {
    if (onNavigate) onNavigate('auth');
    else if (onAuth) onAuth();
    else window.location.hash = 'auth';
  };

  const handleNavPricing = () => {
    if (onNavigate) onNavigate('pricing');
    else if (onPricing) onPricing();
    else {
      window.history.pushState({}, '', '/pricing');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleNavBenchmarks = () => {
    if (onNavigate) onNavigate('benchmarks');
    else if (onBenchmarks) onBenchmarks();
    else {
      window.history.pushState({}, '', '/benchmarks');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif' }}>
      <SallyTopNav
        activePage="security"
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
          else if (page === 'home') onHome ? onHome() : (window.location.hash = 'home');
          else if (page === 'pricing') handleNavPricing();
          else if (page === 'benchmarks') handleNavBenchmarks();
          else if (page === 'chat') handleNavChat();
          else if (page === 'auth') handleNavAuth();
          else window.location.hash = page;
        }}
        onOpenChat={handleNavChat}
        onOpenAuth={handleNavAuth}
      />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(70px, 9vh, 110px) clamp(20px, 3.5vw, 48px) 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 960, margin: '0 auto clamp(48px, 6vh, 64px)' }}>
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
            <ShieldCheck size={13} style={{ color: '#10b981' }} />
            <span>CONFIDENTIALITY & ENTERPRISE PRIVILEGE</span>
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
            Fortified Security for
            <br />
            Confidential Attorney Work-Product.
          </h1>

          <p style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', color: '#9496a1', maxWidth: 760, margin: '0 auto 32px', lineHeight: 1.6 }}>
            SallyIP is engineered from the silicon up for intellectual property counsel. We treat client invention disclosures, trademark filings, copyright assets, and litigation strategies with strict cryptographic isolation and zero data retention.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={handleNavChat}
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
              onClick={handleNavPricing}
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

        {/* Security Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
            marginBottom: 'clamp(48px, 6vh, 72px)',
          }}
        >
          {SECURITY_PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
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
                      {p.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>{p.title}</h3>
                  <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>{p.description}</p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 16 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {p.points.map((pt, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                          <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Certifications Banner */}
        <div
          style={{
            background: '#08090d',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '36px 40px',
            marginBottom: 'clamp(48px, 6vh, 80px)',
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>Compliance & Legal Standards</h3>
          <p style={{ fontSize: 14, color: '#9496a1', margin: '0 0 24px', lineHeight: 1.6 }}>
            Built to satisfy the stringent compliance requirements of Am Law 100 law firms and Fortune 500 patent departments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {CERTIFICATIONS.map((c, i) => (
              <div
                key={i}
                style={{
                  background: '#040508',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#828290', lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modern Gradient Footer */}
      <ModernGradientFooter
        onDemoClick={handleNavChat}
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
          else if (page === 'home') onHome ? onHome() : (window.location.hash = 'home');
          else if (page === 'pricing') handleNavPricing();
          else if (page === 'benchmarks') handleNavBenchmarks();
          else if (page === 'chat') handleNavChat();
          else if (page === 'auth') handleNavAuth();
          else window.location.hash = page;
        }}
      />
    </div>
  );
}
