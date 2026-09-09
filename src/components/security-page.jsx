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

const SECURITY_PILLARS = [
  {
    title: 'Zero-Retention & Zero-Training Policy',
    badge: 'LEGAL PRIVILEGE',
    icon: EyeOff,
    description:
      'Your confidential client disclosures, draft patent claims, and litigation work-product are strictly ephemeral. SallyIP never uses customer data to fine-tune or train baseline models.',
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

export default function SecurityPage({ onHome, onChat, onAuth, onPricing }) {
  return (
    <div className="sally-home" style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc' }}>
      <SallyTopNav
        activePage="security"
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
            <ShieldCheck size={16} />
            <span>CONFIDENTIALITY & ENTERPRISE SECURITY</span>
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
            Fortified security for{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              confidential attorney work-product.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 760, margin: '0 auto', lineHeight: 1.6 }}>
            SallyIP is engineered from the silicon up for intellectual property counsel. We treat client invention disclosures and litigation strategies with the highest grade of cryptographic protection.
          </p>
        </div>

        {/* Security Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 24,
            marginBottom: 64,
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
                  background: 'rgba(18, 18, 24, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 20,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(99, 102, 241, 0.15)',
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
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{p.title}</h3>
                  <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 24px' }}>{p.description}</p>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 18 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {p.points.map((pt, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                          <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
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
            background: 'rgba(18, 18, 24, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 20,
            padding: '36px 40px',
            marginBottom: 48,
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>Compliance & Legal Standards</h3>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 28px' }}>
            Built to satisfy the stringent compliance requirements of Am Law 100 law firms and Fortune 500 patent departments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {CERTIFICATIONS.map((c, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
