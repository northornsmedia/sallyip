import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import SallyTopNav from './sally-topnav';

const PLANS = [
  {
    name: 'Solo Practitioner',
    price: '$99',
    period: '/ month',
    note: 'For independent patent attorneys & agents',
    badge: 'PRACTICE READY',
    featured: false,
    features: [
      'Unlimited grounded legal reasoning queries',
      '50 prior art & novelty research scans / month',
      'Automatic citation verification & quote checking',
      'Office Action analyzer & rejection breakdown',
      'Antecedent basis and claim dependency checks',
      'DOCX & USPTO XML specification export',
    ],
    cta: 'Start Solo Trial',
  },
  {
    name: 'IP Boutique & Firm',
    price: '$299',
    period: '/ attorney / month',
    note: 'For collaborative patent & trademark practices',
    badge: 'MOST POPULAR',
    featured: true,
    features: [
      'Everything in Solo Practitioner',
      'Unlimited prior art & novelty radar scans',
      'Multi-user shared matter knowledge vaults',
      'Element-by-element Evidence of Use (EoU) charts',
      'FTO product clearance & competitor radar',
      'Full 5D Proposition-Evidence Graph audit logs',
      'Priority inference throughput & 99.98% SLA',
    ],
    cta: 'Choose Boutique',
  },
  {
    name: 'Enterprise Department',
    price: 'Custom',
    period: 'annual licensing',
    note: 'For corporate patent departments & Am Law 100',
    badge: 'FORTIFIED',
    featured: false,
    features: [
      'Everything in IP Boutique',
      'Dedicated private cloud VPC or on-prem deployment',
      'Customer-managed KMS encryption keys (BYOK)',
      'Custom fine-tuned adapters for firm practice style',
      'Single Sign-On (SAML/Okta) & RBAC compliance',
      'Dedicated IP solutions architect & 24/7 SLA',
      'Formal legal zero-retention guarantee DPA',
    ],
    cta: 'Contact Solutions',
  },
  {
    name: 'Academic & Universities',
    price: 'Free',
    period: 'for qualifying labs',
    note: 'For law schools, clinical programs & university TTOs',
    badge: 'SCHOLARSHIP',
    university: true,
    featured: false,
    features: [
      'Free educational & clinical access for students',
      'Research benchmarks & provenance tools',
      'Curated IP examination corpus access',
      'Student disclosure drafting sandboxes',
      'Dedicated institutional onboarding',
    ],
    cta: 'Apply for Grant',
  },
];

export default function PricingPage({ onHome, onChat, onAuth }) {
  const [annualBilling, setAnnualBilling] = useState(true);

  return (
    <div className="sally-home" style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc' }}>
      <SallyTopNav
        activePage="pricing"
        onNavigate={(page) => {
          if (page === 'home') onHome();
          else if (page === 'chat') onChat();
          else if (page === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
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
            <Sparkles size={16} />
            <span>TRANSPARENT & PREDICTABLE PRACTICE PRICING</span>
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
            Enterprise legal intelligence,{' '}
            <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              built for modern IP practice.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 740, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Every plan includes zero-retention confidentiality, 100% citation integrity, and verifiable statutory quote checking.
          </p>

          {/* Billing Switch */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255, 255, 255, 0.04)', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: 13, color: !annualBilling ? '#fff' : '#94a3b8', fontWeight: 600 }}>Monthly</span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                background: annualBilling ? '#6366f1' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: annualBilling ? 23 : 3,
                  transition: 'all 0.2s ease',
                }}
              />
            </button>
            <span style={{ fontSize: 13, color: annualBilling ? '#fff' : '#94a3b8', fontWeight: 600 }}>
              Annual <span style={{ color: '#10b981', fontSize: 11, background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>SAVE 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 64,
          }}
        >
          {PLANS.map((plan, index) => {
            const priceDisplay = plan.price.startsWith('$') && annualBilling
              ? `$${Math.round(parseInt(plan.price.slice(1), 10) * 0.8)}`
              : plan.price;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                style={{
                  background: plan.featured
                    ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(18, 18, 24, 0.95) 100%)'
                    : 'rgba(18, 18, 24, 0.85)',
                  border: plan.featured ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 20,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: plan.featured ? '0 0 35px rgba(99, 102, 241, 0.2)' : 'none',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: plan.featured ? '#818cf8' : '#94a3b8',
                        background: plan.featured ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        border: plan.featured ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {plan.badge}
                    </span>
                    {plan.university && <GraduationCap size={18} color="#818cf8" />}
                  </div>

                  <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.4 }}>{plan.note}</p>

                  <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{priceDisplay}</span>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{plan.period}</span>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 20, marginBottom: 28 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>
                          <Check size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  className={plan.featured ? 'sh-btn-white' : 'sh-btn-glass'}
                  onClick={plan.university ? () => window.location.href = 'mailto:team@sallyip.com?subject=SallyIP University Program' : onChat}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {plan.cta} <ArrowRight size={15} />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Guarantee Note */}
        <div
          style={{
            background: 'rgba(18, 18, 24, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '28px 32px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ShieldCheck size={28} color="#10b981" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>30-Day Practice Guarantee</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                Full refund if SallyIP does not noticeably accelerate your firm's patent drafting and research speed.
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            SOC 2 Type II Audited · Zero Training on Client Data
          </div>
        </div>
      </main>
    </div>
  );
}
